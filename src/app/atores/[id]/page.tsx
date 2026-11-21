"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Loader2, MapPin, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MediaCard } from "@/components/MediaCard";
import { formatDateBR } from "@/lib/dates";
import { getTmdbImageUrl } from "@/lib/tmdb";
import { CLIENT_CACHE_MS } from "@/lib/cache";
import type { TmdbPersonDetail } from "@/types";

export default function AtorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<"tv" | "movie">("tv");

  const { data: person, isLoading, error } = useQuery<TmdbPersonDetail>({
    queryKey: ["tmdb", "person", id],
    queryFn: async () => {
      const res = await fetch(`/api/tmdb/person/${id}`);
      if (!res.ok) throw new Error("Não foi possível carregar o perfil.");
      return res.json();
    },
    staleTime: CLIENT_CACHE_MS.person,
  });

  const { tvCredits, movieCredits } = useMemo(() => {
    const cast = person?.combined_credits?.cast || [];
    const seenTv = new Set<number>();
    const seenMovies = new Set<number>();

    const tv = cast
      .filter((c) => {
        if (c.media_type !== "tv" || seenTv.has(c.id)) return false;
        seenTv.add(c.id);
        return true;
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const movie = cast
      .filter((c) => {
        if (c.media_type !== "movie" || seenMovies.has(c.id)) return false;
        seenMovies.add(c.id);
        return true;
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return { tvCredits: tv, movieCredits: movie };
  }, [person]);

  const activeCredits = tab === "tv" ? tvCredits : movieCredits;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#F5C518]" />
          Carregando perfil do ator...
        </div>
      ) : error || !person ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          Não foi possível carregar os dados deste ator.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col gap-6 rounded-3xl border border-[#232630] bg-[#16181D] p-6 sm:flex-row sm:p-8">
            <div className="h-56 w-40 shrink-0 self-center overflow-hidden rounded-2xl border border-white/10 bg-[#1E2128] sm:self-start">
              {person.profile_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getTmdbImageUrl(person.profile_path, "w342")!}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-600">
                  <User className="h-12 w-12" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{person.name}</h1>

              <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                {person.birthday && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#F5C518]" />
                    Nascimento: {formatDateBR(person.birthday)}
                  </span>
                )}
                {person.place_of_birth && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#F5C518]" />
                    {person.place_of_birth}
                  </span>
                )}
              </div>

              {person.biography ? (
                <p className="line-clamp-6 text-sm leading-relaxed text-zinc-300">
                  {person.biography}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Biografia indisponível em português.</p>
              )}
            </div>
          </div>

          <section>
            <div className="mb-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("tv")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  tab === "tv"
                    ? "bg-[#F5C518] text-[#0E0F12]"
                    : "border border-[#232630] bg-[#16181D] text-zinc-300 hover:text-white"
                }`}
              >
                Séries
                <span className="rounded bg-black/15 px-1.5 py-0.5 text-xs">
                  {tvCredits.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab("movie")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  tab === "movie"
                    ? "bg-[#F5C518] text-[#0E0F12]"
                    : "border border-[#232630] bg-[#16181D] text-zinc-300 hover:text-white"
                }`}
              >
                Filmes
                <span className="rounded bg-black/15 px-1.5 py-0.5 text-xs">
                  {movieCredits.length}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {activeCredits.slice(0, 30).map((credit) => (
                <MediaCard
                  key={`${credit.media_type}-${credit.id}`}
                  id={credit.id}
                  type={tab}
                  title={credit.name || credit.title || "Sem título"}
                  posterPath={credit.poster_path}
                  rating={credit.vote_average}
                  subtitle={
                    credit.character
                      ? `como ${credit.character}`
                      : (credit.first_air_date || credit.release_date || "").slice(0, 4)
                  }
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
