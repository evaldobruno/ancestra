"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchMemories, type MemoryRow } from "@/lib/appdata";
import { SourceBadge } from "@/components/SourceBadge";
import { MemoryForm } from "@/components/MemoryForm";
import { Comments } from "@/components/Comments";
import { uploadMedia } from "@/lib/storage";
import {
  fetchViewer,
  fetchMemoryPosts,
  addMemoryPost,
  deleteMemoryPost,
  deleteMemory,
  type Viewer,
  type MemoryPost,
} from "@/lib/memories";

const CATS: Record<string, { pt: string; en: string; icon: string }> = {
  traditions: { pt: "Tradições", en: "Traditions", icon: "🕯️" },
  recipes: { pt: "Receitas", en: "Recipes", icon: "🍰" },
  travel: { pt: "Viagens", en: "Travel", icon: "✈️" },
  childhood: { pt: "Infância", en: "Childhood", icon: "🧸" },
};

const fmt = (s?: string | null, locale = "pt") => {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y) return "";
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB");
};

export default function Memories() {
  const { t, locale } = useI18n();
  const pt = locale === "pt";
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [source, setSource] = useState<"supabase" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({ userId: null, isSuper: false });

  // Detail state
  const [current, setCurrent] = useState<MemoryRow | null>(null);
  const [posts, setPosts] = useState<MemoryPost[]>([]);
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetchMemories().then((r) => {
      setMemories(r.memories);
      setSource(r.source);
      setLoading(false);
    });
  }
  useEffect(() => {
    load();
    fetchViewer().then(setViewer);
  }, []);

  const canDelete = (createdBy?: string | null) =>
    viewer.isSuper || (!!viewer.userId && viewer.userId === createdBy);

  async function open(m: MemoryRow) {
    setCurrent(m);
    setPosts([]);
    setMsg(null);
    setText("");
    setCaption("");
    setPosts(await fetchMemoryPosts(m.id));
  }
  async function reloadPosts() {
    if (current) setPosts(await fetchMemoryPosts(current.id));
  }

  async function addText() {
    if (!current || !text.trim()) return;
    setBusy(true);
    const res = await addMemoryPost(current.id, "text", text, caption);
    setBusy(false);
    if (res.ok) { setText(""); setCaption(""); reloadPosts(); }
    else setMsg(res.error || "Erro");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !current) return;
    setMsg(null);
    setBusy(true);
    const up = await uploadMedia(file, "memories");
    if (!up.ok || !up.url) { setBusy(false); setMsg(up.error || "Erro"); return; }
    const res = await addMemoryPost(current.id, up.kind === "video" ? "video" : "image", up.url, caption);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) { setCaption(""); reloadPosts(); }
    else setMsg(res.error || "Erro");
  }

  async function removePost(id: string) {
    if (!window.confirm(pt ? "Apagar este item?" : "Delete this item?")) return;
    await deleteMemoryPost(id);
    reloadPosts();
  }

  async function removeMemory(m: MemoryRow) {
    if (!window.confirm(pt ? `Apagar a memória “${m.title}”?` : `Delete memory “${m.title}”?`)) return;
    const res = await deleteMemory(m.id);
    if (!res.ok) { alert(res.error || "Erro"); return; }
    if (current?.id === m.id) setCurrent(null);
    load();
  }

  const list = cat ? memories.filter((m) => m.category === cat) : memories;

  // ── Detail view ──
  if (current) {
    return (
      <div className="mx-auto max-w-3xl">
        <button className="btn-ghost mb-4 text-sm" onClick={() => setCurrent(null)}>
          ← {pt ? "Voltar" : "Back"}
        </button>

        <div className="card mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-stone-400">
                {CATS[current.category]?.icon} {fmt(current.date, locale)}
                {current.location ? ` · ${current.location}` : ""}
              </div>
              <h1 className="mt-1 text-2xl font-bold">{current.title}</h1>
            </div>
            {source === "supabase" && canDelete(current.createdBy) && (
              <button onClick={() => removeMemory(current)} className="text-sm text-red-500 opacity-70 hover:opacity-100"
                title={pt ? "Apagar memória" : "Delete memory"}>🗑️</button>
            )}
          </div>
        </div>

        {/* Story blocks */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-center text-stone-400">
              {pt ? "Ainda não há nada. Começa a contar esta memória." : "Nothing yet. Start telling this memory."}
            </p>
          )}
          {posts.map((p) => (
            <div key={p.id} className="card group relative">
              {canDelete(p.created_by) && (
                <button onClick={() => removePost(p.id)}
                  className="absolute right-3 top-3 text-sm text-red-500 opacity-60 hover:opacity-100"
                  title={pt ? "Apagar" : "Delete"}>🗑️</button>
              )}
              {p.type === "text" && (
                <p className="whitespace-pre-wrap pr-6 text-[15px] leading-relaxed text-stone-700 dark:text-stone-200">{p.body}</p>
              )}
              {p.type === "image" && p.body && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.body} alt="" className="w-full rounded-xl object-contain" />
              )}
              {p.type === "video" && p.body && (
                <video src={p.body} controls className="w-full rounded-xl" />
              )}
              {p.caption && p.type !== "text" && (
                <p className="mt-2 text-center text-sm italic text-stone-500">{p.caption}</p>
              )}
            </div>
          ))}
        </div>

        {/* Composer */}
        {source === "supabase" && (
          <div className="card mt-6">
            <h2 className="mb-2 font-semibold">{pt ? "Acrescentar à memória" : "Add to the memory"}</h2>
            <textarea className="input" rows={3}
              placeholder={pt ? "Escreve uma história, umas palavras…" : "Write a story, a few words…"}
              value={text} onChange={(e) => setText(e.target.value)} />
            <input className="input mt-2" value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder={pt ? "Legenda (para a próxima foto/vídeo — opcional)" : "Caption (for the next photo/video — optional)"} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button className="btn-primary" onClick={addText} disabled={busy || !text.trim()}>
                {pt ? "Adicionar texto" : "Add text"}
              </button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? (pt ? "A carregar…" : "Uploading…") : pt ? "📷 Foto / 🎬 Vídeo" : "📷 Photo / 🎬 Video"}
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />
            </div>
            {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
          </div>
        )}

        {/* Comments */}
        {source === "supabase" && (
          <div className="card mt-6">
            <Comments parentType="memory" parentId={current.id} startOpen />
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
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
          {pt ? "Todas" : "All"}
        </button>
        {Object.entries(CATS).map(([k, v]) => (
          <button key={k} onClick={() => setCat(k)}
            className={`rounded-full px-3 py-1 text-sm ${cat === k ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-brand-900"}`}>
            {v.icon} {pt ? v.pt : v.en}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-400">{t("common.loading")}</p>
      ) : list.length === 0 ? (
        <div className="card text-center text-stone-400">
          {pt
            ? "Ainda não há memórias. Cria a primeira com “Nova memória”."
            : "No memories yet. Create the first with “New memory”."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <div key={m.id} className="card group relative text-left transition hover:scale-[1.01]">
              {source === "supabase" && canDelete(m.createdBy) && (
                <button onClick={() => removeMemory(m)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-white/80 px-1.5 text-sm text-red-500 opacity-70 hover:opacity-100 dark:bg-stone-900/80"
                  title={pt ? "Apagar" : "Delete"}>🗑️</button>
              )}
              <button onClick={() => open(m)} className="block w-full text-left">
                {m.cover && m.coverType === "video" ? (
                  <div className="relative mb-2">
                    <video src={m.cover} muted playsInline preload="metadata"
                      className="max-h-40 w-full rounded-xl bg-black object-contain" />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">▶</span>
                    </span>
                  </div>
                ) : m.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.cover} alt=""
                    className="mb-2 max-h-40 w-full rounded-xl bg-brand-50 object-contain dark:bg-stone-800" />
                ) : (
                  <div className="mb-2 h-32 rounded-xl bg-gradient-to-br from-brand-200 to-gold-200 dark:from-brand-800 dark:to-brand-900" />
                )}
                <div className="text-xs text-stone-400">
                  {CATS[m.category]?.icon} {fmt(m.date, locale)}
                </div>
                <h3 className="mt-1 font-semibold">{m.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-stone-500">{m.excerpt}</p>
                <p className="mt-2 text-xs font-medium text-brand-500">{pt ? "Abrir →" : "Open →"}</p>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
