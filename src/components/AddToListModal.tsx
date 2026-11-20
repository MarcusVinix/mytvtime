"use client";

import { useState } from "react";
import { Check, ListPlus, Loader2, Plus, X } from "lucide-react";
import {
  useCreateList,
  useCustomLists,
  useToggleListItem,
} from "@/lib/queries/useLibrary";

interface AddToListButtonProps {
  mediaType: "tv" | "movie";
  tmdbId: number;
  title: string;
  posterPath: string | null;
}

export function AddToListButton({
  mediaType,
  tmdbId,
  title,
  posterPath,
}: AddToListButtonProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: lists = [], isLoading, error } = useCustomLists();
  const createList = useCreateList();
  const toggleItem = useToggleListItem();

  const savedCount = lists.filter((l) =>
    (l.custom_list_items || []).some(
      (i) => i.media_type === mediaType && i.tmdb_id === tmdbId
    )
  ).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = await createList.mutateAsync({ name: newName });
    setNewName("");
    await toggleItem.mutateAsync({
      listId: created.id,
      mediaType,
      tmdbId,
      title,
      posterPath,
      inList: false,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
          savedCount > 0
            ? "border-[#F5C518]/60 bg-[#F5C518]/15 text-[#F5C518]"
            : "border-[#2E3340] bg-[#0E0F12]/90 text-zinc-200 hover:border-[#F5C518] hover:text-[#F5C518]"
        }`}
      >
        <ListPlus className="h-4 w-4" />
        {savedCount > 0 ? `Em ${savedCount} lista(s)` : "Salvar em lista"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#2A2E3A] bg-[#16181D] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#232630] px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">Salvar em lista</h3>
                <p className="line-clamp-1 text-xs text-zinc-400">{title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto p-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-zinc-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#F5C518]" />
                  Carregando listas...
                </div>
              ) : error ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Execute o script <code>supabase/migration_v2_lists.sql</code> no SQL Editor do
                  Supabase para habilitar as listas personalizadas.
                </div>
              ) : lists.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-400">
                  Você ainda não criou nenhuma lista. Crie a primeira abaixo!
                </p>
              ) : (
                lists.map((list) => {
                  const inList = (list.custom_list_items || []).some(
                    (i) => i.media_type === mediaType && i.tmdb_id === tmdbId
                  );
                  return (
                    <button
                      key={list.id}
                      type="button"
                      disabled={toggleItem.isPending}
                      onClick={() =>
                        toggleItem.mutate({
                          listId: list.id,
                          mediaType,
                          tmdbId,
                          title,
                          posterPath,
                          inList,
                        })
                      }
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        inList
                          ? "border-[#F5C518]/60 bg-[#F5C518]/10 text-white"
                          : "border-[#262A34] bg-[#0E0F12] text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{list.name}</p>
                        <p className="text-xs text-zinc-500">
                          {list.custom_list_items?.length || 0} item(ns)
                        </p>
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                          inList
                            ? "bg-[#F5C518] text-[#0E0F12]"
                            : "border border-zinc-600 text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleCreate}
              className="flex gap-2 border-t border-[#232630] bg-[#121419] p-4"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nova lista (ex: Para maratonar)..."
                className="flex-1 rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
              />
              <button
                type="submit"
                disabled={createList.isPending || !newName.trim()}
                className="inline-flex items-center gap-1 rounded-xl bg-[#F5C518] px-3.5 py-2 text-sm font-bold text-[#0E0F12] hover:bg-[#FFD338] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                Criar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
