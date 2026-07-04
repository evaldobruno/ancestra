-- ════════════════════════════════════════════════════════════════════════
-- Ndandu — Tornar-te Super Admin  (instalação em SCHEMA ISOLADO "ndandu")
--
-- COMO USAR:
-- 1. Primeiro cria a tua conta na app (Criar conta) com o teu email.
-- 2. Substitui o email e o nome abaixo pelos teus.
-- 3. Cola e corre no SQL Editor do Supabase (projeto Elegance Virtuelle).
-- ════════════════════════════════════════════════════════════════════════

set search_path to ndandu, public, extensions;

insert into ndandu.users (id, email, full_name, role, family_id)
select
  id,
  email,
  'O Teu Nome',                                  -- ← muda para o teu nome
  'super_admin',
  '11111111-1111-1111-1111-111111111111'         -- Família Gonçalves (do seed)
from auth.users
where email = 'o-teu-email@exemplo.com'          -- ← muda para o teu email
on conflict (id) do update
  set role = 'super_admin',
      family_id = excluded.family_id;

-- Confirma:
select id, email, role, family_id from ndandu.users where role = 'super_admin';
