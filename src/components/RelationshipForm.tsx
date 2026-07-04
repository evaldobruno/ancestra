"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Modal } from "@/components/Modal";
import {
  createRelationship,
  fetchMemberOptions,
  type MemberOption,
} from "@/lib/mutations";

const TYPES = [
  { value: "spouse", pt: "Cônjuge / Casamento", en: "Spouse / Marriage", icon: "💍" },
  { value: "child", pt: "Filho(a) de", en: "Child of", icon: "👶" },
  { value: "parent", pt: "Pai/Mãe de", en: "Parent of", icon: "👪" },
  { value: "sibling", pt: "Irmão/Irmã", en: "Sibling", icon: "🧑‍🤝‍🧑" },
  { value: "partner", pt: "Companheiro(a)", en: "Partner", icon: "❤️" },
  { value: "divorced", pt: "Divorciados", en: "Divorced", icon: "💔" },
];

export function RelationshipForm({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const [people, setPeople] = useState<MemberOption[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("spouse");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMemberOptions().then(setPeople);
      setDone(false);
      setError(null);
    }
  }, [open]);

  const byName = useMemo(
    () => [...people].sort((a, b) => a.name.localeCompare(b.name)),
    [people]
  );
  const sel = TYPES.find((t) => t.value === type)!;
  const fromName = people.find((p) => p.id === from)?.name || "?";
  const toName = people.find((p) => p.id === to)?.name || "?";

  // Human-readable preview of the relationship being created.
  const preview = pt
    ? type === "child"
      ? `${fromName} é filho(a) de ${toName}`
      : type === "parent"
      ? `${fromName} é pai/mãe de ${toName}`
      : type === "spouse"
      ? `${fromName} é cônjuge de ${toName}`
      : type === "sibling"
      ? `${fromName} é irmão/irmã de ${toName}`
      : type === "divorced"
      ? `${fromName} e ${toName} são divorciados`
      : `${fromName} é companheiro(a) de ${toName}`
    : `${fromName} → ${sel.en} → ${toName}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from || !to) return setError(pt ? "Escolha as duas pessoas." : "Pick both people.");
    setSaving(true);
    // Normalise parent/child so the stored data matches the preview text.
    // Storage convention: type "child" => from_member is the PARENT, to_member the child.
    let payload: { from_member: string; to_member: string; type: string };
    if (type === "child") {
      // "A é filho(a) de B"  → B is the parent
      payload = { from_member: to, to_member: from, type: "child" };
    } else if (type === "parent") {
      // "A é pai/mãe de B"   → A is the parent
      payload = { from_member: from, to_member: to, type: "child" };
    } else {
      payload = { from_member: from, to_member: to, type };
    }
    const res = await createRelationship(payload);
    setSaving(false);
    if (!res.ok) return setError(res.error || "Erro");
    setDone(true);
    onSaved?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="🔗"
      title={pt ? "Ligar pessoas" : "Link people"}
      subtitle={pt ? "Crie uma relação para unir a árvore" : "Create a relationship to join the tree"}
    >
      {done ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-3xl text-sage-700">
            ✓
          </div>
          <h3 className="text-lg font-semibold">{pt ? "Relação criada!" : "Relationship created!"}</h3>
          <p className="mt-1 text-sm text-stone-500">{preview}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-primary" onClick={() => { setFrom(""); setTo(""); setDone(false); }}>
              ＋ {pt ? "Ligar mais" : "Link more"}
            </button>
            <button className="btn-ghost" onClick={onClose}>{pt ? "Concluir" : "Done"}</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="section-title">👥 {pt ? "Pessoas" : "People"}</div>
          <div className="field">
            <label className="label">{pt ? "Pessoa A" : "Person A"} <span className="req">*</span></label>
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">{pt ? "— escolher —" : "— choose —"}</option>
              {byName.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">{pt ? "Tipo de relação" : "Relationship"} <span className="req">*</span></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map((tp) => (
                <button
                  type="button"
                  key={tp.value}
                  onClick={() => setType(tp.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    type === tp.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-stone-800"
                      : "border-brand-100 hover:bg-brand-50 dark:border-stone-700 dark:hover:bg-stone-800"
                  }`}
                >
                  <span className="mr-1">{tp.icon}</span>
                  {pt ? tp.pt : tp.en}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">{pt ? "Pessoa B" : "Person B"} <span className="req">*</span></label>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">{pt ? "— escolher —" : "— choose —"}</option>
              {byName.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {from && to && (
            <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-stone-800 dark:text-brand-200">
              <span className="font-medium">{pt ? "Pré-visualização:" : "Preview:"}</span> {preview}
            </div>
          )}

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>{pt ? "Cancelar" : "Cancel"}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (pt ? "A guardar…" : "Saving…") : pt ? "Criar relação" : "Create link"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
