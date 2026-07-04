"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Member } from "@/lib/demo-data";
import { useFamilyData } from "@/lib/useFamilyData";
import { SourceBadge } from "@/components/SourceBadge";
import { MemberForm } from "@/components/MemberForm";
import { RelationshipForm } from "@/components/RelationshipForm";
import { fetchMemberById, type EditableMember } from "@/lib/mutations";

// ── Layout: rows = generations; couples sit side by side; children centre
//    under their parents. ───────────────────────────────────────────────────
const ROW_H = 230;
const NODE_W = 150;
const NODE_H = 168;
const MEMBER_GAP = 168; // distance between the two people of a couple
const UNIT_GAP = 70; // gap between separate units (singles/couples)

type Pos = { x: number; y: number };

// Timezone-safe date formatting (YYYY-MM-DD → DD.MM.AA).
function fmtDate(s?: string) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y) return "";
  if (!m || !d) return String(y);
  const yy = String(y).slice(-2);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${yy}`;
}

function layout(members: Member[]): Record<string, Pos> {
  const pos: Record<string, Pos> = {};
  if (members.length === 0) return pos;

  const byId = new Map(members.map((m) => [m.id, m]));

  // 1) Generation per member, then make spouses share the same (deepest) one.
  const gen = new Map<string, number>();
  members.forEach((m) => gen.set(m.id, m.generation || 0));
  for (let k = 0; k < 6; k++) {
    members.forEach((m) => {
      if (m.spouse && gen.has(m.spouse)) {
        const g = Math.max(gen.get(m.id)!, gen.get(m.spouse)!);
        gen.set(m.id, g);
        gen.set(m.spouse, g);
      }
    });
  }

  // 2) Build units: a couple (2 people) or a single person.
  type Unit = { ids: string[]; gen: number; center: number };
  const seen = new Set<string>();
  const units: Unit[] = [];
  members.forEach((m) => {
    if (seen.has(m.id)) return;
    seen.add(m.id);
    const ids = [m.id];
    if (m.spouse && byId.has(m.spouse) && !seen.has(m.spouse) && gen.get(m.spouse) === gen.get(m.id)) {
      ids.push(m.spouse);
      seen.add(m.spouse);
    }
    units.push({ ids, gen: gen.get(m.id)!, center: 0 });
  });

  const halfWidth = (u: Unit) => (u.ids.length === 2 ? MEMBER_GAP / 2 + NODE_W / 2 : NODE_W / 2);

  const parentCenter = (u: Unit): number | null => {
    const ps: number[] = [];
    u.ids.forEach((id) => {
      (byId.get(id)?.parents ?? []).forEach((pid) => {
        if (pos[pid]) ps.push(pos[pid].x);
      });
    });
    if (ps.length === 0) return null;
    return ps.reduce((a, b) => a + b, 0) / ps.length;
  };

  // 3) Place generation by generation (top → down). Parents are placed first,
  //    so children can be centred under them; overlaps are pushed right.
  const gens = [...new Set(units.map((u) => u.gen))].sort((a, b) => a - b);
  gens.forEach((g) => {
    const list = units.filter((u) => u.gen === g);
    const desired = new Map<Unit, number | null>();
    list.forEach((u) => desired.set(u, parentCenter(u)));
    list.sort((a, b) => (desired.get(a) ?? 0) - (desired.get(b) ?? 0));

    let lastRight = -Infinity;
    list.forEach((u) => {
      const half = halfWidth(u);
      const want = desired.get(u);
      let c = want != null ? want : lastRight === -Infinity ? 0 : lastRight + UNIT_GAP + half;
      const minC = lastRight + UNIT_GAP + half;
      if (c < minC) c = minC;
      u.center = c;
      lastRight = c + half;

      const y = g * ROW_H;
      if (u.ids.length === 2) {
        pos[u.ids[0]] = { x: c - MEMBER_GAP / 2, y };
        pos[u.ids[1]] = { x: c + MEMBER_GAP / 2, y };
      } else {
        pos[u.ids[0]] = { x: c, y };
      }
    });
  });

  // 4) Centre the whole tree horizontally around 0.
  const xs = Object.values(pos).map((p) => p.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  Object.values(pos).forEach((p) => (p.x -= mid));
  return pos;
}

export default function FamilyTree() {
  const { t, locale } = useI18n();
  const { members, source, loading, reload } = useFamilyData();
  const [memberOpen, setMemberOpen] = useState(false);
  const [editMember, setEditMember] = useState<EditableMember | null>(null);
  const [relOpen, setRelOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Pos>({ x: 0, y: 0 });
  const [immersive, setImmersive] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pos = useMemo(() => layout(members), [members]);
  const matches = (m: Member) =>
    query.trim() === "" ? false : m.name.toLowerCase().includes(query.toLowerCase());

  // Fit the whole tree inside the visible box (key for mobile).
  function fitView() {
    const el = containerRef.current;
    const xs = Object.values(pos).map((p) => p.x);
    const ys = Object.values(pos).map((p) => p.y);
    if (!el || xs.length === 0) return;
    const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const contentW = maxX - minX + NODE_W + 48;
    const contentH = maxY + NODE_H + 48;
    const cw = el.clientWidth, ch = el.clientHeight;
    const s = Math.min(cw / contentW, ch / contentH, 1.2) * 0.92;
    const clamped = Math.max(0.2, Math.min(2.5, s));
    setScale(clamped);
    setPan({ x: 0, y: 16 - 64 + (NODE_H / 2) * clamped });
  }

  // Auto-fit once the tree has loaded.
  useEffect(() => {
    if (!loading && members.length) {
      const id = setTimeout(fitView, 60);
      return () => clearTimeout(id);
    }
  }, [loading, members.length]);

  // Build edges: parent→child and spouse links
  const edges = useMemo(() => {
    const list: { from: Pos; to: Pos; kind: "parent" | "spouse" | "divorced" }[] = [];
    members.forEach((m) => {
      m.parents.forEach((pid) => {
        if (pos[pid] && pos[m.id]) list.push({ from: pos[pid], to: pos[m.id], kind: "parent" });
      });
      if (m.spouse && pos[m.spouse] && m.id < m.spouse) {
        list.push({ from: pos[m.id], to: pos[m.spouse], kind: m.spouseDivorced ? "divorced" : "spouse" });
      }
    });
    return list;
  }, [pos, members]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => Math.min(2.5, Math.max(0.4, s - e.deltaY * 0.001)));
  }
  function onDown(e: React.MouseEvent) {
    dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }
  function onMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setPan({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
  }
  function onUp() {
    dragging.current = null;
  }

  // ── Touch (mobile): one finger pans, two fingers pinch-zoom ──
  const touchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      dragging.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    } else if (e.touches.length === 2) {
      pinch.current = touchDist(e.touches);
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinch.current) {
      const d = touchDist(e.touches);
      setScale((s) => Math.min(2.5, Math.max(0.2, s * (d / pinch.current!))));
      pinch.current = d;
    } else if (e.touches.length === 1 && dragging.current) {
      setPan({ x: e.touches[0].clientX - dragging.current.x, y: e.touches[0].clientY - dragging.current.y });
    }
  }
  function onTouchEnd() {
    dragging.current = null;
    pinch.current = null;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("tree.title")}</h1>
          <SourceBadge source={source} loading={loading} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-[200px]"
            placeholder={t("tree.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-ghost text-sm" onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}>＋</button>
          <button className="btn-ghost text-sm" onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}>－</button>
          <button className="btn-ghost text-sm" onClick={fitView} title={locale === "pt" ? "Ver tudo" : "Fit"}>⤢</button>
          <button
            className={`text-sm ${immersive ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setImmersive((v) => !v)}
          >
            ✨ {t("tree.immersive")}
          </button>
          <button className="btn-ghost text-sm" onClick={() => { setEditMember(null); setMemberOpen(true); }}>
            👤 {locale === "pt" ? "Membro" : "Member"}
          </button>
          <button className="btn-primary text-sm" onClick={() => setRelOpen(true)}>
            🔗 {locale === "pt" ? "Ligar" : "Link"}
          </button>
        </div>
      </div>

      <MemberForm
        open={memberOpen}
        onClose={() => { setMemberOpen(false); setEditMember(null); }}
        onSaved={reload}
        editMember={editMember}
      />
      <RelationshipForm open={relOpen} onClose={() => setRelOpen(false)} onSaved={reload} />

      <div
        ref={containerRef}
        className={`relative h-[70vh] overflow-hidden rounded-3xl border border-brand-100 dark:border-stone-800 ${
          immersive ? "tree-immersive" : "bg-white dark:bg-stone-900"
        }`}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: dragging.current ? "grabbing" : "grab", touchAction: "none" }}
      >
        <div
          className="absolute left-1/2 top-16 origin-top"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {/* Connection lines */}
          <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0 }}>
            {edges.map((e, i) => {
              const x1 = e.from.x, y1 = e.from.y + (e.kind === "parent" ? NODE_H / 2 : 0);
              const x2 = e.to.x, y2 = e.to.y - (e.kind === "parent" ? NODE_H / 2 : 0);
              if (e.kind === "spouse") {
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e67a52" strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />;
              }
              if (e.kind === "divorced") {
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8a94a6" strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round" />
                    {/* broken-link symbol: two short slashes crossing the line */}
                    <line x1={mx - 5} y1={my - 9} x2={mx + 1} y2={my + 9} stroke="#c0392b" strokeWidth={2.5} strokeLinecap="round" />
                    <line x1={mx + 5} y1={my - 9} x2={mx + 11} y2={my + 9} stroke="#c0392b" strokeWidth={2.5} strokeLinecap="round" />
                  </g>
                );
              }
              const midY = (y1 + y2) / 2;
              return (
                <path key={i} d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none" stroke="#a0371f" strokeOpacity={0.5} strokeWidth={2} />
              );
            })}
          </svg>

          {/* Nodes */}
          {members.map((m) => {
            const p = pos[m.id];
            const hit = matches(m);
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="absolute flex flex-col overflow-hidden rounded-2xl border bg-white text-center shadow-md transition hover:scale-105 dark:bg-stone-900"
                style={{
                  width: NODE_W, height: NODE_H,
                  left: p.x - NODE_W / 2, top: p.y - NODE_H / 2,
                  borderColor: m.color,
                  boxShadow: hit ? `0 0 0 4px ${m.color}55` : undefined,
                }}
              >
                {/* Photo fills most of the card */}
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt=""
                    className={`w-full min-h-0 flex-1 object-cover ${m.status === "deceased" ? "grayscale" : ""}`} />
                ) : (
                  <div
                    className="flex w-full flex-1 items-center justify-center text-4xl font-bold text-white"
                    style={{ background: m.color }}
                  >
                    {m.knownAs.slice(0, 1)}
                  </div>
                )}
                {/* Name + birth date on one line */}
                <div className="flex shrink-0 items-baseline justify-center gap-1.5 px-2 py-1.5">
                  <span className="truncate text-sm font-semibold leading-tight">{m.knownAs}</span>
                  <span className="shrink-0 text-[11px] text-stone-400">
                    {fmtDate(m.birthDate)}
                    {m.status === "deceased" ? " †" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400">
            {t("common.loading")}
          </div>
        )}

        {/* Generation legend */}
        <div className="absolute bottom-3 left-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-stone-500 backdrop-blur dark:bg-stone-900/80">
          {t("tree.generation")}: 0 → {Math.max(0, ...members.map((m) => m.generation))} · {members.length} {locale === "pt" ? "pessoas" : "people"}
        </div>
      </div>

      {/* Profile drawer */}
      {selected && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setSelected(null)}>
          <div className="card w-full max-w-md rounded-b-none sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {selected.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.avatarUrl} alt=""
                  className={`h-14 w-14 rounded-full object-cover ${selected.status === "deceased" ? "grayscale" : ""}`}
                  style={{ boxShadow: `0 0 0 2px ${selected.color}` }} />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl text-white"
                  style={{ background: selected.color }}>
                  {selected.knownAs.slice(0, 1)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-stone-400">"{selected.knownAs}"</p>
              </div>
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <Row k={t("members.bornIn")} v={`${selected.birthPlace ?? "—"} · ${fmtDate(selected.birthDate)}`} />
              <Row k={t("members.profession")} v={selected.profession ?? "—"} />
              <Row k={t("tree.generation")} v={String(selected.generation)} />
            </dl>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-primary flex-1"
                onClick={async () => {
                  const full = await fetchMemberById(selected.id);
                  if (full) {
                    setEditMember(full);
                    setMemberOpen(true);
                    setSelected(null);
                  }
                }}
              >
                {locale === "pt" ? "Ver / editar perfil" : "View / edit profile"}
              </button>
              <button className="btn-ghost" onClick={() => setSelected(null)}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-brand-50 py-1 dark:border-stone-800">
      <dt className="text-stone-400">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
