"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CLIENT_CACHE_MS } from "@/lib/cache";
import type {
  CustomList,
  MovieStatus,
  ReactionType,
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
  lists: ["library", "lists"] as const,
};

export function useCurrentUser() {
  const supabase = createClient();
  return useQuery({
    queryKey: LIBRARY_KEYS.user,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: CLIENT_CACHE_MS.library,
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
        genres: (show.genres || []).map((g) => g.name),
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
        genres: (movie.genres || []).map((g) => g.name),
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

export function useMarkEpisodesUpTo() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbShowId,
      seasonNumber,
      episodesUpTo,
    }: {
      tmdbShowId: number;
      seasonNumber: number;
      episodesUpTo: TmdbEpisode[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const now = new Date().toISOString();
      const rows = episodesUpTo.map((ep) => ({
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

      await supabase
        .from("user_shows")
        .update({ updated_at: now })
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbShowId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
    },
  });
}

export function useCustomLists() {
  const supabase = createClient();
  return useQuery({
    queryKey: LIBRARY_KEYS.lists,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_lists")
        .select("*, custom_list_items(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CustomList[];
    },
  });
}

export function useCreateList() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("custom_lists")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim() || null,
        })
        .select("*, custom_list_items(*)")
        .single();
      if (error) throw error;
      return data as CustomList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.lists });
    },
  });
}

export function useDeleteList() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase.from("custom_lists").delete().eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.lists });
    },
  });
}

export function useToggleListItem() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      mediaType,
      tmdbId,
      title,
      posterPath,
      inList,
    }: {
      listId: string;
      mediaType: "tv" | "movie";
      tmdbId: number;
      title: string;
      posterPath: string | null;
      inList: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (inList) {
        const { error } = await supabase
          .from("custom_list_items")
          .delete()
          .eq("list_id", listId)
          .eq("media_type", mediaType)
          .eq("tmdb_id", tmdbId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_list_items").upsert(
          {
            list_id: listId,
            user_id: user.id,
            media_type: mediaType,
            tmdb_id: tmdbId,
            title,
            poster_path: posterPath,
          },
          { onConflict: "list_id,media_type,tmdb_id" }
        );
        if (error) throw error;
      }

      await supabase
        .from("custom_lists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.lists });
    },
  });
}

export function useUpdateShowMeta() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbId,
      patch,
      resetEpisodes = false,
    }: {
      tmdbId: number;
      patch: {
        rating?: number | null;
        reaction?: ReactionType | null;
        notes?: string | null;
        is_favorite?: boolean;
        rewatch_count?: number;
        status?: ShowStatus;
        genres?: string[];
      };
      resetEpisodes?: boolean;
    }) => {
      const { error } = await supabase
        .from("user_shows")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("tmdb_id", tmdbId);
      if (error) throw error;

      if (resetEpisodes) {
        const { error: delErr } = await supabase
          .from("watched_episodes")
          .delete()
          .eq("tmdb_show_id", tmdbId);
        if (delErr) throw delErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
    },
  });
}

export function useUpdateEpisodeReview() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbShowId,
      seasonNumber,
      episodeNumber,
      rating,
      reaction,
      notes,
    }: {
      tmdbShowId: number;
      seasonNumber: number;
      episodeNumber: number;
      rating?: number | null;
      reaction?: ReactionType | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from("watched_episodes")
        .update({ rating, reaction, notes })
        .eq("tmdb_show_id", tmdbShowId)
        .eq("season_number", seasonNumber)
        .eq("episode_number", episodeNumber);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
    },
  });
}

export function useUpdateMovieMeta() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tmdbId,
      patch,
    }: {
      tmdbId: number;
      patch: {
        rating?: number | null;
        reaction?: ReactionType | null;
        notes?: string | null;
        is_favorite?: boolean;
        rewatch_count?: number;
        genres?: string[];
      };
    }) => {
      const { error } = await supabase
        .from("user_movies")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.movies });
    },
  });
}
