# Publicar a Ancestra (família Queiroz)

A app **Ancestra** é uma cópia da Ndandu, mas com **base de dados e login próprios**
(projeto Supabase dedicado). Não partilha nada com a Gonçalves nem com o Elegance.

- **Projeto Supabase:** Ancestra Queiroz
- **URL da base de dados:** https://boclaewfqhnlimpqejzb.supabase.co
- As credenciais públicas já estão dentro do `netlify.toml` — **não é preciso** configurar
  variáveis à mão no Netlify.

---

## 1. Enviar o código para o GitHub (repositório NOVO)

1. Em <https://github.com> cria um repositório novo, por exemplo **`ancestra`**
   (diferente do `ndandu`).
2. **Add file → Upload files** → arrasta **tudo o que está dentro da pasta `ancestra`**
   (as pastas `src`, `public`, `supabase`, e os ficheiros `package.json`, `netlify.toml`, etc.).
   - Se aparecer uma subpasta chamada `ndandu`, **não a incluas** (é lixo de uma cópia antiga).
3. **Commit** (mensagem à escolha, ex.: `Ancestra`).

## 2. Criar o site no Netlify (NOVO site)

1. No Netlify: **Add new site → Import an existing project → GitHub** → escolhe o repositório `ancestra`.
2. Deixa as opções por omissão (o plugin do Next.js trata do build). **Deploy site**.
3. Fica com um endereço próprio (ex.: `ancestra.netlify.app`).

## 3. Ligar o registo (no projeto Supabase Ancestra)

No painel do Supabase, com o projeto **Ancestra Queiroz** selecionado:
**Authentication → Sign In / Providers → Email**:

- **Allow new users to sign up** → **ON**
- **Confirm email** → **OFF** (senão as pessoas ficam à espera de um email de confirmação
  que, sem servidor de email, não chega).

## 4. Primeiro administrador

1. A pessoa responsável dos Queiroz vai ao site e **cria a conta** (fica "a aguardar aprovação").
2. Depois é preciso torná-la **super_admin** uma vez. Diz-me o email dela que eu faço isso,
   ou corre no **SQL Editor** do projeto Ancestra:

   ```sql
   update ancestra.users
   set role = 'super_admin', family_id = '10000000-0000-0000-0000-000000000001'
   where email = 'EMAIL_DA_PESSOA';
   ```

A partir daí, essa pessoa entra em **Administração**, aprova os restantes familiares e
começa a construir a árvore dos Queiroz.

---

Já está criada de raiz a **Família Queiroz** (tronco) e a conversa da família. Tudo o resto
(membros, memórias, memorial, documentos, agenda, chat, fotos) funciona igual à Ndandu.
