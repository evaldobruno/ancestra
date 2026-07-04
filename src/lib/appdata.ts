"use client";

// Read layer for Dashboard / Memories. Logged in → real data (empty when the
// account is clean). Not logged in → in-memory demo preview.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";
import {
  BIRTHDAYS as DEMO_BIRTHDAYS,
  EVENTS as DEMO_EVENTS,
  MEMORIES as DEMO_MEMORIES,
  ON_THIS_DAY as DEMO_OTD,
  TASKS as DEMO_TASKS,
} from "@/lib/demo-data";

export type Dash = {
  loggedIn: boolean;
  source: "supabase" | "demo";
  birthdays: { id: string; name: string; date: string }[];
  events: { id: string; title: string; date: string }[];
  memories: { id: string; title: string; excerpt: string; date: string }[];
  tasks: { id: string; title: string; due: string }[];
  onThisDay: { id: string; text: string }[];
};

// Timezone-safe: work from the YYYY-MM-DD parts, never via UTC conversion
// (new Date("2020-07-30") is UTC midnight and shifts a day in PT/UTC+ zones).
function nextBirthday(birth: string): string {
  const [, mm, dd] = birth.slice(0, 10).split("-").map(Number);
  const now = new Date();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();
  let y = now.getFullYear();
  if (mm < todayM || (mm === todayM && dd < todayD)) y += 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mm)}-${pad(dd)}`;
}

export async function fetchDashboard(): Promise<Dash> {
  const demo: Dash = {
    loggedIn: false,
    source: "demo",
    birthdays: DEMO_BIRTHDAYS.map((b) => ({ id: b.id, name: b.name, date: b.date })),
    events: DEMO_EVENTS.map((e) => ({ id: e.id, title: e.title, date: e.date })),
    memories: DEMO_MEMORIES.map((m) => ({ id: m.id, title: m.title, excerpt: m.excerpt, date: m.date })),
    tasks: DEMO_TASKS.map((t) => ({ id: t.id, title: t.title, due: t.due })),
    onThisDay: DEMO_OTD.map((o) => ({ id: o.id, text: o.text })),
  };
  if (!isSupabaseConfigured()) return demo;

  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return demo;

    const todayIso = new Date().toISOString();
    const [{ data: events }, { data: memories }, { data: members }, { data: tasks }] =
      await Promise.all([
        supabase.from("events").select("id,title,starts_at").is("deleted_at", null)
          .gte("starts_at", todayIso).order("starts_at").limit(5),
        supabase.from("memories").select("id,title,story,memory_date").is("deleted_at", null)
          .order("memory_date", { ascending: false }).limit(3),
        supabase.from("family_members").select("id,known_as,full_name,birth_date")
          .is("deleted_at", null).not("birth_date", "is", null),
        supabase.from("tasks").select("id,title,due_date,status").is("deleted_at", null)
          .neq("status", "done").order("due_date").limit(5),
      ]);

    const birthdays = (members ?? [])
      .map((m: any) => ({
        id: m.id,
        name: m.known_as || (m.full_name || "").split(" ")[0],
        date: nextBirthday(m.birth_date),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    return {
      loggedIn: true,
      source: "supabase",
      birthdays,
      events: (events ?? []).map((e: any) => ({ id: e.id, title: e.title, date: e.starts_at.slice(0, 10) })),
      memories: (memories ?? []).map((m: any) => ({
        id: m.id, title: m.title, excerpt: (m.story || "").slice(0, 80), date: m.memory_date || "",
      })),
      tasks: (tasks ?? []).map((t: any) => ({ id: t.id, title: t.title, due: t.due_date || "" })),
      onThisDay: [],
    };
  } catch {
    return demo;
  }
}

export type MemoryRow = { id: string; title: string; category: string; date: string; excerpt: string; cover?: string; coverType?: "image" | "video"; location?: string; createdBy?: string | null };

function coverOf(media: any): { url?: string; type?: "image" | "video" } {
  if (!Array.isArray(media) || !media.length) return {};
  const img = media.find((m) => m && m.type === "image");
  if (img?.url) return { url: img.url, type: "image" };
  const vid = media.find((m) => m && m.type === "video");
  if (vid?.url) return { url: vid.url, type: "video" };
  const any = media[0];
  return any?.url ? { url: any.url, type: any.type === "video" ? "video" : "image" } : {};
}

export async function fetchMemories(): Promise<{ memories: MemoryRow[]; source: "supabase" | "demo" }> {
  if (!isSupabaseConfigured())
    return { memories: DEMO_MEMORIES as any, source: "demo" };
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { memories: DEMO_MEMORIES as any, source: "demo" };
    const { data } = await supabase
      .from("memories")
      .select("id,title,category,memory_date,story,media,location,created_by")
      .is("deleted_at", null)
      .order("memory_date", { ascending: false });

    // Cover can also come from the memory's media blocks (photos/videos added inside).
    const ids = (data ?? []).map((m: any) => m.id);
    const coverMap: Record<string, { url: string; type: "image" | "video" }> = {};
    if (ids.length) {
      const { data: mp } = await supabase
        .from("memory_posts")
        .select("memory_id,type,body,position,created_at")
        .in("memory_id", ids)
        .is("deleted_at", null)
        .in("type", ["image", "video"])
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      (mp ?? []).forEach((p: any) => {
        if (!coverMap[p.memory_id] && p.body)
          coverMap[p.memory_id] = { url: p.body, type: p.type === "video" ? "video" : "image" };
      });
    }

    return {
      memories: (data ?? []).map((m: any) => {
        const fromMedia = coverOf(m.media);
        const cov = coverMap[m.id] || fromMedia;
        return {
          id: m.id, title: m.title, category: m.category || "traditions",
          date: m.memory_date || "", excerpt: (m.story || "").slice(0, 120),
          cover: cov.url, coverType: cov.type, location: m.location || "", createdBy: m.created_by ?? null,
        };
      }),
      source: "supabase",
    };
  } catch {
    return { memories: DEMO_MEMORIES as any, source: "demo" };
  }
}
