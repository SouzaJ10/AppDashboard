# Arquitetura — Gestão de Vendas

## Stack

| Camada       | Tecnologia                                  |
|--------------|---------------------------------------------|
| UI           | React 19 + Tailwind CSS v4 + shadcn/ui     |
| Roteamento   | TanStack Router (file-based) + TanStack Start (SSR/edge) |
| Estado/cache | TanStack Query                              |
| Backend      | Supabase (Postgres + Auth + Realtime)      |
| Gráficos     | Recharts                                    |
| Excel        | SheetJS (xlsx)                              |
| PWA          | Manifest + ícones (sem service worker)     |

## Fluxo dos dados

```
   Excel (.xlsx)
        │
        ▼
  [Importador]
  src/routes/_authenticated/importar.tsx
        │  detecta colunas (excel-mapping.ts)
        │  valida + agrupa por aba
        ▼
   Supabase (Postgres)
   ├── produtos      (upsert por código)
   ├── compras       (insert)
   ├── vendas        (insert)
   └── movimentacoes (insert)
        │
        │  Postgres Replication → Realtime
        ▼
   TanStack Query cache
        │
        ▼
   Dashboards (auto-refresh via useRealtime)
```

## Modelo relacional

```
auth.users (gerenciado)
   ├──< profiles (1:1)
   └──< user_roles (1:N)

produtos
   ├──< compras (produto_id FK)
   └──< vendas  (produto_id FK)

movimentacoes  (independente — caixa)
```

`vendas` e `compras` guardam `codigo` + `descricao` denormalizados para resiliência (uma linha histórica continua legível mesmo se o produto for deletado).

## Autenticação

1. Usuário faz signup em `/auth`
2. Trigger `handle_new_user` cria `profiles` + `user_roles`
3. **Primeiro usuário** recebe role `admin` automaticamente; os demais recebem `user`
4. Função `has_role(_user_id, _role)` (SECURITY DEFINER) é usada nas policies RLS

## RLS (resumo)

| Tabela          | SELECT                  | INSERT/UPDATE/DELETE  |
|----------------|-------------------------|------------------------|
| `produtos`      | `authenticated`         | `admin`                |
| `vendas`        | `authenticated`         | `admin`                |
| `compras`       | `authenticated`         | `admin`                |
| `movimentacoes` | `authenticated`         | `admin`                |
| `profiles`      | `authenticated`         | UPDATE = próprio user  |
| `user_roles`    | próprio user            | bloqueado (só via SQL) |

## Realtime

Tabelas publicadas em `supabase_realtime`:
- `vendas`, `compras`, `movimentacoes`, `produtos`

Cliente subscreve via `useRealtime(['vendas','compras','movimentacoes','produtos'])` no Dashboard/Vendas, que invalida queries do TanStack Query → re-render automático.

## Cadastro manual de venda

`NovaVendaDialog` executa em sequência:
1. `INSERT venda` (com lucro/margem calculados)
2. `UPDATE produtos SET estoque_atual = estoque_atual - qtd`
3. `INSERT movimentacoes (entrada = preço_total)`

Não é transação atômica de banco (3 chamadas REST). Para garantir atomicidade total, futuramente migrar para uma RPC Postgres com `BEGIN/COMMIT`.

## Importador flexível

Em `src/lib/excel-mapping.ts` há dicionários de sinônimos (PT/EN, com/sem acento). O importador:
1. Lê todas as abas do `.xlsx`
2. Detecta qual aba é qual tipo (vendas/compras/estoque/movimentação) pelo nome OU pelas colunas presentes
3. Mapeia cada coluna do header para o campo canônico via sinônimos
4. Lista colunas obrigatórias ausentes ANTES de gravar
5. Permite o usuário marcar quais abas importar
6. Faz upsert idempotente em produtos, insert em transações

## Onde alterar coisas

(ver tabela no README.md)

## Desenvolvimento local

```bash
npm install
cp .env.example .env  # preencher com credenciais
npm run dev           # http://localhost:8080
```

Para resetar o banco local:
```bash
supabase db reset
```

## Deploy

- **Vercel**: importar repo → adicionar env vars → deploy
- **Lovable**: botão Publish
- **Self-host**: ver [docs.lovable.dev/tips-tricks/self-hosting](https://docs.lovable.dev/tips-tricks/self-hosting)

## Riscos conhecidos

| Risco                                            | Mitigação                                  |
|--------------------------------------------------|--------------------------------------------|
| Nova Venda não é transacional (3 chamadas)       | Migrar para RPC `criar_venda_atomica()`   |
| Sem tela de reset de senha                       | Implementar `/reset-password`              |
| Sem audit log                                    | Criar tabela `audit_log` com triggers      |
| Service worker ausente (offline real)            | Adicionar `vite-plugin-pwa` se necessário  |
