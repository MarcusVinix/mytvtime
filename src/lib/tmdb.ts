const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500"
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  revalidateSeconds = 3600
): Promise<T> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  const hasToken = Boolean(token && !token.includes("seu_token"));
  const hasKey = Boolean(apiKey && !apiKey.includes("sua_chave"));

  if (!hasToken && !hasKey) {
    throw new Error("TMDB_NOT_CONFIGURED");
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("language", "pt-BR");

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (hasToken) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (hasKey) {
    url.searchParams.set("api_key", apiKey!);
  }

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate: revalidateSeconds },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`TMDB error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}
