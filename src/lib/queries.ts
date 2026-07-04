"use client";

// Data layer: fetches family members + relationships from Supabase and shapes
// them into the UI `Member` type used by the Members and Tree pages.
// Falls back to in-memory demo data when Supabase isn't configured (demo mode).

import { createClient } from "@/lib/supabase/client";
import { MEMBERS as DEMO_MEMBERS, type Member } from "@/lib/demo-data";

export function isSupabaseConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Deterministic palette so each member keeps a stable colour.
const PALETTE = ["#c14624", "#406341", "#d95a30", "#547d54", "#e67a52", "#a0371f", "#739a72", "#993c1d"];
const colorFor = (id: string, i: number) => PALETTE[i % PALETTE.length];

type DbMember = {
  id: string;
  full_name: string;
  known_as: string | null;
  birth_date: string | null;
  birth_place: string | null;
  profession: string | null;
  status: string | null;
  gender: string | null;
  avatar_url: string | null;
};

// Gendered status label (PT: Vivo/Viva · Falecido/Falecida).
export function statusLabel(status: string, gender: string | undefined, pt: boolean) {
  const alive = status !== "deceased";
  if (!pt) return alive ? "Alive" : "Deceased";
  const female = (gender || "").toLowerCase() === "female";
  if (alive) return female ? "Viva" : "Vivo";
  return female ? "Falecida" : "Falecido";
}
type DbRel = { from_member: string; to_member: string; type: string };
type DbTree = { member_id: string; generation: number | null; branch: string | null };

// Build parents[] / spouse / generation from edges + tree rows.
function assemble(members: DbMember[], rels: DbRel[], tree: DbTree[]): Member[] {
  const genByMember = new Map<string, number>();
  const branchByMember = new Map<string, string>();
  tree.forEach((t) => {
    if (t.generation != null) genByMember.set(t.member_id, t.generation);
    if (t.branch) branchByMember.set(t.member_id, t.branch);
  });

  const parentsOf = new Map<string, string[]>();
  const spouseOf = new Map<string, string>();
  const divorced = new Set<string>();
  rels.forEach((r) => {
    // type 'child': from_member is the PARENT of to_member (see seed/schema).
    if (r.type === "child" || r.type === "parent") {
      const parent = r.type === "child" ? r.from_member : r.to_member;
      const child = r.type === "child" ? r.to_member : r.from_member;
      parentsOf.set(child, [...(parentsOf.get(child) ?? []), parent]);
    }
    // Divorced couples stay side by side too, but drawn differently.
    if (r.type === "spouse" || r.type === "partner" || r.type === "divorced") {
      spouseOf.set(r.from_member, r.to_member);
      spouseOf.set(r.to_member, r.from_member);
      if (r.type === "divorced") {
        divorced.add(r.from_member);
        divorced.add(r.to_member);
      }
    }
  });

  // Derive generation when genealogy_tree has no row: longest parent chain depth.
  const depth = (id: string, seen = new Set<string>()): number => {
    if (genByMember.has(id)) return genByMember.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parentsOf.get(id) ?? [];
    if (ps.length === 0) return 0;
    return 1 + Math.max(...ps.map((p) => depth(p, seen)));
  };

  return members.map((m, i) => ({
    id: m.id,
    name: m.full_name,
    knownAs: m.known_as || m.full_name.split(" ")[0],
    birthDate: m.birth_date || "",
    birthPlace: m.birth_place || undefined,
    profession: m.profession || undefined,
    status: m.status === "deceased" ? "deceased" : "alive",
    generation: depth(m.id),
    branch: branchByMember.get(m.id) || "—",
    color: colorFor(m.id, i),
    avatarUrl: m.avatar_url || undefined,
    gender: m.gender || undefined,
    parents: parentsOf.get(m.id) ?? [],
    spouse: spouseOf.get(m.id),
    spouseDivorced: divorced.has(m.id),
  }));
}

export async function fetchFamilyMembers(): Promise<{ members: Member[]; source: "supabase" | "demo" }> {
  if (!isSupabaseConfigured()) return { members: DEMO_MEMBERS, source: "demo" };

  try {
    const supabase = createClient();

    // Logged in → always show REAL data (even if empty, so you can build from a
    // clean slate). Not logged in → show the in-memory demo preview.
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { members: DEMO_MEMBERS, source: "demo" };

    const [{ data: members, error: e1 }, { data: rels }, { data: tree }] = await Promise.all([
      supabase
        .from("family_members")
        .select("id,full_name,known_as,birth_date,birth_place,profession,status,gender,avatar_url")
        .is("deleted_at", null)
        .order("birth_date", { ascending: true }),
      supabase.from("family_relationships").select("from_member,to_member,type").is("deleted_at", null),
      supabase.from("genealogy_tree").select("member_id,generation,branch").is("deleted_at", null),
    ]);

    // On a real read error, fall back to demo so the UI is never blank.
    // (An empty result for a logged-in user is intentional — clean slate.)
    if (e1) return { members: DEMO_MEMBERS, source: "demo" };

    return {
      members: assemble((members ?? []) as DbMember[], (rels ?? []) as DbRel[], (tree ?? []) as DbTree[]),
      source: "supabase",
    };
  } catch {
    return { members: DEMO_MEMBERS, source: "demo" };
  }
}
