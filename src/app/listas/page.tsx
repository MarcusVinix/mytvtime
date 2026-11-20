"use client";

import { useState } from "react";
import Link from "next/link";
import { ListVideo, Loader2, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useCreateList,
  useCustomLists,
  useDeleteList,
  useToggleListItem,
} from "@/lib/queries/useLibrary";
import { getTmdbImageUrl } from "@/lib/tmdb";

export default function ListasPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: lists = [], isLoading, error } = useCustomLists();
  const createList = useCreateList();
  const deleteList = useDeleteList();
  const toggleItem = useToggleListItem();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createList.mutateAsync({ name, description });
    setName("");
    setDescription("");
    setShowForm(false);
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Minhas Listas
          </h1>
          <p className="text-sm text-zinc-400">
            Crie coleções personalizadas como &ldquo;Para maratonar&rdquo; ou &ldquo;Favoritas&rdquo;
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5C518] px-4 py-2.5 text-sm font-bold text-[#0E0F12] transition-colors hover:bg-[#FFD338]"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          Nova lista
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-3 rounded-2xl border border-[#F5C518]/40 bg-[#16181D] p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da lista (ex: Para ver no fim de semana)"
              className="rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              className="rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createList.isPending}
              className="rounded-xl bg-[#F5C518] px-5 py-2 text-xs font-bold text-[#0E0F12] hover:bg-[#FFD338] disabled:opacity-50"
            >
              Criar lista
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F5C518]" />
          Carregando suas listas...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-200">
          Para usar listas personalizadas, execute o script{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-[#F5C518]">
            supabase/migration_v2_lists.sql
          </code>{" "}
          no SQL Editor do seu projeto Supabase e recarregue a página.
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-3xl border border-[#232630] bg-[#16181D] px-6 py-16 text-center">
          <ListVideo className="mx-auto mb-4 h-12 w-12 text-[#F5C518]" />
          <h2 className="text-lg font-bold text-white">Nenhuma lista criada ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Crie listas personalizadas para organizar séries e filmes por humor, gênero ou o que
            quiser maratonar em seguida.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {lists.map((list) => {
            const items = list.custom_list_items || [];
            return (
              <section
                key={list.id}
                className="rounded-3xl border border-[#232630] bg-[#16181D] p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{list.name}</h2>
                      <span className="rounded-lg bg-[#232630] px-2 py-0.5 text-xs font-bold text-zinc-300">
                        {items.length}
                      </span>
                    </div>
                    {list.description && (
                      <p className="mt-1 text-xs text-zinc-400">{list.description}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir a lista "${list.name}"?`)) {
                        deleteList.mutate(list.id);
                      }
                    }}
                    className="rounded-xl p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                    title="Excluir lista"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#2A2E3A] py-8 text-center text-xs text-zinc-500">
                    Lista vazia — abra qualquer série ou filme e clique em{" "}
                    <strong className="text-zinc-300">Salvar em lista</strong>.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative overflow-hidden rounded-2xl border border-[#262A34] bg-[#0E0F12]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleItem.mutate({
                              listId: list.id,
                              mediaType: item.media_type,
                              tmdbId: item.tmdb_id,
                              title: item.title,
                              posterPath: item.poster_path,
                              inList: true,
                            })
                          }
                          title="Remover da lista"
                          className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/75 p-1 text-zinc-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                        <Link
                          href={
                            item.media_type === "tv"
                              ? `/series/${item.tmdb_id}`
                              : `/filmes/${item.tmdb_id}`
                          }
                        >
                          <div className="aspect-[2/3] w-full bg-[#1E2128]">
                            {item.poster_path && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getTmdbImageUrl(item.poster_path, "w342")!}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="line-clamp-2 text-xs font-semibold text-zinc-100 group-hover:text-[#F5C518]">
                              {item.title}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
