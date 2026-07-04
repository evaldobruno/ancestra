"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { LangSwitcher, ThemeToggle } from "@/components/Controls";
import { NightSky } from "@/components/NightSky";

const features = [
  { icon: "🌳", pt: "Árvore genealógica imersiva", en: "Immersive family tree" },
  { icon: "👪", pt: "Perfis & biografias", en: "Profiles & biographies" },
  { icon: "📅", pt: "Agenda & aniversários", en: "Calendar & birthdays" },
  { icon: "📸", pt: "Memórias & fotos", en: "Memories & photos" },
  { icon: "🕯️", pt: "Memorial", en: "In memory" },
  { icon: "💬", pt: "Conversas da família", en: "Family chat" },
];

export default function Landing() {
  const { locale } = useI18n();
  const pt = locale === "pt";

  return (
    <main className="relative min-h-screen overflow-hidden night-sky text-white">
      <NightSky />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-5">
          <div className="nd-wordmark text-2xl">Ancestra</div>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeToggle />
            <Link href="/login" className="btn-glow px-4 py-2 text-sm">{pt ? "Entrar" : "Sign in"}</Link>
          </div>
        </header>

        <section className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
          <div className="nd-fade nd-fade-1 text-[11px] tracking-[0.5em] text-gold-300/90">
            {pt ? "A CASA DIGITAL DA FAMÍLIA" : "THE FAMILY'S DIGITAL HOME"}
          </div>
          <h1 className="nd-wordmark nd-rise mt-3 text-7xl leading-none sm:text-8xl">Ancestra</h1>
          <div className="nd-rule" />

          <p className="nd-fade nd-fade-2 mt-6 text-2xl font-medium text-white sm:text-3xl">
            {pt ? "Unir famílias, preservar memórias." : "Uniting families, preserving memories."}
          </p>
          <p className="nd-fade nd-fade-2 mx-auto mt-4 max-w-xl text-base text-slate-300/80">
            {pt
              ? "Uma memória viva para as próximas gerações: árvore genealógica, perfis, memórias, fotografias, documentos e as histórias de quem já partiu."
              : "A living memory for future generations: family tree, profiles, memories, photos, documents and the stories of those who passed."}
          </p>

          <div className="nd-fade nd-fade-3 mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn-glow px-7 py-3 text-base">{pt ? "Entrar" : "Sign in"}</Link>
            <Link href="/register" className="btn-glass px-7 py-3 text-base">{pt ? "Criar conta" : "Create account"}</Link>
            <Link href="/app" className="btn-glass px-7 py-3 text-base">{pt ? "Ver demonstração" : "Open demo"}</Link>
          </div>
          <p className="nd-fade nd-fade-3 mt-3 text-sm text-slate-400">
            {pt
              ? "És da família e ainda não tens conta? Cria uma e pede aprovação."
              : "New here? Create an account and ask for approval."}
          </p>
        </section>

        <section className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 px-5 pb-16 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.icon}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm transition hover:border-gold-400/40 hover:bg-white/10">
              <div className="text-3xl">{f.icon}</div>
              <div className="mt-2 text-sm font-medium text-slate-200">{pt ? f.pt : f.en}</div>
            </div>
          ))}
        </section>

        <footer className="pb-8 text-center text-xs text-slate-400">
          {pt ? "Desenvolvido por" : "Developed by"} <span className="font-medium text-slate-200">Bruno Gonçalves</span>
          {" · "}{new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
