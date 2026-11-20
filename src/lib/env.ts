export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("SEU-PROJETO") &&
      !key.includes("sua_chave")
  );
}

export function isTmdbConfigured(): boolean {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  const hasToken = Boolean(token && !token.includes("seu_token"));
  const hasKey = Boolean(apiKey && !apiKey.includes("sua_chave"));
  return hasToken || hasKey;
}
