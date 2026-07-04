"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { EventForm } from "@/components/EventForm";
import {
  fetchCalendarData,
  fetchEventById,
  type CalEvent,
  type CalBirthday,
  type EditableEvent,
} from "@/lib/mutations";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Calendar() {
  const { t, locale } = useI18n();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [birthdays, setBirthdays] = useState<CalBirthday[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);
  const [editEvent, setEditEvent] = useState<EditableEvent | null>(null);

  async function load() {
    const r = await fetchCalendarData();
    setEvents(r.events);
    setBirthdays(r.birthdays);
  }
  useEffect(() => {
    load();
  }, []);

  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const daysIn = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startDay + daysIn }, (_, i) =>
    i < startDay ? null : i - startDay + 1
  );

  // Timezone-safe: build the ISO from parts, never via toISOString().
  const dayItems = (d: number) => {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const out: { label: string; color: string; id?: string }[] = [];
    events
      .filter((e) => e.date === iso)
      .forEach((e) => out.push({ label: e.title, color: "#d4a437", id: e.id }));
    birthdays
      .filter((b) => b.month === month + 1 && b.day === d)
      .forEach((b) => out.push({ label: `🎂 ${b.name}`, color: "#406341" }));
    return out;
  };

  const monthName = new Date(year, month).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB",
    { month: "long", year: "numeric" });
  const weekdays = locale === "pt"
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const shift = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const openNew = (d?: number) => {
    setEditEvent(null);
    setFormDate(d ? `${year}-${pad(month + 1)}-${pad(d)}` : undefined);
    setFormOpen(true);
  };

  async function openEdit(id: string) {
    const full = await fetchEventById(id);
    if (full) {
      setEditEvent(full);
      setFormOpen(true);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditEvent(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("calendar.title")}</h1>
        <button className="btn-primary" onClick={() => openNew()}>＋ {t("dash.addEvent")}</button>
      </div>

      <EventForm open={formOpen} onClose={closeForm} onSaved={load} defaultDate={formDate} editEvent={editEvent} />

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <button className="btn-ghost px-3" onClick={() => shift(-1)}>‹</button>
          <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
          <button className="btn-ghost px-3" onClick={() => shift(1)}>›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
          {weekdays.map((w) => <div key={w} className="pb-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div key={i}
                onClick={() => d && openNew(d)}
                className={`min-h-[72px] rounded-lg border p-1 text-left text-sm ${
                  d ? "cursor-pointer border-brand-100 hover:bg-brand-50 dark:border-stone-800 dark:hover:bg-stone-800" : "border-transparent"
                } ${isToday ? "bg-brand-50 dark:bg-stone-800" : ""}`}>
                {d && (
                  <>
                    <div className={`text-xs ${isToday ? "font-bold text-brand-600" : "text-stone-400"}`}>{d}</div>
                    {dayItems(d).map((it, k) => (
                      <div key={k}
                        onClick={(e) => { e.stopPropagation(); if (it.id) openEdit(it.id); }}
                        className={`mt-0.5 truncate rounded px-1 text-[10px] text-white ${it.id ? "cursor-pointer hover:brightness-110" : ""}`}
                        style={{ background: it.color }}
                        title={it.id ? (locale === "pt" ? "Editar evento" : "Edit event") : undefined}>
                        {it.label}</div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
