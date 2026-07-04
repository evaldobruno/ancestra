"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  fetchFamiliesWithCounts,
  fetchAppUsers,
  updateUserAccess,
  createInvitation,
  fetchInvitations,
  createFamily,
  orderFamilies,
  deleteUser,
  roleRank,
  type FamilyRow,
  type AppUser,
  type InviteRow,
} from "@/lib/mutations";
import { isSupabaseConfigured } from "@/lib/queries";
import { useMyRole } from "@/lib/useRole";
import { logAction, fetchAuditLog, type AuditRow } from "@/lib/audit";

const ROLES = ["super_admin", "family_admin", "member", "guest"];

export default function Admin() {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const { role, userId, loading: roleLoading } = useMyRole();
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // invite form state
  const [invEmail, setInvEmail] = useState("");
  const [invFamily, setInvFamily] = useState("");
  const [invRole, setInvRole] = useState("member");
  const [invMsg, setInvMsg] = useState<string | null>(null);

  // new-family (branch) form state
  const [famName, setFamName] = useState("");
  const [famParent, setFamParent] = useState("");
  const [famMsg, setFamMsg] = useState<string | null>(null);

  // activity log (super admin only)
  const [log, setLog] = useState<AuditRow[]>([]);

  // per-user pending edits (family + role), committed with a button
  const [draft, setDraft] = useState<Record<string, { family_id: string; role: string }>>({});
  const setUserField = (id: string, field: "family_id" | "role", value: string, u: AppUser) =>
    setDraft((p) => ({
      ...p,
      [id]: {
        family_id: p[id]?.family_id ?? u.family_id ?? "",
        role: p[id]?.role ?? u.role,
        [field]: value,
      },
    }));

  async function addFamily() {
    setFamMsg(null);
    if (!famName.trim()) {
      setFamMsg(pt ? "Indique o nome." : "Enter a name.");
      return;
    }
    const res = await createFamily(famName, famParent || null);
    if (res.ok) {
      setFamName("");
      setFamParent("");
      setFamMsg(pt ? "Família criada!" : "Family created!");
      load();
    } else {
      setFamMsg(res.error || "Erro");
    }
  }

  async function load() {
    setLoading(true);
    const [f, u, i] = await Promise.all([
      fetchFamiliesWithCounts(),
      fetchAppUsers(),
      fetchInvitations(),
    ]);
    setFamilies(f);
    setUsers(u);
    setInvites(i);
    // seed per-user drafts; pending guests default to "member" when approved
    const d: Record<string, { family_id: string; role: string }> = {};
    u.forEach((x) => {
      const pending = !x.family_id && x.role !== "super_admin";
      d[x.id] = { family_id: x.family_id ?? "", role: pending && x.role === "guest" ? "member" : x.role };
    });
    setDraft(d);
    setLoading(false);
  }

  async function removeUser(u: AppUser) {
    if (!window.confirm(pt ? `Eliminar a conta de ${u.email}? Perde o acesso à app.` : `Delete ${u.email}'s account?`)) return;
    const res = await deleteUser(u.id);
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      logAction("delete", "account", u.email);
      setSavedMsg(pt ? `Conta de ${u.email} eliminada.` : `${u.email} deleted.`);
    } else {
      setSavedMsg(res.error || "Erro");
    }
  }

  async function commit(u: AppUser) {
    const d = draft[u.id] ?? { family_id: u.family_id ?? "", role: u.role };
    if (!d.family_id) {
      setSavedMsg(pt ? "Escolhe a família para autorizar." : "Pick a family to authorize.");
      return;
    }
    await save(u, d.family_id || null, d.role || "member");
  }

  async function sendInvite() {
    setInvMsg(null);
    if (!invEmail.trim() || !invFamily) {
      setInvMsg(pt ? "Indique email e família." : "Enter email and family.");
      return;
    }
    const res = await createInvitation(invEmail, invFamily, invRole);
    if (res.ok) {
      setInvEmail("");
      setInvMsg(pt ? "Convite criado! A pessoa já pode registar-se com esse email." : "Invite created!");
      load();
    } else {
      setInvMsg(res.error || "Erro");
    }
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (role === "super_admin") fetchAuditLog().then(setLog);
  }, [role]);

  async function save(u: AppUser, familyId: string | null, role: string) {
    setSavedMsg(null);
    const res = await updateUserAccess(u.id, familyId, role);
    if (res.ok) {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, family_id: familyId, role } : x))
      );
      logAction("authorize", "access", `${u.email} → ${role}`);
      setSavedMsg(pt ? `Acesso de ${u.email} atualizado.` : `${u.email} updated.`);
    } else {
      setSavedMsg(res.error || "Erro");
    }
  }

  const totalMembers = families.reduce((s, f) => s + f.members, 0);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">{pt ? "Administração" : "Admin"}</h1>
        <p className="mt-3 text-stone-500">{pt ? "Disponível com Supabase configurado." : "Available with Supabase configured."}</p>
      </div>
    );
  }

  // Administration is for admins (super or family).
  const isSuper = role === "super_admin";
  const isAdmin = isSuper || role === "family_admin";
  if (!roleLoading && !isAdmin) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">{pt ? "Administração" : "Admin"}</h1>
        <p className="mt-3 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800 dark:bg-stone-800 dark:text-gold-200">
          {pt ? "Não tens acesso a esta área." : "You don't have access to this area."}
        </p>
      </div>
    );
  }

  // family_admin cannot grant super_admin nor edit the super admin's account.
  const roleOptions = isSuper ? ROLES : ROLES.filter((r) => r !== "super_admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{pt ? "Administração" : "Admin"}</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: pt ? "Famílias" : "Families", value: families.length, icon: "👨‍👩‍👧" },
          { label: pt ? "Membros" : "Members", value: totalMembers, icon: "🧑" },
          { label: pt ? "Contas" : "Accounts", value: users.length, icon: "🔑" },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-1 text-2xl font-bold">{loading ? "…" : s.value}</div>
            <div className="text-sm text-stone-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invite people (invite-only sign-up) */}
      <div className="card">
        <h2 className="mb-1 font-semibold">{pt ? "Convidar pessoa" : "Invite a person"}</h2>
        <p className="mb-4 text-sm text-stone-400">
          {pt
            ? "Só quem tiver convite consegue criar conta. Ao registar-se com este email, fica ligado à família automaticamente."
            : "Only invited people can register. They get linked to the family automatically."}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="pessoa@email.com" value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">{pt ? "Família" : "Family"}</label>
            <select className="input max-w-[180px]" value={invFamily} onChange={(e) => setInvFamily(e.target.value)}>
              <option value="">{pt ? "— escolher —" : "— choose —"}</option>
              {orderFamilies(families).map((f) => (
                <option key={f.id} value={f.id}>{f.parent_family_id ? "   ↳ " : ""}{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{pt ? "Papel" : "Role"}</label>
            <select className="input max-w-[150px]" value={invRole} onChange={(e) => setInvRole(e.target.value)}>
              {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <button className="btn-primary" onClick={sendInvite}>{pt ? "Convidar" : "Invite"}</button>
        </div>
        {invMsg && <p className="mt-3 text-sm text-sage-700 dark:text-sage-300">{invMsg}</p>}

        {invites.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {pt ? "Convites" : "Invitations"}
            </div>
            <div className="space-y-1 text-sm">
              {invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between border-t border-brand-50 py-1.5 dark:border-brand-800">
                  <span className="truncate">{i.email} <span className="text-stone-400">→ {i.family_name || "—"}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    i.status === "accepted" ? "bg-sage-100 text-sage-700" : "bg-gold-100 text-gold-800"
                  }`}>{i.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Access management — the in-app onboarding */}
      <div className="card">
        <h2 className="mb-1 font-semibold">{pt ? "Acessos das pessoas" : "People & access"}</h2>
        <p className="mb-4 text-sm text-stone-400">
          {pt
            ? "Quando alguém se regista, aparece aqui. Atribui-lhe uma família e um papel."
            : "When someone registers they appear here. Assign them a family and a role."}
        </p>

        {savedMsg && (
          <p className="mb-3 rounded-lg bg-sage-100 px-3 py-2 text-sm text-sage-700 dark:bg-stone-800 dark:text-sage-300">
            {savedMsg}
          </p>
        )}

        {loading ? (
          <p className="text-stone-400">{pt ? "A carregar…" : "Loading…"}</p>
        ) : users.length === 0 ? (
          <p className="text-stone-400">{pt ? "Ainda não há contas." : "No accounts yet."}</p>
        ) : (
          <div className="space-y-1.5">
            {[...users]
              .sort((a, b) => Number(!!a.family_id) - Number(!!b.family_id))
              .map((u) => {
              const pending = !u.family_id && u.role !== "super_admin";
              const locked = u.role === "super_admin" && !isSuper; // family_admin can't touch the super admin
              return (
              <div
                key={u.id}
                className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 text-sm sm:flex-row sm:items-center sm:gap-2 ${
                  pending ? "border-gold-300 bg-gold-50/60 dark:border-gold-700 dark:bg-stone-800" : "border-brand-100 dark:border-brand-800"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{u.full_name || u.email}</span>
                    {pending && (
                      <span className="shrink-0 rounded-full bg-gold-200 px-1.5 py-0.5 text-[10px] font-medium text-gold-900">
                        {pt ? "pendente" : "pending"}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-stone-400">{u.email}</div>
                </div>
                {locked ? (
                  <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-stone-700 dark:text-stone-200">
                    🔒 {pt ? "Administrador principal" : "Main administrator"}
                  </span>
                ) : (
                <div className="flex shrink-0 items-center gap-1.5">
                  <select
                    className="input w-[130px] py-1 text-xs"
                    value={draft[u.id]?.family_id ?? u.family_id ?? ""}
                    onChange={(e) => setUserField(u.id, "family_id", e.target.value, u)}
                  >
                    <option value="">{pt ? "— família —" : "— family —"}</option>
                    {orderFamilies(families).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.parent_family_id ? "↳ " : ""}{f.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input w-[110px] py-1 text-xs"
                    value={draft[u.id]?.role ?? u.role}
                    onChange={(e) => setUserField(u.id, "role", e.target.value, u)}
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`${pending ? "btn-primary" : "btn-ghost"} px-2.5 py-1 text-xs`}
                    onClick={() => commit(u)}
                    disabled={!(draft[u.id]?.family_id ?? u.family_id)}
                  >
                    {pending ? (pt ? "Autorizar" : "Authorize") : pt ? "Guardar" : "Save"}
                  </button>
                  {roleRank(role) > roleRank(u.role) && u.id !== userId && (
                    <button
                      className="btn-ghost px-2 py-1 text-xs text-red-600"
                      onClick={() => removeUser(u)}
                      title={pt ? "Eliminar conta" : "Delete account"}
                    >
                      🗑️
                    </button>
                  )}
                </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create a family / branch */}
      <div className="card">
        <h2 className="mb-1 font-semibold">{pt ? "Nova família (ramo)" : "New family (branch)"}</h2>
        <p className="mb-4 text-sm text-stone-400">
          {pt
            ? "A Gonçalves é o tronco. Cria ramos (ex.: Bravo Gonçalves) e escolhe a família-mãe à qual se ligam."
            : "Gonçalves is the trunk. Create branches and pick the parent family they link to."}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="label">{pt ? "Nome da família" : "Family name"}</label>
            <input className="input" placeholder={pt ? "Ex.: Família Bravo Gonçalves" : "e.g. Família Bravo Gonçalves"}
              value={famName} onChange={(e) => setFamName(e.target.value)} />
          </div>
          <div>
            <label className="label">{pt ? "Família-mãe" : "Parent family"}</label>
            <select className="input max-w-[220px]" value={famParent} onChange={(e) => setFamParent(e.target.value)}>
              <option value="">{pt ? "— nenhuma (tronco) —" : "— none (trunk) —"}</option>
              {orderFamilies(families).map((f) => (
                <option key={f.id} value={f.id}>{f.parent_family_id ? "   ↳ " : ""}{f.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={addFamily}>{pt ? "Criar família" : "Create family"}</button>
        </div>
        {famMsg && <p className="mt-3 text-sm text-sage-700 dark:text-sage-300">{famMsg}</p>}
      </div>

      {/* Families overview (hierarchy) */}
      <div className="card">
        <h2 className="mb-3 font-semibold">{pt ? "Famílias" : "Families"}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-stone-400">
              <tr>
                <th className="py-2">{pt ? "Nome" : "Name"}</th>
                <th>{pt ? "Família-mãe" : "Parent"}</th>
                <th>{pt ? "Membros" : "Members"}</th>
              </tr>
            </thead>
            <tbody>
              {[...families]
                .sort((a, b) => {
                  // trunk first, then branches grouped under their parent name
                  const ka = a.parent_family_id ? `1-${a.parent_name}-${a.name}` : `0-${a.name}`;
                  const kb = b.parent_family_id ? `1-${b.parent_name}-${b.name}` : `0-${b.name}`;
                  return ka.localeCompare(kb);
                })
                .map((f) => (
                  <tr key={f.id} className="border-t border-brand-50 dark:border-brand-800">
                    <td className="py-2 font-medium">
                      {f.parent_family_id ? <span className="text-stone-400">↳ </span> : null}
                      {f.name}
                    </td>
                    <td className="text-stone-400">{f.parent_name || (pt ? "tronco" : "trunk")}</td>
                    <td>{f.members}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity log — super admin only */}
      {isSuper && (
        <div className="card">
          <h2 className="mb-1 font-semibold">{pt ? "Registo de atividade" : "Activity log"}</h2>
          <p className="mb-3 text-sm text-stone-400">
            {pt ? "Quem fez o quê, e quando." : "Who did what, and when."}
          </p>
          {log.length === 0 ? (
            <p className="text-sm text-stone-400">{pt ? "Sem registos ainda." : "No activity yet."}</p>
          ) : (
            <div className="max-h-[420px] space-y-1 overflow-y-auto text-sm">
              {log.map((e) => {
                const verb = ACTION_LABEL[e.action]?.[pt ? 0 : 1] || e.action;
                const ent = ENTITY_LABEL[e.entity]?.[pt ? 0 : 1] || e.entity;
                return (
                  <div key={e.id} className="flex items-baseline justify-between gap-3 border-t border-brand-50 py-1.5 dark:border-brand-800">
                    <span className="min-w-0">
                      <span className="font-medium">{e.actor_name}</span>{" "}
                      <span className="text-stone-500">{verb} {ent}</span>
                      {e.label ? <span className="text-stone-500"> — {e.label}</span> : null}
                    </span>
                    <span className="shrink-0 text-[11px] text-stone-400">
                      {new Date(e.created_at).toLocaleString(pt ? "pt-PT" : "en-GB", {
                        day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ACTION_LABEL: Record<string, [string, string]> = {
  create: ["criou", "created"],
  update: ["editou", "updated"],
  delete: ["apagou", "deleted"],
  invite: ["convidou para", "invited to"],
  authorize: ["autorizou", "authorized"],
};
const ENTITY_LABEL: Record<string, [string, string]> = {
  member: ["um membro", "a member"],
  event: ["um evento", "an event"],
  memory: ["uma memória", "a memory"],
  family: ["uma família", "a family"],
  document: ["um documento", "a document"],
  relationship: ["uma ligação", "a relationship"],
  invitation: ["um convite", "an invitation"],
  access: ["o acesso de", "access for"],
  account: ["uma conta", "an account"],
};
