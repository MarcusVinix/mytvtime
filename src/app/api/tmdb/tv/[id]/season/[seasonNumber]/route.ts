import { NextRequest, NextResponse } from "next/server";
import { tmdbFetch } from "@/lib/tmdb";
import { SERVER_CACHE } from "@/lib/cache";
import type { TmdbSeasonDetail } from "@/types";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; seasonNumber: string }> }
) {
  const { id, seasonNumber } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(seasonNumber)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    const data = await tmdbFetch<TmdbSeasonDetail>(
      `/tv/${id}/season/${seasonNumber}`,
      {},
      SERVER_CACHE.tmdbDetailsSeconds
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar temporada";
    const status = message === "TMDB_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
