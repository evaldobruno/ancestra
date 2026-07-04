"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/Controls";
import { useMyRole } from "@/lib/useRole";
import { NightSky } from "@/components/NightSky";

const NAV = [
  { href: "/app", key: "nav.dashboard", icon: "🏠" },
  { href: "/app/members", key: "nav.members", icon: "👪" },
  { href: "/app/tree", key: "nav.tree", icon: "🌳" },
  { href: "/app/calendar", key: "nav.calendar", icon: "📅" },
  { href: "/app/memories", key: "nav.memories", icon: "📸" },
  { href: "/app/memorial", key: "nav.memorial", icon: "🕯️" },
  { href: "/app/documents", key: "nav.documents", icon: "📜" },
  { href: "/app/chat", key: "nav.chat", icon: "💬" },
  { href: "/app/profile", key: "nav.profile", icon: "👤" },
  { href: "/app/admin", key: "nav.admin", icon: "⚙️", adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { role } = useMyRole();
  // Administration is for admins (super or family); hidden from members/guests.
  const isAdmin = role === "super_admin" || role === "family_admin";
  const nav = NAV.filter((n) => !n.adminOnly || isAdmin);

  const active = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  // The whole app wears the "constellation" theme (dark) — scoped here so it
  // works regardless of the user's light/dark preference elsewhere.
  return (
    <div className="dark relative min-h-screen text-slate-100">
      {/* Starry backdrop behind the whole app */}
      <div className="pointer-events-none fixed inset-0 night-sky">
        <NightSky constellation={false} />
      </div>

      <div className="relative z-10 min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-brand-950/60 p-4 backdrop-blur-xl md:block">
        <Link href="/app" className="nd-wordmark block px-2 py-3 text-2xl">
          Ancestra
        </Link>
        <nav className="mt-2 space-y-1">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                active(n.href)
                  ? "bg-brand-500 text-white"
                  : "text-stone-600 hover:bg-brand-50 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}>
              <span className="text-lg">{n.icon}</span> {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-6 flex items-center gap-2 px-2">
          <LangSwitcher />
        </div>
        <Link href="/" className="mt-4 block px-3 text-sm text-slate-400 hover:underline">
          ← {t("nav.signout")}
        </Link>
        <div className="mt-6 px-3 text-[11px] leading-relaxed text-slate-400">
          Desenvolvido por<br /><span className="font-medium">Bruno Gonçalves & Ana Oliveira Gonçalves</span>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between border-b border-white/10 bg-brand-950/70 p-3 backdrop-blur md:hidden">
          <button onClick={() => setOpen(!open)} className="btn-ghost px-3 py-1.5" aria-label="Menu">☰</button>
          <span className="nd-wordmark text-lg">Ancestra</span>
          <div className="flex gap-1"><LangSwitcher /></div>
        </header>
        {open && (
          <nav className="grid grid-cols-3 gap-2 border-b border-white/10 bg-brand-950/80 p-3 backdrop-blur md:hidden">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={`rounded-xl px-2 py-3 text-center text-sm ${
                  active(n.href) ? "bg-brand-500 text-white" : "bg-white/5 text-slate-200"
                }`}>
                <div className="text-lg">{n.icon}</div>{t(n.key)}
              </Link>
            ))}
          </nav>
        )}

        <main className="flex-1 p-4 sm:p-6">{children}</main>
        <footer className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-slate-400 md:hidden">
          Desenvolvido por Bruno Gonçalves & Ana Oliveira Gonçalves
        </footer>
      </div>
      </div>
    </div>
  );
}
