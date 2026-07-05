"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Modal } from "@/components/Modal";
import { uploadMedia } from "@/lib/storage";
import { createMemory } from "@/lib/mutations";

const EMPTY = {
  title: "",
  category: "traditions",
  memory_date: "",
  location: "",
  story: "",
  photo: "",
  media_type: "image",
};

export function MemoryForm({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm({ ...EMPTY });
    }
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const up = await uploadMedia(file, "memories");
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!up.ok || !up.url) { setError(up.error || "Erro"); return; }
    set("photo", up.url);
    set("media_type", up.kind === "video" ? "video" : "image");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError(pt ? "O título é obrigatório." : "Title is required.");
    setSaving(true);
    const res = await createMemory({
      ...form,
      media: form.photo ? [{ url: form.photo, type: form.media_type }] : [],
    });
    setSaving(false);
    if (!res.ok) return setError(res.error || "Erro");
    onSaved?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="📸"
      title={pt ? "Nova memória" : "New memory"}
      subtitle={pt ? "Guarde uma história ou momento da família" : "Save a family story or moment"}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label className="label">{pt ? "Foto ou vídeo" : "Photo or video"}</label>
          {form.photo ? (
            <div className="relative">
              {form.media_type === "video" ? (
                <video src={form.photo} controls className="w-full rounded-xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo} alt="" className="w-full rounded-xl object-contain" />
              )}
              <button
                type="button"
                onClick={() => { set("photo", ""); set("media_type", "image"); }}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 text-white hover:bg-black/80"
                title={pt ? "Remover" : "Remove"}
              >✕</button>
            </div>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? (pt ? "A carregar…" : "Uploading…") : pt ? "📷 Foto / 🎬 Vídeo" : "📷 Photo / 🎬 Video"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />
          <p className="mt-1 text-xs text-stone-400">
            {pt ? "Podes adicionar mais fotos e vídeos depois, ao abrir a memória." : "You can add more photos and videos later, inside the memory."}
          </p>
        </div>

        <div className="field">
          <label className="label">
            {pt ? "Título" : "Title"} <span className="req">*</span>
          </label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={pt ? "Ex.: O Natal na casa da avó" : "e.g. Christmas at grandma's"}
          />
        </div>

        <div className="field">
          <label className="label">{pt ? "Data (opcional)" : "Date (optional)"}</label>
          <input type="date" className="input" value={form.memory_date} onChange={(e) => set("memory_date", e.target.value)} />
        </div>

        <div className="field">
          <label className="label">{pt ? "Local" : "Location"}</label>
          <input
            className="input"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder={pt ? "Onde aconteceu?" : "Where did it happen?"}
          />
        </div>

        <div className="field">
          <label className="label">{pt ? "História" : "Story"}</label>
          <textarea
            className="input"
            rows={4}
            value={form.story}
            onChange={(e) => set("story", e.target.value)}
            placeholder={pt ? "Conta o que aconteceu…" : "Tell what happened…"}
          />
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {pt ? "Cancelar" : "Cancel"}
          </button>
          <button type="submit" className="btn-primary" disabled={saving || busy}>
            {saving ? (pt ? "A guardar…" : "Saving…") : pt ? "Guardar memória" : "Save memory"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
