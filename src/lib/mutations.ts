"use client";

// Write layer — create members and relationships directly from the app forms.
// Requires an authenticated Supabase session (RLS: super_admin or own family).

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";
import { logAction } from "@/lib/audit";

export type FamilyOption = { id: string; name: string; parent_family_id?: string | null };

// Order families as a hierarchy: each trunk followed by its branches.
export function orderFamilies<T extends { id: string; name: string; parent_family_id?: string | null }>(
  list: T[]
): T[] {
  const roots = list.filter((f) => !f.parent_family_id).sort((a, b) => a.name.localeCompare(b.name));
  const childrenOf = (pid: string) =>
    list.filter((f) => f.parent_family_id === pid).sort((a, b) => a.name.localeCompare(b.name));
  const out: T[] = [];
  roots.forEach((r) => {
    out.push(r);
    childrenOf(r.id).forEach((c) => out.push(c));
  });
  // Any orphan branches whose parent isn't in the list.
  list.forEach((f) => {
    if (!out.includes(f)) out.push(f);
  });
  return out;
}
export type MemberOption = { id: string; name: string; family_id: string };

export type NewMember = {
  family_id: string;
  full_name: string;
  known_as?: string;
  gender?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  profession?: string;
  avatar_url?: string;
  status?: "alive" | "deceased" | "unknown" | "historical";
};

export type NewRelationship = {
  from_member: string;
  to_member: string;
  type: string; // relationship_type enum
};

export type Result = { ok: boolean; error?: string };

export type FamilyRow = {
  id: string;
  name: string;
  slug: string;
  members: number;
  parent_family_id: string | null;
  parent_name?: string | null;
};
export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  family_id: string | null;
  family_name?: string | null;
};

// Families with live member counts (for the Admin overview).
export async function fetchFamiliesWithCounts(): Promise<FamilyRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const [{ data: fams }, { data: mems }] = await Promise.all([
    supabase.from("families").select("id,name,slug,parent_family_id").is("deleted_at", null).order("name"),
    supabase.from("family_members").select("family_id").is("deleted_at", null),
  ]);
  const counts = new Map<string, number>();
  (mems ?? []).forEach((m: any) => counts.set(m.family_id, (counts.get(m.family_id) ?? 0) + 1));
  const nameById = new Map<string, string>();
  (fams ?? []).forEach((f: any) => nameById.set(f.id, f.name));
  return (fams ?? []).map((f: any) => ({
    ...f,
    members: counts.get(f.id) ?? 0,
    parent_name: f.parent_family_id ? nameById.get(f.parent_family_id) ?? null : null,
  }));
}

// Create a new family (optionally a branch under a parent family).
export async function createFamily(name: string, parentFamilyId?: string | null): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!name.trim()) return { ok: false, error: "O nome é obrigatório." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = `${base || "familia"}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("families").insert({
    name: name.trim(),
    slug,
    parent_family_id: parentFamilyId || null,
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("create", "family", name.trim());
  return { ok: true };
}

// App users / access list (super_admin sees everyone).
export async function fetchAppUsers(): Promise<AppUser[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const [{ data: users }, { data: fams }] = await Promise.all([
    supabase.from("users").select("id,email,full_name,role,family_id").is("deleted_at", null).order("email"),
    supabase.from("families").select("id,name"),
  ]);
  const famName = new Map<string, string>();
  (fams ?? []).forEach((f: any) => famName.set(f.id, f.name));
  return (users ?? []).map((u: any) => ({
    ...u,
    family_name: u.family_id ? famName.get(u.family_id) ?? null : null,
  }));
}

export type InviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  family_id: string | null;
  family_name?: string | null;
  expires_at: string | null;
};

// Create an invitation (invite-only sign-up). The person can then register with
// this email; a DB trigger links them to the family automatically.
export async function createInvitation(
  email: string,
  familyId: string,
  role: string
): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!email.trim()) return { ok: false, error: "Email obrigatório." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const token =
    (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
    Math.random().toString(36).slice(2);

  const { error } = await supabase.from("invitations").insert({
    family_id: familyId,
    email: email.trim().toLowerCase(),
    role,
    token,
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("invite", "invitation", email.trim().toLowerCase());
  return { ok: true };
}

export async function fetchInvitations(): Promise<InviteRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const [{ data: invs }, { data: fams }] = await Promise.all([
    supabase.from("invitations").select("id,email,role,status,family_id,expires_at")
      .is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("families").select("id,name"),
  ]);
  const famName = new Map<string, string>();
  (fams ?? []).forEach((f: any) => famName.set(f.id, f.name));
  return (invs ?? []).map((i: any) => ({
    ...i,
    family_name: i.family_id ? famName.get(i.family_id) ?? null : null,
  }));
}

// Role hierarchy for who can remove whom.
export const ROLE_RANK: Record<string, number> = {
  super_admin: 3,
  family_admin: 2,
  member: 1,
  guest: 0,
};
export const roleRank = (r?: string | null) => ROLE_RANK[r ?? "member"] ?? 1;

// Remove (soft-delete) a user account. Caller must outrank the target
// (enforced in the UI and by RLS: super_admin any; family_admin members/guests).
export async function deleteUser(userId: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString(), is_active: false, family_id: null })
    .eq("id", userId);
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true };
}

// Assign a user to a family and set their role (the in-app "automatic" admin).
export async function updateUserAccess(
  userId: string,
  familyId: string | null,
  role: string
): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ family_id: familyId, role })
    .eq("id", userId);
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true };
}

// All families (for the dropdowns). Shared visibility → returns all of them.
export async function fetchFamilies(): Promise<FamilyOption[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("families")
    .select("id,name,parent_family_id")
    .is("deleted_at", null)
    .order("name");
  if (error) return [];
  return (data ?? []) as FamilyOption[];
}

// All members (for the relationship picker).
export async function fetchMemberOptions(): Promise<MemberOption[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("id,full_name,family_id")
    .is("deleted_at", null)
    .order("full_name");
  if (error) return [];
  return (data ?? []).map((m: any) => ({ id: m.id, name: m.full_name, family_id: m.family_id }));
}

export type EditableMember = {
  id: string;
  family_id: string;
  full_name: string;
  known_as: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  profession: string | null;
  avatar_url: string | null;
  status: string;
};

// Load one member's full editable record.
export async function fetchMemberById(id: string): Promise<EditableMember | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("id,family_id,full_name,known_as,gender,birth_date,birth_place,nationality,profession,avatar_url,status")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as EditableMember;
}

// Update an existing member (e.g. fix a wrong birth date). RLS: own family / super_admin.
export async function updateMember(
  id: string,
  input: Omit<NewMember, "family_id"> & { family_id?: string }
): Promise<Result> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase não configurado (modo demo)." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const payload: Record<string, any> = {
    full_name: input.full_name.trim(),
    known_as: input.known_as?.trim() || null,
    gender: input.gender || null,
    birth_date: input.birth_date || null,
    birth_place: input.birth_place?.trim() || null,
    nationality: input.nationality?.trim() || null,
    profession: input.profession?.trim() || null,
    avatar_url: input.avatar_url?.trim() || null,
    status: input.status || "alive",
    updated_by: auth.user.id,
  };
  if (input.family_id) payload.family_id = input.family_id;

  const { error } = await supabase.from("family_members").update(payload).eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("update", "member", input.full_name, id);
  return { ok: true };
}

// Soft-delete a member (keeps history; hidden everywhere). RLS: own family / super_admin.
export async function deleteMember(id: string): Promise<Result> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase não configurado (modo demo)." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const { error } = await supabase
    .from("family_members")
    .update({ deleted_at: new Date().toISOString(), updated_by: auth.user.id })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("delete", "member", undefined, id);
  return { ok: true };
}

export async function createMember(input: NewMember): Promise<Result & { id?: string }> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase não configurado (modo demo)." };
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const payload = {
    family_id: input.family_id,
    full_name: input.full_name.trim(),
    known_as: input.known_as?.trim() || null,
    gender: input.gender || null,
    birth_date: input.birth_date || null,
    birth_place: input.birth_place?.trim() || null,
    nationality: input.nationality?.trim() || null,
    profession: input.profession?.trim() || null,
    avatar_url: input.avatar_url?.trim() || null,
    status: input.status || "alive",
    created_by: auth.user.id,
  };
  const { data, error } = await supabase
    .from("family_members")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("create", "member", input.full_name, data?.id);
  return { ok: true, id: data?.id };
}

export async function createRelationship(input: NewRelationship): Promise<Result> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase não configurado (modo demo)." };
  if (input.from_member === input.to_member)
    return { ok: false, error: "Escolha duas pessoas diferentes." };
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };

  // The relationship row needs a family_id — use the "from" member's family.
  const { data: from } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("id", input.from_member)
    .single();
  if (!from) return { ok: false, error: "Pessoa de origem não encontrada." };

  const { error } = await supabase.from("family_relationships").insert({
    family_id: from.family_id,
    from_member: input.from_member,
    to_member: input.to_member,
    type: input.type,
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("create", "relationship", input.type);
  return { ok: true };
}

export type NewEvent = {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  location?: string;
  category?: string;
  description?: string;
};

// Create a calendar event in the current user's family.
export async function createEvent(input: NewEvent): Promise<Result> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase não configurado (modo demo)." };
  if (!input.title.trim()) return { ok: false, error: "O título é obrigatório." };
  if (!input.date) return { ok: false, error: "A data é obrigatória." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const { data: me } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.family_id)
    return { ok: false, error: "Ainda não tens família atribuída. Pede a um administrador." };

  // Store at the chosen time, or midday to avoid timezone day-shifts.
  const starts_at = `${input.date}T${input.time && input.time.length ? input.time : "12:00"}:00`;

  const { error } = await supabase.from("events").insert({
    family_id: me.family_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category || null,
    location: input.location?.trim() || null,
    starts_at,
    all_day: !input.time,
    status: "confirmed",
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("create", "event", input.title);
  return { ok: true };
}

export type EditableEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  description: string;
};

// Load one event, split into date + time for the form.
export async function fetchEventById(id: string): Promise<EditableEvent | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("id,title,starts_at,location,category,description,all_day")
    .eq("id", id)
    .single();
  if (!data) return null;
  const iso = String(data.starts_at);
  const date = iso.slice(0, 10);
  const time = data.all_day ? "" : iso.slice(11, 16);
  return {
    id: data.id,
    title: data.title || "",
    date,
    time: time === "12:00" ? "" : time,
    location: data.location || "",
    category: data.category || "",
    description: data.description || "",
  };
}

export async function updateEvent(id: string, input: NewEvent): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado (modo demo)." };
  if (!input.title.trim()) return { ok: false, error: "O título é obrigatório." };
  if (!input.date) return { ok: false, error: "A data é obrigatória." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const starts_at = `${input.date}T${input.time && input.time.length ? input.time : "12:00"}:00`;
  const { error } = await supabase
    .from("events")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category || null,
      location: input.location?.trim() || null,
      starts_at,
      all_day: !input.time,
      updated_by: auth.user.id,
    })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("update", "event", input.title, id);
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado (modo demo)." };
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("delete", "event", undefined, id);
  return { ok: true };
}

export type NewMemory = {
  title: string;
  category?: string;
  memory_date?: string;
  location?: string;
  story?: string;
  media?: { url: string; type: string }[];
};

// Create a memory/story in the current user's family.
export async function createMemory(input: NewMemory): Promise<Result> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Supabase não configurado (modo demo)." };
  if (!input.title.trim()) return { ok: false, error: "O título é obrigatório." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const { data: me } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.family_id)
    return { ok: false, error: "Ainda não tens família atribuída. Pede a um administrador." };

  const { error } = await supabase.from("memories").insert({
    family_id: me.family_id,
    title: input.title.trim(),
    story: input.story?.trim() || null,
    category: input.category || "traditions",
    memory_date: input.memory_date || null,
    location: input.location?.trim() || null,
    media: input.media && input.media.length ? input.media : [],
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  logAction("create", "memory", input.title);
  return { ok: true };
}

export type CalEvent = { id: string; title: string; date: string };
export type CalBirthday = { id: string; name: string; month: number; day: number };

// Events + birthdays for the calendar grid (logged-in users only).
export async function fetchCalendarData(): Promise<{
  events: CalEvent[];
  birthdays: CalBirthday[];
  source: "supabase" | "demo";
}> {
  if (!isSupabaseConfigured()) return { events: [], birthdays: [], source: "demo" };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { events: [], birthdays: [], source: "demo" };

  const [{ data: events }, { data: members }] = await Promise.all([
    supabase.from("events").select("id,title,starts_at").is("deleted_at", null),
    supabase
      .from("family_members")
      .select("id,known_as,full_name,birth_date")
      .is("deleted_at", null)
      .not("birth_date", "is", null),
  ]);

  return {
    source: "supabase",
    events: (events ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      date: String(e.starts_at).slice(0, 10),
    })),
    birthdays: (members ?? []).map((m: any) => {
      const [, mm, dd] = String(m.birth_date).slice(0, 10).split("-").map(Number);
      return {
        id: m.id,
        name: m.known_as || (m.full_name || "").split(" ")[0],
        month: mm,
        day: dd,
      };
    }),
  };
}

function friendly(msg: string) {
  if (/row-level security|rls|permission/i.test(msg))
    return "Sem permissão. Inicie sessão como administrador desta família.";
  if (/duplicate key|unique/i.test(msg)) return "Essa relação já existe.";
  return msg;
}
