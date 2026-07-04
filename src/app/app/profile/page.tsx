"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { isSupabaseConfigured } from "@/lib/queries";
import { PhotoUpload } from "@/components/PhotoUpload";
import {
  fetchMyProfile,
  updateAccount,
  updateMyMember,
  updatePassword,
  claimMember,
  createMyMember,
  type MyProfile,
} from "@/lib/profile";

export default function Profile() {
  const { locale, setLocale } = useI18n() as any;
  const pt = locale === "pt";
  const [data, setData] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // account form
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accLocale, setAccLocale] = useState("pt");

  // member form
  const [mName, setMName] = useState("");
  const [mKnownAs, setMKnownAs] = useState("");
  const [mGender, setMGender] = useState("");
  const [mBirth, setMBirth] = useState("");
  const [mPlace, setMPlace] = useState("");
  const [mNat, setMNat] = useState("");
  const [mProf, setMProf] = useState("");
  const [mAvatar, setMAvatar] = useState("");

  // claim
  const [claimId, setClaimId] = useState("");
  const [newName, setNewName] = useState("");

  // password
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function savePassword() {
    setPwMsg(null);
    if (pw1.length < 6) return setPwMsg(pt ? "Mínimo 6 caracteres." : "At least 6 characters.");
    if (pw1 !== pw2) return setPwMsg(pt ? "As palavras-passe não coincidem." : "Passwords don't match.");
    setSaving(true);
    const res = await updatePassword(pw1);
    setSaving(false);
    if (res.ok) { setPw1(""); setPw2(""); setPwMsg(pt ? "Palavra-passe alterada!" : "Password changed!"); }
    else setPwMsg(res.error || "Erro");
  }

  function hydrate(p: MyProfile) {
    setData(p);
    setFullName(p.account.full_name ?? "");
    setDisplayName(p.account.display_name ?? "");
    setAccLocale(p.account.locale ?? "pt");
    if (p.member) {
      setMName(p.member.full_name ?? "");
      setMKnownAs(p.member.known_as ?? "");
      setMGender(p.member.gender ?? "");
      setMBirth(p.member.birth_date ?? "");
      setMPlace(p.member.birth_place ?? "");
      setMNat(p.member.nationality ?? "");
      setMProf(p.member.profession ?? "");
      setMAvatar(p.member.avatar_url ?? "");
    }
  }

  async function load() {
    setLoading(true);
    const p = await fetchMyProfile();
    if (p) hydrate(p);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const isGuest = data?.account.role === "guest";

  async function saveAccount() {
    setMsg(null);
    setSaving(true);
    const res = await updateAccount({ full_name: fullName, display_name: displayName, locale: accLocale });
    setSaving(false);
    if (res.ok) {
      if (typeof setLocale === "function" && accLocale) setLocale(accLocale);
      setMsg(pt ? "Conta atualizada." : "Account updated.");
    } else setMsg(res.error || "Erro");
  }

  async function saveMember() {
    if (!data?.member) return;
    setMsg(null);
    setSaving(true);
    const res = await updateMyMember(data.member.id, {
      full_name: mName,
      known_as: mKnownAs,
      gender: mGender,
      birth_date: mBirth,
      birth_place: mPlace,
      nationality: mNat,
      profession: mProf,
      avatar_url: mAvatar,
    });
    setSaving(false);
    if (res.ok) {
      setMsg(pt ? "Perfil atualizado." : "Profile updated.");
      load();
    } else setMsg(res.error || "Erro");
  }

  async function doClaim() {
    if (!claimId) return;
    setMsg(null);
    setSaving(true);
    const res = await claimMember(claimId);
    setSaving(false);
    if (res.ok) {
      setMsg(pt ? "Associado! Já podes editar a tua ficha." : "Linked!");
      load();
    } else setMsg(res.error || "Erro");
  }

  async function doCreate() {
    if (!newName.trim()) return;
    setMsg(null);
    setSaving(true);
    const res = await createMyMember({ full_name: newName, known_as: mKnownAs });
    setSaving(false);
    if (res.ok) {
      setMsg(pt ? "Ficha criada! Já podes editar." : "Created!");
      load();
    } else setMsg(res.error || "Erro");
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">{pt ? "O meu perfil" : "My profile"}</h1>
        <p className="mt-3 text-stone-500">
          {pt ? "Disponível depois de iniciar sessão." : "Available once signed in."}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">{pt ? "O meu perfil" : "My profile"}</h1>
        <p className="mt-3 text-stone-400">{pt ? "A carregar…" : "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{pt ? "O meu perfil" : "My profile"}</h1>
        <p className="mt-1 text-sm text-stone-400">
          {data?.account.email}
          {data?.familyName ? ` · ${data.familyName}` : ""}
          {data?.account.role ? ` · ${data.account.role}` : ""}
        </p>
      </div>

      {msg && (
        <p className="rounded-lg bg-sage-100 px-3 py-2 text-sm text-sage-700 dark:bg-stone-800 dark:text-sage-300">
          {msg}
        </p>
      )}

      {isGuest && (
        <p className="rounded-lg bg-gold-100 px-3 py-2 text-sm text-gold-800">
          {pt
            ? "A tua conta é de convidado (só leitura). Pede a um administrador para mudar o teu papel se quiseres editar."
            : "Your account is a guest (read-only)."}
        </p>
      )}

      {/* Password */}
      <div className="card space-y-3">
        <h2 className="font-semibold">{pt ? "Palavra-passe" : "Password"}</h2>
        <p className="text-sm text-stone-400">
          {pt ? "Muda aqui a tua palavra-passe (ideal para trocar uma provisória)." : "Change your password here."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{pt ? "Nova palavra-passe" : "New password"}</label>
            <input className="input" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </div>
          <div>
            <label className="label">{pt ? "Repetir" : "Repeat"}</label>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={savePassword} disabled={saving || !pw1}>
          {pt ? "Mudar palavra-passe" : "Change password"}
        </button>
        {pwMsg && <p className="text-sm text-sage-700 dark:text-sage-300">{pwMsg}</p>}
      </div>

      {/* Account */}
      <fieldset disabled={isGuest || saving} className="card space-y-3 disabled:opacity-60">
        <h2 className="font-semibold">{pt ? "Conta" : "Account"}</h2>
        <div>
          <label className="label">{pt ? "Nome completo" : "Full name"}</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">{pt ? "Alcunha (como queres ser tratado)" : "Nickname"}</label>
          <input className="input" placeholder={pt ? "Ex.: Bruno" : "e.g. Bruno"} value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="label">{pt ? "Idioma" : "Language"}</label>
          <select className="input max-w-[200px]" value={accLocale} onChange={(e) => setAccLocale(e.target.value)}>
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </div>
        <button className="btn-primary" onClick={saveAccount} disabled={isGuest || saving}>
          {saving ? (pt ? "A guardar…" : "Saving…") : pt ? "Guardar conta" : "Save account"}
        </button>
      </fieldset>

      {/* Member (person in the family) */}
      {data?.member ? (
        <fieldset disabled={isGuest || saving} className="card space-y-3 disabled:opacity-60">
          <h2 className="font-semibold">{pt ? "A minha ficha na família" : "My family profile"}</h2>
          <p className="text-sm text-stone-400">
            {pt ? "É isto que aparece na árvore e na lista de membros." : "This is what shows in the tree and members list."}
          </p>
          <PhotoUpload
            value={mAvatar}
            onChange={setMAvatar}
            folder="avatars"
            shape="circle"
            label={pt ? "Foto" : "Photo"}
          />
          <div>
            <label className="label">{pt ? "Nome completo" : "Full name"}</label>
            <input className="input" value={mName} onChange={(e) => setMName(e.target.value)} />
          </div>
          <div>
            <label className="label">{pt ? "Alcunha" : "Nickname"}</label>
            <input className="input" value={mKnownAs} onChange={(e) => setMKnownAs(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{pt ? "Género" : "Gender"}</label>
              <input className="input" value={mGender} onChange={(e) => setMGender(e.target.value)} />
            </div>
            <div>
              <label className="label">{pt ? "Data de nascimento" : "Birth date"}</label>
              <input className="input" type="date" value={mBirth} onChange={(e) => setMBirth(e.target.value)} />
            </div>
            <div>
              <label className="label">{pt ? "Local de nascimento" : "Birth place"}</label>
              <input className="input" value={mPlace} onChange={(e) => setMPlace(e.target.value)} />
            </div>
            <div>
              <label className="label">{pt ? "Nacionalidade" : "Nationality"}</label>
              <input className="input" value={mNat} onChange={(e) => setMNat(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{pt ? "Profissão" : "Profession"}</label>
              <input className="input" value={mProf} onChange={(e) => setMProf(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" onClick={saveMember} disabled={isGuest || saving}>
            {saving ? (pt ? "A guardar…" : "Saving…") : pt ? "Guardar ficha" : "Save profile"}
          </button>
        </fieldset>
      ) : (
        !isGuest && (
          <div className="card space-y-3">
            <h2 className="font-semibold">{pt ? "A minha ficha na família" : "My family profile"}</h2>
            <p className="text-sm text-stone-400">
              {pt
                ? "Ainda não estás ligado a uma pessoa na árvore. Escolhe quem és, ou cria a tua ficha."
                