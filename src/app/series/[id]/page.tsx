"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  FastForward,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AddToListButton } from "@/components/AddToListModal";
import { CastSection, RecommendationsSection, TrailerButton } from "@/components/MediaExtras";
import { EpisodeReviewButton, MediaReviewCard } from "@/components/ReviewControls";
import {
  useMarkEpisodesUpTo,
  useRemoveShow,
  useToggleEpisode,
  useToggleSeason,
  useUpdateEpisodeReview,
  useUpdateShowMeta,
  useUpdateShowStatus,
  useUpsertShow,
  useUserShows,
  useWatchedEpisodes,
} from "@/lib/queries/useLibrary";
import { formatCountdownLabel, formatDateBR, formatEpisodeCode } from "@/lib/dates";
import { getTmdbImageUrl } from "@/lib/tmdb";
import type { ShowStatus, TmdbSeasonDetail, TmdbShowDetail, WatchedEpisode } from "@/types";

function SeasonAccordion({
  tmdbShowId,
  seasonNumber,
  seasonName,
  episodeCount,
  isInLibrary,
  watchedMap,
  defaultOpen,
  onEnsureInLibrary,
}: {
  tmdbShowId: number;
  seasonNumber: number;
  seasonName: string;
  episodeCount: number;
  isInLibrary: boolean;
  watchedMap: Map<string, WatchedEpisode>;
  defaultOpen: boolean;
  onEnsureInLibrary: () => Promise<void>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggleEpisode = useToggleEpisode();
  const toggleSeason = useToggleSeason();
  const markUpTo = useMarkEpisodesUpTo();
  const updateEpisodeReview = useUpdateEpisodeReview();

  const { data: seasonDetail, isLoading } = useQuery<TmdbSeasonDetail>({
    queryKey: ["tmdb", "tv", tmdbShowId, "season", seasonNumber],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/tv/${tmdbShowId}/season/${seasonNumber}`);
      if (!res.ok) throw new Error("Erro ao carregar temporada");
      return res.json();
    },
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });

  const watchedInSeason = useMemo(() => {
    let count = 0;
    for (let ep = 1; ep <= episodeCount; ep++) {
      if (watchedMap.has(`${seasonNumber}-${ep}`)) count++;
    }
    return count;
  }, [watchedMap, seasonNumber, episodeCount]);

  const allWatched = episodeCount > 0 && watchedInSeason >= episodeCount;

  async function handleToggleEpisode(epNum: number, runtime: number | null, currentlyWatched: boolean) {
    if (!isInLibrary && !currentlyWatched) {
      await onEnsureInLibrary();
    }
    toggleEpisode.mutate({
      tmdbShowId,
      seasonNumber,
      episodeNumber: epNum,
      runtimeMinutes: runtime || 45,
      watched: !currentlyWatched,
    });
  }

  async function handleToggleWholeSeason() {
    if (!seasonDetail?.episodes) return;
    if (!isInLibrary && !allWatched) {
      await onEnsureInLibrary();
    }
    toggleSeason.mutate({
      tmdbShowId,
      seasonNumber,
      episodes: seasonDetail.episodes,
      markAsWatched: !allWatched,
    });
  }

  async function handleMarkUpTo(targetEpNumber: number) {
    if (!seasonDetail?.episodes) return;
    if (!isInLibrary) {
      await onEnsureInLibrary();
    }
    const episodesUpTo = seasonDetail.episodes.filter(
      (e) => e.episode_number <= targetEpNumber
    );
    markUpTo.mutate({
      tmdbShowId,
      seasonNumber,
      episodesUpTo,
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#232630] bg-[#16181D]">
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-[#1B1E25]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white">{seasonName}</h3>
            <span className="text-xs font-semibold text-zinc-400">
              {watchedInSeason}/{episodeCount} vistos
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#262A34]">
            <div
              className="h-full rounded-full bg-[#F5C518] transition-all"
              style={{
                width: `${episodeCount > 0 ? Math.min(100, (watchedInSeason / episodeCount) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {open && seasonDetail?.episodes && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleWholeSeason();
              }}
              disabled={toggleSeason.isPending}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                allWatched
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-[#232630] text-zinc-200 hover:bg-[#F5C518] hover:text-[#0E0F12]"
              }`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {allWatched ? "Desmarcar temporada" : "Marcar temporada"}
            </button>
          )}
          {open ? (
            <ChevronUp className="h-5 w-5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-[#232630] divide-y divide-[#232630]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#F5C518]" />
              Carregando episódios...
            </div>
          ) : (
            (seasonDetail?.episodes || []).map((ep) => {
              const watchedRecord = watchedMap.get(`${ep.season_number}-${ep.episode_number}`);
              const watched = Boolean(watchedRecord);
              return (
                <div
                  key={ep.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#1A1D24]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#F5C518]">
                        {formatEpisodeCode(ep.season_number, ep.episode_number)}
                      </span>
                      <span className="font-semibold text-zinc-100">{ep.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateBR(ep.air_date)}
                      </span>
                      {ep.runtime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ep.runtime} min
                        </span>
                      )}
                    </div>
                    {ep.overview && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">{ep.overview}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {watched && (
                      <EpisodeReviewButton
                        episodeLabel={`${formatEpisodeCode(ep.season_number, ep.episode_number)} · ${ep.name}`}
                        rating={watchedRecord?.rating}
                        reaction={watchedRecord?.reaction}
                        notes={watchedRecord?.notes}
                        onSave={(patch) =>
                          updateEpisodeReview.mutate({
                            tmdbShowId,
                            seasonNumber,
                            episodeNumber: ep.episode_number,
                            ...patch,
                          })
                        }
                      />
                    )}

                    {!watched && ep.episode_number > 1 && (
                      <button
                        type="button"
                        disabled={markUpTo.isPending}
                        onClick={() => handleMarkUpTo(ep.episode_number)}
                        title="Marcar todos até este episódio"
                        className="flex h-9 items-center gap-1 rounded-xl border border-[#2E3340] bg-[#0E0F12] px-2.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:border-[#F5C518] hover:text-[#F5C518] disabled:opacity-50"
                      >
                        <FastForward className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Até aqui</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleEpisode(ep.episode_number, ep.runtime, watched)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                        watched
                          ? "bg-[#F5C518] text-[#0E0F12]"
                          : "border border-[#2E3340] bg-[#0E0F12] text-zinc-400 hover:border-[#F5C518] hover:text-[#F5C518]"
                      }`}
                      title={watched ? "Desmarcar episódio" : "Marcar como assistido"}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tmdbId = Number(id);

  const { data: show, isLoading, error } = useQuery<TmdbShowDetail>({
    queryKey: ["tmdb", "tv", tmdbId],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/tv/${tmdbId}`);
      if (!res.ok) throw new Error("Não foi possível carregar os detalhes da série.");
      return res.json();
    },
  });

  const { data: userShows = [] } = useUserShows();
  const { data: watchedEpisodes = [] } = useWatchedEpisodes();
  const upsertShow = useUpsertShow();
  const updateStatus = useUpdateShowStatus();
  const updateShowMeta = useUpdateShowMeta();
  const removeShow = useRemoveShow();

  const savedShow = useMemo(
    () => userShows.find((s) => s.tmdb_id === tmdbId),
    [userShows, tmdbId]
  );

  const watchedMap = useMemo(() => {
    const map = new Map<string, WatchedEpisode>();
    for (const ep of watchedEpisodes) {
      if (ep.tmdb_show_id === tmdbId) {
        map.set(`${ep.season_number}-${ep.episode_number}`, ep);
      }
    }
    return map;
  }, [watchedEpisodes, tmdbId]);

  const regularSeasons = useMemo(
    () => (show?.seasons || []).filter((s) => s.season_number > 0),
    [show]
  );

  const providers = show?.["watch/providers"]?.results?.BR?.flatrate || [];

  async function ensureInLibrary() {
    if (!savedShow && show) {
      await upsertShow.mutateAsync({ show, status: "watching" });
    }
  }

  return (
    <AppShell>
      <Link
        href="/series"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#F5C518]" />
          Carregando série...
        </div>
      ) : error || !show ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          Erro ao carregar série. Verifique se a chave do TMDB está configurada no{" "}
          <code>.env.local</code>.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-[#232630] bg-[#16181D]">
            {show.backdrop_path && (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getTmdbImageUrl(show.backdrop_path, "w1280")!}
                  alt={show.name}
                  className="h-full w-full object-cover opacity-25"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#16181D] via-[#16181D]/80 to-transparent" />
              </div>
            )}

            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
              <div className="h-56 w-36 shrink-0 self-center overflow-hidden rounded-2xl border border-white/10 bg-[#1E2128] shadow-xl sm:self-start">
                {show.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getTmdbImageUrl(show.poster_path, "w342")!}
                    alt={show.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{show.name}</h1>
                    {show.vote_average > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5C518]/15 px-2.5 py-1 text-xs font-bold text-[#F5C518]">
                        <Star className="h-3.5 w-3.5 fill-[#F5C518]" />
                        {show.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {show.number_of_seasons} temporada(s) · {show.number_of_episodes} episódios ·{" "}
                    {show.genres.map((g) => g.name).join(", ")}
                  </p>
                </div>

                {show.overview && (
                  <p className="text-sm leading-relaxed text-zinc-300">{show.overview}</p>
                )}

                {show.next_episode_to_air && (
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-3.5 py-2 text-xs text-[#F5C518]">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Próximo episódio:{" "}
                      <strong>
                        {formatEpisodeCode(
                          show.next_episode_to_air.season_number,
                          show.next_episode_to_air.episode_number
                        )}
                      </strong>{" "}
                      ({formatCountdownLabel(show.next_episode_to_air.air_date)})
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!savedShow ? (
                    <button
                      type="button"
                      disabled={upsertShow.isPending}
                      onClick={() => upsertShow.mutate({ show, status: "watching" })}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-5 py-2.5 text-sm font-bold text-[#0E0F12] transition-colors hover:bg-[#FFD338]"
                    >
                      <Plus className="h-4 w-4" strokeWidth={3} />
                      Adicionar às minhas séries
                    </button>
                  ) : (
                    <>
                      <select
                        value={savedShow.status}
                        onChange={(e) =>
                          updateStatus.mutate({
                            tmdbId,
                            status: e.target.value as ShowStatus,
                          })
                        }
                        className="rounded-xl border border-[#F5C518]/50 bg-[#0E0F12] px-4 py-2.5 text-sm font-semibold text-[#F5C518] outline-none"
                      >
                        <option value="watching">Assistindo</option>
                        <option value="plan_to_watch">Quero ver</option>
                        <option value="completed">Concluída</option>
                        <option value="stopped">Pausada</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Remover esta série e o histórico de episódios dela?")) {
                            removeShow.mutate(tmdbId);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </>
                  )}

                  <AddToListButton
                    mediaType="tv"
                    tmdbId={show.id}
                    title={show.name}
                    posterPath={show.poster_path}
                  />

                  <TrailerButton videos={show.videos?.results} />
                </div>

                {/* Watch Providers BR */}
                {providers.length > 0 && (
                  <div className="pt-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Onde assistir no Brasil
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {providers.map((p) => (
                        <div
                          key={p.provider_id}
                          className="flex items-center gap-2 rounded-xl border border-[#262A34] bg-[#0E0F12]/80 px-2.5 py-1.5 text-xs text-zinc-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getTmdbImageUrl(p.logo_path, "w185")!}
                            alt={p.provider_name}
                            className="h-5 w-5 rounded"
                          />
                          <span>{p.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review, Favorite & Rewatch */}
          {savedShow && (
            <MediaReviewCard
              rating={savedShow.rating}
              reaction={savedShow.reaction}
              notes={savedShow.notes}
              isFavorite={savedShow.is_favorite}
              rewatchCount={savedShow.rewatch_count || 0}
              isShow
              saving={updateShowMeta.isPending}
              onSave={(patch) =>
                updateShowMeta.mutate({
                  tmdbId,
                  patch: {
                    ...patch,
                    genres: (show.genres || []).map((g) => g.name),
                  },
                })
              }
              onRewatch={(resetEpisodes) =>
                updateShowMeta.mutate({
                  tmdbId,
                  patch: {
                    rewatch_count: (savedShow.rewatch_count || 0) + 1,
                    status: "watching",
                    genres: (show.genres || []).map((g) => g.name),
                  },
                  resetEpisodes: Boolean(resetEpisodes),
                })
              }
            />
          )}

          {/* Cast */}
          <CastSection cast={show.credits?.cast} />

          {/* Seasons */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Temporadas e Episódios</h2>
            <div className="space-y-3">
              {regularSeasons.map((season, index) => (
                <SeasonAccordion
                  key={season.id}
                  tmdbShowId={tmdbId}
                  seasonNumber={season.season_number}
                  seasonName={season.name}
                  episodeCount={season.episode_count}
                  isInLibrary={Boolean(savedShow)}
                  watchedMap={watchedMap}
                  defaultOpen={index === 0}
                  onEnsureInLibrary={ensureInLibrary}
                />
              ))}
            </div>
          </section>

          <RecommendationsSection items={show.recommendations?.results} type="tv" />
        </div>
      )}
    </AppShell>
  );
}
