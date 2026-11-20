"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Film, Tv, User } from "lucide-react";
import { SetupBanner } from "./SetupBanner";

const NAV_ITEMS = [
  { href: "/series", label: "Séries", icon: Tv },
  { href: "/filmes", label: "Filmes", icon: Film },
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0E0F12] text-[#F5F6F8]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#232630] bg-[#121419] md:flex">
        <Link href="/series" className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5C518] text-[#0E0F12] font-black shadow-lg shadow-[#F5C518]/20">
            <Tv className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              My<span className="text-[#F5C518]">TVTime</span>
            </span>
            <p className="text-[11px] text-zinc-400">Suas séries & filmes</p>
          </div>
        </Link>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#F5C518] text-[#0E0F12]"
                    : "text-zinc-400 hover:bg-[#1C1F27] hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#232630] px-5 py-4 text-xs text-zinc-500">
          Catálogo via TMDB
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#232630] bg-[#0E0F12]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/series" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5C518] text-[#0E0F12]">
            <Tv className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-base font-extrabold tracking-tight text-white">
            My<span className="text-[#F5C518]">TVTime</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:pl-64 md:pr-8 md:pb-12 md:pt-8">
        <SetupBanner />
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#232630] bg-[#121419]/95 backdrop-blur-lg md:hidden">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-[#F5C518]" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
