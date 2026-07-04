"use client";

// Historical documents — certificates, letters, old papers, scans…
// Uses the shared `documents` table. RLS: validated members read; own family writes.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";
import { logAction } from "@/lib/audit";

export type Result = { ok: boolean; error?: string };

export type DocRow = {
  id: string;
  name: string;
  url: string;         // stored in storage_path
  doc_type: string | null;
  doc_date: string | null;
  size_bytes: number | null;
  created_at: string;
};

export async function fetchDocuments(): Promise<DocRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data } = await supabase
    .from("documents")
    .select("id,name,storage_path,doc_type,doc_date,size_bytes,created_at")
    .is("deleted_at", null)
    .order("doc_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    url: d.storage_path,
    doc_type: d.doc_type,
    doc_date: d.doc_date,
    size_bytes: d.size_bytes,
    created_at: d.created_at,
  }));
}

export async function addDocument(input: {
  name: string;
  url: string;
  doc_type?: string;
  doc_date?: string;
  size_bytes?: number;
}): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!input.name.trim()) return { ok: false, error: "Indica um nome." };
  if (!input.url) return { ok: false, error: "Falta o ficheiro." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const { data: me } = await supabase.from("users").select("family_id").eq("id", auth.user.id).single();
  if (!me?.family_id) return { ok: false, error: "Ainda não tens família atribuída." };

  const { error } = await supabase.from("documents").insert({
    family_id: me.family_id,
    name: input.name.trim(),
    storage_path: input.url,
    doc_type: input.doc_type || null,
    doc_date: input.doc_date || null,
    size_bytes: input.size_bytes ?? null,
    visibility: "everyone",
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };
  logAction("create", "document", input.name.trim());
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  logAction("delete", "document", undefined, id);
  return { ok: true };
}
