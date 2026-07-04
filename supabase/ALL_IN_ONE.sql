-- ════════════════════════════════════════════════════════════════
-- Ndandu — TUDO-NUM-SÓ (cola este ficheiro inteiro no SQL Editor)
-- Equivale a correr 0001 + 0002 + 0003 por ordem.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- >>> supabase/migrations/0001_schema.sql
-- ────────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════════
-- Ndandu — Database schema (PostgreSQL / Supabase)
-- Migration 0001: core schema
--
-- Conventions (spec §25):
--   Every domain table has: id, created_at, updated_at, created_by,
--   updated_by, deleted_at (soft delete).
--   `updated_at` is maintained by a trigger.
--   Row Level Security is enabled in migration 0002.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────
do $$ begin
  create type user_role         as enum ('super_admin','family_admin','member','guest');
  create type member_status     as enum ('alive','deceased','unknown','historical');
  create type visibility_level  as enum ('everyone','admins','authorized','private');
  create type event_status      as enum ('planned','confirmed','cancelled','completed');
  create type task_status       as enum ('todo','in_progress','blocked','done');
  create type task_priority     as enum ('low','medium','high','urgent');
  create type chat_type         as enum ('general','direct','branch','event');
  create type invitation_status as enum ('pending','accepted','expired','revoked');
  create type relationship_type as enum (
    'parent','child','spouse','sibling','grandparent','grandchild',
    'uncle_aunt','niece_nephew','cousin','partner','other'
  );
exception when duplicate_object then null; end $$;

-- ─── Helper: updated_at trigger ─────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- IDENTITY & ACCESS
-- ════════════════════════════════════════════════════════════════════════

-- Families (multi-family ready — spec §30)
create table families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- App users. Mirrors auth.users (Supabase Auth) by id.
create table users (
  id           uuid primary key,                 -- == auth.users.id
  family_id    uuid references families(id) on delete set null,
  email        text unique not null,
  full_name    text,
  display_name text,
  avatar_url   text,
  role         user_role not null default 'member',
  locale       text not null default 'pt',       -- pt | en | nl | es | fr
  two_factor_enabled boolean not null default false,
  is_active    boolean not null default true,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz
);

-- Granular per-module permissions (spec §13)
create table permissions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  module      text not null,        -- 'profiles','tree','calendar','chat',...
  can_view    boolean not null default true,
  can_create  boolean not null default false,
  can_edit    boolean not null default false,
  can_delete  boolean not null default false,
  can_comment boolean not null default true,
  can_upload  boolean not null default false,
  can_invite  boolean not null default false,
  can_manage  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  unique (user_id, module)
);

-- Invitations (spec §14)
create table invitations (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role not null default 'member',
  token       text unique not null,
  status      invitation_status not null default 'pending',
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- ════════════════════════════════════════════════════════════════════════
-- FAMILY MEMBERS, BIOGRAPHIES, RELATIONSHIPS, TREE
-- ════════════════════════════════════════════════════════════════════════

-- A person in the family (may or may not have a login — ancestors won't).
create table family_members (
  id              uuid primary key default uuid_generate_v4(),
  family_id       uuid not null references families(id) on delete cascade,
  user_id         uuid references users(id) on delete set null, -- linked login, if any
  full_name       text not null,
  known_as        text,
  avatar_url      text,
  gender          text,
  birth_date      date,
  birth_place     text,
  death_date      date,
  nationality     text,
  address         text,                       -- private by default
  contacts        jsonb default '{}'::jsonb,   -- {phone, email, ...}
  marital_status  text,
  profession      text,
  hobbies         text[],
  status          member_status not null default 'alive',
  visibility      visibility_level not null default 'everyone',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  deleted_at      timestamptz
);

create table biographies (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references family_members(id) on delete cascade,
  summary     text,            -- short bio
  life_story  text,            -- long form
  notes       text,            -- private/family notes
  visibility  visibility_level not null default 'everyone',
  ai_generated boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- Directed relationship edges that drive the genealogy tree (spec §4)
create table family_relationships (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references families(id) on delete cascade,
  from_member   uuid not null references family_members(id) on delete cascade,
  to_member     uuid not null references family_members(id) on delete cascade,
  type          relationship_type not null,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  deleted_at    timestamptz,
  check (from_member <> to_member),
  unique (from_member, to_member, type)
);

-- Optional precomputed layout / metadata for the visual tree
create table genealogy_tree (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  generation  int,             -- 0 = root generation
  branch      text,            -- e.g. 'paternal' / 'maternal' / surname
  pos_x       numeric,
  pos_y       numeric,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  unique (member_id)
);

-- ════════════════════════════════════════════════════════════════════════
-- CALENDAR, EVENTS, EPHEMERIDES, TASKS, PLANS
-- ════════════════════════════════════════════════════════════════════════

create table events (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references families(id) on delete cascade,
  title        text not null,
  description  text,
  category     text,            -- birthday, wedding, trip, meeting, anniversary...
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,
  location     text,
  recurrence   text,            -- iCal RRULE string, null = one-off
  status       event_status not null default 'planned',
  responsible  uuid references family_members(id) on delete set null,
  visibility   visibility_level not null default 'everyone',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz
);

-- RSVP / guest list (spec §6)
create table event_participants (
  id          uuid primary key default uuid_generate_v4(),
  event_id    uuid not null references events(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  rsvp        text not null default 'invited',  -- invited|yes|no|maybe
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  unique (event_id, member_id)
);

-- Generic calendar entries (birthdays/anniversaries auto-generated + manual)
create table calendar_entries (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  title       text not null,
  entry_date  date not null,
  kind        text not null,          -- 'birthday','anniversary','death','custom'
  member_id   uuid references family_members(id) on delete cascade,
  event_id    uuid references events(id) on delete set null,
  recurring_yearly boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- Ephemerides — significant dates & "on this day" (spec §8, §16)
create table ephemerides (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references families(id) on delete cascade,
  title        text not null,
  description  text,
  event_date   date not null,
  kind         text,                  -- birth, wedding, death, move, milestone...
  member_ids   uuid[] default '{}',
  location     text,
  cover_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz
);

create table plans (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  title       text not null,
  description text,
  category    text,             -- birthday, trip, reunion, christmas, wedding...
  budget      numeric,
  starts_at   date,
  ends_at     date,
  status      task_status not null default 'todo',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

create table tasks (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  plan_id     uuid references plans(id) on delete cascade,
  title       text not null,
  description text,
  assignee    uuid references family_members(id) on delete set null,
  due_date    date,
  priority    task_priority not null default 'medium',
  status      task_status not null default 'todo',
  checklist   jsonb default '[]'::jsonb,    -- [{label, done}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- ════════════════════════════════════════════════════════════════════════
-- CHAT
-- ════════════════════════════════════════════════════════════════════════

create table chats (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  name        text,
  type        chat_type not null default 'general',
  event_id    uuid references events(id) on delete set null,
  is_muted    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

create table chat_members (
  id          uuid primary key default uuid_generate_v4(),
  chat_id     uuid not null references chats(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  muted       boolean not null default false,
  last_read_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (chat_id, user_id)
);

create table chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  chat_id     uuid not null references chats(id) on delete cascade,
  sender_id   uuid not null references users(id) on delete cascade,
  body        text,
  attachments jsonb default '[]'::jsonb,   -- [{url,type,name,size}]
  reactions   jsonb default '{}'::jsonb,   -- {emoji: [user_id,...]}
  read_by     uuid[] default '{}',
  reported    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- ════════════════════════════════════════════════════════════════════════
-- MEMORIES, GALLERY, DOCUMENTS
-- ════════════════════════════════════════════════════════════════════════

create table albums (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  title       text not null,
  description text,
  cover_url   text,
  event_id    uuid references events(id) on delete set null,
  visibility  visibility_level not null default 'everyone',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

create table photos (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  album_id    uuid references albums(id) on delete set null,
  storage_path text not null,
  caption     text,
  taken_at    date,
  location    text,
  tagged_members uuid[] default '{}',  -- people identified in the photo
  width       int,
  height      int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

create table memories (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  title       text not null,
  story       text,
  category    text,             -- childhood, wedding, travel, recipes, traditions...
  memory_date date,
  location    text,
  member_ids  uuid[] default '{}',
  media       jsonb default '[]'::jsonb,  -- [{url,type}]
  visibility  visibility_level not null default 'everyone',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

create table comments (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references families(id) on delete cascade,
  parent_type  text not null,    -- 'memory','photo','event','album'
  parent_id    uuid not null,
  author_id    uuid not null references users(id) on delete cascade,
  body         text not null,
  reactions    jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz
);

create table documents (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references families(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  doc_type     text,            -- birth_cert, marriage_cert, medical, school...
  category     text,
  member_id    uuid references family_members(id) on delete set null,
  doc_date     date,
  visibility   visibility_level not null default 'authorized',
  size_bytes   bigint,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz
);

-- ════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS, EMAIL, SETTINGS, I18N, AUDIT, BACKUPS
-- ════════════════════════════════════════════════════════════════════════

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null,    -- event_created, birthday, new_message, ...
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

-- Per-user email preferences (spec §12)
create table notification_preferences (
  user_id            uuid primary key references users(id) on delete cascade,
  mode               text not null default 'important', -- all|important|birthdays|weekly|none
  weekly_summary     boolean not null default true,
  monthly_summary    boolean not null default false,
  birthdays          boolean not null default true,
  events             boolean not null default true,
  messages           boolean not null default false,
  updated_at         timestamptz not null default now()
);

create table email_logs (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid references families(id) on delete set null,
  to_email    text not null,
  template    text not null,
  subject     text,
  status      text not null default 'queued',  -- queued|sent|failed
  provider    text,
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table settings (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid references families(id) on delete cascade,
  key         text not null,
  value       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (family_id, key)
);

create table languages (
  code      text primary key,        -- 'pt','en','nl','es','fr'
  name      text not null,
  enabled   boolean not null default true,
  is_default boolean not null default false
);

create table translations (
  id        uuid primary key default uuid_generate_v4(),
  lang      text not null references languages(code) on delete cascade,
  namespace text not null default 'common',
  key       text not null,
  value     text not null,
  unique (lang, namespace, key)
);

-- Activity logs (spec §19, §21)
create table audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid references families(id) on delete set null,
  actor_id    uuid references users(id) on delete set null,
  action      text not null,       -- create|update|delete|login|export...
  entity      text,                -- table name
  entity_id   uuid,
  metadata    jsonb default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create table backup_logs (
  id          uuid primary key default uuid_generate_v4(),
  kind        text not null,       -- daily|weekly|files
  status      text not null default 'started',  -- started|completed|failed
  location    text,
  size_bytes  bigint,
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- ─── updated_at triggers for all domain tables ──────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'families','users','permissions','invitations','family_members',
    'biographies','family_relationships','genealogy_tree','events',
    'event_participants','calendar_entries','ephemerides','plans','tasks',
    'chats','chat_messages','albums','photos','memories','comments',
    'documents','notifications','settings'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
         for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ─── Helpful indexes ────────────────────────────────────────────────────
create index idx_users_family            on users(family_id) where deleted_at is null;
create index idx_members_family          on family_members(family_id) where deleted_at is null;
create index idx_rel_family              on family_relationships(family_id);
create index idx_events_family_start     on events(family_id, starts_at) where deleted_at is null;
create index idx_calendar_family_date    on calendar_entries(family_id, entry_date);
create index idx_messages_chat_created   on chat_messages(chat_id, created_at) where deleted_at is null;
create index idx_memories_family         on memories(family_id) where deleted_at is null;
create index idx_photos_album            on photos(album_id) where deleted_at is null;
create index idx_documents_family        on documents(family_id) where deleted_at is null;
create index idx_notifications_user      on notifications(user_id, read_at);
create index idx_audit_family_created    on audit_logs(family_id, created_at);


-- ────────────────────────────────────────────────────────────────
-- >>> supabase/migrations/0002_rls.sql
-- ────────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════════
-- Ndandu — Migration 0002: Row Level Security (multi-family isolation)
--
-- Core rule: a user can only read/write rows belonging to THEIR family.
-- Super admins bypass the family check. This gives true multi-family
-- (multi-tenant) isolation out of the box (spec §30, user request).
-- ════════════════════════════════════════════════════════════════════════

-- Returns the family_id of the currently authenticated user.
create or replace function auth_family_id()
returns uuid language sql stable security definer set search_path = public as $$
  select family_id from users where id = auth.uid();
$$;

-- True if the current user is a super admin.
create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from users where id = auth.uid()), false);
$$;

-- True if the current user is an admin (family or super) of their family.
create or replace function is_family_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('super_admin','family_admin') from users where id = auth.uid()),
    false);
$$;

-- Convenience: can the current user see rows of family `fid`?
create or replace function can_access_family(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_super_admin() or fid = auth_family_id();
$$;

-- Enable RLS + add family-scoped policies for every family-scoped table.
do $$
declare t text;
begin
  foreach t in array array[
    'families','users','permissions','invitations','family_members',
    'biographies','family_relationships','genealogy_tree','events',
    'event_participants','calendar_entries','ephemerides','plans','tasks',
    'chats','chat_members','chat_messages','albums','photos','memories',
    'comments','documents','notifications','settings','audit_logs'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- families: a user sees their own family; super admin sees all.
create policy family_select on families for select
  using (is_super_admin() or id = auth_family_id());
create policy family_admin_write on families for all
  using (is_super_admin() or (id = auth_family_id() and is_family_admin()))
  with check (is_super_admin() or (id = auth_family_id() and is_family_admin()));

-- users: see members of your own family; edit yourself or admin edits family.
create policy users_select on users for select
  using (is_super_admin() or family_id = auth_family_id());
create policy users_update_self on users for update
  using (id = auth.uid() or is_family_admin())
  with check (id = auth.uid() or is_family_admin());

-- Generic family-scoped tables: SELECT for same family, WRITE for same family.
-- (Fine-grained per-module permissions are enforced in the app layer via the
--  `permissions` table; RLS guarantees hard tenant isolation.)
do $$
declare t text;
begin
  foreach t in array array[
    'permissions','invitations','family_members','biographies',
    'family_relationships','genealogy_tree','events','event_participants',
    'calendar_entries','ephemerides','plans','tasks','chats','chat_members',
    'chat_messages','albums','photos','memories','comments','documents',
    'notifications','settings','audit_logs'
  ] loop
    -- event_participants/chat_members/comments are scoped via parent; keep simple:
    if t in ('event_participants','chat_members','permissions') then
      execute format($f$
        create policy %1$s_all on %1$s for all
          using (is_super_admin() or true)   -- parent tables already family-scoped
          with check (true);
      $f$, t);
    else
      execute format($f$
        create policy %1$s_select on %1$s for select
          using (can_access_family(family_id));
        create policy %1$s_write on %1$s for all
          using (can_access_family(family_id))
          with check (can_access_family(family_id));
      $f$, t);
    end if;
  end loop;
end $$;


-- ────────────────────────────────────────────────────────────────
-- >>> supabase/migrations/0003_seed.sql
-- ────────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════════
-- Ndandu — Migration 0003: demo seed data
-- Two families to demonstrate multi-family isolation.
-- NOTE: users here are placeholder rows. Real logins are created through
-- Supabase Auth; link them by setting users.id = auth.users.id afterwards.
-- ════════════════════════════════════════════════════════════════════════

-- Languages
insert into languages (code, name, enabled, is_default) values
  ('pt','Português', true, true),
  ('en','English',   true, false),
  ('nl','Nederlands',true, false),
  ('es','Español',   false,false),
  ('fr','Français',  false,false)
on conflict (code) do nothing;

-- ─── Family A: Gonçalves (Portugal) ─────────────────────────────────────
insert into families (id, name, slug, description) values
  ('11111111-1111-1111-1111-111111111111','Família Gonçalves','goncalves',
   'A nossa casa digital.')
on conflict do nothing;

insert into family_members (id, family_id, full_name, known_as, birth_date, birth_place, nationality, status, profession, hobbies) values
  ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Bruno Gonçalves','Bruno','1985-04-12','Lisboa, Portugal','Portuguesa','alive','Engenheiro', array['fotografia','viagens']),
  ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Ana Gonçalves','Ana','1987-09-03','Porto, Portugal','Portuguesa','alive','Professora', array['jardinagem','leitura']),
  ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Carolina Gonçalves','Carol','2015-06-29','Setúbal, Portugal','Portuguesa','alive','Estudante', array['desenho']),
  ('a0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','João Gonçalves','Avô João','1955-01-20','Évora, Portugal','Portuguesa','alive','Reformado', array['história']),
  ('a0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Maria Gonçalves','Avó Maria','1958-11-11','Évora, Portugal','Portuguesa','alive','Reformada', array['cozinha'])
on conflict do nothing;

insert into biographies (member_id, summary, life_story) values
  ('a0000000-0000-0000-0000-000000000001','Pai, marido e o organizador da família.','Nasceu em Lisboa, mudou-se para Setúbal em 2014.'),
  ('a0000000-0000-0000-0000-000000000004','O patriarca da família, contador de histórias.','Cresceu em Évora numa família de agricultores.')
on conflict do nothing;

-- Relationships (drive the tree)
insert into family_relationships (family_id, from_member, to_member, type) values
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','spouse'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','child'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','child'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','child'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','child'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000005','spouse')
on conflict do nothing;

insert into genealogy_tree (family_id, member_id, generation, branch) values
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000004',0,'paternal'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000005',0,'paternal'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001',1,'paternal'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000002',1,'maternal'),
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003',2,'paternal')
on conflict do nothing;

-- Events & calendar
insert into events (family_id, title, description, category, starts_at, location, status) values
  ('11111111-1111-1111-1111-111111111111','Aniversário da Carolina','Festa em casa 🎂','birthday', now() + interval '2 days','Setúbal','confirmed'),
  ('11111111-1111-1111-1111-111111111111','Reunião de Verão','Encontro anual da família','reunion', now() + interval '30 days','Évora','planned');

insert into calendar_entries (family_id, title, entry_date, kind, member_id, recurring_yearly) values
  ('11111111-1111-1111-1111-111111111111','Aniversário da Carolina','2015-06-29','birthday','a0000000-0000-0000-0000-000000000003', true),
  ('11111111-1111-1111-1111-111111111111','Aniversário do Bruno','1985-04-12','birthday','a0000000-0000-0000-0000-000000000001', true);

insert into ephemerides (family_id, title, description, event_date, kind, member_ids) values
  ('11111111-1111-1111-1111-111111111111','Casamento de Bruno e Ana','Casaram-se em Lisboa.','2013-06-15','wedding', array['a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002']::uuid[]),
  ('11111111-1111-1111-1111-111111111111','Viagem a Paris','A família visitou Paris.','2019-08-10','milestone', array['a0000000-0000-0000-0000-000000000001']::uuid[]);

insert into memories (family_id, title, story, category, memory_date, location, member_ids) values
  ('11111111-1111-1111-1111-111111111111','O nosso primeiro Natal em Setúbal','Foi o primeiro Natal na casa nova...','traditions','2014-12-25','Setúbal', array['a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002']::uuid[]),
  ('11111111-1111-1111-1111-111111111111','Receita do bolo da Avó Maria','O segredo está na canela.','recipes','2010-03-01','Évora', array['a0000000-0000-0000-0000-000000000005']::uuid[]);

-- ─── Family B: De Vries (Netherlands) — proves isolation ────────────────
insert into families (id, name, slug, description) values
  ('22222222-2222-2222-2222-222222222222','Familie De Vries','de-vries','Onze familie.')
on conflict do nothing;

insert into family_members (id, family_id, full_name, known_as, birth_date, nationality, status) values
  ('b0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Jan de Vries','Jan','1980-02-02','Nederlandse','alive'),
  ('b0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Sanne de Vries','Sanne','1982-07-19','Nederlandse','alive')
on conflict do nothing;

insert into family_relationships (family_id, from_member, to_member, type) values
  ('22222222-2222-2222-2222-222222222222','b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','spouse')
on conflict do nothing;


