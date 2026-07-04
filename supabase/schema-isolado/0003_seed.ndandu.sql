-- AUTO-GERADO: instalacao no schema isolado "ndandu"
create schema if not exists ndandu;
set search_path to ndandu, public, extensions;

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
