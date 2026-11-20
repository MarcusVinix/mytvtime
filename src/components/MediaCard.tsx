import Link from "next/link";
import { Film, Star, Tv } from "lucide-react";
import { getTmdbImageUrl } from "@/lib/tmdb";

interface MediaCardProps {
  id: number;
  type: "tv" | "movie";
  title: string;
  posterPath: string | null;
  rating?: number;
  subtitle?: string;
  badge?: string;
}

export function MediaCard({
  id,
  type,
  title,
  posterPath,
  rating,
  subtitle,
  badge,
}: MediaCardProps) {
  const href = type === "tv" ? `/series/${id}` : `/filmes/${id}`;
  const posterUrl = getTmdbImageUrl(posterPath, "w342");

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#232630] bg-[#16181D] transition-all hover:-translate-y-0.5 hover:border-[#F5C518]/60"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1D2028]">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-600">
            {type === "tv" ? <Tv className="h-8 w-8" /> : <Film className="h-8 w-8" />}
            <span className="text-xs">Sem pôster</span>
          </div>
        )}

        {rating !== undefined && rating > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/75 px-2 py-1 text-xs font-bold text-[#F5C518] backdrop-blur-sm">
            <Star className="h-3 w-3 fill-[#F5C518]" />
            {rating.toFixed(1)}
          </div>
        )}

        {badge && (
          <div className="absolute left-2 top-2 rounded-lg bg-[#F5C518] px-2 py-0.5 text-[11px] font-bold text-[#0E0F12]">
            {badge}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-100 group-hover:text-[#F5C518]">
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
      </div>
    </Link>
  );
}
