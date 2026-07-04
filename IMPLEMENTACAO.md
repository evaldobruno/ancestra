# Ancestra — Guia de Implementação (passo a passo)

Este guia leva-te de "código na pasta" até "app a funcionar na internet".
Segue as fases por ordem. Cada passo diz **o que fazer** e **que ficheiro** mexer.

Tempo estimado: ~30–45 min para ter tudo online.

---

## Fase 0 — Pré-requisitos (instalar uma vez)

1. **Node.js 18 ou superior** → instala em <https://nodejs.org> (versão LTS).
   Confirma no terminal:
   ```bash
   node --version
   ```
2. **Conta Supabase** (grátis) → <https://supabase.com>
3. **Conta GitHub** (grátis) → <https://github.com>  *(para o deploy)*
4. **Conta Vercel** (grátis) → <https://vercel.com>  *(para o deploy)*
5. *(Opcional, para emails reais)* conta SendGrid, Mailgun ou um SMTP.

> Ficheiros envolvidos: nenhum. É só instalar contas/ferramentas.

---

## Fase 1 — Correr a app no teu computador (modo demo)

Aqui vês a app a funcionar **sem base de dados**, com dados de exemplo.

1. Abre o terminal dentro da pasta do código:
   ```bash
   cd "Ancestra App/familyhub"
   ```
2. Instala as dependências (só na 1.ª vez):
   ```bash
   npm install
   ```
3. Arranca:
   ```bash
   npm run dev
   ```
4. Abre no browser: <http://localhost:3000> → clica **"Ver demonstração"**.

✅ Se vês a landing page e consegues navegar (Início, Membros, Árvore…), a Fase 1 está feita.

> Ficheiros: `package.json` (define os comandos). Nada para editar.

---

## Fase 2 — Criar a base de dados no Supabase

1. Entra em <https://supabase.com> → **New project**.
   - Dá um nome (ex.: `ancestra`), define uma **password** da base de dados (guarda-a).
   - Escolhe a região mais próxima (ex.: *West EU / London*).
2. Quando o projeto estiver pronto, no menu lateral abre **SQL Editor**.
3. Corre os 3 ficheiros de migração **por esta ordem** (abre cada um, copia o conteúdo, cola no editor, carrega em **Run**):
   1. `supabase/migrations/0001_schema.sql`  → cria todas as tabelas
   2. `supabase/migrations/0002_rls.sql`     → segurança (cada família só vê os seus dados)
   3. `supabase/migrations/0003_seed.sql`    → dados de exemplo *(opcional, mas recomendado para testar)*
4. Cria os "baldes" de ficheiros: menu **Storage** → **New bucket**, cria três:
   - `avatars`  (público)
   - `photos`   (público)
   - `documents` (privado)

✅ Em **Table Editor** deves ver as tabelas (`families`, `family_members`, etc.) preenchidas.

> Ficheiros: as 3 migrações em `supabase/migrations/`. Não editas nada — só corres.

---

## Fase 3 — Ligar a app ao Supabase (variáveis de ambiente)

1. No Supabase: **Settings → API**. Copia estes 3 valores:
   - **Project URL**
   - **anon public** key
   - **service_role** key  *(secreta — nunca a partilhes)*
2. Na pasta `familyhub`, faz uma cópia do exemplo:
   ```bash
   cp .env.example .env.local
   ```
3. Abre **`.env.local`** e preenche pelo menos:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...        (Project URL)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   (anon public)
   SUPABASE_SERVICE_ROLE_KEY=...       (service_role)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Pára o servidor (Ctrl+C) e arranca de novo:
   ```bash
   npm run dev
   ```

✅ Agora, na página **Membros** e **Árvore**, o indicador no topo deve passar de
🟡 *demo* para 🟢 *Supabase* — sinal de que está a ler dados reais.

> Ficheiros: **`.env.local`** (este é o único que editas; não vai para o GitHub, está protegido pelo `.gitignore`).

---

## Fase 4 — Criar a tua conta e tornar-te administrador

1. Em <http://localhost:3000> → **Criar conta** com o teu email e password.
2. No Supabase: **Authentication → Users** confirma que o teu utilizador aparece.
3. Liga esse login ao perfil de utilizador da app. No **SQL Editor**, corre
   (troca o email pelo teu):
   ```sql
   insert into users (id, email, full_name, role, family_id)
   select id, email, 'O Teu Nome', 'super_admin',
          '11111111-1111-1111-1111-111111111111'
   from auth.users where email = 'o-teu-email@exemplo.com'
   on conflict (id) do update set role = 'super_admin';
   ```
   *(o `family_id` acima é o da Família Gonçalves do seed; mais tarde crias a tua própria família)*

✅ Entras na app e tens acesso de administrador (menu **Administração**).

> Ficheiros: nenhum. É tudo no painel do Supabase.

---

## Fase 5 — (Opcional) Ativar os emails

Sem isto, os emails só aparecem no terminal (modo dev). Para enviar a sério:

1. Escolhe **um** fornecedor e mete a chave no **`.env.local`**:
   - SendGrid → `SENDGRID_API_KEY=...`
   - ou Mailgun → `MAILGUN_API_KEY=...` e `MAILGUN_DOMAIN=...`
   - ou SMTP → `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
2. Define o remetente:
   ```
   EMAIL_FROM="Ancestra <no-reply@oteudominio.com>"
   ```
3. Reinicia (`npm run dev`). O sistema deteta o fornecedor automaticamente.

> Ficheiros: **`.env.local`**. A lógica já está em `src/lib/email/service.ts` (não precisas de mexer).

---

## Fase 6 — Pôr a app online (deploy na Vercel)

1. Cria um repositório no GitHub e envia o código:
   ```bash
   cd "Ancestra App/familyhub"
   git init
   git add .
   git commit -m "Ancestra MVP"
   git branch -M main
   git remote add origin https://github.com/o-teu-user/ancestra.git
   git push -u origin main
   ```
2. Em <https://vercel.com/new> → **Import** do repositório do GitHub.
3. Em **Environment Variables**, adiciona as mesmas chaves do `.env.local`
   (Project URL, anon, service_role, EMAIL_*, etc.) — mas mete
   `NEXT_PUBLIC_APP_URL` com o endereço final da Vercel.
4. Clica **Deploy**. Em 1–2 min tens um link público (ex.: `ancestra.vercel.app`).
5. No Supabase: **Authentication → URL Configuration** → adiciona o endereço da
   Vercel à lista de URLs permitidos.

✅ A app está online, instalável no telemóvel (PWA) e pronta a usar.

> Ficheiros: todo o projeto vai para o GitHub. As variáveis ficam na Vercel (não no código).

---

## Fase 7 — (Opcional) Lembretes automáticos (aniversários)

1. Define um segredo no `.env.local` e na Vercel:
   ```
   CRON_SECRET=uma-frase-longa-aleatoria
   ```
2. Cria o ficheiro **`vercel.json`** na raiz de `familyhub` com:
   ```json
   { "crons": [ { "path": "/api/cron/birthdays", "schedule": "0 7 * * *" } ] }
   ```
3. Faz `git push`. A Vercel passa a chamar todos os dias às 07:00 a rota
   `src/app/api/cron/birthdays/route.ts`, que envia os emails de aniversário.

---

## Resumo: que ficheiros mexes mesmo?

| Fase | Editas | Só corres / configuras |
|---|---|---|
| 1 | — | `npm install`, `npm run dev` |
| 2 | — | as 3 migrações em `supabase/migrations/` |
| 3 | **`.env.local`** | — |
| 4 | — | SQL no Supabase |
| 5 | **`.env.local`** | — |
| 6 | — | GitHub + Vercel (variáveis) |
| 7 | **`vercel.json`** (novo) | `.env` `CRON_SECRET` |

Na prática, o **único ficheiro de código que editas é o `.env.local`** (as tuas chaves).
Tudo o resto é configuração nos painéis do Supabase e da Vercel.

---

## Se algo correr mal

- App em branco / erro de Supabase → confirma as 3 chaves no `.env.local` e reinicia.
- Indicador continua 🟡 *demo* → as variáveis `NEXT_PUBLIC_SUPABASE_*` não estão a ser lidas (reinicia o `npm run dev`).
- Erro ao correr o `0002_rls.sql` → garante que correste primeiro o `0001_schema.sql`.
- Não recebes emails → estás em modo dev (sem fornecedor); vê a Fase 5.

Para detalhes técnicos extra, vê `README.md` e `DEPLOY.md`.
