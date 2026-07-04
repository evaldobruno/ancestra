"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useFamilyData } from "@/lib/useFamilyData";
import { MemberForm } from "@/components/MemberForm";
import { SourceBadge, SkeletonGrid } from "@/components/SourceBadge";
import { fetchMemberById, deleteMember, type EditableMember } from "@/lib/mutations";

export default function Members() {
  const { t, locale } = useI18n();
  const pt = locale === "pt";
  const { members, source, loading, reload } = useFamilyData();
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editMember, setEditMember] = useState<EditableMember | null>(null);
  const list = members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  async function openEdit(id: string) {
    const full = await fetchMemberById(id);
    if (full) {
      setEditMember(full);
      setFormOpen(true);
    }
  }

  function openCreate() {
    setEditMember(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditMember(null);
  }

  async function removeMember(id: string, name: string) {
    const ok = window.confirm(
      pt
        ? `Apagar ${name}? Esta pessoa deixa de aparecer na árvore e na lista.`
        : `Delete ${name}? They will be removed from the tree and list.`
    );
    if (!ok) return;
    const res = await deleteMember(id);
    if (res.ok) reload();
    else alert(res.error || "Erro");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("members.title")}</h1>
          <SourceBadge source={source} loading={loading} />
        </div>
        <div className="flex gap-2">
          <input className="input max-w-[200px]" placeholder={t("common.search")} value={q}
            onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary" onClick={openCreate}>＋ {t("members.add")}</button>
        </div>
      </div>

      <MemberForm open={formOpen} onClose={closeForm} onSaved={reload} editMember={editMember} />

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-center gap-3">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt=""
                    className={`h-12 w-12 rounded-full object-cover ${m.status === "deceased" ? "grayscale" : ""}`}
                    style={{ boxShadow: `0 0 0 2px ${m.color}` }} />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-white"
                    style={{ background: m.color }}>{m.knownAs.slice(0, 1)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-sm text-stone-400">"{m.knownAs}"</p>
                </div>
                {source === "supabase" && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(m.id)}
                      className="btn-ghost px-2 py-1 text-sm"
                      title={pt ? "Editar" : "Edit"}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => removeMember(m.id, m.name)}
                      className="btn-ghost px-2 py-1 text-sm text-red-600"
                      title={pt ? "Apagar" : "Delete"}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
              <dl className="mt-3 space-y-1 text-sm text-stone-500">
                {m.birthPlace && <div>📍 {m.birthPlace}{m.birthDate ? ` · ${new Date(m.birthDate).getFullYear()}` : ""}</div>}
                {m.profession && <div>💼 {m.profession}</div>}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
