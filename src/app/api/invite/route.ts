import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/service";
import { renderTemplate } from "@/lib/email/templates";
import type { Locale } from "@/i18n/dictionaries";

// POST /api/invite — admin invites a relative by email (spec §14).
export async function POST(req: Request) {
  const { email, fullName, role = "member", locale = "en" } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("family_id, role")
    .eq("id", auth.user.id)
    .single();

  if (!me || !["super_admin", "family_admin"].includes(me.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = randomBytes(24).toString("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("invitations").insert({
    family_id: me.family_id,
    email,
    full_name: fullName,
    role,
    token,
    created_by: auth.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  const { data: fam } = await admin.from("families").select("name").eq("id", me.family_id).single();
  const { subject, html } = renderTemplate("invite", locale as Locale, {
    name: fullName ?? email,
    family: fam?.name ?? "Ancestra",
    link,
  });
  const result = await sendEmail({ to: email, subject, html, template: "invite" });
  await admin.from("email_logs").insert({
    family_id: me.family_id, to_email: email, template: "invite",
    subject, status: result.ok ? "sent" : "failed", provider: result.provider, error: result.error,
  });

  return NextResponse.json({ ok: true, emailed: result.ok });
}
