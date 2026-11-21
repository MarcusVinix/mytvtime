function parseSeconds(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

/**
 * Tempos de cache no servidor (Next.js Data Cache / revalidate, em segundos).
 * Podem ser sobrescritos via .env / Vercel Environment Variables.
 */
export const SERVER_CACHE = {
  tmdbSearchSeconds: parseSeconds(process.env.CACHE_TMDB_SEARCH_SECONDS, 300), // 5 min
  tmdbDetailsSeconds: parseSeconds(process.env.CACHE_TMDB_DETAILS_SECONDS, 1800), // 30 min
  tmdbTrendingSeconds: parseSeconds(process.env.CACHE_TMDB_TRENDING_SECONDS, 3600), // 1 hora
};

/**
 * Tempos de cache no cliente (TanStack Query staleTime, em milissegundos).
 * Configuráveis via variáveis NEXT_PUBLIC_* em segundos.
 */
export const CLIENT_CACHE_MS = {
  library: parseSeconds(process.env.NEXT_PUBLIC_CACHE_LIBRARY_SECONDS, 60) * 1000, // 1 min
  details: parseSeconds(process.env.NEXT_PUBLIC_CACHE_DETAILS_SECONDS, 600) * 1000, // 10 min
  trending: parseSeconds(process.env.NEXT_PUBLIC_CACHE_TRENDING_SECONDS, 900) * 1000, // 15 min
  person: parseSeconds(process.env.NEXT_PUBLIC_CACHE_PERSON_SECONDS, 1800) * 1000, // 30 min
};
