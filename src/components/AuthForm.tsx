"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { LangSwitcher, ThemeToggle } from "@/components/Controls";
import { NightSky } from "@/components/NightSky";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      // Demo mode: no backend configured → go straight to the demo app.
      router.push("/app");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/app");
    } catch (err: any) {
      const raw = String(err?.message ?? "Error");
      // Invite-only: the DB trigger blocks uninvited sign-ups.
      if (mode === "signup" && /database error|saving new user|invite|convite/i.test(raw)) {
        setError("És da família? Então pede a um parente para te convidar.");
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dark relative flex min-h-screen flex-col overflow-hidden night-sky text-white">
      <NightSky constellation={false} />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between p-5">
        <Link href="/" className="nd-wordmark text-2xl">Ancestra</Link>
        <div className="flex gap-2"><LangSwitcher /><ThemeToggle /></div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16">
        <div className="card w-full max-w-md">
          <h1 className="text-2xl font-bold">
            {mode === "signin" ? t("auth.welcome") : t("auth.createTitle")}
          </h1>
          {!configured && (
            <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-stone-800 dark:text-brand-200">
              {t("common.demo")} — Supabase não configurado. Qualquer botão abre a demo.
            </p>
          )}
          {mode === "signup" && configured && (
            <p className="mt-2 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800 dark:bg-stone-800 dark:text-gold-200">
              Cria a tua conta. O acesso é aprovado por um administrador — terás acesso assim que fores validado.
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <input className="input" placeholder={t("auth.name")} value={name}
                onChange={(e) => setName(e.target.value)} />
            )}
            <input className="input" type="email" placeholder={t("auth.email")} value={email}
              onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder={t("auth.password")} value={password}
              onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? t("common.loading") : mode === "signin" ? t("auth.signin") : t("auth.signup")}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-stone-500">
            {mode === "signin" ? (
              <>{t("auth.noaccount")} <Link href="/register" className="text-brand-600 underline">{t("auth.signup")}</Link></>
            ) : (
              <>{t("auth.haveaccount")} <Link href="/login" className="text-brand-600 underline">{t("auth.signin")}</Link></>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
