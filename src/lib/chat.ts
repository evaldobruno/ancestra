"use client";

// Shared family chat, stored in Supabase so everyone sees the same messages.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

export type ChatMessage = {
  id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  mine: boolean;
};

export async function getGeneralChatId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("chats")
    .select("id")
    .eq("type", "general")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.id ?? null;
}

export async function fetchMessages(chatId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const myId = auth?.user?.id;
  const { data } = await supabase
    .from("chat_messages")
    .select("id,body,sender_id,created_at")
    .eq("chat_id", chatId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(500);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: any) => r.sender_id).filter(Boolean))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: us } = await supabase.from("users").select("id,full_name,display_name,email").in("id", ids);
    (us ?? []).forEach((u: any) =>
      names.set(u.id, u.display_name || u.full_name || (u.email || "").split("@")[0])
    );
  }
  return rows.map((r: any) => ({
    id: r.id,
    body: r.body,
    sender_id: r.sender_id,
    sender_name: names.get(r.sender_id) || "—",
    created_at: r.created_at,
    mine: r.sender_id === myId,
  }));
}

export async function sendMessage(chatId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!body.trim()) return { ok: false };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const { error } = await supabase.from("chat_messages").insert({
    chat_id: chatId,
    sender_id: auth.user.id,
    body: body.trim(),
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
