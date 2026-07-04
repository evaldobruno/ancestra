// Email notification service (spec §12, §27).
// Auto-detects the configured provider from env. Provider calls are written
// against their HTTP APIs so there are no extra runtime deps to install.

type SendArgs = { to: string; subject: string; html: string; text?: string; template: string };

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; provider: string; error?: string }> {
  const from = process.env.EMAIL_FROM || "Ancestra <no-reply@ancestra.app>";

  // Provider: Resend (preferred — modern, reliable)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [args.to],
          subject: args.subject,
          html: args.html,
          text: args.text || stripHtml(args.html),
        }),
      });
      return { ok: res.ok, provider: "resend", error: res.ok ? undefined : await res.text() };
    } catch (e: any) {
      return { ok: false, provider: "resend", error: String(e) };
    }
  }

  // Provider: SendGrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: args.to }] }],
          from: { email: parseFrom(from).email, name: parseFrom(from).name },
          subject: args.subject,
          content: [
            { type: "text/plain", value: args.text || stripHtml(args.html) },
            { type: "text/html", value: args.html },
          ],
        }),
      });
      return { ok: res.ok, provider: "sendgrid", error: res.ok ? undefined : await res.text() };
    } catch (e: any) {
      return { ok: false, provider: "sendgrid", error: String(e) };
    }
  }

  // Provider: Mailgun
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    try {
      const body = new URLSearchParams({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text || stripHtml(args.html),
      });
      const res = await fetch(
        `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );
      return { ok: res.ok, provider: "mailgun", error: res.ok ? undefined : await res.text() };
    } catch (e: any) {
      return { ok: false, provider: "mailgun", error: String(e) };
    }
  }

  // Provider: SMTP / SES — requires `nodemailer` (add to deps when enabling).
  if (process.env.SMTP_HOST || process.env.AWS_SES_REGION) {
    // Pseudocode to keep the project dependency-light by default:
    //   const nodemailer = await import("nodemailer");
    //   const transport = nodemailer.createTransport({ host, port, auth });
    //   await transport.sendMail({ from, to, subject, html, text });
    return { ok: false, provider: "smtp", error: "Install nodemailer and enable in service.ts" };
  }

  // No provider configured → log to console in dev.
  console.info(`[email:dev] to=${args.to} subject="${args.subject}" template=${args.template}`);
  return { ok: true, provider: "console" };
}

function parseFrom(from: string) {
  const m = from.match(/^(.*)<(.+)>$/);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: "Ancestra", email: from };
}
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
