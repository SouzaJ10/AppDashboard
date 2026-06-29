# Migração para um projeto Supabase próprio

Este guia descreve, passo a passo, como sair do projeto Supabase atual
(`tqnggvhwdluophinvwaf`, gerenciado pela Lovable Cloud) e mover o sistema
para um projeto Supabase criado na sua conta — ficando 100% independente
do Lovable.

---

## 1. Estrutura atual do banco (resumo)

| Objeto | Tipo | Observação |
|---|---|---|
| `public.app_role` | ENUM | `'admin' \| 'user'` |
| `public.profiles` | tabela | FK para `auth.users` |
| `public.user_roles` | tabela | papéis por usuário |
| `public.produtos` | tabela | cadastro de produtos |
| `public.compras` | tabela | entradas |
| `public.vendas` | tabela | saídas / faturamento |
| `public.movimentacoes` | tabela | fluxo de caixa |
| `public.has_role(uuid, app_role)` | função SECURITY DEFINER | usada em RLS |
| `public.handle_new_user()` | função SECURITY DEFINER | cria profile + role |
| `on_auth_user_created` | trigger em `auth.users` | dispara `handle_new_user` |
| Publicação `supabase_realtime` | realtime | inclui `vendas`, `compras`, `movimentacoes`, `produtos` |
| RLS | habilitado em **todas** as tabelas `public.*` | políticas detalhadas no SQL |

**Views:** nenhuma.
**Buckets de Storage:** nenhum.
**Edge Functions:** nenhuma (toda lógica está em `createServerFn` do TanStack Start).

O SQL completo, pronto para rodar, está em **`docs/SCHEMA_COMPLETO.sql`**.

---

## 2. Criar o novo projeto Supabase

1. Acesse https://supabase.com/dashboard e crie um novo projeto na sua organização.
2. Anote, em **Project Settings → API**:
   - `Project URL` → `https://<ref>.supabase.co`
   - `anon public key` → chave pública (`eyJ...`)
   - `service_role` → **NUNCA** vai para o frontend.
3. Em **Project Settings → Database → Connection string**, anote a senha
   do banco (necessária se quiser usar `psql` para migrar dados).

---

## 3. Aplicar o schema no novo projeto

Opção A — SQL Editor (mais simples):

1. Abra o **SQL Editor** do novo projeto.
2. Cole o conteúdo de `docs/SCHEMA_COMPLETO.sql`.
3. Clique em **Run**.

Opção B — `psql`:

```bash
psql "postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" \
  -f docs/SCHEMA_COMPLETO.sql
```

---

## 4. Configurar Authentication

No painel do novo projeto, em **Authentication → Providers**:

- **Email**: habilitado, `Confirm email` = ON.
- **Google**: habilite e preencha `Client ID` / `Client Secret` do Google Cloud.
  Em **Authorized redirect URIs** do Google Cloud Console, adicione:
  ```
  https://<ref>.supabase.co/auth/v1/callback
  ```

Em **Authentication → URL Configuration**:

- **Site URL**: URL de produção (ex.: `https://app.souzaprado.com.br`).
- **Redirect URLs** (uma por linha):
  ```
  http://localhost:8080/**
  http://localhost:8080/auth/callback
  http://localhost:8080/reset-password
  https://<seu-dominio>/**
  https://<seu-dominio>/auth/callback
  https://<seu-dominio>/reset-password
  ```

Em **Authentication → Emails**, personalize templates se desejar.

---

## 5. Migrar dados (opcional, só se quiser preservar registros)

Exportar do projeto antigo (precisa do acesso ao banco antigo):

```bash
pg_dump "postgresql://postgres:SENHA@db.tqnggvhwdluophinvwaf.supabase.co:5432/postgres" \
  --data-only --schema=public \
  --table=produtos --table=compras --table=vendas --table=movimentacoes \
  > dados.sql
```

Importar no novo:

```bash
psql "postgresql://postgres:SENHA@db.<novo-ref>.supabase.co:5432/postgres" -f dados.sql
```

> Usuários (`auth.users`) **não migram** automaticamente — peça aos usuários para
> cadastrar-se de novo, ou use a Auth Admin API para recriá-los.

---

## 6. Atualizar variáveis de ambiente da aplicação

Edite `.env` (local) e as variáveis do provedor de deploy (Vercel/Cloudflare):

```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key do novo projeto>
VITE_SUPABASE_PROJECT_ID=<ref>

# Apenas no servidor (Vercel / Cloudflare env vars). NUNCA commitar.
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key do novo projeto>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Reinicie o dev server (`bun dev`) ou refaça o deploy.

---

## 7. O que muda no código?

**Nada.** Toda a aplicação já lê o Supabase via variáveis de ambiente:

- `src/integrations/supabase/client.ts` → usa `VITE_SUPABASE_*`
- `src/integrations/supabase/client.server.ts` → usa `SUPABASE_*`
- `src/integrations/supabase/auth-middleware.ts` → idem
- Importador de planilhas (`src/routes/_authenticated/importar.tsx`),
  Realtime (`src/hooks/useRealtime.ts`), consultas, OAuth — tudo continua
  funcionando com o novo backend.

> Se você quiser regenerar o arquivo de tipos do banco
> (`src/integrations/supabase/types.ts`) a partir do novo projeto:
> ```bash
> npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
> ```

---

## 8. Remover dependências do Lovable Cloud

Após confirmar que o novo backend funciona:

```bash
bun remove @lovable.dev/cloud-auth-js
rm -rf src/integrations/lovable
```

Procure por imports remanescentes:

```bash
rg "@/integrations/lovable|@lovable.dev" src/
```

E remova-os.

---

## 9. Checklist final

- [ ] Schema aplicado no novo projeto (`SCHEMA_COMPLETO.sql`).
- [ ] Google OAuth configurado no Supabase + Google Cloud.
- [ ] Redirect URLs cadastradas (localhost + produção).
- [ ] `.env` local apontando para o novo projeto.
- [ ] Variáveis de ambiente atualizadas no Vercel/Cloudflare.
- [ ] Primeiro usuário cadastrado vira `admin` automaticamente.
- [ ] Dados importados via planilha funcionando (`/importar`).
- [ ] Realtime funcionando (dashboard atualizando sozinho).
- [ ] Pacote `@lovable.dev/cloud-auth-js` removido (opcional).

Pronto — o sistema está 100% no seu Supabase.
