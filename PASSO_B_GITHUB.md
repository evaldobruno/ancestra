# Parte B — Criar o repositório e enviar os ficheiros (sem terminal)

Vamos usar o **GitHub Desktop** (aplicação gráfica). É a forma mais fiável de enviar
uma pasta com subpastas, sem escrever comandos. ~10 minutos.

---

## 1. Instalar o GitHub Desktop
1. Vai a **https://desktop.github.com** → **Download for Windows** → instala.
2. Abre a app → **Sign in to GitHub.com** → entra com a tua conta (evaldobruno).
3. Em "Configure Git", carrega **Continue** (usa o nome/email da conta).

## 2. Transformar a pasta familyhub num repositório
1. No menu de cima: **File → Add local repository…**
2. Em **Local path**, carrega **Choose…** e seleciona a pasta:
   `C:\Users\hp\Claude\Projects\Ancestra App\familyhub`
3. Vai aparecer um aviso *"This directory does not appear to be a Git repository"*
   com um link azul **"create a repository"** — clica nesse link.
4. No ecrã **Create a repository**:
   - **Name:** `ancestra`
   - **Description:** (opcional) "App familiar Ancestra"
   - Deixa o resto como está.
   - Carrega **Create repository**.

> Não te preocupes com o `node_modules` nem com o `.env.local` — o ficheiro
> `.gitignore` já os exclui automaticamente (as tuas chaves NÃO vão para o GitHub).

## 3. Fazer o primeiro "commit" (guardar os ficheiros)
1. À esquerda vais ver a lista de todos os ficheiros (centenas — é normal).
2. Em baixo à esquerda, no campo **Summary**, escreve: `Ancestra MVP`
3. Carrega o botão azul **Commit to main**.

## 4. Publicar no GitHub
1. Em cima, carrega **Publish repository**.
2. Na janela:
   - **Name:** `ancestra` (já vem preenchido)
   - **Keep this code private** → deixa **marcado** (recomendado).
   - Carrega **Publish repository**.
3. Espera uns segundos. Pronto — o teu código está no GitHub. ✅

Para confirmares: menu **Repository → View on GitHub** abre o repositório no browser
e devias ver as pastas `src`, `supabase`, `public`, o `package.json`, o `netlify.toml`, etc.

---

## 5. Voltar ao Netlify
Agora que o repo existe:
1. No Netlify → **Add new site → Import an existing project → GitHub**.
2. Se aparecer o ecrã de permissões, escolhe **Only select repositories** e seleciona
   `ancestra` (ou deixa "All repositories"). **Install / Save**.
3. Escolhe o repositório `ancestra` na lista.
4. O Netlify deteta o Next.js sozinho (pelo `netlify.toml`). Não mexas no build.
5. **Environment variables** → adiciona:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ypskwqrnmfhkrookprbk.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (a chave anon — está no teu `.env.local`)
   - `NEXT_PUBLIC_SUPABASE_SCHEMA` = `ancestra`
   - `NEXT_PUBLIC_APP_URL` = (o endereço final do Netlify, ex.: `https://ancestra.netlify.app`)
   - *(se pedir)* `NODE_VERSION` = `20`
6. **Deploy site**. Em 1–2 min tens o link público.
7. **Supabase → Authentication → URL Configuration** → mete o link do Netlify no
   **Site URL** e grava.

---

## Atualizações futuras (super simples)
Sempre que eu (ou tu) mudar algo no código:
1. Abres o **GitHub Desktop** → vês as alterações → escreves um Summary → **Commit to main**.
2. Carregas **Push origin** (em cima).
3. O Netlify reconstrói e publica sozinho em ~1 min. 🎉

---

## Alternativa (sem instalar nada)
Se não quiseres instalar o GitHub Desktop:
1. Em **https://github.com/new** cria um repositório chamado `ancestra` (Private), sem README.
2. Na página seguinte clica **"uploading an existing file"**.
3. Abre a pasta `familyhub`, seleciona **tudo lá dentro** (Ctrl+A) e **arrasta** para a janela.
4. Espera o upload e clica **Commit changes**.

⚠️ Este método pelo browser às vezes falha com muitas subpastas — por isso recomendo
o GitHub Desktop. Se algum ficheiro faltar, o build no Netlify vai dar erro.
