"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Bell, BellRing, Calendar, X } from "lucide-react";
import { useUserMovies, useUserShows } from "@/lib/queries/useLibrary";
import { formatCountdownLabel, formatEpisodeCode, getDaysUntil } from "@/lib/dates";
import { CLIENT_CACHE_MS } from "@/lib/cache";
import type { TmdbShowDetail } from "@/types";

interface ReleaseAlert {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  daysUntil: number;
  date: string;
}

const NOTIF_ENABLED_KEY = "mytvtime_notif_enabled";
const NOTIF_SENT_PREFIX = "mytvtime_notif_sent_";

export function ReleaseNotifications() {
  const [open, setOpen] = useState(false);
  const { data: shows = [] } = useUserShows();
  const { data: movies = [] } = useUserMovies();

  const activeShows = useMemo(
    () => shows.filter((s) => s.status === "watching" || s.status === "plan_to_watch"),
    [shows]
  );

  const detailQueries = useQueries({
    queries: activeShows.map((show) => ({
      queryKey: ["tmdb", "tv", show.tmdb_id],
      queryFn: async () => {
        const res = await fetch(`/api/tmdb/tv/${show.tmdb_id}`);
        if (!res.ok) throw new Error("Erro");
        return res.json() as Promise<TmdbShowDetail>;
      },
      staleTime: CLIENT_CACHE_MS.trending,
    })),
  });

  const alerts = useMemo<ReleaseAlert[]>(() => {
    const list: ReleaseAlert[] = [];

    activeShows.forEach((show, idx) => {
      const next = detailQueries[idx]?.data?.next_episode_to_air;
      if (!next?.air_date) return;
      const days = getDaysUntil(next.air_date);
      if (days !== null && days >= 0 && days <= 3) {
        list.push({
          id: `tv-${show.tmdb_id}-${next.season_number}-${next.episode_number}`,
          href: `/series/${show.tmdb_id}`,
          title: show.title,
          subtitle: `${formatEpisodeCode(next.season_number, next.episode_number)} · ${next.name}`,
          daysUntil: days,
          date: next.air_date,
        });
      }
    });

    for (const movie of movies) {
      if (movie.status !== "watchlist" || !movie.release_date) continue;
      const days = getDaysUntil(movie.release_date);
      if (days !== null && days >= 0 && days <= 3) {
        list.push({
          id: `movie-${movie.tmdb_id}`,
          href: `/filmes/${movie.tmdb_id}`,
          title: movie.title,
          subtitle: "Estreia de filme",
          daysUntil: days,
          date: movie.release_date,
        });
      }
    }

    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [activeShows, detailQueries, movies]);

  // Fire native browser/PWA notification once per day for releases happening today
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(NOTIF_ENABLED_KEY) !== "true") return;
    if (Notification.permission !== "granted") return;

    const todayAlerts = alerts.filter((a) => a.daysUntil === 0);
    if (todayAlerts.length === 0) return;

    const todayKey = `${NOTIF_SENT_PREFIX}${new Date().toISOString().slice(0, 10)}`;
    const sentIds = new Set<string>(
      JSON.parse(localStorage.getItem(todayKey) || "[]") as string[]
    );

    const unsent = todayAlerts.filter((a) => !sentIds.has(a.id));
    if (unsent.length === 0) return;

    for (const item of unsent) {
      try {
        new Notification(`Lançamento hoje: ${item.title}`, {
          body: item.subtitle,
          icon: "/icon-192.png",
        });
        sentIds.add(item.id);
      } catch {
        // Ignore on platforms restricting direct Notification constructor
      }
    }

    localStorage.setItem(todayKey, JSON.stringify([...sentIds]));
  }, [alerts]);

  const todayCount = alerts.filter((a) => a.daysUntil <= 1).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#262A34] bg-[#16181D] text-zinc-300 transition-colors hover:border-[#F5C518] hover:text-[#F5C518]"
        title="Alertas de lançamento"
      >
        {alerts.length > 0 ? <BellRing className="h-4 w-4 text-[#F5C518]" /> : <Bell className="h-4 w-4" />}
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F5C518] px-1 text-[10px] font-black text-[#0E0F12]">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[#2A2E3A] bg-[#16181D] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232630] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">Próximos Lançamentos</p>
                <p className="text-[11px] text-zinc-400">
                  {todayCount > 0
                    ? `${todayCount} lançamento(s) hoje/amanhã`
                    : "Próximos 3 dias"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  <Calendar className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                  Nenhum episódio ou filme agendado para os próximos 3 dias.
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <Link
                      key={alert.id}
                      href={alert.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#262A34] bg-[#0E0F12] p-3 hover:border-[#F5C518]/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{alert.title}</p>
                        <p className="truncate text-[11px] text-zinc-400">{alert.subtitle}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
                          alert.daysUntil === 0
                            ? "bg-[#F5C518] text-[#0E0F12]"
                            : "bg-[#232630] text-[#F5C518]"
                        }`}
                      >
                        {formatCountdownLabel(alert.date)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#232630] bg-[#121419] px-4 py-2.5 text-center">
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-[#F5C518] hover:underline"
              >
                Configurar notificações no Perfil
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
