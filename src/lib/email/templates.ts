// Bilingual (PT/EN) email templates (spec §27). NL ready to add.
import type { Locale } from "@/i18n/dictionaries";

const shell = (title: string, body: string) => `
<!doctype html><html><body style="margin:0;background:#fdf4f0;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #f6c8b1">
    <div style="background:#d95a30;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">Ancestra</div>
    <div style="padding:28px;color:#2b2b2b;line-height:1.6">
      <h2 style="margin:0 0 12px;color:#a0371f">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 28px;color:#999;font-size:12px;border-top:1px solid #f3f6f3">
      Ancestra · ${new Date().getFullYear()}
    </div>
  </div>
</body></html>`;

type Vars = Record<string, string>;
const fill = (s: string, v: Vars) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

export const TEMPLATES: Record<
  string,
  Record<Locale, { subject: string; body: string }>
> = {
  invite: {
    pt: { subject: "Foi convidado para a {family} no Ancestra", body: "Olá {name},<p>Foi convidado para se juntar à <b>{family}</b>. Clique para criar a sua conta:</p><p><a href='{link}' style='background:#d95a30;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none'>Aceitar convite</a></p><p style='color:#999'>Este link expira em 7 dias.</p>" },
    en: { subject: "You're invited to {family} on Ancestra", body: "Hi {name},<p>You've been invited to join <b>{family}</b>. Click to create your account:</p><p><a href='{link}' style='background:#d95a30;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none'>Accept invitation</a></p><p style='color:#999'>This link expires in 7 days.</p>" },
    nl: { subject: "Je bent uitgenodigd voor {family} op Ancestra", body: "Hoi {name},<p>Je bent uitgenodigd voor <b>{family}</b>. Klik om je account aan te maken: <a href='{link}'>Uitnodiging accepteren</a></p>" },
    es: { subject: "Invitación a {family}", body: "{name}: <a href='{link}'>Aceptar</a>" },
    fr: { subject: "Invitation à {family}", body: "{name}: <a href='{link}'>Accepter</a>" },
  },
  birthday: {
    pt: { subject: "🎂 Amanhã é o aniversário de {name}", body: "<p>Amanhã, {date}, é o aniversário de <b>{name}</b>. Não se esqueça de felicitar!</p>" },
    en: { subject: "🎂 Tomorrow is {name}'s birthday", body: "<p>Tomorrow, {date}, is <b>{name}</b>'s birthday. Don't forget to celebrate!</p>" },
    nl: { subject: "🎂 Morgen is {name} jarig", body: "<p>Morgen, {date}, is <b>{name}</b> jarig.</p>" },
    es: { subject: "🎂 Mañana es el cumpleaños de {name}", body: "<p>{date}</p>" },
    fr: { subject: "🎂 Demain c'est l'anniversaire de {name}", body: "<p>{date}</p>" },
  },
  event_reminder: {
    pt: { subject: "Lembrete: {title}", body: "<p>O evento <b>{title}</b> é em {when}, em {location}.</p>" },
    en: { subject: "Reminder: {title}", body: "<p>The event <b>{title}</b> is on {when}, at {location}.</p>" },
    nl: { subject: "Herinnering: {title}", body: "<p>{title} — {when}, {location}.</p>" },
    es: { subject: "Recordatorio: {title}", body: "<p>{title} — {when}</p>" },
    fr: { subject: "Rappel : {title}", body: "<p>{title} — {when}</p>" },
  },
  weekly_summary: {
    pt: { subject: "O resumo semanal da {family}", body: "<p>Esta semana na sua família:</p>{content}" },
    en: { subject: "{family} — your weekly summary", body: "<p>This week in your family:</p>{content}" },
    nl: { subject: "{family} — wekelijks overzicht", body: "{content}" },
    es: { subject: "{family} — resumen semanal", body: "{content}" },
    fr: { subject: "{family} — résumé hebdomadaire", body: "{content}" },
  },
};

export function renderTemplate(template: string, locale: Locale, vars: Vars) {
  const t = TEMPLATES[template]?.[locale] ?? TEMPLATES[template]?.en;
  if (!t) throw new Error(`Unknown template: ${template}`);
  const subject = fill(t.subject, vars);
  const html = shell(subject, fill(t.body, vars));
  return { subject, html };
}
