"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchMemories, type MemoryRow } from "@/lib/appdata";
import { SourceBadge } from "@/components/SourceBadge";
import { MemoryForm } from "@/components/MemoryForm";
import { Comments } from "@/components/Comments";

const CATS: Record<string, { pt: string; en: string; icon: string }> = {
  traditions: { pt: "Tradições", en: "Traditions", icon: "🕯️" },
  recipes: { pt: "Receitas", en: "Recipes", icon: "🍰" },
  travel: { pt: "Viagens", en: "Travel", icon: "✈️" },
  childhood: { pt: "Infância", en: "Childhood", icon: "🧸" },
};

export default function Memories() {
  const { t, locale } = useI18n();
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [source, setSource] = useState<"supabase" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function load() {
    fetchMemories().then((r) => {
      setMemories(r.memories);
      setSource(r.source);
      setLoading(false);
    });
  }
  useEffect(() => {
    load();
  }, []);

  const list = cat ? memories.filter((m) => m.category === cat) : memories;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("memories.title")}</h1>
          <SourceBadge source={source} loading={loading} />
        </div>
        <button className="btn-primary" onClick={() => setFormOpen(true)}>＋ {t("memories.add")}</button>
      </div>

      <MemoryForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCat(null)}
          className={`rounded-full px-3 py-1 text-sm ${!cat ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-brand-900"}`}>
          {locale === "pt" ? "Todas" : "All"}
        </button>
        {Object.entries(CATS).map(([k, v]) => (
          <button key={k} onClick={() => setCat(k)}
            className={`rounded-full px-3 py-1 text-sm ${cat === k ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-brand-900"}`}>
            {v.icon} {locale === "pt" ? v.pt : v.en}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-400">{t("common.loading")}</p>
      ) : list.length === 0 ? (
        <div className="card text-center text-stone-400">
          {locale === "pt"
            ? "Ainda não há memórias. Cria a primeira com “Nova memória”."
            : "No memories yet. Create the first with “New memory”."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <article key={m.id} className="card">
              {m.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.cover} alt=""
                  className="mb-2 max-h-40 w-full rounded-xl bg-brand-50 object-contain dark:bg-stone-800" />
              ) : (
                <div className="mb-2 h-32 rounded-xl bg-gradient-to-br from-brand-200 to-gold-200 dark:from-brand-800 dark:to-brand-900" />
              )}
              <div className="text-xs text-stone-400">
                {CATS[m.category]?.icon} {m.date && new Date(m.date).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB")}
              </div>
              <h3 className="mt-1 font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{m.excerpt}</p>
              {source === "supabase" && <Comments parentType="memory" parentId={m.id} />}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
