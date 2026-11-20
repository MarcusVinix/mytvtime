"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Clock,
  Download,
  Film,
  History,
  KeyRound,
  Loader2,
  LogOut,
  Tv,
  Upload,
  User,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import {
  LIBRARY_KEYS,
  useCurrentUser,
  useUserMovies,
  useUserShows,
  useWatchedEpisodes,
} from "@/lib/queries/useLibrary";
import { formatEpisodeCode, formatWatchTime } from "@/lib/dates";
import type { UserMovie, UserShow, WatchedEpisode } from "@/types";

const NOTIF_ENABLED_KEY = "mytvtime_notif_enabled";

export default function PerfilPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useCurrentUser();
  const { data: shows = [] } = useUserShows();
  const { data: episodes = [] } = useWatchedEpisodes();
  const { data: movies = [] } = useUserMovies();

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Import state
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Notifications state
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifEnabled(localStorage.getItem(NOTIF_ENABLED_KEY) === "true");
    }
  }, []);

  const showTitleMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of shows) map.set(s.tmdb_id, s.title);
    return map;
  }, [shows]);

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

  // Last 6 months activity chart
  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; episodes: number; movies: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(d)
        .replace(".", "");
      buckets.push({ key, label, episodes: 0, movies: 0 });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    for (const ep of episodes) {
      const key = (ep.watched_at || "").slice(0, 7);
      const b = bucketMap.get(key);
      if (b) b.episodes++;
    }
    for (const m of movies) {
      if (m.status !== "watched" || !m.watched_at) continue;
      const key = m.watched_at.slice(0, 7);
      const b = bucketMap.get(key);
      if (b) b.movies++;
    }
    return buckets;
  }, [episodes, movies]);

  const maxMonthly = useMemo(
    () => Math.max(1, ...monthlyActivity.map((m) => m.episodes + m.movies)),
    [monthlyActivity]
  );

  // Recent watch history (last 8 items combined)
  const recentHistory = useMemo(() => {
    const items: {
      id: string;
      href: string;
      title: string;
      subtitle: string;
      type: "tv" | "movie";
      at: string;
    }[] = [];

    for (const ep of episodes.slice(0, 12)) {
      items.push({
        id: `ep-${ep.id}`,
        href: `/series/${ep.tmdb_show_id}`,
        title: showTitleMap.get(ep.tmdb_show_id) || `Série #${ep.tmdb_show_id}`,
        subtitle: formatEpisodeCode(ep.season_number, ep.episode_number),
        type: "tv",
        at: ep.watched_at,
      });
    }
    for (const m of movies) {
      if (m.status !== "watched" || !m.watched_at) continue;
      items.push({
        id: `mv-${m.id}`,
        href: `/filmes/${m.tmdb_id}`,
        title: m.title,
        subtitle: "Filme assistido",
        type: "movie",
        at: m.watched_at,
      });
    }

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [episodes, movies, showTitleMap]);

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

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    setImportFeedback(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        shows?: Partial<UserShow>[];
        watchedEpisodes?: Partial<WatchedEpisode>[];
        movies?: Partial<UserMovie>[];
      };

      let showsCount = 0;
      let epsCount = 0;
      let moviesCount = 0;

      if (Array.isArray(parsed.shows) && parsed.shows.length > 0) {
        const rows = parsed.shows
          .filter((s) => s.tmdb_id && s.title)
          .map((s) => ({
            user_id: user.id,
            tmdb_id: s.tmdb_id!,
            title: s.title!,
            poster_path: s.poster_path ?? null,
            backdrop_path: s.backdrop_path ?? null,
            status: s.status || "watching",
            total_episodes: s.total_episodes || 0,
            number_of_seasons: s.number_of_seasons || 1,
            first_air_date: s.first_air_date ?? null,
            next_episode_date: s.next_episode_date ?? null,
            updated_at: s.updated_at || new Date().toISOString(),
          }));
        if (rows.length > 0) {
          const { error } = await supabase
            .from("user_shows")
            .upsert(rows, { onConflict: "user_id,tmdb_id" });
          if (error) throw error;
          showsCount = rows.length;
        }
      }

      if (Array.isArray(parsed.watchedEpisodes) && parsed.watchedEpisodes.length > 0) {
        const rows = parsed.watchedEpisodes
          .filter((ep) => ep.tmdb_show_id && ep.season_number != null && ep.episode_number != null)
          .map((ep) => ({
            user_id: user.id,
            tmdb_show_id: ep.tmdb_show_id!,
            season_number: ep.season_number!,
            episode_number: ep.episode_number!,
            runtime_minutes: ep.runtime_minutes || 45,
            rating: ep.rating ?? null,
            watched_at: ep.watched_at || new Date().toISOString(),
          }));
        if (rows.length > 0) {
          const { error } = await supabase
            .from("watched_episodes")
            .upsert(rows, { onConflict: "user_id,tmdb_show_id,season_number,episode_number" });
          if (error) throw error;
          epsCount = rows.length;
        }
      }

      if (Array.isArray(parsed.movies) && parsed.movies.length > 0) {
        const rows = parsed.movies
          .filter((m) => m.tmdb_id && m.title)
          .map((m) => ({
            user_id: user.id,
            tmdb_id: m.tmdb_id!,
            title: m.title!,
            poster_path: m.poster_path ?? null,
            backdrop_path: m.backdrop_path ?? null,
            release_date: m.release_date ?? null,
            status: m.status || "watchlist",
            runtime_minutes: m.runtime_minutes || 110,
            rating: m.rating ?? null,
            watched_at: m.watched_at ?? null,
            updated_at: m.updated_at || new Date().toISOString(),
          }));
        if (rows.length > 0) {
          const { error } = await supabase
            .from("user_movies")
            .upsert(rows, { onConflict: "user_id,tmdb_id" });
          if (error) throw error;
          moviesCount = rows.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.shows });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.episodes });
      queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.movies });
      setImportFeedback(
        `Backup importado: ${showsCount} série(s), ${epsCount} episódio(s) e ${moviesCount} filme(s).`
      );
    } catch (err) {
      setImportFeedback(
        err instanceof Error ? `Erro ao importar: ${err.message}` : "Arquivo JSON inválido."
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleToggleNotifications() {
    setNotifStatus(null);
    if (notifEnabled) {
      localStorage.setItem(NOTIF_ENABLED_KEY, "false");
      setNotifEnabled(false);
      setNotifStatus("Alertas desativados neste dispositivo.");
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifStatus(
        "Este navegador não suporta notificações nativas, mas você continua vendo os alertas no sino do topo."
      );
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(NOTIF_ENABLED_KEY, "true");
      setNotifEnabled(true);
      setNotifStatus("Alertas ativados! Você será avisado quando houver estreias no dia.");
      try {
        new Notification("MyTVTime — Alertas ativados", {
          body: "Avisaremos quando um novo episódio ou filme da sua lista estrear!",
          icon: "/icon-192.png",
        });
      } catch {
        // Ignore if OS blocks direct constructor
      }
    } else {
      setNotifStatus("Permissão negada no navegador. Libere nas configurações do site para ativar.");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdFeedback(null);

    if (newPassword.length < 6) {
      setPwdFeedback({ type: "err", text: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdFeedback({ type: "err", text: "As senhas não coincidem." });
      return;
    }

    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPwdFeedback({ type: "ok", text: "Senha alterada com sucesso!" });
    } catch (err) {
      setPwdFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Erro ao alterar senha.",
      });
    } finally {
      setPwdLoading(false);
    }
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
            Exportar JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <button
            type="button"
            disabled={importing || !user}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2E3A] bg-[#16181D] px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-[#F5C518] hover:text-[#F5C518] disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importar JSON
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

      {importFeedback && (
        <div className="mb-6 rounded-2xl border border-[#F5C518]/40 bg-[#1A1812] px-4 py-3 text-sm text-[#F5C518]">
          {importFeedback}
        </div>
      )}

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

      {/* Monthly Chart + Recent History */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#232630] bg-[#16181D] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#F5C518]" />
              <h2 className="text-base font-bold text-white">Atividade nos últimos 6 meses</h2>
            </div>
            <span className="text-xs text-zinc-500">Episódios + Filmes</span>
          </div>

          <div className="flex h-44 items-end gap-3 pt-4">
            {monthlyActivity.map((m) => {
              const total = m.episodes + m.movies;
              const pct = Math.max(6, Math.round((total / maxMonthly) * 100));
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-bold text-zinc-300">{total}</span>
                  <div className="flex h-28 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-[#F5C518]/70 to-[#F5C518] transition-all"
                      style={{ height: total === 0 ? "6px" : `${pct}%` }}
                      title={`${m.episodes} episódios, ${m.movies} filmes`}
                    />
                  </div>
                  <span className="text-xs capitalize text-zinc-400">{m.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-[#232630] bg-[#16181D] p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-[#F5C518]" />
            <h2 className="text-base font-bold text-white">Histórico Recente</h2>
          </div>

          {recentHistory.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              Marque episódios ou filmes para ver seu histórico recente aqui.
            </p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#232630] bg-[#0E0F12] px-3.5 py-2.5 hover:border-[#F5C518]/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-[#F5C518]">{item.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(item.at))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Notifications + Password Change */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#232630] bg-[#16181D] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#F5C518]" />
                <h2 className="text-base font-bold text-white">Alertas de Lançamento</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Receba uma notificação no navegador/celular quando um episódio novo ou filme da sua
                lista estrear no dia.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                notifEnabled
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-[#F5C518] text-[#0E0F12] hover:bg-[#FFD338]"
              }`}
            >
              {notifEnabled ? "Ativado" : "Ativar alertas"}
            </button>
          </div>

          {notifStatus && <p className="mt-3 text-xs text-zinc-300">{notifStatus}</p>}
        </section>

        {user && (
          <section className="rounded-3xl border border-[#232630] bg-[#16181D] p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#F5C518]" />
              <h2 className="text-base font-bold text-white">Trocar Senha</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mín. 6)"
                  className="rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                  className="rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
                />
              </div>

              {pwdFeedback && (
                <p
                  className={`text-xs ${
                    pwdFeedback.type === "ok" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {pwdFeedback.text}
                </p>
              )}

              <button
                type="submit"
                disabled={pwdLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2 text-xs font-bold text-[#0E0F12] hover:bg-[#FFD338] disabled:opacity-60"
              >
                {pwdLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Atualizar senha
              </button>
            </form>
          </section>
        )}
      </div>
    </AppShell>
  );
}
