"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchComments, addComment, deleteComment, type Comment } from "@/lib/comments";

const fmt = (s: string, pt: boolean) =>
  new Date(s).toLocaleDateString(pt ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

// Reusable comment thread for any item (memory, memorial, …).
export function Comments({
  parentType,
  parentId,
  startOpen = false,
}: {
  parentType: string;
  parentId: string;
  startOpen?: boolean;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const [open, setOpen] = useState(startOpen);
  const [items, setItems] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await fetchComments(parentType, parentId));
    setLoaded(true);
  }
  useEffect(() => {
    if (open && !loaded) load();
  }, [open]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const res = await addComment(parentType, parentId, text);
    setBusy(false);
    if (res.ok) { setText(""); load(); }
    else alert(res.error || "Erro");
  }

  async function remove(id: string) {
    if (!window.confirm(pt ? "Apagar comentário?" : "Delete comment?")) return;
    await deleteComment(id);
    load();
  }

  return (
    <div className="mt-3 border-t border-brand-50 pt-2 dark:border-brand-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
      >
        💬 {pt ? "Comentários" : "Comments"}{loaded ? ` (${items.length})` : ""} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {loaded && items.length === 0 && (
            <p className="text-sm text-stone-400">{pt ? "Sê o primeiro a comentar." : "Be the first to comment."}</p>
          )}
          {items.map((c) => (
            <div key={c.id} className="group rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-stone-800">
              <div className="flex items-center justify-between">
                <span className="font-medium text-brand-700 dark:text-brand-200">{c.author_name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400">{fmt(c.created_at, pt)}</span>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-[11px] text-red-500 opacity-0 group-hover:opacity-100"
                    title={pt ? "Apagar" : "Delete"}
                  >🗑️</button>
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-stone-700 dark:text-stone-200">{c.body}</p>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              className="input"
              placeholder={pt ? "Escreve um comentário…" : "Write a comment…"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn-primary shrink-0" onClick={send} disabled={busy || !text.trim()}>
              {pt ? "Enviar" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
