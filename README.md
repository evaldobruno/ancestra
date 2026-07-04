# Ancestra 🏡

A private digital home for your family — profiles, an immersive family tree, a shared
calendar, memories, documents and chat. Built **multi-family** (multi-tenant) from the
ground up, with **Portuguese & English** today and Dutch/Spanish/French ready to switch on.

> Status: **MVP foundation (v0.1)**. This is a runnable, well-structured starting point —
> not the full turnkey product. See [`ROADMAP.md`](./ROADMAP.md) for what's built vs. planned.

---

## ✨ What works right now

- **Landing + auth** (sign in / register) with a no-backend **demo mode**.
- **App shell**: responsive sidebar + mobile nav, light/dark mode, language switcher.
- **Dashboard** — upcoming birthdays & events, "On this day", recent memories, tasks, quick actions.
- **Immersive family tree** — pan, zoom, search, generation layout, spouse/parent links, profile drawer.
- **Members** directory, **Calendar** (month grid with events & birthdays), **Memories** (categories),
  **Chat** (channels + live message composer), **Admin** (multi-family overview, invites, system).
- **i18n** (PT/EN) across the whole UI.
- **Database**: full PostgreSQL schema for all 25+ entities, with RLS multi-family isolation and demo seed data.
- **Email service** (SendGrid/Mailgun/SMTP/SES) + bilingual templates.
- **API examples**: invite-by-email and a daily birthday-reminder cron.

The UI runs on **in-memory demo data** until you connect Supabase, so you can click through
everything immediately.

---

## 🚀 Quick start

```bash
cd familyhub
npm install
cp .env.example .env.local      # optional for demo; required for real data
npm run dev                     # http://localhost:3000
```

Open <http://localhost:3000> → **"Open demo"** to browse the app with sample data.

### Connect Supabase (real data)

1. Create a project at <https://supabase.com>.
2. In **SQL Editor**, run the migrations in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_seed.sql` (demo data — optional)
3. Copy your project URL + anon key + service-role key into `.env.local`
   (see `.env.example`).
4. Restart `npm run dev`. Auth and data now run against Supabase with RLS enforced.

> The first user you register should be promoted to `super_admin`:
> `update users set role = 'super_admin' where email = 'you@example.com';`

---

## 📂 Project structure

```
familyhub/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # landing
│  │  ├─ login, register/         # auth
│  │  ├─ app/                     # authenticated area (shell + modules)
│  │  │  ├─ page.tsx              # dashboard
│  │  │  ├─ members, tree, calendar, memories, chat, admin/
│  │  └─ api/
│  │     ├─ invite/               # POST: invite a relative by email
│  │     └─ cron/birthdays/       # GET: daily birthday reminders
│  ├─ components/                 # AppShell, AuthForm, Providers, Controls
│  ├─ i18n/                       # dictionaries (PT/EN) + provider
│  └─ lib/
│     ├─ supabase/                # browser + server + admin clients
│     ├─ email/                   # provider service + bilingual templates
│     └─ demo-data.ts             # in-memory sample data
├─ supabase/migrations/           # schema, RLS, seed
└─ public/                        # PWA manifest + icons
```

## 🌍 Languages

UI strings live in `src/i18n/dictionaries.ts`. PT & EN are complete; NL/ES/FR have
slots ready — fill the dictionary and flip `enabled: true` in `LOCALES`.
Email templates are bilingual in `src/lib/email/templates.ts`.

## 👨‍👩‍👧 Multi-family

Every domain row carries a `family_id`. RLS (`0002_rls.sql`) guarantees a user only sees
their own family's data; `super_admin` sees all. The seed creates **two** families
(Gonçalves 🇵🇹 + De Vries 🇳🇱) so you can verify isolation.

## 📧 Email notifications

`src/lib/email/service.ts` auto-detects the provider from env (SendGrid → Mailgun →
SMTP/SES → console in dev). Schedule `GET /api/cron/birthdays` daily (Vercel Cron,
Supabase scheduled functions, or any cron), protected by `CRON_SECRET`.

## 🛠 Scripts

| command | does |
|---|---|
| `npm run dev` | start dev server |
| `npm run build` | production build |
| `npm run start` | run the production build |
| `npm run typecheck` | TypeScript check |

See [`DEPLOY.md`](./DEPLOY.md) for hosting and [`ROADMAP.md`](./ROADMAP.md) for the plan.
