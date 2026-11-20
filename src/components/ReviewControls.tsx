"use client";

import { useEffect, useState } from "react";
import { Heart, MessageSquare, RotateCcw, Save, Star, X } from "lucide-react";
import type { ReactionType } from "@/types";

export const REACTIONS: { id: ReactionType; emoji: string; label: string }[] = [
  { id: "loved", emoji: "😍", label: "Amei" },
  { id: "wow", emoji: "🤯", label: "Surpreso" },
  { id: "funny", emoji: "😂", label: "Engraçado" },
  { id: "sad", emoji: "😢", label: "Emocionante" },
  { id: "angry", emoji: "😡", label: "Raiva" },
];

interface MediaReviewCardProps {
  rating?: number | null;
  reaction?: ReactionType | null;
  notes?: string | null;
  isFavorite?: boolean;
  rewatchCount?: number;
  isShow?: boolean;
  saving?: boolean;
  onSave: (patch: {
    rating?: number | null;
    reaction?: ReactionType | null;
    notes?: string | null;
    is_favorite?: boolean;
  }) => void;
  onRewatch: (resetEpisodes?: boolean) => void;
}

export function MediaReviewCard({
  rating = null,
  reaction = null,
  notes = "",
  isFavorite = false,
  rewatchCount = 0,
  isShow = false,
  saving = false,
  onSave,
  onRewatch,
}: MediaReviewCardProps) {
  const [localNotes, setLocalNotes] = useState(notes || "");
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setLocalNotes(notes || "");
  }, [notes]);

  function handleSaveNotes() {
    onSave({ notes: localNotes.trim() || null });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  }

  return (
    <section className="rounded-3xl border border-[#232630] bg-[#16181D] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white">Sua Avaliação & Notas</h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave({ is_favorite: !isFavorite })}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
              isFavorite
                ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                : "border-[#2A2E3A] bg-[#0E0F12] text-zinc-300 hover:border-rose-400 hover:text-rose-300"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-rose-400 text-rose-400" : ""}`} />
            {isFavorite ? "Favorito" : "Favoritar"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (isShow) {
                const reset = confirm(
                  "Deseja iniciar um Rewatch do zero? Clique em OK para incrementar o contador de Rewatch e desmarcar os episódios para reassistir, ou Cancelar para apenas somar +1 no contador."
                );
                onRewatch(reset);
              } else {
                onRewatch(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-3 py-1.5 text-xs font-bold text-zinc-300 transition-colors hover:border-[#F5C518] hover:text-[#F5C518]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {rewatchCount > 0 ? `Reassistido ${rewatchCount}x` : "Reassistir"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          {/* Stars */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">Nota (1 a 5 estrelas)</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (rating || 0) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={saving}
                    onClick={() => onSave({ rating: rating === star ? null : star })}
                    className="rounded-lg p-1 transition-transform hover:scale-110"
                    title={`${star} estrela(s)`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        active ? "fill-[#F5C518] text-[#F5C518]" : "text-zinc-600 hover:text-zinc-400"
                      }`}
                    />
                  </button>
                );
              })}
              {rating ? (
                <span className="ml-2 text-xs font-bold text-[#F5C518]">{rating}/5</span>
              ) : null}
            </div>
          </div>

          {/* Reactions */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">Reação</p>
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map((r) => {
                const active = reaction === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={saving}
                    onClick={() => onSave({ reaction: active ? null : r.id })}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-[#F5C518] bg-[#F5C518]/15 text-[#F5C518]"
                        : "border-[#262A34] bg-[#0E0F12] text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Personal Notes */}
        <div className="flex flex-col">
          <label className="mb-1.5 text-xs font-medium text-zinc-400">
            Notas pessoais (privadas)
          </label>
          <textarea
            rows={3}
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="O que você achou? Anote momentos marcantes, teorias..."
            className="flex-1 rounded-xl border border-[#2A2E3A] bg-[#0E0F12] p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {savedToast && <span className="text-xs text-emerald-400">Nota salva!</span>}
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveNotes}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5C518] px-3.5 py-1.5 text-xs font-bold text-[#0E0F12] hover:bg-[#FFD338] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar nota
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EpisodeReviewButton({
  episodeLabel,
  rating,
  reaction,
  notes,
  onSave,
}: {
  episodeLabel: string;
  rating?: number | null;
  reaction?: ReactionType | null;
  notes?: string | null;
  onSave: (patch: {
    rating?: number | null;
    reaction?: ReactionType | null;
    notes?: string | null;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localRating, setLocalRating] = useState<number | null>(rating ?? null);
  const [localReaction, setLocalReaction] = useState<ReactionType | null>(reaction ?? null);
  const [localNotes, setLocalNotes] = useState(notes || "");

  const hasReview = Boolean(rating || reaction || notes);
  const reactionObj = REACTIONS.find((r) => r.id === reaction);

  function handleOpen() {
    setLocalRating(rating ?? null);
    setLocalReaction(reaction ?? null);
    setLocalNotes(notes || "");
    setOpen(true);
  }

  function handleSave() {
    onSave({
      rating: localRating,
      reaction: localReaction,
      notes: localNotes.trim() || null,
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Avaliar / anotar episódio"
        className={`flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
          hasReview
            ? "border-[#F5C518]/50 bg-[#F5C518]/10 text-[#F5C518]"
            : "border-[#2E3340] bg-[#0E0F12] text-zinc-400 hover:border-[#F5C518] hover:text-[#F5C518]"
        }`}
      >
        {reactionObj ? (
          <span>{reactionObj.emoji}</span>
        ) : rating ? (
          <Star className="h-3.5 w-3.5 fill-[#F5C518]" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
        {rating ? <span>{rating}</span> : null}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#2A2E3A] bg-[#16181D] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Avaliar Episódio</h3>
                <p className="text-xs text-[#F5C518]">{episodeLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs text-zinc-400">Estrelas</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLocalRating(localRating === s ? null : s)}
                      className="p-1"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          (localRating || 0) >= s
                            ? "fill-[#F5C518] text-[#F5C518]"
                            : "text-zinc-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs text-zinc-400">Reação</p>
                <div className="flex flex-wrap gap-2">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setLocalReaction(localReaction === r.id ? null : r.id)}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
                        localReaction === r.id
                          ? "border-[#F5C518] bg-[#F5C518]/15 text-[#F5C518]"
                          : "border-[#262A34] bg-[#0E0F12] text-zinc-300"
                      }`}
                    >
                      {r.emoji} {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs text-zinc-400">Nota pessoal</p>
                <textarea
                  rows={3}
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Comentário sobre este episódio..."
                  className="w-full rounded-xl border border-[#2A2E3A] bg-[#0E0F12] p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full rounded-xl bg-[#F5C518] py-2.5 text-sm font-bold text-[#0E0F12] hover:bg-[#FFD338]"
              >
                Salvar avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
