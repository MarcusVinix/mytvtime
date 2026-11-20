"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Film,
  Loader2,
  Tv,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useUserMovies, useUserShows } from "@/lib/queries/useLibrary";
import { formatDateBR, formatEpisodeCode } from "@/lib/dates";
import { getTmdbImageUrl } from "@/lib/tmdb";
import type { TmdbSeasonDetail, TmdbShowDetail } from "@/types";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  mediaType: "tv" | "movie";
  tmdbId: number;
  title: string;
  subtitle: string;
  posterPath: string | null;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarioPage() {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [cursorDate, setCursorDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [selectedIso, setSelectedIso] = useState<string>(todayIso);

  const { data: shows = [], isLoading: showsLoading } = useUserShows();
  const { data: movies = [], isLoading: moviesLoading } = useUserMovies();

  const activeShows = useMemo(
    () => shows.filter((s) => s.status !== "stopped"),
    [shows]
  );

  // Fetch show details to know the latest season & next_episode_to_air
  const showDetailQueries = useQueries({
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

  // Fetch the latest regular season of each active show so all episodes of the month appear
  const latestSeasonTargets = useMemo(() => {
    return activeShows
      .map((show, idx) => {
        const detail = showDetailQueries[idx]?.data;
        if (!detail) return null;
        const regular = (detail.seasons || []).filter((s) => s.season_number > 0);
        if (regular.length === 0) return null;
        const latest = regular[regular.length - 1];
        return { show, seasonNumber: latest.season_number };
      })
      .filter(Boolean) as { show: (typeof activeShows)[number]; seasonNumber: number }[];
  }, [activeShows, showDetailQueries]);

  const seasonQueries = useQueries({
    queries: latestSeasonTargets.map((t) => ({
      queryKey: ["tmdb", "tv", t.show.tmdb_id, "season", t.seasonNumber],
      queryFn: async () => {
        const res = await fetch(`/api/tmdb/tv/${t.show.tmdb_id}/season/${t.seasonNumber}`);
        if (!res.ok) throw new Error("Erro ao carregar temporada");
        return res.json() as Promise<TmdbSeasonDetail>;
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Build unified event map keyed by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const seen = new Set<string>();

    const pushEvent = (ev: CalendarEvent) => {
      if (seen.has(ev.id)) return;
      seen.add(ev.id);
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    };

    // Episodes from latest season of each show
    latestSeasonTargets.forEach((target, idx) => {
      const season = seasonQueries[idx]?.data;
      if (!season?.episodes) return;
      for (const ep of season.episodes) {
        if (!ep.air_date) continue;
        pushEvent({
          id: `tv-${target.show.tmdb_id}-${ep.season_number}-${ep.episode_number}`,
          date: ep.air_date,
          mediaType: "tv",
          tmdbId: target.show.tmdb_id,
          title: target.show.title,
          subtitle: `${formatEpisodeCode(ep.season_number, ep.episode_number)} · ${ep.name}`,
          posterPath: target.show.poster_path,
        });
      }
    });

    // Also include next_episode_to_air in case it belongs to a new season not yet returned
    activeShows.forEach((show, idx) => {
      const next = showDetailQueries[idx]?.data?.next_episode_to_air;
      if (!next?.air_date) return;
      pushEvent({
        id: `tv-${show.tmdb_id}-${next.season_number}-${next.episode_number}`,
        date: next.air_date,
        mediaType: "tv",
        tmdbId: show.tmdb_id,
        title: show.title,
        subtitle: `${formatEpisodeCode(next.season_number, next.episode_number)} · ${next.name}`,
        posterPath: show.poster_path,
      });
    });

    // Movies with release_date
    for (const movie of movies) {
      if (!movie.release_date) continue;
      pushEvent({
        id: `movie-${movie.tmdb_id}`,
        date: movie.release_date,
        mediaType: "movie",
        tmdbId: movie.tmdb_id,
        title: movie.title,
        subtitle: movie.status === "watched" ? "Filme (Assistido)" : "Estreia de Filme",
        posterPath: movie.poster_path,
      });
    }

    return map;
  }, [latestSeasonTargets, seasonQueries, activeShows, showDetailQueries, movies]);

  // Month grid cells
  const monthDays = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date; iso: string; inMonth: boolean }[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, iso: toIsoDate(d), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ date: d, iso: toIsoDate(d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - (startWeekday + daysInMonth) + 1;
      const d = new Date(year, month + 1, nextIdx);
      cells.push({ date: d, iso: toIsoDate(d), inMonth: false });
    }
    return cells;
  }, [cursorDate]);

  // Week days (Sun..Sat containing cursorDate)
  const weekDays = useMemo(() => {
    const start = new Date(cursorDate);
    start.setDate(cursorDate.getDate() - cursorDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, iso: toIsoDate(d) };
    });
  }, [cursorDate]);

  function navigatePeriod(delta: number) {
    setCursorDate((prev) => {
      if (viewMode === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      }
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  }

  function goToToday() {
    const now = new Date();
    setCursorDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    setSelectedIso(toIsoDate(now));
  }

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(cursorDate);
    }
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
    return `${fmt.format(first)} – ${fmt.format(last)}`;
  }, [viewMode, cursorDate, weekDays]);

  const selectedEvents = eventsByDate.get(selectedIso) || [];
  const isLoading = showsLoading || moviesLoading;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Calendário de Lançamentos
          </h1>
          <p className="text-sm text-zinc-400">
            Episódios das suas séries e estreias dos seus filmes em um só lugar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#232630] bg-[#16181D] p-1">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                viewMode === "month"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                viewMode === "week"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Semanal
            </button>
          </div>
        </div>
      </div>

      {/* Period Navigation */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#232630] bg-[#16181D] px-4 py-3">
        <button
          type="button"
          onClick={() => navigatePeriod(-1)}
          className="rounded-xl p-2 text-zinc-300 hover:bg-[#232630] hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold capitalize text-white">{periodLabel}</h2>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-[#2E3340] bg-[#0E0F12] px-2.5 py-1 text-xs font-semibold text-[#F5C518] hover:border-[#F5C518]"
          >
            Hoje
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigatePeriod(1)}
          className="rounded-xl p-2 text-zinc-300 hover:bg-[#232630] hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
          Montando calendário...
        </div>
      ) : viewMode === "month" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Month Grid */}
          <div className="rounded-3xl border border-[#232630] bg-[#16181D] p-4 lg:col-span-2">
            <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-zinc-500">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1.5">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((cell) => {
                const dayEvents = eventsByDate.get(cell.iso) || [];
                const isToday = cell.iso === todayIso;
                const isSelected = cell.iso === selectedIso;

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedIso(cell.iso)}
                    className={`flex min-h-[68px] flex-col items-start justify-between rounded-xl border p-2 text-left transition-colors sm:min-h-[82px] ${
                      isSelected
                        ? "border-[#F5C518] bg-[#F5C518]/15"
                        : isToday
                        ? "border-[#F5C518]/40 bg-[#1E201A]"
                        : "border-[#22252F] bg-[#0E0F12]/60 hover:border-zinc-700"
                    } ${!cell.inMonth ? "opacity-35" : ""}`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        isToday || isSelected ? "text-[#F5C518]" : "text-zinc-300"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayEvents.length > 0 && (
                      <div className="flex w-full flex-wrap gap-1">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              ev.mediaType === "tv" ? "bg-[#F5C518]" : "bg-sky-400"
                            }`}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] font-bold text-[#F5C518]">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#F5C518]" />
                Episódio de série
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Estreia de filme
              </span>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="rounded-3xl border border-[#232630] bg-[#16181D] p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#F5C518]" />
              <h3 className="text-sm font-bold text-white">{formatDateBR(selectedIso)}</h3>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Nenhum lançamento agendado para este dia.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={ev.mediaType === "tv" ? `/series/${ev.tmdbId}` : `/filmes/${ev.tmdbId}`}
                    className="flex items-center gap-3 rounded-2xl border border-[#262A34] bg-[#0E0F12] p-3 transition-colors hover:border-[#F5C518]/60"
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-[#1E2128]">
                      {ev.posterPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getTmdbImageUrl(ev.posterPath, "w185")!}
                          alt={ev.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-600">
                          {ev.mediaType === "tv" ? (
                            <Tv className="h-4 w-4" />
                          ) : (
                            <Film className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          ev.mediaType === "tv"
                            ? "bg-[#F5C518]/15 text-[#F5C518]"
                            : "bg-sky-500/15 text-sky-300"
                        }`}
                      >
                        {ev.mediaType === "tv" ? "Série" : "Filme"}
                      </span>
                      <p className="mt-1 truncate text-sm font-bold text-white">{ev.title}</p>
                      <p className="truncate text-xs text-zinc-400">{ev.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Weekly View */
        <div className="space-y-3">
          {weekDays.map(({ date, iso }) => {
            const dayEvents = eventsByDate.get(iso) || [];
            const isToday = iso === todayIso;
            return (
              <div
                key={iso}
                className={`rounded-2xl border p-4 ${
                  isToday
                    ? "border-[#F5C518]/50 bg-[#1A1812]"
                    : "border-[#232630] bg-[#16181D]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {WEEKDAYS[date.getDay()]} · {formatDateBR(iso)}
                    </span>
                    {isToday && (
                      <span className="rounded-md bg-[#F5C518] px-2 py-0.5 text-[10px] font-extrabold text-[#0E0F12]">
                        HOJE
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{dayEvents.length} lançamento(s)</span>
                </div>

                {dayEvents.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sem lançamentos neste dia.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {dayEvents.map((ev) => (
                      <Link
                        key={ev.id}
                        href={
                          ev.mediaType === "tv" ? `/series/${ev.tmdbId}` : `/filmes/${ev.tmdbId}`
                        }
                        className="flex items-center gap-3 rounded-xl border border-[#262A34] bg-[#0E0F12] p-3 transition-colors hover:border-[#F5C518]/60"
                      >
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-[#1E2128]">
                          {ev.posterPath && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getTmdbImageUrl(ev.posterPath, "w185")!}
                              alt={ev.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{ev.title}</p>
                          <p className="truncate text-xs text-[#F5C518]">{ev.subtitle}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
