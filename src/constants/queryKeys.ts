export const queryKeys = {
  vendas: {
    all: ["vendas"] as const,
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

  empresas: {
  all: ["empresas"] as const,

  usuario: (userId: string) =>
    ["empresas", "usuario", userId] as const,
},
};