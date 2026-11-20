"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MediaCard } from "@/components/MediaCard";
import type { TmdbMediaItem } from "@/types";

interface TrendingResponse {
  trendingTv: TmdbMediaItem[];
  trendingMovies: TmdbMediaItem[];
  popularTv: TmdbMediaItem[];
}

export default function ExplorarPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data: searchData, isLoading: searchLoading } = useQuery<{ results: TmdbMediaItem[] }>({
    queryKey: ["tmdb", "search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Erro na busca");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const { data: trending, isLoading: trendingLoading } = useQuery<TrendingResponse>({
    queryKey: ["tmdb", "trending"],
    queryFn: async () => {
      const res = await fetch("/api/tmdb/trending");
      if (!res.ok) throw new Error("Erro ao carregar catálogo");
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Explorar</h1>
        <p className="text-sm text-zinc-400">
          Busque qualquer série ou filme para adicionar à sua biblioteca
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
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

      {/* Search Results */}
      {debouncedQuery.length >= 2 ? (
        <section>
          <h2 className="mb-4 text-base font-bold text-white">
            Resultados para &ldquo;{debouncedQuery}&rdquo;
          </h2>
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
