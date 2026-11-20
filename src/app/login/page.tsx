"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Mail, Sparkles, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SetupBanner } from "@/components/SetupBanner";

type AuthMode = "login" | "magic" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const origin = window.location.origin;

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/series");
        router.refresh();
      } else if (mode === "magic") {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=/series`,
          },
        });
        if (otpError) throw otpError;
        setMessage(
          "Link mágico enviado! Abra seu e-mail e clique no link para entrar instantaneamente."
        );
      } else if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
        });
        if (resetError) throw resetError;
        setMessage(
          "E-mail de recuperação enviado! Clique no link recebido para definir sua nova senha."
        );
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=/series`,
          },
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
          <div className="mb-7 flex flex-col items-center text-center">
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

          <div className="mb-6 grid grid-cols-3 rounded-xl bg-[#0E0F12] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                mode === "login"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Senha
            </button>
            <button
              type="button"
              onClick={() => switchMode("magic")}
              className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                mode === "magic"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Link Mágico
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-[#F5C518] text-[#0E0F12]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>

          {mode === "reset" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#F5C518]/30 bg-[#F5C518]/10 px-3.5 py-2.5 text-xs text-[#F5C518]">
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>Informe seu e-mail para receber o link de troca de senha.</span>
            </div>
          )}

          {mode === "magic" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#2A2E3A] bg-[#0E0F12] px-3.5 py-2.5 text-xs text-zinc-300">
              <Mail className="h-4 w-4 shrink-0 text-[#F5C518]" />
              <span>Entre sem precisar de senha: enviaremos um link único no seu e-mail.</span>
            </div>
          )}

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

            {(mode === "login" || mode === "signup") && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-400">Senha</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs font-medium text-[#F5C518] hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
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
            )}

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
              {mode === "login"
                ? "Entrar no MyTVTime"
                : mode === "magic"
                ? "Enviar Link Mágico por e-mail"
                : mode === "reset"
                ? "Enviar link de recuperação"
                : "Criar conta gratuita"}
            </button>

            {mode === "reset" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-center text-xs text-zinc-400 hover:text-white"
              >
                Voltar para o login com senha
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
