# Ancestra — Estado da base de dados (feito por mim)

A base de dados **já está criada e a funcionar**. Instalei-a num **schema isolado**
chamado `ancestra`, dentro do teu projeto Supabase **Elegance Virtuelle** — sem tocar
nas tabelas das tuas outras apps.

## O que ficou feito ✅
- Schema `ancestra` criado.
- **26 tabelas** (perfis, árvore, agenda, memórias, chat, documentos, etc.).
- **45 políticas de segurança (RLS)** — cada família só vê os seus dados.
- **Dados de exemplo**: 2 famílias (Gonçalves 🇵🇹 + De Vries 🇳🇱), 7 membros, árvore, eventos, memórias.
- Permissões de API e exposição do schema `ancestra` ao PostgREST.
- A app já está apontada ao schema `ancestra` (`src/lib/supabase/*`).
- O teu `.env.local` já tem o URL e a chave pública preenchidos.

## Projeto Supabase usado
- Projeto: **Elegance Virtuelle** (`ypskwqrnmfhkrookprbk`)
- URL: `https://ypskwqrnmfhkrookprbk.supabase.co`
- Schema: `ancestra`

## O que falta (passos teus) 🔜

### 1. Criar a tua conta + tornares-te admin
- Quando a app estiver a correr (local ou online), faz **Criar conta** com o teu email.
- Depois corre o ficheiro `supabase/make_admin.sql` (muda email e nome) no SQL Editor.

### 2. Chave service_role (só para emails/cron/admin — opcional por agora)
- Supabase → **Settings → API → service_role** (Reveal) → copia para `SUPABASE_SERVICE_ROLE_KEY`
  no `.env.local` e nas variáveis do Vercel.

### 3. Storage (só quando quiseres fotos/documentos)
- Supabase → **Storage** → cria buckets `avatars`, `photos` (públicos) e `documents` (privado).

### 4. Pôr online (Vercel)
- Segue o `PUBLICAR_ONLINE.md`, **partes B e C** (a parte A do Supabase já está feita).
- Nas variáveis do Vercel, além das chaves, acrescenta:
  - `NEXT_PUBLIC_SUPABASE_SCHEMA = ancestra`

## Nota técnica
Se algum dia editares **Settings → API → Exposed schemas** no painel do Supabase,
garante que `ancestra` continua na lista (senão a app deixa de ler os dados).

## Como remover tudo (se quiseres recomeçar)
No SQL Editor: `drop schema ancestra cascade;` — apaga só o Ancestra, não toca no resto.
