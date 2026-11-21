import { NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import { SERVER_CACHE } from "@/lib/cache";
import type { TmdbMediaItem } from "@/types";

export async function GET() {
  try {
    const [trendingTv, trendingMovies, popularTv] = await Promise.all([
      tmdbFetch<{ results: TmdbMediaItem[] }>(
        "/trending/tv/week",
        {},
        SERVER_CACHE.tmdbTrendingSeconds
      ),
      tmdbFetch<{ results: TmdbMediaItem[] }>(
        "/trending/movie/week",
        {},
        SERVER_CACHE.tmdbTrendingSeconds
      ),
      tmdbFetch<{ results: TmdbMediaItem[] }>(
        "/tv/popular",
        {},
        SERVER_CACHE.tmdbTrendingSeconds
      ),
    ]);

    return NextResponse.json({
      trendingTv: (trendingTv.results || []).map((i) => ({ ...i, media_type: "tv" as const })),
      trendingMovies: (trendingMovies.results || []).map((i) => ({
        ...i,
        media_type: "movie" as const,
      })),
      popularTv: (popularTv.results || []).map((i) => ({ ...i, media_type: "tv" as const })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar catálogo";
    const status = message === "TMDB_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
