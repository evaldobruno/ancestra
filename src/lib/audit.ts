"use client";

// Simple activity log. Every meaningful action records who, what and when.
// Only the super admin can read it (RLS).

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

// Fire-and-forget: never block or break the main action if logging fails.
export async function logAction(
  action: "create" | "update" | "delete" | "invite" | "authorize",
  entity: string,
  label?: string,
  entityId?: string
) {
  try {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    const { data: me } = await supabase.from("users").select("family_id").eq("id", auth.user.id).single();
    await supabase.from("audit_logs").insert({
      family_id: me?.family_id ?? null,
      actor_id: auth.user.id,
      action,
      entity,
      entity_id: entityId ?? null,
      metadata: label ? { label } : {},
    });
  } catch {
    /* ignore logging errors */
  }
}

export type AuditRow = {
  id: string;
  action: string;
  entity: string;
  label: string | null;
  actor_name: string;
  created_at: string;
};

export async function fetchAuditLog(limit = 200): Promise<AuditRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id,action,entity,metadata,actor_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: us } = await supabase.from("users").select("id,full_name,display_name,email").in("id", ids);
    (us ?? []).forEach((u: any) =>
      names.set(u.id, u.display_name || u.full_name || (u.email || "").split("@")[0])
    );
  }
  return rows.map((r: any) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    label: r.metadata?.label ?? null,
    actor_name: names.get(r.actor_id) || "—",
    created_at: r.created_at,
  }));
}
