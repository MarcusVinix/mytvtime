"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Filter, Loader2, Search, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MediaCard } from "@/components/MediaCard";
import { CLIENT_CACHE_MS } from "@/lib/cache";
import type { TmdbMediaItem } from "@/types";

interface PaginatedMediaResponse {
  results: TmdbMediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

interface TrendingResponse {
  trendingTv: TmdbMediaItem[];
  trendingMovies: TmdbMediaItem[];
  popularTv: TmdbMediaItem[];
}

const STREAMING_PROVIDERS = [
  { id: "", label: "Todos" },
  { id: "8", label: "Netflix" },
  { id: "119", label: "Prime Video" },
  { id: "1899", label: "Max" },
  { id: "337", label: "Disney+" },
  { id: "350", label: "Apple TV+" },
  { id: "307", label: "Globoplay" },
  { id: "531", label: "Paramount+" },
];

const ORIGIN_FILTERS = [
  { id: "", label: "Qualquer origem" },
  { id: "dorama", label: "Doramas (Todos)" },
  { id: "ko", label: "K-Dramas (Coreia)" },
  { id: "ja", label: "J-Dramas (Japão)" },
  { id: "zh", label: "C-Dramas (China)" },
];

const TV_GENRES = [
  { id: "", label: "Todos os gêneros" },
  { id: "10759", label: "Ação e Aventura" },
  { id: "35", label: "Comédia" },
  { id: "18", label: "Drama" },
  { id: "10765", label: "Sci-Fi & Fantasia" },
  { id: "80", label: "Crime" },
  { id: "9648", label: "Mistério" },
  { id: "16", label: "Animação" },
  { id: "99", label: "Documentário" },
];

const MOVIE_GENRES = [
  { id: "", label: "Todos os gêneros" },
  { id: "28", label: "Ação" },
  { id: "12", label: "Aventura" },
  { id: "35", label: "Comédia" },
  { id: "18", label: "Drama" },
  { id: "878", label: "Ficção Científica" },
  { id: "53", label: "Suspense" },
  { id: "27", label: "Terror" },
  { id: "16", label: "Animação" },
];

export default function ExplorarPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [discoverType, setDiscoverType] = useState<"tv" | "movie">("tv");
  const [provider, setProvider] = useState("");
  const [genre, setGenre] = useState("");
  const [origin, setOrigin] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, discoverType, provider, genre, origin, sort]);

  const hasFilters = Boolean(provider || genre || origin || sort !== "popularity.desc");

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useQuery<PaginatedMediaResponse>({
    queryKey: ["tmdb", "search", debouncedQuery, page],
    queryFn: async () => {
      const res = await fetch(
        `/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}&page=${page}`
      );
      if (!res.ok) throw new Error("Erro na busca");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
    placeholderData: (prev) => prev,
  });

  const {
    data: discoverData,
    isLoading: discoverLoading,
    isFetching: discoverFetching,
  } = useQuery<PaginatedMediaResponse>({
    queryKey: ["tmdb", "discover", discoverType, provider, genre, origin, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: discoverType,
        provider,
        genre,
        origin,
        sort,
        page: String(page),
      });
      const res = await fetch(`/api/tmdb/discover?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao filtrar");
      return res.json();
    },
    enabled: debouncedQuery.length < 2 && hasFilters,
    placeholderData: (prev) => prev,
  });

  const { data: trending, isLoading: trendingLoading } = useQuery<TrendingResponse>({
    queryKey: ["tmdb", "trending"],
    queryFn: async () => {
      const res = await fetch("/api/tmdb/trending");
      if (!res.ok) throw new Error("Erro ao carregar catálogo");
      return res.json();
    },
    staleTime: CLIENT_CACHE_MS.trending,
  });

  const genres = discoverType === "tv" ? TV_GENRES : MOVIE_GENRES;

  function clearFilters() {
    setProvider("");
    setGenre("");
    setOrigin("");
    setSort("popularity.desc");
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderPagination(currentPage: number, totalPages: number, fetching: boolean) {
    if (totalPages <= 1) return null;
    return (
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={currentPage <= 1 || fetching}
          onClick={() => changePage(currentPage - 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2E3A] bg-[#16181D] px-4 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#F5C518] hover:text-[#F5C518] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <span className="inline-flex items-center gap-2 rounded-xl border border-[#232630] bg-[#121419] px-4 py-2 text-xs font-semibold text-zinc-300">
          {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F5C518]" />}
          Página <strong className="text-[#F5C518]">{currentPage}</strong> de {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages || fetching}
          onClick={() => changePage(currentPage + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2E3A] bg-[#16181D] px-4 py-2 text-xs font-bold text-zinc-200 transition-colors hover:border-[#F5C518] hover:text-[#F5C518] disabled:opacity-40"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Explorar</h1>
        <p className="text-sm text-zinc-400">
          Busque por nome ou filtre por streaming no Brasil e gênero
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar séries ou filmes (ex: Severance, Breaking Bad, Duna)..."
          className="w-full rounded-2xl border border-[#2A2E3A] bg-[#16181D] py-3.5 pl-12 pr-11 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#F5C518]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Discovery Filters */}
      {debouncedQuery.length < 2 && (
        <div className="mb-8 space-y-3 rounded-2xl border border-[#232630] bg-[#16181D] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Filter className="h-3.5 w-3.5 text-[#F5C518]" />
              Filtros de Descoberta
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg bg-[#0E0F12] p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDiscoverType("tv");
                    setGenre("");
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    discoverType === "tv"
                      ? "bg-[#F5C518] text-[#0E0F12]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Séries
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscoverType("movie");
                    setGenre("");
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    discoverType === "movie"
                      ? "bg-[#F5C518] text-[#0E0F12]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Filmes
                </button>
              </div>

              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="rounded-lg border border-[#2A2E3A] bg-[#0E0F12] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F5C518]"
              >
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-[#2A2E3A] bg-[#0E0F12] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#F5C518]"
              >
                <option value="popularity.desc">Mais populares</option>
                <option value="vote_average.desc">Melhor avaliados</option>
                <option value="release_date.desc">Mais recentes (lançamento)</option>
                <option value="release_date.asc">Mais antigos (lançamento)</option>
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#F5C518] hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {STREAMING_PROVIDERS.map((p) => (
              <button
                key={p.id || "all"}
                type="button"
                onClick={() => setProvider(p.id)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  provider === p.id
                    ? "bg-[#F5C518] text-[#0E0F12]"
                    : "border border-[#2A2E3A] bg-[#0E0F12] text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {ORIGIN_FILTERS.map((o) => (
              <button
                key={o.id || "any"}
                type="button"
                onClick={() => setOrigin(o.id)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  origin === o.id
                    ? "bg-rose-500 text-white"
                    : "border border-[#2A2E3A] bg-[#0E0F12] text-zinc-300 hover:border-rose-400"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {debouncedQuery.length >= 2 ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white">
              Resultados para &ldquo;{debouncedQuery}&rdquo;
            </h2>
            {searchData?.totalResults ? (
              <span className="text-xs text-zinc-400">
                {searchData.totalResults.toLocaleString("pt-BR")} resultado(s)
              </span>
            ) : null}
          </div>
          {searchLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
              Buscando no TMDB...
            </div>
          ) : (searchData?.results || []).length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">
              Nenhum resultado encontrado.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {(searchData?.results || []).map((item) => {
                  const isTv = item.media_type === "tv";
                  const year = (item.first_air_date || item.release_date || "").slice(0, 4);
                  return (
                    <MediaCard
                      key={`${item.media_type}-${item.id}`}
                      id={item.id}
                      type={isTv ? "tv" : "movie"}
                      title={item.name || item.title || "Sem título"}
                      posterPath={item.poster_path}
                      rating={item.vote_average}
                      badge={isTv ? "Série" : "Filme"}
                      subtitle={year || undefined}
                    />
                  );
                })}
              </div>
              {renderPagination(
                searchData?.page || page,
                searchData?.totalPages || 1,
                searchFetching
              )}
            </>
          )}
        </section>
      ) : hasFilters ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white">
              {discoverType === "tv" ? "Séries" : "Filmes"} filtrados
            </h2>
            {discoverData?.totalResults ? (
              <span className="text-xs text-zinc-400">
                {discoverData.totalResults.toLocaleString("pt-BR")} título(s)
              </span>
            ) : null}
          </div>
          {discoverLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
              Aplicando filtros...
            </div>
          ) : (discoverData?.results || []).length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">
              Nenhum título encontrado para essa combinação de filtros.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {(discoverData?.results || []).map((item) => (
                  <MediaCard
                    key={item.id}
                    id={item.id}
                    type={discoverType}
                    title={item.name || item.title || "Sem título"}
                    posterPath={item.poster_path}
                    rating={item.vote_average}
                    subtitle={(item.first_air_date || item.release_date || "").slice(0, 4)}
                  />
                ))}
              </div>
              {renderPagination(
                discoverData?.page || page,
                discoverData?.totalPages || 1,
                discoverFetching
              )}
            </>
          )}
        </section>
      ) : trendingLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
          Carregando destaques...
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F5C518]" />
              <h2 className="text-lg font-bold text-white">Séries em alta na semana</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {(trending?.trendingTv || []).slice(0, 10).map((item) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  type="tv"
                  title={item.name || "Sem título"}
                  posterPath={item.poster_path}
                  rating={item.vote_average}
                  subtitle={(item.first_air_date || "").slice(0, 4)}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold text-white">Filmes em destaque</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {(trending?.trendingMovies || []).slice(0, 10).map((item) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  type="movie"
                  title={item.title || "Sem título"}
                  posterPath={item.poster_path}
                  rating={item.vote_average}
                  subtitle={(item.release_date || "").slice(0, 4)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
