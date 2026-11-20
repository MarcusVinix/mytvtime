"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  Clock,
  Compass,
  Loader2,
  Play,
  Tv,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MediaCard } from "@/components/MediaCard";
import {
  useToggleEpisode,
  useUserShows,
  useWatchedEpisodes,
} from "@/lib/queries/useLibrary";
import {
  formatCountdownLabel,
  formatDateBR,
  formatEpisodeCode,
  getDaysUntil,
  isReleased,
} from "@/lib/dates";
import { getTmdbImageUrl } from "@/lib/tmdb";
import type {
  ShowStatus,
  TmdbEpisode,
  TmdbSeasonDetail,
  TmdbShowDetail,
  UserShow,
} from "@/types";

type SubTab = "up_next" | "upcoming" | "all";

interface UpNextItem {
  show: UserShow;
  nextEpisode: TmdbEpisode;
  watchedCount: number;
  totalCount: number;
}

interface UpcomingItem {
  show: UserShow;
  episode: TmdbEpisode;
  daysUntil: number;
}

export default function SeriesPage() {
  const [subTab, setSubTab] = useState<SubTab>("up_next");
  const [statusFilter, setStatusFilter] = useState<ShowStatus | "all">("all");

  const { data: shows = [], isLoading: showsLoading } = useUserShows();
  const { data: watchedEpisodes = [], isLoading: epsLoading } = useWatchedEpisodes();
  const toggleEpisode = useToggleEpisode();

  const watchedByShow = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const ep of watchedEpisodes) {
      if (!map.has(ep.tmdb_show_id)) {
        map.set(ep.tmdb_show_id, new Set());
      }
      map.get(ep.tmdb_show_id)!.add(`${ep.season_number}-${ep.episode_number}`);
    }
    return map;
  }, [watchedEpisodes]);

  const activeShows = useMemo(
    () => shows.filter((s) => s.status === "watching" || s.status === "plan_to_watch"),
    [shows]
  );

  // Fetch TMDB details for active shows (cached 30 min on server + React Query)
  const detailQueries = useQueries({
    queries: activeShows.map((show) => ({
      queryKey: ["tmdb", "tv", show.tmdb_id],
      queryFn: async () => {
        const res = await fetch(`/api/tmdb/tv/${show.tmdb_id}`);
        if (!res.ok) throw new Error("Erro ao carregar série");
        return res.json() as Promise<TmdbShowDetail>;
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Determine which season to inspect for each active show to find the next unwatched episode
  const seasonTargets = useMemo(() => {
    return activeShows
      .map((show, idx) => {
        const detail = detailQueries[idx]?.data;
        if (!detail) return null;

        const regularSeasons = (detail.seasons || []).filter(
          (s) => s.season_number > 0 && s.episode_count > 0
        );
        if (regularSeasons.length === 0) return null;

        const watchedSet = watchedByShow.get(show.tmdb_id) || new Set<string>();
        // Pick first season that is not completely watched
        let targetSeason = regularSeasons[regularSeasons.length - 1].season_number;
        for (const season of regularSeasons) {
          let watchedInSeason = 0;
          for (let epNum = 1; epNum <= season.episode_count; epNum++) {
            if (watchedSet.has(`${season.season_number}-${epNum}`)) {
              watchedInSeason++;
            }
          }
          if (watchedInSeason < season.episode_count) {
            targetSeason = season.season_number;
            break;
          }
        }

        return { show, detail, seasonNumber: targetSeason };
      })
      .filter(Boolean) as { show: UserShow; detail: TmdbShowDetail; seasonNumber: number }[];
  }, [activeShows, detailQueries, watchedByShow]);

  const seasonQueries = useQueries({
    queries: seasonTargets.map((target) => ({
      queryKey: ["tmdb", "tv", target.show.tmdb_id, "season", target.seasonNumber],
      queryFn: async () => {
        const res = await fetch(
          `/api/tmdb/tv/${target.show.tmdb_id}/season/${target.seasonNumber}`
        );
        if (!res.ok) throw new Error("Erro ao carregar temporada");
        return res.json() as Promise<TmdbSeasonDetail>;
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  const upNextItems = useMemo<UpNextItem[]>(() => {
    const items: UpNextItem[] = [];
    seasonTargets.forEach((target, idx) => {
      const seasonDetail = seasonQueries[idx]?.data;
      if (!seasonDetail?.episodes) return;
      const watchedSet = watchedByShow.get(target.show.tmdb_id) || new Set<string>();

      const nextEp = seasonDetail.episodes.find(
        (ep) =>
          !watchedSet.has(`${ep.season_number}-${ep.episode_number}`) &&
          isReleased(ep.air_date)
      );

      if (nextEp) {
        items.push({
          show: target.show,
          nextEpisode: nextEp,
          watchedCount: watchedSet.size,
          totalCount: target.detail.number_of_episodes || target.show.total_episodes || 1,
        });
      }
    });
    return items;
  }, [seasonTargets, seasonQueries, watchedByShow]);

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
    const list: UpcomingItem[] = [];
    activeShows.forEach((show, idx) => {
      const detail = detailQueries[idx]?.data;
      const nextAir = detail?.next_episode_to_air;
      if (!nextAir?.air_date) return;
      const days = getDaysUntil(nextAir.air_date);
      if (days !== null && days >= 0) {
        list.push({ show, episode: nextAir, daysUntil: days });
      }
    });
    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [activeShows, detailQueries]);

  const filteredShows = useMemo(() => {
    if (statusFilter === "all") return shows;
    return shows.filter((s) => s.status === statusFilter);
  }, [shows, statusFilter]);

  const isLoading = showsLoading || epsLoading;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Minhas Séries</h1>
          <p className="text-sm text-zinc-400">
            Continue de onde parou e acompanhe as datas de lançamento
          </p>
        </div>

        <Link
          href="/explorar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-sm font-bold text-[#0E0F12] transition-colors hover:bg-[#FFD338]"
        >
          <Compass className="h-4 w-4" />
          Adicionar série
        </Link>
      </div>

      {/* Sub-tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "up_next" as const, label: "Assistir a seguir", count: upNextItems.length },
          { id: "upcoming" as const, label: "Em breve", count: upcomingItems.length },
          { id: "all" as const, label: "Todas", count: shows.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              subTab === tab.id
                ? "bg-[#F5C518] text-[#0E0F12]"
                : "border border-[#232630] bg-[#16181D] text-zinc-300 hover:border-zinc-700 hover:text-white"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                subTab === tab.id
                  ? "bg-black/15 text-[#0E0F12]"
                  : "bg-[#232630] text-zinc-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
          Carregando sua biblioteca...
        </div>
      ) : shows.length === 0 ? (
        <div className="rounded-3xl border border-[#232630] bg-[#16181D] px-6 py-16 text-center">
          <Tv className="mx-auto mb-4 h-12 w-12 text-[#F5C518]" />
          <h2 className="text-lg font-bold text-white">Nenhuma série na sua lista ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Busque suas séries favoritas na aba Explorar para acompanhar o próximo episódio e as
            datas de lançamento.
          </p>
          <Link
            href="/explorar"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-5 py-3 text-sm font-bold text-[#0E0F12] hover:bg-[#FFD338]"
          >
            <Compass className="h-4 w-4" />
            Explorar catálogo
          </Link>
        </div>
      ) : subTab === "up_next" ? (
        upNextItems.length === 0 ? (
          <div className="rounded-3xl border border-[#232630] bg-[#16181D] px-6 py-14 text-center">
            <Check className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Tudo em dia!</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Você já assistiu todos os episódios lançados das suas séries em andamento. Confira a
              aba <strong>Em breve</strong> para ver os próximos lançamentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upNextItems.map(({ show, nextEpisode, watchedCount, totalCount }) => {
              const progress = Math.min(100, Math.round((watchedCount / totalCount) * 100));
              const remaining = Math.max(0, totalCount - watchedCount);
              const backdrop = getTmdbImageUrl(
                nextEpisode.still_path || show.backdrop_path || show.poster_path,
                "w500"
              );

              return (
                <div
                  key={show.tmdb_id}
                  className="group overflow-hidden rounded-2xl border border-[#232630] bg-[#16181D] transition-colors hover:border-[#F5C518]/50"
                >
                  <div className="flex gap-4 p-4">
                    <Link
                      href={`/series/${show.tmdb_id}`}
                      className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-[#1E2128]"
                    >
                      {show.poster_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getTmdbImageUrl(show.poster_path, "w185")!}
                          alt={show.title}
                          className="h-full w-full object-cover"
                        />
                      ) : backdrop ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={backdrop}
                          alt={show.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-600">
                          <Tv className="h-6 w-6" />
                        </div>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <Link
                          href={`/series/${show.tmdb_id}`}
                          className="line-clamp-1 text-base font-bold text-white hover:text-[#F5C518]"
                        >
                          {show.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-[#F5C518]">
                          <Play className="h-3 w-3 fill-[#F5C518]" />
                          <span>
                            {formatEpisodeCode(
                              nextEpisode.season_number,
                              nextEpisode.episode_number
                            )}
                          </span>
                          <span className="truncate font-normal text-zinc-300">
                            {nextEpisode.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {remaining === 1
                            ? "Falta 1 episódio"
                            : `Faltam ${remaining} episódios`}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#262A34]">
                            <div
                              className="h-full rounded-full bg-[#F5C518] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={toggleEpisode.isPending}
                          onClick={() =>
                            toggleEpisode.mutate({
                              tmdbShowId: show.tmdb_id,
                              seasonNumber: nextEpisode.season_number,
                              episodeNumber: nextEpisode.episode_number,
                              runtimeMinutes: nextEpisode.runtime || 45,
                              watched: true,
                            })
                          }
                          title="Marcar episódio como assistido"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5C518] text-[#0E0F12] shadow-md shadow-[#F5C518]/15 transition-transform hover:scale-105 hover:bg-[#FFD338] active:scale-95 disabled:opacity-50"
                        >
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : subTab === "upcoming" ? (
        upcomingItems.length === 0 ? (
          <div className="rounded-3xl border border-[#232630] bg-[#16181D] px-6 py-14 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-zinc-500" />
            <h2 className="text-base font-bold text-white">Sem lançamentos agendados</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Nenhuma das suas séries em andamento possui próximo episódio com data anunciada no
              momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingItems.map(({ show, episode, daysUntil }) => (
              <Link
                key={`${show.tmdb_id}-${episode.season_number}-${episode.episode_number}`}
                href={`/series/${show.tmdb_id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#232630] bg-[#16181D] p-4 transition-colors hover:border-[#F5C518]/50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-[#1E2128]">
                    {show.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getTmdbImageUrl(show.poster_path, "w185")!}
                        alt={show.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-white">{show.title}</h3>
                    <p className="mt-0.5 truncate text-sm text-zinc-300">
                      <span className="font-semibold text-[#F5C518]">
                        {formatEpisodeCode(episode.season_number, episode.episode_number)}
                      </span>{" "}
                      · {episode.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateBR(episode.air_date)}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ${
                    daysUntil <= 1
                      ? "bg-[#F5C518] text-[#0E0F12]"
                      : "border border-[#2A2E3A] bg-[#0E0F12] text-[#F5C518]"
                  }`}
                >
                  {formatCountdownLabel(episode.air_date)}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { id: "all" as const, label: "Todas" },
              { id: "watching" as const, label: "Assistindo" },
              { id: "plan_to_watch" as const, label: "Quero ver" },
              { id: "completed" as const, label: "Concluídas" },
              { id: "stopped" as const, label: "Pausadas" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === f.id
                    ? "bg-zinc-100 text-[#0E0F12]"
                    : "bg-[#16181D] text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredShows.map((show) => {
              const watchedCount = watchedByShow.get(show.tmdb_id)?.size || 0;
              return (
                <MediaCard
                  key={show.tmdb_id}
                  id={show.tmdb_id}
                  type="tv"
                  title={show.title}
                  posterPath={show.poster_path}
                  subtitle={`${watchedCount}/${show.total_episodes || "?"} eps`}
                />
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
