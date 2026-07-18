# Gestão de Vendas — Sistema de Gestão Comercial

Aplicativo PWA de BI e operação comercial.
Stack: **React 19 + TanStack Start + Tailwind v4 + Supabase + Recharts**.

## ✨ Funcionalidades

- 🔐 Autenticação Email/Senha (primeiro usuário vira admin)
- 📊 Dashboard executiva com KPIs e gráficos (Recharts)
- 🛒 Histórico de vendas + cadastro manual (➕ Nova Venda)
- 📦 Estoque com alertas (OK / Crítico / Zerado)
- 💰 Financeiro (fluxo de caixa diário / semanal / mensal / anual)
- 🏷️ Precificação (ROI, margem, custo por produto)
- 💡 Insights automáticos
- 📥 Importador flexível de Excel (auto-mapeamento de colunas, importação por aba)
- ⚡ Realtime — atualização instantânea ao gravar venda/compra
- 📱 PWA instalável (Android / iOS / desktop)

## 🔒 Segurança

- ✅ RLS em todas as tabelas (escrita só para admin)
- ✅ Roles em tabela separada (`user_roles`) com função `has_role()` SECURITY DEFINER
- ✅ Nenhum endpoint público expondo dados
- ✅ Service role key fica server-side apenas
- ❌ Não há reset de senha implementado (TODO)

## 📄 Licença

Privado —  Gestão de Vendas.
