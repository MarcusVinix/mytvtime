import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import type { TmdbMediaItem } from "@/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await tmdbFetch<{ results: TmdbMediaItem[] }>(
      "/search/multi",
      { query, include_adult: "false" },
      300
    );
    const filtered = (data.results || []).filter(
      (item) => item.media_type === "tv" || item.media_type === "movie"
    );
    return NextResponse.json({ results: filtered });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar no TMDB";
    const status = message === "TMDB_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
