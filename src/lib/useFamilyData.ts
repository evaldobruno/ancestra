"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFamilyMembers } from "@/lib/queries";
import type { Member } from "@/lib/demo-data";

export function useFamilyData() {
  const [members, setMembers] = useState<Member[]>([]);
  const [source, setSource] = useState<"supabase" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchFamilyMembers().then((res) => {
      if (!alive) return;
      setMembers(res.members);
      setSource(res.source);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [nonce]);

  return { members, source, loading, reload };
}
