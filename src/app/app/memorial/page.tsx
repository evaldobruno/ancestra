"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { isSupabaseConfigured } from "@/lib/queries";
import { uploadMedia } from "@/lib/storage";
import { Comments } from "@/components/Comments";
import { fetchViewer, type Viewer } from "@/lib/memories";
import {
  fetchDeparted,
  fetchMemberBasic,
  fetchMemorial,
  addPost,
  deletePost,
  type Departed,
  type MemorialPost,
} from "@/lib/memorial";

const fmt = (s?: string | null) => {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y) return "";
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
};

export default function Memorial() {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const [people, setPeople] = useState<Departed[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Departed | null>(null);
  const [posts, setPosts] = useState<MemorialPost[]>([]);
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>({ userId: null, isSuper: false });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDeparted().then((p) => {
      setPeople(p);
      setLoading(false);
    });
    fetchViewer().then(setViewer);
  }, []);

  const canDelete = (createdBy?: string | null) =>
    viewer.isSuper || (!!viewer.userId && viewer.userId === createdBy);

  async function open(person: Departed) {
    setCurrent(person);
    setPosts([]);
    setMsg(null);
    setPosts(await fetchMemorial(person.id));
  }

  async function reloadPosts() {
    if (current) setPosts(await fetchMemorial(current.id));
  }

  async function addText() {
    if (!current || !text.trim()) return;
    setBusy(true);
    const res = await addPost(current.id, "text", text);
    setBusy(false);
    if (res.ok) { setText(""); reloadPosts(); }
    else setMsg(res.error || "Erro");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !current) return;
    setMsg(null);
    setBusy(true);
    const up = await uploadMedia(file, "memorial");
    if (!up.ok || !up.url) { setBusy(false); setMsg(up.error || "Erro"); return; }
    const res = await addPost(current.id, up.kind === "video" ? "video" : "image", up.url, caption);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) { setCaption(""); reloadPosts(); }
    else setMsg(res.error || "Erro");
  }

  async function remove(id: string) {
    if (!window.confirm(pt ? "Apagar este item?" : "Delete this item?")) return;
    await deletePost(id);
    reloadPosts();
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">{pt ? "Memorial" : "Memorial"}</h1>
        <p className="mt-3 text-stone-500">{pt ? "Disponível depois de iniciar sessão." : "Available once signed in."}</p>
      </div>
    );
  }

  // ── Detail view ──
  if (current) {
    return (
      <div className="mx-auto max-w-3xl">
        <button className="btn-ghost mb-4 text-sm" onClick={() => setCurrent(null)}>
          ← {pt ? "Voltar" : "Back"}
        </button>

        <div className="card mb-5 flex items-center gap-4">
          {current.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover grayscale" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-stone-700">🕯️</div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{current.full_name}</h1>
            {current.known_as && <p className="text-sm text-stone-400">"{current.known_as}"</p>}
            <p className="mt-1 text-sm text-stone-500">
              {fmt(current.birth_date)}{current.death_date ? ` — ${fmt(current.death_date)}` : ""}
            </p>
          </div>
        </div>

        {/* Story blocks */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-center text-stone-400">
              {pt ? "Ainda não há nada. Começa a contar a história desta pessoa." : "Nothing yet. Start telling their story."}
            </p>
          )}
          {posts.map((p) => (
            <div key={p.id} className="card group relative">
              {canDelete(p.created_by) && (
                <button
                  onClick={() => remove(p.id)}
                  className="absolute right-3 top-3 text-sm text-red-500 opacity-60 hover:opacity-100"
                  title={pt ? "Apagar" : "Delete"}
                >🗑️</button>
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
        <div className="card mt-6">
          <h2 className="mb-2 font-semibold">{pt ? "Acrescentar à história" : "Add to the story"}</h2>
          <textarea
            className="input"
            rows={3}
            placeholder={pt ? "Escreve uma memória, uma história, umas palavras…" : "Write a memory, a story, a few words…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
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

        {/* Comments / condolences */}
        <div className="card mt-6">
          <Comments parentType="member" parentId={current.id} startOpen />
        </div>
      </div>
    );
  }

  // ── List of departed ──
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">{pt ? "Em memória" : "In memory"}</h1>
      <p className="mt-1 text-sm text-stone-400">
        {pt
          ? "Honrar quem já partiu com histórias, fotografias e vídeos."
          : "Honouring those who passed with stories, photos and videos."}
      </p>

      {loading ? (
        <p className="mt-6 text-stone-400">{pt ? "A carregar…" : "Loading…"}</p>
      ) : people.length === 0 ? (
        <div className="card mt-6 text-center text-stone-400">
          {pt
            ? "Ainda não há ninguém marcado como falecido. Marca o estado da pessoa na ficha para aparecer aqui."
            : "No one marked as deceased yet."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <button key={p.id} onClick={() => open(p)} className="card text-left transition hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover grayscale" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl dark:bg-stone-700">🕯️</div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.known_as || p.full_name}</div>
                  <div className="text-xs text-stone-400">
                    {fmt(p.birth_date)}{p.death_date ? ` — ${fmt(p.death_date)}` : ""}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
