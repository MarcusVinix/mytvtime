import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";
import { tmdbFetch } from "@/lib/tmdb";
import type { TmdbShowDetail } from "@/types";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@mytvtime.app";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      {
        skipped: true,
        reason:
          "Configure SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY na Vercel para habilitar Push em segundo plano.",
      },
      { status: 200 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Today's date in São Paulo timezone (YYYY-MM-DD)
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const { data: subscriptions, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("*");
  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, todayIso });
  }

  const userIds = [...new Set(subscriptions.map((s) => s.user_id as string))];
  const { data: userShows } = await supabase
    .from("user_shows")
    .select("user_id, tmdb_id, title, status")
    .in("user_id", userIds)
    .in("status", ["watching", "plan_to_watch"]);

  const { data: userMovies } = await supabase
    .from("user_movies")
    .select("user_id, tmdb_id, title, release_date, status")
    .in("user_id", userIds)
    .eq("status", "watchlist")
    .eq("release_date", todayIso);

  // Cache TMDB show checks across users
  const uniqueShowIds = [...new Set((userShows || []).map((s) => s.tmdb_id as number))];
  const airingTodayByShow = new Map<
    number,
    { title: string; epCode: string; epName: string }
  >();

  await Promise.all(
    uniqueShowIds.map(async (tmdbId) => {
      try {
        const detail = await tmdbFetch<TmdbShowDetail>(`/tv/${tmdbId}`, {}, 1800);
        const candidates = [detail.next_episode_to_air, detail.last_episode_to_air];
        const match = candidates.find((ep) => ep?.air_date === todayIso);
        if (match) {
          const epCode = `T${String(match.season_number).padStart(2, "0")}E${String(
            match.episode_number
          ).padStart(2, "0")}`;
          airingTodayByShow.set(tmdbId, {
            title: detail.name,
            epCode,
            epName: match.name,
          });
        }
      } catch {
        // Ignore single show errors
      }
    })
  );

  let sent = 0;

  for (const sub of subscriptions) {
    const notifications: { title: string; body: string; url: string }[] = [];

    const myShows = (userShows || []).filter((s) => s.user_id === sub.user_id);
    for (const s of myShows) {
      const airing = airingTodayByShow.get(s.tmdb_id);
      if (airing) {
        notifications.push({
          title: `Novo episódio hoje: ${airing.title}`,
          body: `${airing.epCode} · ${airing.epName}`,
          url: `/series/${s.tmdb_id}`,
        });
      }
    }

    const myMovies = (userMovies || []).filter((m) => m.user_id === sub.user_id);
    for (const m of myMovies) {
      notifications.push({
        title: `Estreia hoje: ${m.title}`,
        body: "Um filme da sua lista estreia hoje!",
        url: `/filmes/${m.tmdb_id}`,
      });
    }

    for (const payload of notifications) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, todayIso, sent });
}
