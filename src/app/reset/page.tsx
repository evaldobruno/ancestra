"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";
import { NightSky } from "@/components/NightSky";

// Landing page for the password-recovery email link.
export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    // @supabase/ssr picks up the recovery session from the URL automatically.
    const supabase = createClient();
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw1.length < 6) return setMsg("A palavra-passe tem de ter pelo menos 6 caracteres.");
    if (pw1 !== pw2) return setMsg("As palavras-passe não coincidem.");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(false);
    if (error) return setMsg(error.message);
    setOk(true);
    setTimeout(() => router.push("/login"), 1800);
  }

  return (
    <main className="dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden night-sky px-5 text-white">
      <NightSky constellation={false} />
      <div className="card relative z-10 w-full max-w-md">
        <Link href="/" className="nd-wordmark text-2xl">Ancestra</Link>
        <h1 className="mt-3 text-xl font-bold">Nova palavra-passe</h1>
        {ok ? (
          <p className="mt-3 rounded-lg bg-sage-100 px-3 py-2 text-sm text-sage-700 dark:bg-stone-800 dark:text-sage-300">
            Palavra-passe alterada! A redirecionar para entrar…
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className="input" type="password" placeholder="Nova palavra-passe" value={pw1}
              onChange={(e) => setPw1(e.target.value)} />
            <input className="input" type="password" placeholder="Repetir palavra-passe" value={pw2}
              onChange={(e) => setPw2(e.target.value)} />
            {msg && <p className="text-sm text-red-500">{msg}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={busy || !ready}>
              {busy ? "A guardar…" : "Guardar palavra-passe"}
            </button>
            <p className="text-center text-xs text-stone-400">
              Abre esta página a partir do link que recebeste por email.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
