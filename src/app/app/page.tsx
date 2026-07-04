"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchDashboard, type Dash } from "@/lib/appdata";
import { isSupabaseConfigured } from "@/lib/queries";
import { fetchFamiliesWithCounts, fetchAppUsers } from "@/lib/mutations";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-stone-400">{text}</p>;
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const [d, setD] = useState<Dash | null>(null);
  const [stats, setStats] = useState<{ families: number; members: number; accounts: number } | null>(null);
  useEffect(() => {
    fetchDashboard().then(setD);
    if (isSupabaseConfigured()) {
      Promise.all([fetchFamiliesWithCounts(), fetchAppUsers()]).then(([f, u]) => {
        setStats({
          families: f.length,
          members: f.reduce((s, x) => s + x.members, 0),
          accounts: u.length,
        });
      });
    }
  }, []);

  // Build the date from its parts so it isn't shifted by the timezone.
  const fmt = (s: string) => {
    if (!s) return "";
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB", {
      day: "numeric",
      month: "short",
    });
  };
  const none = locale === "pt" ? "Nada por aqui ainda." : "Nothing here yet.";

  const pt = locale === "pt";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dash.greeting")} 👋</h1>
        <p className="text-stone-500">{t("app.tagline")}</p>
      </div>

      {/* Sobre a app */}
      <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏡</span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-200">
            {pt ? "Sobre a Ancestra" : "About Ancestra"}
          </h2>
        </div>
        <p className="mt-2 leading-relaxed text-white/90">
          {pt
            ? "A Ancestra é a casa digital da nossa família. Nasceu para nos aproximar — estejamos onde estivermos — e para guardar quem somos e de onde viemos. Aqui reunimos a árvore da família, os perfis de cada pessoa, as memórias, as fotografias, os documentos e as histórias de quem já partiu."
            : "Ancestra is our family's digital home. It exists to bring us closer — wherever we are — and to preserve who we are and where we come from: the family tree, everyone's profile, memories, photos, documents and the stories of those who passed."}
        </p>
        <p className="mt-2 leading-relaxed text-white/80">
          {pt
            ? "Mais do que uma aplicação, é uma memória viva para as próximas gerações — para que um dia os nossos netos possam conhecer os seus bisavós, ouvir as suas histórias e ver os seus rostos."
            : "More than an app, it's a living memory for future generations — so that one day our grandchildren can meet their great-grandparents, hear their stories and see their faces."}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: pt ? "Famílias" : "Families", value: stats.families, icon: "👨‍👩‍👧" },
            { label: pt ? "Membros" : "Members", value: stats.members, icon: "🧑" },
            { label: pt ? "Contas" : "Accounts", value: stats.accounts, icon: "🔑" },
          ].map((s) => (
            <div key={s.label} className="card">
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1 text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-stone-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/app/calendar" className="btn-primary py-3">＋ {t("dash.addEvent")}</Link>
        <Link href="/app/members" className="btn-ghost py-3">＋ {t("dash.addMember")}</Link>
        <Link href="/app/memories" className="btn-ghost py-3">＋ {t("dash.addMemory")}</Link>
        <Link href="/app/chat" className="btn-ghost py-3">💬 {t("dash.openChat")}</Link>
      </div>

      {d && d.onThisDay.length > 0 && (
        <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold-200">✨ {t("dash.onThisDay")}</h3>
          {d.onThisDay.map((o) => (
            <p key={o.id} className="text-lg font-medium leading-snug">{o.text}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t("dash.upcomingBirthdays")}>
          {!d ? <Empty text="…" /> : d.birthdays.length === 0 ? <Empty text={none} /> : (
            <ul className="space-y-2">
              {d.birthdays.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span>🎂</span>{b.name}</span>
                  <span className="text-sm text-stone-400">{fmt(b.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dash.upcomingEvents")}>
          {!d ? <Empty text="…" /> : d.events.length === 0 ? <Empty text={none} /> : (
            <ul className="space-y-2">
              {d.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between">
                  <span>{e.title}</span>
                  <span className="text-sm text-stone-400">{fmt(e.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dash.recentMemories")}>
          {!d ? <Empty text="…" /> : d.memories.length === 0 ? <Empty text={none} /> : (
            <ul className="space-y-3">
              {d.memories.map((m) => (
                <li key={m.id}>
                  <Link href="/app/memories" className="font-medium hover:text-brand-600">{m.title}</Link>
                  <p className="text-sm text-stone-400">{m.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("dash.pendingTasks")}>
          {!d ? <Empty text="…" /> : d.tasks.length === 0 ? <Empty text={none} /> : (
            <ul className="space-y-2">
              {d.tasks.map((tk) => (
                <li key={tk.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" /> {tk.title}
                  </span>
                  <span className="text-sm text-stone-400">{fmt(tk.due)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
