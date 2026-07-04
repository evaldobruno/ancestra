"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Modal } from "@/components/Modal";
import { PhotoUpload } from "@/components/PhotoUpload";
import {
  createMember,
  updateMember,
  deleteMember,
  fetchFamilies,
  orderFamilies,
  type FamilyOption,
  type EditableMember,
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
  status: "alive",
};

export function MemberForm({
  open,
  onClose,
  onSaved,
  defaultFamilyId,
  editMember,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultFamilyId?: string;
  editMember?: EditableMember | null;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const isEdit = !!editMember;
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY, family_id: defaultFamilyId || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) fetchFamilies().then(setFamilies);
  }, [open]);

  useEffect(() => {
    if (open) {
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
          status: editMember.status || "alive",
        });
      } else {
        setForm({ ...EMPTY, family_id: defaultFamilyId || "" });
      }
    }
  }, [open, defaultFamilyId, editMember]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.family_id) return setError(pt ? "Escolha a família." : "Pick a family.");
    if (!form.full_name.trim())
      return setError(pt ? "O nome é obrigatório." : "Name is required.");
    setSaving(true);
    const res = isEdit
      ? await updateMember(editMember!.id, form as any)
      : await createMember(form as any);
    setSaving(false);
    if (!res.ok) return setError(res.error || "Erro");
    onSaved?.();
    if (isEdit) {
      onClose();
    } else {
      setDone(true);
    }
  }

  function addAnother() {
    setForm((f) => ({
      ...f,
      full_name: "",
      known_as: "",
      gender: "",
      birth_date: "",
      birth_place: "",
      profession: "",
    }));
    setDone(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="👤"
      title={isEdit ? (pt ? "Editar membro" : "Edit member") : pt ? "Adicionar membro" : "Add member"}
      subtitle={
        isEdit
          ? pt
            ? "Atualize os dados desta pessoa"
            : "Update this person's details"
          : pt
          ? "Junte uma pessoa à árvore da família"
          : "Add a person to the family tree"
      }
    >
      {done ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-3xl text-sage-700">
            ✓
          </div>
          <h3 className="text-lg font-semibold">{pt ? "Membro adicionado!" : "Member added!"}</h3>
          <p className="mt-1 text-sm text-stone-500">
            {pt ? "Já aparece na árvore e na lista." : "It now appears in the tree and list."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-primary" onClick={addAnother}>
              ＋ {pt ? "Adicionar outro" : "Add another"}
            </button>
            <button className="btn-ghost" onClick={onClose}>
              {pt ? "Concluir" : "Done"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="section-title">📋 {pt ? "Essencial" : "Essentials"}</div>
          <PhotoUpload
            value={form.avatar_url}
            onChange={(url) => set("avatar_url", url)}
            folder="avatars"
            shape="circle"
            label={pt ? "Foto" : "Photo"}
          />
          <div className="field">
            <label className="label">
              {pt ? "Família" : "Family"} <span className="req">*</span>
            </label>
            <select
              className="input"
              value={form.family_id}
              onChange={(e) => set("family_id", e.target.value)}
            >
              <option value="">{pt ? "— escolher —" : "— choose —"}</option>
              {orderFamilies(families).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.parent_family_id ? "   ↳ " : ""}{f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label">
                {pt ? "Nome completo" : "Full name"} <span className="req">*</span>
              </label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder={pt ? "Ex.: Maria Silva" : "e.g. Maria Silva"}
              />
            </div>
            <div className="field">
              <label className="label">{pt ? "Conhecido(a) por" : "Known as"}</label>
              <input
                className="input"
                value={form.known_as}
                onChange={(e) => set("known_as", e.target.value)}
                placeholder={pt ? "Alcunha familiar" : "Family nickname"}
              />
            </div>
          </div>

          <div className="section-title">🗓️ {pt ? "Nascimento" : "Birth"}</div>
          <div className="form-grid">
            <div className="field">
              <label className="label">{pt ? "Data de nascimento" : "Date of birth"}</label>
              <input
                type="date"
                className="input"
                value={form.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">{pt ? "Local de nascimento" : "Birthplace"}</label>
              <input
                className="input"
                value={form.birth_place}
                onChange={(e) => set("birth_place", e.target.value)}
                placeholder={pt ? "Cidade, País" : "City, Country"}
              />
            </div>
          </div>

          <div className="section-title">🪪 {pt ? "Detalhes" : "Details"}</div>
          <div className="form-grid">
            <div className="field">
              <label className="label">{pt ? "Nacionalidade" : "Nationality"}</label>
              <input
                className="input"
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">{pt ? "Profissão" : "Profession"}</label>
              <input
                className="input"
                value={form.profession}
                onChange={(e) => set("profession", e.target.value)}
              />
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
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {isEdit && (
              <button type="button" className="btn-ghost text-red-600" onClick={remove} disabled={saving}>
                🗑️ {pt ? "Apagar" : "Delete"}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" className="btn-ghost" onClick={onClose}>
              {pt ? "Cancelar" : "Cancel"}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? pt
                  ? "A guardar…"
                  : "Saving…"
                : isEdit
                ? pt
                  ? "Guardar alterações"
                  : "Save changes"
                : pt
                ? "Guardar membro"
                : "Save member"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
