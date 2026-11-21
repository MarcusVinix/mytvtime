import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import { SERVER_CACHE } from "@/lib/cache";
import type { TmdbMediaItem } from "@/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const rawPage = Number(request.nextUrl.searchParams.get("page") || "1");
  const page = Number.isFinite(rawPage) ? Math.min(500, Math.max(1, Math.floor(rawPage))) : 1;

  if (!query) {
    return NextResponse.json({ results: [], page: 1, totalPages: 1, totalResults: 0 });
  }

  try {
    const data = await tmdbFetch<{
      page: number;
      total_pages: number;
      total_results: number;
      results: TmdbMediaItem[];
    }>(
      "/search/multi",
      { query, include_adult: "false", page },
      SERVER_CACHE.tmdbSearchSeconds
    );
    const filtered = (data.results || []).filter(
      (item) => item.media_type === "tv" || item.media_type === "movie"
    );
    return NextResponse.json({
      results: filtered,
      page: data.page || page,
      totalPages: Math.min(500, data.total_pages || 1),
      totalResults: data.total_results || filtered.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar no TMDB";
    const status = message === "TMDB_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
