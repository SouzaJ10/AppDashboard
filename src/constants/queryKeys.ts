export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },

  produtos: {
    all: ["produtos"] as const,
    select: ["produtos-select"] as const,
  },

  vendas: {
    all: ["vendas-all"] as const,
  },

  movimentacoes: {
    all: ["movimentacoes"] as const,
  },
} as const;