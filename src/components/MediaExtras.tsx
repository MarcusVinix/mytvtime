"use client";

import { useMemo, useState } from "react";
import { Play, User, X } from "lucide-react";
import { getTmdbImageUrl } from "@/lib/tmdb";
import type { TmdbCastMember, TmdbVideo } from "@/types";

export function TrailerButton({ videos = [] }: { videos?: TmdbVideo[] }) {
  const [open, setOpen] = useState(false);

  const trailer = useMemo(() => {
    const yt = videos.filter((v) => v.site === "YouTube");
    return (
      yt.find((v) => v.type === "Trailer" && v.official) ||
      yt.find((v) => v.type === "Trailer") ||
      yt.find((v) => v.type === "Teaser") ||
      yt[0] ||
      null
    );
  }, [videos]);

  if (!trailer) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#2E3340] bg-[#0E0F12]/90 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-[#F5C518] hover:text-[#F5C518]"
      >
        <Play className="h-4 w-4 fill-current" />
        Ver Trailer
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[#2A2E3A] bg-[#121419] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#232630] px-4 py-3">
              <p className="truncate text-sm font-bold text-white">{trailer.name}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                title={trailer.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CastSection({ cast = [] }: { cast?: TmdbCastMember[] }) {
  const topCast = cast.slice(0, 12);
  if (topCast.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">Elenco Principal</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {topCast.map((actor) => {
          const photo = getTmdbImageUrl(actor.profile_path, "w185");
          return (
            <div
              key={actor.id}
              className="w-28 shrink-0 overflow-hidden rounded-2xl border border-[#232630] bg-[#16181D]"
            >
              <div className="aspect-[2/3] w-full bg-[#1E2128]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={actor.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                    <User className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-xs font-bold text-zinc-100">{actor.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">
                  {actor.character || "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import { MediaCard } from "./MediaCard";
import type { TmdbMediaItem } from "@/types";

export function RecommendationsSection({
  items = [],
  type,
}: {
  items?: TmdbMediaItem[];
  type: "tv" | "movie";
}) {
  const top = items.slice(0, 10);
  if (top.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">Títulos Parecidos</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {top.map((item) => (
          <MediaCard
            key={item.id}
            id={item.id}
            type={type}
            title={item.name || item.title || "Sem título"}
            posterPath={item.poster_path}
            rating={item.vote_average}
            subtitle={(item.first_air_date || item.release_date || "").slice(0, 4)}
          />
        ))}
      </div>
    </section>
  );
}
