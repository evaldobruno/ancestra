# Ancestra — Publicar online (sem terminal, só no browser)

Objetivo: ter a app num link público (ex.: `ancestra.vercel.app`) que a tua família
abre no telemóvel ou computador. **Não precisas de instalar nada nem de programar.**
Só vais usar 3 sites, todos grátis. Tempo: ~30 minutos.

A ordem é: **A) Supabase** (a base de dados) → **B) GitHub** (guardar o código) →
**C) Vercel** (pôr no ar).

---

## A) Supabase — criar a base de dados (~10 min)

1. Vai a **https://supabase.com** → **Start your project** → cria conta (podes usar o Google).
2. Clica **New project**.
   - Name: `ancestra`
   - Database Password: inventa uma e **guarda-a** num sítio seguro.
   - Region: escolhe a Europa (ex.: *West EU (London)*).
   - Clica **Create new project** e espera ~2 min até ficar pronto.
3. No menu da esquerda, abre **SQL Editor** → **+ New query**.
4. Abre no teu computador o ficheiro
   `Ancestra App\familyhub\supabase\ALL_IN_ONE.sql`, **copia tudo** (Ctrl+A, Ctrl+C),
   **cola** na caixa do SQL Editor e clica **Run** (canto inferior direito).
   - Deve aparecer "Success". Isto cria todas as tabelas e dados de exemplo.
5. No menu esquerdo abre **Storage** → **New bucket** e cria três (um de cada vez):
   - `avatars` → deixa **Public** ligado
   - `photos` → **Public** ligado
   - `documents` → deixa **Public DESligado** (privado)
6. Agora as chaves: menu **Settings** (engrenagem) → **API**. Deixa esta página
   aberta, vais precisar de copiar 3 valores daqui já a seguir:
   - **Project URL**
   - **anon public**
   - **service_role** (carrega em "Reveal" para a ver)

✅ Base de dados pronta.

---

## B) GitHub — guardar o código (~10 min)

O Vercel vai buscar o código ao GitHub. Não precisas de saber Git — fazes upload pelo site.

1. Vai a **https://github.com** → cria conta (grátis).
2. Em cima à direita, **+** → **New repository**.
   - Repository name: `ancestra`
   - Marca **Private** (só tu vês o código).
   - **NÃO** marques "Add a README".
   - Clica **Create repository**.
3. Na página seguinte, clica no link **"uploading an existing file"**
   (a meio do texto cinzento).
4. Abre no teu computador a pasta `Ancestra App\familyhub`. Seleciona **tudo o que está
   lá dentro** (Ctrl+A) e **arrasta** para a janela do GitHub.
   - ⚠️ Importante: arrasta o **conteúdo** da pasta `familyhub` (as pastas `src`,
     `supabase`, `public`, o `package.json`, etc.), não a pasta `familyhub` em si.
   - ⚠️ Se aparecer um ficheiro chamado `.env.local`, **não o envies** (apaga-o da
     lista). As chaves secretas vão para o Vercel, não para aqui.
   - Espera que todos os ficheiros carreguem (a barra em baixo).
5. Clica no botão verde **Commit changes**.

✅ Código guardado no GitHub.

---

## C) Vercel — pôr no ar (~10 min)

1. Vai a **https://vercel.com** → **Sign up** → escolhe **Continue with GitHub**
   (liga a conta que acabaste de criar).
2. **Add New…** → **Project**.
3. Encontra o repositório `ancestra` na lista e clica **Import**.
4. Antes de "Deploy", abre **Environment Variables** e adiciona estas
   (Name à esquerda, Value à direita — copia os valores da página do Supabase que
   deixaste aberta no passo A6):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | (o **Project URL**) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (a **anon public**) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (a **service_role**) |
   | `NEXT_PUBLIC_APP_URL` | `https://ancestra.vercel.app` (ajustas depois) |

   *(Para cada uma: escreve o Name, cola o Value, clica **Add**.)*
5. Clica **Deploy**. Espera 1–2 minutos.
6. Quando terminar, o Vercel mostra o teu link (ex.: `https://ancestra.vercel.app`).
   Copia esse link.

### Último ajuste (importante para o login funcionar)
7. Volta ao **Supabase** → **Authentication** → **URL Configuration** →
   no campo **Site URL** cola o teu link do Vercel e **Save**.
8. *(Se mudaste o link)* volta ao Vercel → **Settings → Environment Variables** →
   corrige `NEXT_PUBLIC_APP_URL` para o link real e faz **Redeploy**.

✅ A app está online! Abre o link no telemóvel — podes "Adicionar ao ecrã principal"
para ficar como uma app.

---

## D) Tornares-te o administrador

1. No teu link, clica **Criar conta** e regista-te com o teu email.
2. No **Supabase** → **SQL Editor** → New query, cola o conteúdo do ficheiro
   `supabase\make_admin.sql` (na tua pasta), **muda o email e o nome** para os teus,
   e clica **Run**.

✅ Entras como administrador e podes começar a convidar a família.

---

## Resumo ultra-curto

1. **Supabase**: criar projeto → correr `ALL_IN_ONE.sql` → criar 3 buckets → copiar 3 chaves.
2. **GitHub**: criar repo → arrastar os ficheiros da pasta `familyhub`.
3. **Vercel**: importar repo → colar as 4 variáveis → Deploy.
4. **Supabase**: meter o link do Vercel em Authentication.
5. Criar conta → correr `make_admin.sql`.

---

## Se precisares de ajuda

Em qualquer passo, diz-me **em que site estás e o que vês no ecrã** (ou manda um
print) e eu digo-te exatamente onde clicar. Não há pressa — faz um passo de cada vez.
