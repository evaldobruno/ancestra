"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

type State = "loading" | "ok" | "pending";

// Lets logged-out visitors browse the demo, validated members use the app,
// and shows a "waiting for approval" screen to freshly-registered users.
export function AccessGate({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const pt = locale === "pt";
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (alive) setState("ok"); // demo mode
        return;
      }
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        if (alive) setState("ok"); // logged out → demo preview
        return;
      }
      const { data: me } = await supabase
        .from("users")
        .select("family_id, role")
        .eq("id", auth.user.id)
        .single();
      const validated = !!me && (me.family_id != null || me.role === "super_admin");
      if (alive) {
        setEmail(auth.user.email || "");
        setState(validated ? "ok" : "pending");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    if (isSupabaseConfigured()) {
      try {
        await createClient().auth.signOut();
      } catch {}
    }
    router.push("/");
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-stone-400">
        {pt ? "A carregar…" : "Loading…"}
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-3xl">
            ⏳
          </div>
          <h1 className="text-xl font-bold">
            {pt ? "Conta a aguardar aprovação" : "Account awaiting approval"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {pt
              ? "A tua conta foi criada com sucesso. Um administrador da família vai validar o teu acesso em breve. Quando isso acontecer, é só voltar a entrar."
              : "Your account was created. A family admin will approve your access soon. Once approved, just sign in again."}
          </p>
          {email && <p className="mt-3 text-xs text-stone-400">{email}</p>}
          <button className="btn-ghost mt-5" onClick={signOut}>
            {pt ? "Sair" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
