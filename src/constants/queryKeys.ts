export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },

  vendas: {
    all: ["vendas"] as const,
  },

  produtos: {
    all: ["produtos"] as const,
    giro: ["produtos-giro"] as const,
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

  financeiro: {
    all: ["mov-fin"] as const,
  },

  insights: {
    vendas: ["vendas-ins"] as const,
    produtos: ["produtos-ins"] as const,
    movimentacoes: ["mov-ins"] as const,
  },
};