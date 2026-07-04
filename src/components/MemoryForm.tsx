"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Modal } from "@/components/Modal";
import { PhotoUpload } from "@/components/PhotoUpload";
import { createMemory } from "@/lib/mutations";

const EMPTY = {
  title: "",
  category: "traditions",
  memory_date: "",
  location: "",
  story: "",
  photo: "",
};

const CATS = [
  { v: "traditions", pt: "Tradições", en: "Traditions", icon: "🕯️" },
  { v: "recipes", pt: "Receitas", en: "Recipes", icon: "🍰" },
  { v: "travel", pt: "Viagens", en: "Travel", icon: "✈️" },
  { v: "childhood", pt: "Infância", en: "Childhood", icon: "🧸" },
];

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm({ ...EMPTY });
    }
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError(pt ? "O título é obrigatório." : "Title is required.");
    setSaving(true);
    const res = await createMemory({
      ...form,
      media: form.photo ? [{ url: form.photo, type: "image" }] : [],
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
        <PhotoUpload
          value={form.photo}
          onChange={(url) => set("photo", url)}
          folder="memories"
          shape="square"
          label={pt ? "Foto" : "Photo"}
        />
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

        <div className="form-grid">
          <div className="field">
            <label className="label">{pt ? "Categoria" : "Category"}</label>
            <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATS.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.icon} {pt ? c.pt : c.en}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">{pt ? "Data (opcional)" : "Date (optional)"}</label>
            <input type="date" className="input" value={form.memory_date} onChange={(e) => set("memory_date", e.target.value)} />
          </div>
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
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (pt ? "A guardar…" : "Saving…") : pt ? "Guardar memória" : "Save memory"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
