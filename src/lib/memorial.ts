"use client";

// "Em memória" — tributes for family members who have passed away.
// Each memorial is a sequence of posts: text, image or video.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

export type Result = { ok: boolean; error?: string };

export type Departed = {
  id: string;
  full_name: string;
  known_as: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
};

export type MemorialPost = {
  id: string;
  type: "text" | "image" | "video";
  body: string | null;
  caption: string | null;
  created_at: string;
  created_by: string | null;
};

// People marked as deceased.
export async function fetchDeparted(): Promise<Departed[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data } = await supabase
    .from("family_members")
    .select("id,full_name,known_as,birth_date,death_date,avatar_url,status")
    .is("deleted_at", null)
    .eq("status", "deceased")
    .order("full_name");
  return (data ?? []) as Departed[];
}

export async function fetchMemberBasic(id: string): Promise<Departed | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("family_members")
    .select("id,full_name,known_as,birth_date,death_date,avatar_url")
    .eq("id", id)
    .single();
  return (data as Departed) ?? null;
}

export async function fetchMemorial(memberId: string): Promise<MemorialPost[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("memorial_posts")
    .select("id,type,body,caption,created_at,created_by")
    .eq("member_id", memberId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as MemorialPost[];
}

export async function addPost(
  memberId: string,
  type: "text" | "image" | "video",
  body: string,
  caption?: string
): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!body.trim()) return { ok: false, error: "Sem conteúdo." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const { data: m } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("id", memberId)
    .single();
  if (!m?.family_id) return { ok: false, error: "Pessoa não encontrada." };

  const { error } = await supabase.from("memorial_posts").insert({
    member_id: memberId,
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

export async function deletePost(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("memorial_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
