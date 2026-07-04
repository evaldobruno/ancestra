"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

// Current user's role (super_admin | family_admin | member | guest | null).
export function useMyRole() {
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (alive) { setRole(null); setLoading(false); }
        return;
      }
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        if (alive) { setRole(null); setLoading(false); }
        return;
      }
      if (alive) setUserId(auth.user.id);
      const { data } = await supabase.from("users").select("role").eq("id", auth.user.id).single();
      if (alive) { setRole(data?.role ?? null); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return { role, userId, loading, isSuperAdmin: role === "super_admin" };
}
