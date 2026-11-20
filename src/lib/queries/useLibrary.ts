"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  MovieStatus,
  ShowStatus,
  TmdbEpisode,
  TmdbMovieDetail,
  TmdbShowDetail,
  UserMovie,
  UserShow,
  WatchedEpisode,
} from "@/types";

export const LIBRARY_KEYS = {
  user: ["auth", "user"] as const,
  shows: ["library", "shows"] as const,
  episodes: ["library", "episodes"] as const,
  movies: ["library", "movies"] as const,
};

export function useCurrentUser() {
  const supabase = createClient();
  return useQuery({
    queryKey: LIBRARY_KEYS.user,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });
}

export function useUserShows() {
  const supabase = createClient();
  return useQuery({
    queryKey: LIBRARY_KEYS.shows,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_shows")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserShow[];
    },
  });
}

export function useWatchedEpisodes() {
  const supabase = createClient();
  return useQuery({
    queryKey: LIBRARY_KEYS.episodes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watched_episodes")
        .select("*")
        .order("watched_at", { ascending: false });
      if (error) throw error;
      return (data || []) as WatchedEpisode[];
    },
  });
}

export function useUserMovies() {
  const supabase = createClient();
  return useQuery({
    queryKey: LIBRARY_KEYS.movies,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_movies")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserMovie[];
    },
  });
}

export function useUpsertShow() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      show,
      status = "watching",
    }: {
      show: TmdbShowDetail;
      status?: ShowStatus;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        user_id: user.id,
        tmdb_id: show.id,
        title: show.name,
        poster_path: show.poster_path,
        backdrop_path: show.backdrop_path,
        status,
        total_episodes: show.number_of_episodes || 0,
        number_of_seasons: show.number_of_seasons || 1,
        first_air_date: show.first_air_date || null,
        next_episode_date: show.next_episode_to_air?.air_date || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_shows")
        .upsert(payload, { onConflict: "user_id,tmdb_id" })
        .select()
        .single();
      if (error) throw error;
      return data as UserShow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
    },
  });
}

export function useUpdateShowStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbId,
      status,
    }: {
      tmdbId: number;
      status: ShowStatus;
    }) => {
      const { error } = await supabase
        .from("user_shows")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
    },
  });
}

export function useRemoveShow() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tmdbId: number) => {
      const { error: epErr } = await supabase
        .from("watched_episodes")
        .delete()
        .eq("tmdb_show_id", tmdbId);
      if (epErr) throw epErr;

      const { error } = await supabase
        .from("user_shows")
        .delete()
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
    },
  });
}

export function useToggleEpisode() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbShowId,
      seasonNumber,
      episodeNumber,
      runtimeMinutes = 45,
      watched,
    }: {
      tmdbShowId: number;
      seasonNumber: number;
      episodeNumber: number;
      runtimeMinutes?: number;
      watched: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (watched) {
        const { error } = await supabase.from("watched_episodes").upsert(
          {
            user_id: user.id,
            tmdb_show_id: tmdbShowId,
            season_number: seasonNumber,
            episode_number: episodeNumber,
            runtime_minutes: runtimeMinutes || 45,
            watched_at: new Date().toISOString(),
          },
          { onConflict: "user_id,tmdb_show_id,season_number,episode_number" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("watched_episodes")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_show_id", tmdbShowId)
          .eq("season_number", seasonNumber)
          .eq("episode_number", episodeNumber);
        if (error) throw error;
      }

      await supabase
        .from("user_shows")
        .update({ updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbShowId);
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: LIBRARY_KEYS.episodes });
      const prev = queryClient.getQueryData<WatchedEpisode[]>(LIBRARY_KEYS.episodes);

      queryClient.setQueryData<WatchedEpisode[]>(LIBRARY_KEYS.episodes, (old = []) => {
        if (vars.watched) {
          const exists = old.some(
            (e) =>
              e.tmdb_show_id === vars.tmdbShowId &&
              e.season_number === vars.seasonNumber &&
              e.episode_number === vars.episodeNumber
          );
          if (exists) return old;
          return [
            {
              id: `optimistic-${vars.tmdbShowId}-${vars.seasonNumber}-${vars.episodeNumber}`,
              user_id: "optimistic",
              tmdb_show_id: vars.tmdbShowId,
              season_number: vars.seasonNumber,
              episode_number: vars.episodeNumber,
              runtime_minutes: vars.runtimeMinutes || 45,
              rating: null,
              watched_at: new Date().toISOString(),
            },
            ...old,
          ];
        }
        return old.filter(
          (e) =>
            !(
              e.tmdb_show_id === vars.tmdbShowId &&
              e.season_number === vars.seasonNumber &&
              e.episode_number === vars.episodeNumber
            )
        );
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(LIBRARY_KEYS.episodes, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
    },
  });
}

export function useToggleSeason() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbShowId,
      seasonNumber,
      episodes,
      markAsWatched,
    }: {
      tmdbShowId: number;
      seasonNumber: number;
      episodes: TmdbEpisode[];
      markAsWatched: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (markAsWatched) {
        const now = new Date().toISOString();
        const rows = episodes.map((ep) => ({
          user_id: user.id,
          tmdb_show_id: tmdbShowId,
          season_number: seasonNumber,
          episode_number: ep.episode_number,
          runtime_minutes: ep.runtime || 45,
          watched_at: now,
        }));
        const { error } = await supabase.from("watched_episodes").upsert(rows, {
          onConflict: "user_id,tmdb_show_id,season_number,episode_number",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("watched_episodes")
          .delete()
          .eq("user_id", user.id)
          .eq("tmdb_show_id", tmdbShowId)
          .eq("season_number", seasonNumber);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
    },
  });
}

export function useUpsertMovie() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      movie,
      status,
    }: {
      movie: TmdbMovieDetail;
      status: MovieStatus;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        tmdb_id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        release_date: movie.release_date || null,
        status,
        runtime_minutes: movie.runtime || 110,
        watched_at: status === "watched" ? now : null,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("user_movies")
        .upsert(payload, { onConflict: "user_id,tmdb_id" })
        .select()
        .single();
      if (error) throw error;
      return data as UserMovie;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.movies });
    },
  });
}

export function useToggleMovieStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbId,
      status,
    }: {
      tmdbId: number;
      status: MovieStatus;
    }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("user_movies")
        .update({
          status,
          watched_at: status === "watched" ? now : null,
          updated_at: now,
        })
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.movies });
    },
  });
}

export function useRemoveMovie() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tmdbId: number) => {
      const { error } = await supabase
        .from("user_movies")
        .delete()
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.movies });
    },
  });
}
