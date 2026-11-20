"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SetupBanner } from "@/components/SetupBanner";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/series");
        router.refresh();
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Conta criada! Se o Supabase exigir confirmação de e-mail, verifique sua caixa de entrada ou faça login."
        );
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E0F12] px-4 py-10">
      <div className="w-full max-w-md">
        <SetupBanner />

        <div className="rounded-3xl border border-[#232630] bg-[#16181D] p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5C518] text-[#0E0F12] shadow-lg shadow-[#F5C518]/20">
              <Tv className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              My<span className="text-[#F5C518]">TVTime</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Acompanhe suas séries, filmes e próximos lançamentos
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#0E0F12] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === "login"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#F5C518]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C518] py-3 text-sm font-bold text-[#0E0F12] transition-colors hover:bg-[#FFD338] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar no MyTVTime" : "Criar conta gratuita"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
