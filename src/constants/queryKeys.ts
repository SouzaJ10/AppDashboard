import { useRealtime } from "@/hooks/useRealtime";

function InsightsPage() {
  useRealtime(["vendas", "produtos", "movimentacoes"]);
}

export const queryKeys = {
  vendas: {
    all: ["vendas"] as const,
    faturamento: ["vendas", "faturamento"] as const,
  },

  produtos: {
    all: ["produtos"] as const,
    lista: ["produtos", "lista"] as const,
    giro: ["vendas", "giro-produtos"] as const,
  },

  movimentacoes: {
    all: ["movimentacoes"] as const,
  },

  compras: {
    all: ["compras"] as const,
  },

  despesas: {
    all: ["despesas"] as const,
  },

  categoriasDespesa: {
    all: ["categorias_despesa"] as const,
  },
};