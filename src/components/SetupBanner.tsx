"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

interface StatusResponse {
  supabaseConfigured: boolean;
  tmdbConfigured: boolean;
}

export function SetupBanner() {
  const { data } = useQuery<StatusResponse>({
    queryKey: ["system", "status"],
    queryFn: async () => {
      const res = await fetch("/api/status");
      return res.json();
    },
    staleTime: 30_000,
  });

  if (!data || (data.supabaseConfigured && data.tmdbConfigured)) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#F5C518]/40 bg-[#1A1812] p-5 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5C518]" />
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[#F5C518]">
              Configuração pendente no arquivo .env.local
            </h2>
            <p className="mt-1 text-zinc-300">
              Para o MyTVTime buscar o catálogo e salvar seu progresso na nuvem, preencha as
              chaves gratuitas abaixo no arquivo{" "}
              <code className="rounded bg-black/50 px-1.5 py-0.5 text-[#F5C518]">.env.local</code>{" "}
              e reinicie o servidor:
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#121318] px-3 py-2.5">
              <div className="flex items-center gap-2">
                {data.supabaseConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                )}
                <span className="font-medium text-zinc-100">Supabase (Banco + Auth)</span>
              </div>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#F5C518] hover:underline"
              >
                Abrir <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#121318] px-3 py-2.5">
              <div className="flex items-center gap-2">
                {data.tmdbConfigured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                )}
                <span className="font-medium text-zinc-100">TMDB (Catálogo + Datas)</span>
              </div>
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#F5C518] hover:underline"
              >
                Abrir <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
