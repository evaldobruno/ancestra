# Ancestra — Roadmap

This MVP is the **foundation**. Below is an honest map of what's done and what remains,
following your 32-section brief.

## ✅ Built in v0.1 (this delivery)
- Project scaffold (Next.js 14 + TypeScript + Tailwind, PWA).
- Full database schema for all entities (spec §25) + RLS multi-family isolation + seed.
- i18n PT/EN with switcher; NL/ES/FR slots.
- Auth screens + Supabase auth wiring + demo mode.
- Dashboard, Members, **immersive Family Tree**, Calendar, Memories, Chat, Admin (UI).
- Email service (4 providers) + bilingual templates.
- API examples: invite-by-email, daily birthday cron.
- README, DEPLOY, .env.example.

## 🔜 Next (wire UI to the database)
The UI currently reads `lib/demo-data.ts`. Replace each page's data source with Supabase
queries (the schema + RLS already support all of it):
- Members & biographies CRUD + visibility rules + photo/document upload to Storage.
- Tree edges read from `family_relationships`; add/edit relatives; **PDF/image export & print** (spec §4).
- Calendar/events CRUD, RSVP, recurring events, reminders.
- Realtime chat via Supabase Realtime; reactions, read receipts, attachments, moderation.
- Memories/gallery uploads, comments, reactions, timeline; documents vault.
- Notifications centre + per-user email preferences UI.
- Invitation accept flow (`/invite/[token]`), approval, 2FA, password reset.
- Global search across people/events/memories/docs.
- Admin: user/permission management, audit logs, backup status, reported messages.

## 🌱 Later (spec §18, §30)
- AI helpers (biographies, summaries, timeline, translation) — `ANTHROPIC_API_KEY` slot is ready.
- GEDCOM import/export; Google/iCloud calendar sync; family world map; video calls.
- Native mobile apps (Capacitor wrap, or React Native/Flutter on the same backend).
- Reports & exports (PDF/CSV/Excel/JSON); premium subscriptions; white-label.

## Suggested build order
1. Members + Tree against the DB (the emotional core).
2. Calendar + email reminders (recurring value).
3. Memories + Gallery + Documents (the family archive).
4. Realtime chat.
5. Notifications + Admin + Search.
6. AI + integrations + native apps.
