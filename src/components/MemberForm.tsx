"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Modal } from "@/components/Modal";
import { PhotoUpload } from "@/components/PhotoUpload";
import {
  createMember,
  updateMember,
  deleteMember,
  createRelationship,
  deleteRelationship,
  fetchRelationshipsFor,
  fetchFamilies,
  fetchMemberOptions,
  fetchMemberParents,
  orderFamilies,
  type FamilyOption,
  type MemberOption,
  type EditableMember,
  type MemberRel,
} from "@/lib/mutations";

const EMPTY = {
  family_id: "",
  full_name: "",
  known_as: "",
  gender: "",
  birth_date: "",
  birth_place: "",
  nationality: "",
  profession: "",
  avatar_url: "",
  death_date: "",
  status: "alive",
};

const NO_REL = { father: "", mother: "", spouse: "", parentOf: "", sibling: "" };

// linkTo lets the tree open this form to add a relative of an existing person.
export type LinkTo = {
  memberId: string;
  memberName?: string;
  relation: "parentOf" | "spouseOf" | "childOf";
  gender?: string;
};

export function MemberForm({
  open,
  onClose,
  onSaved,
  defaultFamilyId,
  editMember,
  linkTo,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultFamilyId?: string;
  editMember?: EditableMember | null;
  linkTo?: LinkTo | null;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const isEdit = !!editMember;
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [people, setPeople] = useState<MemberOption[]>([]);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY, family_id: defaultFamilyId || "" });
  const [rel, setRel] = useState<typeof NO_REL>({ ...NO_REL });
  const [memberRels, setMemberRels] = useState<MemberRel[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFamilies().then(setFamilies);
      fetchMemberOptions().then(setPeople);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    if (editMember) {
      setForm({
        family_id: editMember.family_id || "",
        full_name: editMember.full_name || "",
        known_as: editMember.known_as || "",
        gender: editMember.gender || "",
        birth_date: editMember.birth_date || "",
        birth_place: editMember.birth_place || "",
        nationality: editMember.nationality || "",
        profession: editMember.profession || "",
        avatar_url: editMember.avatar_url || "",
        death_date: (editMember as any).death_date || "",
        status: editMember.status || "alive",
      });
      setRel({ ...NO_REL });
      setMemberRels([]);
      fetchRelationshipsFor(editMember.id).then(setMemberRels);
    } else {
      setMemberRels([]);
      const r = { ...NO_REL };
      const f = { ...EMPTY, family_id: defaultFamilyId || "" };
      if (linkTo) {
        if (linkTo.relation === "parentOf") { r.parentOf = linkTo.memberId; if (linkTo.gender) f.gender = linkTo.gender; }
        else if (linkTo.relation === "spouseOf") r.spouse = linkTo.memberId;
        else if (linkTo.relation === "childOf") {
          if (linkTo.gender === "female") r.mother = linkTo.memberId; else r.father = linkTo.memberId;
        }
      }
      setForm(f);
      setRel(r);
    }
  }, [open, defaultFamilyId, editMember, linkTo]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setR = (k: string, v: string) => setRel((r) => ({ ...r, [k]: v }));

  async function remove() {
    if (!editMember) return;
    const ok = window.confirm(
      pt
        ? `Apagar ${editMember.full_name}? Deixa de aparecer na árvore e na lista.`
        : `Delete ${editMember.full_name}? They will be removed from the tree and list.`
    );
    if (!ok) return;
    setSaving(true);
    const res = await deleteMember(editMember.id);
    setSaving(false);
    if (!res.ok) return setError(res.error || "Erro");
    onSaved?.();
    onClose();
  }

  async function applyLinks(newId: string) {
    const jobs: Promise<any>[] = [];
    if (rel.father) jobs.push(createRelationship({ from_member: rel.father, to_member: newId, type: "child" }));
    if (rel.mother) jobs.push(createRelationship({ from_member: rel.mother, to_member: newId, type: "child" }));
    if (rel.spouse) jobs.push(createRelationship({ from_member: newId, to_member: rel.spouse, type: "spouse" }));
    if (rel.parentOf) jobs.push(createRelationship({ from_member: newId, to_member: rel.parentOf, type: "child" }));
    if (rel.sibling) {
      const parents = await fetchMemberParents(rel.sibling);
      parents.forEach((p) => jobs.push(createRelationship({ from_member: p, to_member: newId, type: "child" })));
    }
    await Promise.all(jobs);
  }

  async function removeRel(id: string) {
    if (!editMember) return;
    const ok = window.confirm(pt ? "Remover esta ligação?" : "Remove this link?");
    if (!ok) return;
    const res = await deleteRelationship(id);
    if (!res.ok) return setError(res.error || "Erro");
    setMemberRels((rs) => rs.filter((r) => r.id !== id));
    onSaved?.();
  }

  const relLabel = (kind: MemberRel["kind"]) =>
    kind === "parent" ? (pt ? "Pai/Mãe" : "Parent")
      : kind === "child" ? (pt ? "Filho(a)" : "Child")
      : kind === "spouse" ? (pt ? "Cônjuge" : "Spouse")
      : kind === "divorced" ? (pt ? "Divorciado(a)" : "Divorced")
      : (pt ? "Ligação" : "Link");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.family_id) return setError(pt ? "Escolha a família." : "Pick a family.");
    if (!form.full_name.trim()) return setError(pt ? "O nome é obrigatório." : "Name is required.");
    setSaving(true);
    if (isEdit) {
      const res = await updateMember(editMember!.id, form as any);
      if (!res.ok) { setSaving(false); return setError(res.error || "Erro"); }
      try { await applyLinks(editMember!.id); } catch { /* links best-effort */ }
      setSaving(false);
      onSaved?.();
      onClose();
      return;
    }
    const res = await createMember(form as any);
    if (!res.ok) { setSaving(false); return setError(res.error || "Erro"); }
    try { if (res.id) await applyLinks(res.id); } catch { /* links best-effort */ }
    setSaving(false);
    onSaved?.();
    setDone(true);
  }

  function addAnother() {
    setForm((f) => ({ ...f, full_name: "", known_as: "", gender: "", birth_date: "", birth_place: "", profession: "", avatar_url: "" }));
    setRel({ ...NO_REL });
    setDone(false);
  }

  const relField = (key: keyof typeof NO_REL, label: string) => (
    <div className="field">
      <label className="label">{label}</label>
      <select className="input" value={rel[key]} onChange={(e) => setR(key, e.target.value)}>
        <option value="">{pt ? "— ninguém —" : "— none —"}</option>
        {people.filter((p) => !isEdit || p.id !== editMember!.id).map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="👤"
      title={isEdit ? (pt ? "Editar membro" : "Edit member") : pt ? "Adicionar membro" : "Add member"}
      subtitle={
        isEdit
          ? pt ? "Atualize os dados desta pessoa" : "Update this person's details"
          : linkTo?.memberName
          ? (pt ? `Adicionar familiar de ${linkTo.memberName}` : `Add a relative of ${linkTo.memberName}`)
          : pt ? "Junte uma pessoa à árvore da família" : "Add a person to the family tree"
      }
    >
      {done ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-3xl text-sage-700">✓</div>
          <h3 className="text-lg font-semibold">{pt ? "Membro adicionado!" : "Member added!"}</h3>
          <p className="mt-1 text-sm text-stone-500">{pt ? "Já aparece na árvore e na lista." : "It now appears in the tree and list."}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-primary" onClick={addAnother}>＋ {pt ? "Adicionar outro" : "Add another"}</button>
            <button className="btn-ghost" onClick={onClose}>{pt ? "Concluir" : "Done"}</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="section-title">📋 {pt ? "Essencial" : "Essentials"}</div>
          <PhotoUpload value={form.avatar_url} onChange={(url) => set("avatar_url", url)} folder="avatars" shape="circle" label={pt ? "Foto" : "Photo"} />
          <div className="field">
            <label className="label">{pt ? "Família" : "Family"} <span className="req">*</span></label>
            <select className="input" value={form.family_id} onChange={(e) => set("family_id", e.target.value)}>
              <option value="">{pt ? "— escolher —" : "— choose —"}</option>
              {orderFamilies(families).map((f) => (
                <option key={f.id} value={f.id}>{f.parent_family_id ? "   ↳ " : ""}{f.name}</option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label">{pt ? "Nome completo" : "Full name"} <span className="req">*</span></label>
              <input className="input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={pt ? "Ex.: Maria Silva" : "e.g. Maria Silva"} />
            </div>
            <div className="field">
              <label className="label">{pt ? "Conhecido(a) por" : "Known as"}</label>
              <input className="input" value={form.known_as} onChange={(e) => set("known_as", e.target.value)} placeholder={pt ? "Alcunha familiar" : "Family nickname"} />
            </div>
          </div>

          <div className="section-title">🗓️ {pt ? "Nascimento" : "Birth"}</div>
          <div className="form-grid">
            <div className="field">
              <label className="label">{pt ? "Data de nascimento" : "Date of birth"}</label>
              <input type="date" className="input" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{pt ? "Local de nascimento" : "Birthplace"}</label>
              <input className="input" value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} placeholder={pt ? "Cidade, País" : "City, Country"} />
            </div>
          </div>

          <div className="section-title">🪪 {pt ? "Detalhes" : "Details"}</div>
          <div className="form-grid">
            <div className="field">
              <label className="label">{pt ? "Nacionalidade" : "Nationality"}</label>
              <input className="input" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{pt ? "Profissão" : "Profession"}</label>
              <input className="input" value={form.profession} onChange={(e) => set("profession", e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{pt ? "Género" : "Gender"}</label>
              <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">—</option>
                <option value="female">{pt ? "Feminino" : "Female"}</option>
                <option value="male">{pt ? "Masculino" : "Male"}</option>
                <option value="other">{pt ? "Outro" : "Other"}</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{pt ? "Estado" : "Status"}</label>
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="alive">{pt ? "Vivo(a)" : "Alive"}</option>
                <option value="deceased">{pt ? "Falecido(a)" : "Deceased"}</option>
                <option value="historical">{pt ? "Histórico" : "Historical"}</option>
                <option value="unknown">{pt ? "Desconhecido" : "Unknown"}</option>
              </select>
            </div>
            {form.status === "deceased" && (
              <div className="field">
                <label className="label">{pt ? "Data de falecimento" : "Date of death"}</label>
                <input type="date" className="input" value={form.death_date} onChange={(e) => set("death_date", e.target.value)} />
              </div>
            )}
          </div>

          <div className="section-title">🔗 {pt ? "Ligações" : "Links"}</div>

          {isEdit && (
            <div className="mb-3">
              {memberRels.length === 0 ? (
                <p className="text-xs text-stone-400">{pt ? "Ainda sem ligações. Adicione abaixo." : "No links yet. Add some below."}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {memberRels.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm dark:bg-white/10">
                      <span className="text-stone-400">{relLabel(r.kind)}:</span>
                      <span className="font-medium">{r.otherName}</span>
                      <button type="button" onClick={() => removeRel(r.id)} title={pt ? "Remover" : "Remove"}
                        className="ml-0.5 text-stone-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="-mt-1 mb-3 text-xs text-stone-400">
            {pt
              ? "Liga esta pessoa à família — a árvore junta tudo automaticamente."
              : "Connect this person to the family — the tree links it automatically."}
          </p>
          <div className="form-grid">
            {relField("father", pt ? "Pai" : "Father")}
            {relField("mother", pt ? "Mãe" : "Mother")}
            {relField("spouse", pt ? "Cônjuge / companheiro(a)" : "Spouse / partner")}
            {relField("parentOf", pt ? "É pai/mãe de" : "Is parent of")}
            {relField("sibling", pt ? "Irmão/Irmã de" : "Sibling of")}
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {isEdit && (
              <button type="button" className="btn-ghost text-red-600" onClick={remove} disabled={saving}>🗑️ {pt ? "Apagar" : "Delete"}</button>
            )}
            <div className="flex-1" />
            <button type="button" className="btn-ghost" onClick={onClose}>{pt ? "Cancelar" : "Cancel"}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (pt ? "A guardar…" : "Saving…") : isEdit ? (pt ? "Guardar alterações" : "Save changes") : pt ? "Guardar membro" : "Save member"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
