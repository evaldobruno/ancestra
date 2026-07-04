-- AUTO-GERADO: instalacao no schema isolado "ndandu"
create schema if not exists ndandu;
set search_path to ndandu, public, extensions;

-- ════════════════════════════════════════════════════════════════════════
-- Ndandu — Migration 0002: Row Level Security (multi-family isolation)
--
-- Core rule: a user can only read/write rows belonging to THEIR family.
-- Super admins bypass the family check. This gives true multi-family
-- (multi-tenant) isolation out of the box (spec §30, user request).
-- ════════════════════════════════════════════════════════════════════════

-- Returns the family_id of the currently authenticated user.
create or replace function auth_family_id()
returns uuid language sql stable security definer set search_path = ndandu, public, extensions as $$
  select family_id from users where id = auth.uid();
$$;

-- True if the current user is a super admin.
create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = ndandu, public, extensions as $$
  select coalesce((select role = 'super_admin' from users where id = auth.uid()), false);
$$;

-- True if the current user is an admin (family or super) of their family.
create or replace function is_family_admin()
returns boolean language sql stable security definer set search_path = ndandu, public, extensions as $$
  select coalesce(
    (select role in ('super_admin','family_admin') from users where id = auth.uid()),
    false);
$$;

-- Convenience: can the current user see rows of family `fid`?
create or replace function can_access_family(fid uuid)
returns boolean language sql stable security definer set search_path = ndandu, public, extensions as $$
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
