import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import { SERVER_CACHE } from "@/lib/cache";
import type { TmdbMediaItem } from "@/types";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "movie" ? "movie" : "tv";
  const provider = sp.get("provider") || "";
  const genre = sp.get("genre") || "";
  const origin = sp.get("origin") || ""; // dorama | ko | ja | zh
  const sort = sp.get("sort") || "popularity.desc";

  try {
    const todayIso = new Date().toISOString().slice(0, 10);
    const dateField = type === "tv" ? "first_air_date" : "primary_release_date";

    let tmdbSort = sort;
    if (sort === "release_date.desc") {
      tmdbSort = `${dateField}.desc`;
    } else if (sort === "release_date.asc") {
      tmdbSort = `${dateField}.asc`;
    }

    const params: Record<string, string> = {
      sort_by: tmdbSort,
      watch_region: "BR",
      include_adult: "false",
    };

    if (provider) {
      params.with_watch_providers = provider;
    }
    if (genre) {
      params.with_genres = genre;
    }
    if (origin === "dorama") {
      params.with_original_language = "ko|ja|zh";
      // Exclude animation unless user explicitly picked Animation genre (16)
      if (genre !== "16") {
        params.without_genres = "16";
      }
    } else if (origin === "ko" || origin === "ja" || origin === "zh") {
      params.with_original_language = origin;
      if (genre !== "16") {
        params.without_genres = "16";
      }
    }

    if (sort === "vote_average.desc") {
      params["vote_count.gte"] = origin ? "50" : "200";
    } else if (sort === "release_date.desc") {
      // Evita retornar títulos futuros sem pôster (ex.: 2029) no topo de "Mais recentes"
      params[`${dateField}.lte`] = todayIso;
      params["vote_count.gte"] = origin ? "1" : "5";
    } else if (sort === "release_date.asc") {
      // Evita registros sem data ou obscuros sem votos no topo de "Mais antigos"
      params[`${dateField}.gte`] = "1950-01-01";
      params["vote_count.gte"] = origin ? "1" : "10";
    }

    const data = await tmdbFetch<{ results: TmdbMediaItem[] }>(
      `/discover/${type}`,
      params,
      SERVER_CACHE.tmdbDetailsSeconds
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
