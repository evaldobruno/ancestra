import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Ancestra lives in its own isolated Postgres schema (shared project).
const SCHEMA = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "ancestra";

// Server-side Supabase client (App Router). Respects RLS via the user session.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    }
  );
}

// Service-role client — SERVER ONLY. Bypasses RLS. Use for cron/admin/backups.
export function createAdminClient() {
  const { createClient: createSb } = require("@supabase/supabase-js");
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: SCHEMA }, auth: { autoRefreshToken: false, persistSession: false } }
  );
}
