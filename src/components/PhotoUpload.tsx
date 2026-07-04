"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { uploadImage } from "@/lib/storage";

// Reusable photo picker + uploader. Shows a preview and calls onChange(url).
export function PhotoUpload({
  value,
  onChange,
  folder = "uploads",
  shape = "circle",
  label,
}: {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: string;
  shape?: "circle" | "square";
  label?: string;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const res = await uploadImage(file, folder);
    setBusy(false);
    if (res.ok && res.url) onChange(res.url);
    else setError(res.error || "Erro");
    if (inputRef.current) inputRef.current.value = "";
  }

  const box = shape === "circle" ? "h-20 w-20 rounded-full" : "h-24 w-32 rounded-xl";

  return (
    <div className="field">
      {label && <label className="label">{label}</label>}
      <div className="flex items-center gap-3">
        <div className={`flex ${box} items-center justify-center overflow-hidden border border-brand-100 bg-brand-50 text-2xl text-stone-400 dark:border-stone-700 dark:bg-stone-800`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            "📷"
          )}
        </div>
        <div>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy
              ? pt ? "A carregar…" : "Uploading…"
              : value
              ? pt ? "Mudar foto" : "Change photo"
              : pt ? "Carregar foto" : "Upload photo"}
          </button>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}
