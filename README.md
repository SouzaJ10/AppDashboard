# Gestão de Vendas — Sistema de Gestão Comercial

Aplicativo PWA de BI e operação comercial.
Stack: **React 19 + TanStack Start + Tailwind v4 + Supabase (Lovable Cloud) + Recharts**.

## ✨ Funcionalidades

- 🔐 Autenticação Email/Senha + Google (primeiro usuário vira admin)
- 📊 Dashboard executiva com 8 KPIs e gráficos (Recharts)
- 🛒 Histórico de vendas + cadastro manual (➕ Nova Venda)
- 📦 Estoque com alertas (OK / Crítico / Zerado)
- 💰 Financeiro (fluxo de caixa diário / semanal / mensal / anual)
- 🏷️ Precificação (ROI, margem, custo por produto)
- 💡 Insights automáticos
- 📥 Importador flexível de Excel (auto-mapeamento de colunas, importação por aba)
- ⚡ Realtime — atualização instantânea ao gravar venda/compra
- 📱 PWA instalável (Android / iOS / desktop)

## 🚀 Rodar localmente

```bash
# 1. Clonar
git clone <seu-repo>
cd souza-prado

# 2. Instalar
npm install   # ou bun install

# 3. Configurar Supabase
cp .env.example .env
# preencha VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID

# 4. Rodar
npm run dev
# abre em http://localhost:8080
```

## 🗄️ Banco de dados (Supabase)

As migrações ficam em `supabase/migrations/*.sql`. Para recriar o schema:

```bash
# Com Supabase CLI
supabase db reset                # roda todas as migrações em ordem
```

Ou aplique os arquivos `.sql` manualmente no SQL Editor do Supabase.

### Tabelas

| Tabela           | Função                                  |
|------------------|------------------------------------------|
| `profiles`       | Espelho de `auth.users` (nome, email)    |
| `user_roles`     | Roles (admin / user) — separadas por segurança |
| `produtos`       | Estoque (código, descrição, qtd, mínimo) |
| `compras`        | Histórico de compras                     |
| `vendas`         | Histórico de vendas (com lucro/margem)   |
| `movimentacoes`  | Fluxo de caixa (entrada/saída/data)      |

Todas têm **RLS habilitado**. Leitura: usuário autenticado. Escrita: admin.

## 📦 Build & Deploy

### Vercel

```bash
npm run build     # gera .output/
```

1. Importe o repositório em https://vercel.com/new
2. Framework preset: **TanStack Start** (ou "Other" + comando `npm run build`)
3. Adicione as variáveis de ambiente do `.env.example`
4. Deploy

### Lovable

Botão **Publish** no canto superior direito — gera URL `*.lovable.app`.

## 📱 Instalar no celular (PWA)

- **Android (Chrome)**: ⋮ → "Adicionar à tela inicial"
- **iOS (Safari)**: ⬆️ → "Adicionar à Tela de Início"

## 📁 Estrutura

```
src/
├── routes/
│   ├── __root.tsx                 ← layout raiz, providers
│   ├── index.tsx                  ← redirect → /dashboard ou /auth
│   ├── auth.tsx                   ← login/cadastro
│   └── _authenticated/            ← rotas protegidas (gate ssr:false)
│       ├── route.tsx              ← gate de auth (gerenciado)
│       ├── dashboard.tsx          ← KPIs + 3 gráficos
│       ├── vendas.tsx             ← histórico + Nova Venda
│       ├── estoque.tsx
│       ├── financeiro.tsx
│       ├── precificacao.tsx
│       ├── insights.tsx
│       └── importar.tsx           ← upload Excel (admin)
├── components/
│   ├── layout/AppShell.tsx        ← sidebar + header (← editar MENU aqui)
│   ├── dashboard/KpiCard.tsx      ← card de KPI reutilizável
│   ├── vendas/NovaVendaDialog.tsx ← form de venda manual
│   └── ui/                        ← shadcn primitives
├── hooks/
│   ├── useAuth.ts                 ← session + role
│   └── useRealtime.ts             ← subscription Supabase
├── integrations/supabase/         ← clients (auto-gerados; não editar)
├── lib/
│   ├── format.ts                  ← brl, pct, dateBR
│   └── excel-mapping.ts           ← sinônimos de colunas do importador
└── styles.css                     ← tema (cores, fontes)
```

## 🛠️ Onde alterar...

| O que                     | Arquivo                                          |
|--------------------------|--------------------------------------------------|
| Itens do **menu**         | `src/components/layout/AppShell.tsx` (array `NAV`) |
| **KPIs do dashboard**     | `src/routes/_authenticated/dashboard.tsx`        |
| **Gráficos**              | mesma rota, blocos `<ResponsiveContainer>`       |
| **Cores e tema**          | `src/styles.css` (variáveis CSS)                 |
| **Regras de margem/ROI**  | rotas correspondentes (`precificacao.tsx`, etc.)|
| **Mapeamento de colunas Excel** | `src/lib/excel-mapping.ts`                |
| **Schema do banco**       | nova migração em `supabase/migrations/`          |
| **Nome do app / ícones**  | `public/manifest.webmanifest` + `public/icon-*.png` |

Mais detalhes em [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## 🔒 Segurança

- ✅ RLS em todas as tabelas (escrita só para admin)
- ✅ Roles em tabela separada (`user_roles`) com função `has_role()` SECURITY DEFINER
- ✅ Nenhum endpoint público expondo dados
- ✅ Service role key fica server-side apenas
- ❌ Não há reset de senha implementado (TODO)

## 📄 Licença

Privado —  Gestão de Vendas.
