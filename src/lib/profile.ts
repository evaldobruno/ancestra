"use client";

// Self-service profile layer.
// Every signed-in user (except guests) can edit THEIR OWN profile:
//  • account fields on `users` (nome, alcunha/display_name, idioma)
//  • their person in the family (`family_members`): alcunha (known_as) + details
// A user is tied to a person via family_members.user_id = auth.uid().
// RLS already allows: users self-update, and writing family_members of own family.

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

export type Result = { ok: boolean; error?: string };

export type ProfileMember = {
  id: string;
  full_name: string;
  known_as: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  profession: string | null;
  avatar_url: string | null;
};

export type ProfileAccount = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  locale: string | null;
  role: string;
  family_id: string | null;
};

export type MyProfile = {
  account: ProfileAccount;
  member: ProfileMember | null;
  familyName: string | null;
  // People in my family not yet linked to a login — for "claim who I am".
  claimable: { id: string; full_name: string; known_as: string | null }[];
};

const MEMBER_COLS =
  "id,full_name,known_as,gender,birth_date,birth_place,nationality,profession,avatar_url";

export async function fetchMyProfile(): Promise<MyProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const uid = auth.user.id;

  const { data: account } = await supabase
    .from("users")
    .select("id,email,full_name,display_name,locale,role,family_id")
    .eq("id", uid)
    .single();
  if (!account) return null;

  const { data: member } = await supabase
    .from("family_members")
    .select(MEMBER_COLS)
    .eq("user_id", uid)
    .is("deleted_at", null)
    .maybeSingle();

  let familyName: string | null = null;
  let claimable: MyProfile["claimable"] = [];
  if (account.family_id) {
    const [{ data: fam }, { data: people }] = await Promise.all([
      supabase.from("families").select("name").eq("id", account.family_id).single(),
      supabase
        .from("family_members")
        .select("id,full_name,known_as,user_id")
        .eq("family_id", account.family_id)
        .is("deleted_at", null)
        .order("full_name"),
    ]);
    familyName = fam?.name ?? null;
    claimable = (people ?? [])
      .filter((p: any) => !p.user_id)
      .map((p: any) => ({ id: p.id, full_name: p.full_name, known_as: p.known_as }));
  }

  return {
    account: account as ProfileAccount,
    member: (member as ProfileMember) ?? null,
    familyName,
    claimable,
  };
}

// Update the login account (name, alcunha = display_name, language).
export async function updateAccount(input: {
  full_name?: string;
  display_name?: string;
  locale?: string;
}): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const { error } = await supabase
    .from("users")
    .update({
      full_name: input.full_name?.trim() || null,
      display_name: input.display_name?.trim() || null,
      locale: input.locale || "pt",
    })
    .eq("id", auth.user.id);
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true };
}

// Update my own person in the family (alcunha + details).
export async function updateMyMember(
  memberId: string,
  input: Partial<Omit<ProfileMember, "id">>
): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { error } = await supabase
    .from("family_members")
    .update({
      full_name: input.full_name?.trim(),
      known_as: input.known_as?.trim() || null,
      gender: input.gender || null,
      birth_date: input.birth_date || null,
      birth_place: input.birth_place?.trim() || null,
      nationality: input.nationality?.trim() || null,
      profession: input.profession?.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
    })
    .eq("id", memberId);
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true };
}

// "I am this person" — link an existing family member to my login.
export async function claimMember(memberId: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const { error } = await supabase
    .from("family_members")
    .update({ user_id: auth.user.id })
    .eq("id", memberId);
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true };
}

// Create a new person in my family that represents me, and link it.
export async function createMyMember(input: {
  full_name: string;
  known_as?: string;
}): Promise<Result & { id?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const { data: me } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.family_id)
    return { ok: false, error: "Ainda não tens família atribuída. Pede a um administrador." };

  const { data, error } = await supabase
    .from("family_members")
    .insert({
      family_id: me.family_id,
      user_id: auth.user.id,
      full_name: input.full_name.trim(),
      known_as: input.known_as?.trim() || null,
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, id: data?.id };
}

function friendly(msg: string) {
  if (/row-level security|rls|permission/i.test(msg))
    return "Sem permissão para editar este perfil.";
  return msg;
}
