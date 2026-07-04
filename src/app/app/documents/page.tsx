"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { isSupabaseConfigured } from "@/lib/queries";
import { uploadDocument } from "@/lib/storage";
import { fetchDocuments, addDocument, deleteDocument, type DocRow } from "@/lib/documents";

const TYPES = [
  { v: "birth", pt: "Certidão de nascimento", en: "Birth certificate" },
  { v: "marriage", pt: "Certidão de casamento", en: "Marriage certificate" },
  { v: "death", pt: "Certidão de óbito", en: "Death certificate" },
  { v: "id", pt: "Documento de identificação", en: "ID document" },
  { v: "letter", pt: "Carta / manuscrito", en: "Letter / manuscript" },
  { v: "photo", pt: "Fotografia de documento", en: "Document photo" },
  { v: "other", pt: "Outro", en: "Other" },
];

const fmtDate = (s?: string | null, pt = true) => {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y) return "";
  if (!m || !d) return String(y);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
};
const fmtSize = (b?: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : "");
const iconFor = (url: string) => (/\.pdf($|\?)/i.test(url) ? "📄" : /\.(png|jpe?g|gif|webp|heic)($|\?)/i.test(url) ? "🖼️" : "📎");

export default function Documents() {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [pending, setPending] = useState<{ url: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetchDocuments().then((d) => { setDocs(d); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setBusy(true);
    const up = await uploadDocument(file, "documents");
    setBusy(false);
    if (!up.ok || !up.url) { setMsg(up.error || "Erro"); return; }
    setPending({ url: up.url, size: up.size || 0 });
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
  }

  async function save() {
    setMsg(null);
    if (!name.trim()) return setMsg(pt ? "Indica um nome." : "Enter a name.");
    if (!pending) return setMsg(pt ? "Carrega o ficheiro primeiro." : "Upload the file first.");
    setBusy(true);
    const res = await addDocument({ name, url: pending.url, doc_type: type, doc_date: date, size_bytes: pending.size });
    setBusy(false);
    if (!res.ok) return setMsg(res.error || "Erro");
    setName(""); setType(""); setDate(""); setPending(null);
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  async function remove(id: string) {
    if (!window.confirm(pt ? "Apagar este documento?" : "Delete this document?")) return;
    await deleteDocument(id);
    load();
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">{pt ? "Documentos históricos" : "Historical documents"}</h1>
        <p className="mt-3 text-stone-500">{pt ? "Disponível depois de iniciar sessão." : "Available once signed in."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{pt ? "Documentos históricos" : "Historical documents"}</h1>
        <p className="mt-1 text-sm text-stone-400">
          {pt
            ? "Guarda certidões, cartas antigas e papéis de família num só lugar seguro."
            : "Keep certificates, old letters and family papers in one safe place."}
        </p>
      </div>

      {/* Upload form */}
      <div className="card space-y-3">
        <h2 className="font-semibold">{pt ? "Adicionar documento" : "Add document"}</h2>
        <div className="form-grid">
          <div className="field">
            <label className="label">{pt ? "Nome" : "Name"} <span className="req">*</span></label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={pt ? "Ex.: Certidão de casamento dos avós" : "e.g. Grandparents' marriage certificate"} />
          </div>
          <div className="field">
            <label className="label">{pt ? "Tipo" : "Type"}</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">—</option>
              {TYPES.map((tp) => <option key={tp.v} value={tp.v}>{pt ? tp.pt : tp.en}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">{pt ? "Data do documento" : "Document date"}</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{pt ? "Ficheiro (PDF ou imagem)" : "File (PDF or image)"}</label>
            <button type="button" className="btn-ghost w-full" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? (pt ? "A carregar…" : "Uploading…") : pending ? (pt ? "✓ Ficheiro pronto" : "✓ File ready") : (pt ? "Escolher ficheiro" : "Choose file")}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={save} disabled={busy || !pending || !name.trim()}>
            {pt ? "Guardar documento" : "Save document"}
          </button>
          {msg && <span className="text-sm text-red-600">{msg}</span>}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-stone-400">{pt ? "A carregar…" : "Loading…"}</p>
      ) : docs.length === 0 ? (
        <div className="card text-center text-stone-400">
          {pt ? "Ainda não há documentos. Adiciona o primeiro acima." : "No documents yet. Add the first above."}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="card flex items-center gap-3 py-3">
              <span className="text-2xl">{iconFor(d.url)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                <div className="truncate text-xs text-stone-400">
                  {d.doc_type ? (pt ? TYPES.find((x) => x.v === d.doc_type)?.pt : TYPES.find((x) => x.v === d.doc_type)?.en) || d.doc_type : ""}
                  {d.doc_date ? ` · ${fmtDate(d.doc_date, pt)}` : ""}
                  {d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ""}
                </div>
              </div>
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 text-sm">
                {pt ? "Abrir" : "Open"}
              </a>
              <button onClick={() => remove(d.id)} className="btn-ghost shrink-0 text-sm text-red-600" title={pt ? "Apagar" : "Delete"}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
