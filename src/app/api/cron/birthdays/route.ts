import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/service";
import { renderTemplate } from "@/lib/email/templates";

// GET /api/cron/birthdays — run daily. Emails members about tomorrow's birthdays
// (spec §8, §12, §16). Protect with CRON_SECRET; wire to Vercel Cron / Supabase
// scheduled function / any scheduler.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");

  // Find calendar birthday entries matching tomorrow's MM-DD.
  const { data: entries } = await admin
    .from("calendar_entries")
    .select("title, family_id, entry_date")
    .eq("kind", "birthday");

  const due = (entries ?? []).filter((e: any) => {
    const d = new Date(e.entry_date);
    return String(d.getMonth() + 1).padStart(2, "0") === mm &&
           String(d.getDate()).padStart(2, "0") === dd;
  });

  let sent = 0;
  for (const e of due) {
    // Notify family members who opted in to birthday emails.
    const { data: members } = await admin
      .from("users")
      .select("email, locale, notification_preferences(birthdays)")
      .eq("family_id", e.family_id);

    for (const u of members ?? []) {
      const { subject, html } = renderTemplate("birthday", (u.locale ?? "en") as any, {
        name: e.title.replace(/Aniversário d[eo] /i, ""),
        date: `${dd}/${mm}`,
      });
      const r = await sendEmail({ to: u.email, subject, html, template: "birthday" });
      if (r.ok) sent++;
    }
  }

  return NextResponse.json({ ok: true, birthdays: due.length, emailsSent: sent });
}
