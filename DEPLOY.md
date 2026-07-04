# Deploy Ancestra

## Recommended: Vercel + Supabase (free tiers to start)

### 1. Supabase (database, auth, storage, realtime)
1. Create a project at <https://supabase.com>.
2. **SQL Editor** → run `supabase/migrations/0001_schema.sql`, then `0002_rls.sql`, then optionally `0003_seed.sql`.
3. **Storage** → create buckets: `avatars`, `photos`, `documents` (set `documents` to private).
4. **Authentication** → Email provider enabled. Add your production URL to the redirect allow-list.
5. Copy **Project URL**, **anon key**, **service-role key** from Settings → API.

### 2. Vercel (hosting the Next.js app)
1. Push this folder to a Git repo and import it at <https://vercel.com/new>.
2. Add Environment Variables (from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL), `EMAIL_FROM`, one email provider's keys
   - `CRON_SECRET`
3. Deploy.

### 3. Scheduled jobs (birthdays, reminders, backups)
Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/birthdays", "schedule": "0 7 * * *" }
  ]
}
```
Vercel cron calls must include the `Authorization: Bearer <CRON_SECRET>` header — set this
in the cron configuration, or front the route with a Vercel Cron + middleware check.

## Backups (spec §20)
- Supabase Pro includes automated daily DB backups + point-in-time recovery.
- For self-managed backups, schedule `pg_dump` to object storage and log rows in `backup_logs`.
- Storage buckets can be replicated/synced to a second bucket for file backups.

## Alternative hosts
- **Backend/API**: any Node host (Render, Railway, Fly.io, AWS, DigitalOcean App Platform).
- **Database**: any managed PostgreSQL (Supabase, Neon, RDS, Cloud SQL).
- **Storage**: S3 / GCS / R2 — swap the storage paths in the upload helpers.

## PWA / mobile
- The web app is already an installable PWA (`public/manifest.webmanifest`). Add real icons
  in `public/icons/`.
- For native Android/iOS later: wrap with Capacitor (fastest) or rebuild the client in
  React Native / Flutter against the same Supabase backend. See `ROADMAP.md`.
