"use client";

// Comments on memories and memorial pages. Uses the shared `comments` table
// (parent_type + parent_id). RLS: validated members read; own family writes.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

export type Result = { ok: boolean; error?: string };
export type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
};

export async function fetchComments(parentType: string, parentId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("comments")
    .select("id,body,created_at,author_id")
    .eq("parent_type", parentType)
    .eq("parent_id", parentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: any) => r.author_id).filter(Boolean))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: us } = await supabase.from("users").select("id,full_name,display_name,email").in("id", ids);
    (us ?? []).forEach((u: any) =>
      names.set(u.id, u.display_name || u.full_name || (u.email || "").split("@")[0])
    );
  }
  return rows.map((r: any) => ({
    ...r,
    author_name: names.get(r.author_id) || "—",
  })) as Comment[];
}

async function familyIdFor(parentType: string, parentId: string): Promise<string | null> {
  const supabase = createClient();
  if (parentType === "memory") {
    const { data } = await supabase.from("memories").select("family_id").eq("id", parentId).single();
    return data?.family_id ?? null;
  }
  // member / memorial
  const { data } = await supabase.from("family_members").select("family_id").eq("id", parentId).single();
  return data?.family_id ?? null;
}

export async function addComment(parentType: string, parentId: string, body: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!body.trim()) return { ok: false, error: "Sem texto." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const familyId = await familyIdFor(parentType, parentId);
  if (!familyId) return { ok: false, error: "Item não encontrado." };
  const { error } = await supabase.from("comments").insert({
    family_id: familyId,
    parent_type: parentType,
    parent_id: parentId,
    author_id: auth.user.id,
    body: body.trim(),
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteComment(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
