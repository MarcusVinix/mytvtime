import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import type { TmdbMediaItem } from "@/types";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "movie" ? "movie" : "tv";
  const provider = sp.get("provider") || "";
  const genre = sp.get("genre") || "";
  const sort = sp.get("sort") || "popularity.desc";

  try {
    const params: Record<string, string> = {
      sort_by: sort,
      watch_region: "BR",
      include_adult: "false",
    };

    if (provider) {
      params.with_watch_providers = provider;
    }
    if (genre) {
      params.with_genres = genre;
    }
    if (sort === "vote_average.desc") {
      params["vote_count.gte"] = "200";
    }

    const data = await tmdbFetch<{ results: TmdbMediaItem[] }>(
      `/discover/${type}`,
      params,
      1800
    );

    const results = (data.results || []).map((item) => ({
      ...item,
      media_type: type as "tv" | "movie",
    }));

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao filtrar catálogo";
    const status = message === "TMDB_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
