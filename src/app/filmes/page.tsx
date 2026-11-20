"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Check, Compass, Film, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useToggleMovieStatus, useUserMovies } from "@/lib/queries/useLibrary";
import { formatCountdownLabel, formatDateBR, getDaysUntil } from "@/lib/dates";
import { getTmdbImageUrl } from "@/lib/tmdb";

type MovieTab = "watchlist" | "upcoming" | "watched";

export default function FilmesPage() {
  const [tab, setTab] = useState<MovieTab>("watchlist");
  const { data: movies = [], isLoading } = useUserMovies();
  const toggleMovie = useToggleMovieStatus();

  const watchlist = useMemo(() => movies.filter((m) => m.status === "watchlist"), [movies]);
  const watched = useMemo(() => movies.filter((m) => m.status === "watched"), [movies]);
  const upcoming = useMemo(() => {
    return watchlist
      .filter((m) => {
        const d = getDaysUntil(m.release_date);
        return d !== null && d >= 0;
      })
      .sort((a, b) => (getDaysUntil(a.release_date) ?? 9999) - (getDaysUntil(b.release_date) ?? 9999));
  }, [watchlist]);

  const activeList = tab === "watchlist" ? watchlist : tab === "upcoming" ? upcoming : watched;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Meus Filmes</h1>
          <p className="text-sm text-zinc-400">
            Organize os filmes que quer ver, estreias e seu histórico
          </p>
        </div>

        <Link
          href="/explorar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-sm font-bold text-[#0E0F12] transition-colors hover:bg-[#FFD338]"
        >
          <Compass className="h-4 w-4" />
          Adicionar filme
        </Link>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "watchlist" as const, label: "Quero assistir", count: watchlist.length },
          { id: "upcoming" as const, label: "Em breve", count: upcoming.length },
          { id: "watched" as const, label: "Assistidos", count: watched.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-[#F5C518] text-[#0E0F12]"
                : "border border-[#232630] bg-[#16181D] text-zinc-300 hover:text-white"
            }`}
          >
            {t.label}
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                tab === t.id ? "bg-black/15 text-[#0E0F12]" : "bg-[#232630] text-zinc-400"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
          Carregando seus filmes...
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-3xl border border-[#232630] bg-[#16181D] px-6 py-16 text-center">
          <Film className="mx-auto mb-4 h-11 w-11 text-zinc-500" />
          <h2 className="text-base font-bold text-white">Nenhum filme nesta lista</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Explore o catálogo para adicionar filmes à sua lista ou marcar os que você já assistiu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {activeList.map((movie) => {
            const isWatched = movie.status === "watched";
            return (
              <div
                key={movie.tmdb_id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#232630] bg-[#16181D]"
              >
                <Link
                  href={`/filmes/${movie.tmdb_id}`}
                  className="relative aspect-[2/3] w-full overflow-hidden bg-[#1E2128]"
                >
                  {movie.poster_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getTmdbImageUrl(movie.poster_path, "w342")!}
                      alt={movie.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-600">
                      <Film className="h-8 w-8" />
                    </div>
                  )}
                  {tab === "upcoming" && movie.release_date && (
                    <span className="absolute left-2 top-2 rounded-lg bg-[#F5C518] px-2 py-0.5 text-[11px] font-bold text-[#0E0F12]">
                      {formatCountdownLabel(movie.release_date)}
                    </span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <Link
                      href={`/filmes/${movie.tmdb_id}`}
                      className="line-clamp-2 text-sm font-semibold text-white hover:text-[#F5C518]"
                    >
                      {movie.title}
                    </Link>
                    {movie.release_date && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <Calendar className="h-3 w-3" />
                        {formatDateBR(movie.release_date)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleMovie.mutate({
                        tmdbId: movie.tmdb_id,
                        status: isWatched ? "watchlist" : "watched",
                      })
                    }
                    className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${
                      isWatched
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-[#F5C518] text-[#0E0F12] hover:bg-[#FFD338]"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    {isWatched ? "Assistido" : "Marcar visto"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
