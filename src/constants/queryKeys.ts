export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },

  vendas: {
    all: ["vendas"] as const,
  },

  produtos: {
    all: ["produtos"] as const,
    lista: ["produtos", "lista"] as const,
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

  insights: {
    vendas: ["vendas-ins"] as const,
    produtos: ["produtos-ins"] as const,
    movimentacoes: ["mov-ins"] as const,
  },

  categoriasDespesa: {
    all: ["categorias_despesa"] as const,
  },

  precificacao: {
    vendas: ["vendas-prec"] as const,
  },

  financeiro: {
    all: ["mov-fin"] as const,
    compras: ["compras-fin"] as const,
  },
};