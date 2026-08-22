export const queryKeys = {
  vendas: {
    all: ["vendas"] as const,
    faturamento: ["vendas", "faturamento"] as const,
  },

  produtos: {
    all: ["produtos"] as const,
    lista: ["produtos", "lista"] as const,

    // Giro é derivado das vendas, por isso pertence à família
    // de invalidação de "vendas".
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

  insights: {
    vendas: ["vendas", "insights"] as const,
    produtos: ["produtos", "insights"] as const,
    movimentacoes: ["movimentacoes", "insights"] as const,
  },

  categoriasDespesa: {
    all: ["categorias_despesa"] as const,
  },

  precificacao: {
    vendas: ["vendas", "precificacao"] as const,
  },

  financeiro: {
    all: ["movimentacoes", "financeiro"] as const,
    compras: ["compras", "financeiro"] as const,
  },
};