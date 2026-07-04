"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Modal } from "@/components/Modal";
import { createEvent, updateEvent, deleteEvent, type EditableEvent } from "@/lib/mutations";

const EMPTY = {
  title: "",
  date: "",
  time: "",
  location: "",
  category: "",
  description: "",
};

export function EventForm({
  open,
  onClose,
  onSaved,
  defaultDate,
  editEvent,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultDate?: string;
  editEvent?: EditableEvent | null;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const isEdit = !!editEvent;
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (editEvent) {
        setForm({
          title: editEvent.title || "",
          date: editEvent.date || "",
          time: editEvent.time || "",
          location: editEvent.location || "",
          category: editEvent.category || "",
          description: editEvent.description || "",
        });
      } else {
        setForm({ ...EMPTY, date: defaultDate || "" });
      }
    }
  }, [open, defaultDate, editEvent]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const CATS = [
    { v: "birthday", pt: "Aniversário", en: "Birthday" },
    { v: "wedding", pt: "Casamento", en: "Wedding" },
    { v: "reunion", pt: "Encontro de família", en: "Reunion" },
    { v: "trip", pt: "Viagem", en: "Trip" },
    { v: "meeting", pt: "Reunião", en: "Meeting" },
    { v: "other", pt: "Outro", en: "Other" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError(pt ? "O título é obrigatório." : "Title is required.");
    if (!form.date) return setError(pt ? "Escolha a data." : "Pick a date.");
    setSaving(true);
    const res = isEdit ? await updateEvent(editEvent!.id, form) : await createEvent(form);
    setSaving(false);
    if (!res.ok) return setError(res.error || "Erro");
    onSaved?.();
    onClose();
  }

  async function remove() {
    if (!editEvent) return;
    if (!window.confirm(pt ? `Apagar "${editEvent.title}"?` : `Delete "${editEvent.title}"?`)) return;
    setSaving(true);
    const res = await deleteEvent(editEvent.id);
    setSaving(false);
    if (!res.ok) return setError(res.error || "Erro");
    onSaved?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="📅"
      title={isEdit ? (pt ? "Editar evento" : "Edit event") : pt ? "Novo evento" : "New event"}
      subtitle={pt ? "Agenda da família" : "Family calendar"}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label className="label">
            {pt ? "Título" : "Title"} <span className="req">*</span>
          </label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={pt ? "Ex.: Almoço de família" : "e.g. Family lunch"}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="label">
              {pt ? "Data" : "Date"} <span className="req">*</span>
            </label>
            <input type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{pt ? "Hora (opcional)" : "Time (optional)"}</label>
            <input type="time" className="input" value={form.time} onChange={(e) => set("time", e.target.value)} />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="label">{pt ? "Local" : "Location"}</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder={pt ? "Cidade, casa, restaurante…" : "City, home, venue…"}
            />
          </div>
          <div className="field">
            <label className="label">{pt ? "Categoria" : "Category"}</label>
            <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">—</option>
              {CATS.map((c) => (
                <option key={c.v} value={c.v}>
                  {pt ? c.pt : c.en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label">{pt ? "Notas" : "Notes"}</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {isEdit && (
            <button type="button" className="btn-ghost text-red-600" onClick={remove} disabled={saving}>
              🗑️ {pt ? "Apagar" : "Delete"}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose}>
            {pt ? "Cancelar" : "Cancel"}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving
              ? pt ? "A guardar…" : "Saving…"
              : isEdit ? (pt ? "Guardar alterações" : "Save changes") : pt ? "Guardar evento" : "Save event"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
