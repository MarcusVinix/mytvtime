"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Clock, Download, Film, LogOut, Tv, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  useCurrentUser,
  useUserMovies,
  useUserShows,
  useWatchedEpisodes,
} from "@/lib/queries/useLibrary";
import { formatWatchTime } from "@/lib/dates";

export default function PerfilPage() {
  const router = useRouter();
  const supabase = createClient();

  const { data: user } = useCurrentUser();
  const { data: shows = [] } = useUserShows();
  const { data: episodes = [] } = useWatchedEpisodes();
  const { data: movies = [] } = useUserMovies();

  const stats = useMemo(() => {
    const tvMinutes = episodes.reduce((acc, ep) => acc + (ep.runtime_minutes || 45), 0);
    const watchedMovies = movies.filter((m) => m.status === "watched");
    const movieMinutes = watchedMovies.reduce((acc, m) => acc + (m.runtime_minutes || 110), 0);

    return {
      showsCount: shows.length,
      episodesCount: episodes.length,
      moviesWatchedCount: watchedMovies.length,
      moviesWatchlistCount: movies.filter((m) => m.status === "watchlist").length,
      tvTime: formatWatchTime(tvMinutes),
      movieTime: formatWatchTime(movieMinutes),
      totalTime: formatWatchTime(tvMinutes + movieMinutes),
    };
  }, [shows, episodes, movies]);

  function handleExportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "MyTVTime",
      shows,
      watchedEpisodes: episodes,
      movies,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mytvtime-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5C518]/15 text-[#F5C518]">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Meu Perfil</h1>
            <p className="text-sm text-zinc-400">{user?.email || "Conta local / não autenticado"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2E3A] bg-[#16181D] px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-[#F5C518] hover:text-[#F5C518]"
          >
            <Download className="h-4 w-4" />
            Exportar Backup (JSON)
          </button>

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[#F5C518]/30 bg-gradient-to-br from-[#1C1A12] to-[#16181D] p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F5C518]">
            <Clock className="h-4 w-4" />
            Tempo Total Assistido
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">{stats.totalTime.label}</p>
          <p className="mt-1 text-xs text-zinc-400">Somando todas as séries e filmes</p>
        </div>

        <div className="rounded-3xl border border-[#232630] bg-[#16181D] p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Tv className="h-4 w-4 text-[#F5C518]" />
            Séries & Episódios
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">
            {stats.episodesCount}{" "}
            <span className="text-sm font-medium text-zinc-400">episódios</span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {stats.showsCount} séries · {stats.tvTime.label}
          </p>
        </div>

        <div className="rounded-3xl border border-[#232630] bg-[#16181D] p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Film className="h-4 w-4 text-[#F5C518]" />
            Filmes
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white">
            {stats.moviesWatchedCount}{" "}
            <span className="text-sm font-medium text-zinc-400">assistidos</span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {stats.moviesWatchlistCount} na lista · {stats.movieTime.label}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
