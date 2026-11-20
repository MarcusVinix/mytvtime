"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  Clock,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRemoveMovie, useUpsertMovie, useUserMovies } from "@/lib/queries/useLibrary";
import { formatDateBR } from "@/lib/dates";
import { getTmdbImageUrl } from "@/lib/tmdb";
import type { TmdbMovieDetail } from "@/types";

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tmdbId = Number(id);

  const { data: movie, isLoading, error } = useQuery<TmdbMovieDetail>({
    queryKey: ["tmdb", "movie", tmdbId],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/movie/${tmdbId}`);
      if (!res.ok) throw new Error("Não foi possível carregar o filme.");
      return res.json();
    },
  });

  const { data: userMovies = [] } = useUserMovies();
  const upsertMovie = useUpsertMovie();
  const removeMovie = useRemoveMovie();

  const savedMovie = useMemo(
    () => userMovies.find((m) => m.tmdb_id === tmdbId),
    [userMovies, tmdbId]
  );

  const providers = movie?.["watch/providers"]?.results?.BR?.flatrate || [];

  return (
    <AppShell>
      <Link
        href="/filmes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#F5C518]" />
          Carregando filme...
        </div>
      ) : error || !movie ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          Erro ao carregar filme. Verifique sua chave do TMDB no <code>.env.local</code>.
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-[#232630] bg-[#16181D]">
          {movie.backdrop_path && (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getTmdbImageUrl(movie.backdrop_path, "w1280")!}
                alt={movie.title}
                className="h-full w-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#16181D] via-[#16181D]/80 to-transparent" />
            </div>
          )}

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
            <div className="h-60 w-40 shrink-0 self-center overflow-hidden rounded-2xl border border-white/10 bg-[#1E2128] shadow-xl sm:self-start">
              {movie.poster_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getTmdbImageUrl(movie.poster_path, "w342")!}
                  alt={movie.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{movie.title}</h1>
                  {movie.vote_average > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5C518]/15 px-2.5 py-1 text-xs font-bold text-[#F5C518]">
                      <Star className="h-3.5 w-3.5 fill-[#F5C518]" />
                      {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateBR(movie.release_date)}
                  </span>
                  {movie.runtime && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {movie.runtime} min
                    </span>
                  )}
                  <span>{movie.genres.map((g) => g.name).join(", ")}</span>
                </div>
              </div>

              {movie.overview && (
                <p className="text-sm leading-relaxed text-zinc-300">{movie.overview}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={upsertMovie.isPending}
                  onClick={() => upsertMovie.mutate({ movie, status: "watched" })}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                    savedMovie?.status === "watched"
                      ? "bg-emerald-500 text-[#0E0F12]"
                      : "bg-[#F5C518] text-[#0E0F12] hover:bg-[#FFD338]"
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                  {savedMovie?.status === "watched" ? "Assistido" : "Marcar como assistido"}
                </button>

                <button
                  type="button"
                  disabled={upsertMovie.isPending}
                  onClick={() => upsertMovie.mutate({ movie, status: "watchlist" })}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    savedMovie?.status === "watchlist"
                      ? "border-[#F5C518] bg-[#F5C518]/15 text-[#F5C518]"
                      : "border-[#2E3340] bg-[#0E0F12] text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  Quero assistir
                </button>

                {savedMovie && (
                  <button
                    type="button"
                    onClick={() => removeMovie.mutate(tmdbId)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                )}
              </div>

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
      )}
    </AppShell>
  );
}
