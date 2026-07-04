-- ════════════════════════════════════════════════════════════════════════
-- Ndandu — Migration 0004 (schema isolado "ndandu"): VISIBILIDADE PARTILHADA
--
-- Muda o modelo de "cada família só vê os seus dados" para
-- "todas as famílias veem-se umas às outras" (objetivo: unificar/juntar).
--   • LEITURA  → aberta a qualquer utilizador autenticado (todas as famílias).
--   • ESCRITA  → continua restrita à própria família + super_admin.
-- Aplicada ao projeto Elegance Virtuelle (ypskwqrnmfhkrookprbk).
-- ════════════════════════════════════════════════════════════════════════

set search_path to ndandu, public, extensions;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'ndandu' loop
    execute format('drop policy if exists %I on ndandu.%I', r.policyname, r.tablename);
  end loop;
end $$;

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
    execute format(
      'create policy %1$s_select_shared on ndandu.%1$s for select
         using (auth.uid() is not null);', t);
  end loop;
end $$;

create policy families_write on ndandu.families for all
  using (ndandu.is_super_admin() or (id = ndandu.auth_family_id() and ndandu.is_family_admin()))
  with check (ndandu.is_super_admin() or (id = ndandu.auth_family_id() and ndandu.is_family_admin()));

create policy users_write_self on ndandu.users for update
  using (id = auth.uid() or ndandu.is_family_admin())
  with check (id = auth.uid() or ndandu.is_family_admin());

do $$
declare t text;
begin
  foreach t in array array[
    'invitations','family_members','family_relationships','genealogy_tree',
    'events','calendar_entries','ephemerides','plans','tasks','chats',
    'albums','photos','memories','comments','documents','notifications',
    'settings','audit_logs'
  ] loop
    execute format($f$
      create policy %1$s_write on ndandu.%1$s for all
        using (ndandu.can_access_family(family_id))
        with check (ndandu.can_access_family(family_id));
    $f$, t);
  end loop;
end $$;

create policy permissions_write on ndandu.permissions for all
  using (exists (select 1 from ndandu.users u where u.id = permissions.user_id and ndandu.can_access_family(u.family_id)))
  with check (exists (select 1 from ndandu.users u where u.id = permissions.user_id and ndandu.can_access_family(u.family_id)));

create policy biographies_write on ndandu.biographies for all
  using (exists (select 1 from ndandu.family_members m where m.id = biographies.member_id and ndandu.can_access_family(m.family_id)))
  with check (exists (select 1 from ndandu.family_members m where m.id = biographies.member_id and ndandu.can_access_family(m.family_id)));

create policy event_participants_write on ndandu.event_participants for all
  using (exists (select 1 from ndandu.events e where e.id = event_participants.event_id and ndandu.can_access_family(e.family_id)))
  with check (exists (select 1 from ndandu.events e where e.id = event_participants.event_id and ndandu.can_access_family(e.family_id)));

create policy chat_members_write on ndandu.chat_members for all
  using (exists (select 1 from ndandu.chats c where c.id = chat_members.chat_id and ndandu.can_access_family(c.family_id)))
  with check (exists (select 1 from ndandu.chats c where c.id = chat_members.chat_id and ndandu.can_access_family(c.family_id)));

create policy chat_messages_write on ndandu.chat_messages for all
  using (exists (select 1 from ndandu.chats c where c.id = chat_messages.chat_id and ndandu.can_access_family(c.family_id)))
  with check (exists (select 1 from ndandu.chats c where c.id = chat_messages.chat_id and ndandu.can_access_family(c.family_id)));

-- Famílias atuais: Gonçalves, Neves, Bravo, Ferrão, Castro Monteiro, Silva,
-- Schultz, Dias, Moreira, Oliveira.
