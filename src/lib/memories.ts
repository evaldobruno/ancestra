"use client";

// Memory "story blocks" — text / image / video posts inside a memory,
// mirroring the memorial. Deletion is owner-or-super (enforced by RLS).

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

export type Result = { ok: boolean; error?: string };

export type MemoryPost = {
  id: string;
  type: "text" | "image" | "video";
  body: string | null;
  caption: string | null;
  created_at: string;
  created_by: string | null;
};

export type Viewer = { userId: string | null; isSuper: boolean };

export async function fetchViewer(): Promise<Viewer> {
  if (!isSupabaseConfigured()) return { userId: null, isSuper: false };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { userId: null, isSuper: false };
  const { data: me } = await supabase.from("users").select("role").eq("id", auth.user.id).single();
  return { userId: auth.user.id, isSuper: me?.role === "super_admin" };
}

export async function fetchMemoryPosts(memoryId: string): Promise<MemoryPost[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("memory_posts")
    .select("id,type,body,caption,created_at,created_by")
    .eq("memory_id", memoryId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as MemoryPost[];
}

export async function addMemoryPost(
  memoryId: string,
  type: "text" | "image" | "video",
  body: string,
  caption?: string
): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!body.trim()) return { ok: false, error: "Sem conteúdo." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const { data: m } = await supabase.from("memories").select("family_id").eq("id", memoryId).single();
  if (!m?.family_id) return { ok: false, error: "Memória não encontrada." };

  const { error } = await supabase.from("memory_posts").insert({
    memory_id: memoryId,
    family_id: m.family_id,
    type,
    body: body.trim(),
    caption: caption?.trim() || null,
    position: Date.now() % 2000000000,
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMemoryPost(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("memory_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Soft-delete a whole memory (owner or super, enforced by RLS).
export async function deleteMemory(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("memories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
