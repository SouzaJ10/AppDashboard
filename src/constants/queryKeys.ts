export const queryKeys = {
  vendas: {
    // Raiz da família. Continua útil para invalidar
    // caches de vendas de todas as empresas.
    all: ["vendas"] as const,

    empresa: (empresaId: string | null) =>
      ["vendas", empresaId] as const,
  },

  produtos: {
    // Raiz da família.
    all: ["produtos"] as const,

    // Chave antiga mantida temporariamente durante a migração.
    lista: ["produtos", "lista"] as const,

    // Prefixo dos dados de produtos de uma empresa.
    empresa: (empresaId: string | null) =>
      ["produtos", empresaId] as const,

    listaEmpresa: (empresaId: string | null) =>
      ["produtos", empresaId, "lista"] as const,

    // Giro é derivado de vendas, portanto pertence
    // à família de cache de vendas.
    giro: ["vendas", "giro-produtos"] as const,

    giroEmpresa: (empresaId: string | null) =>
      ["vendas", empresaId, "giro-produtos"] as const,
  },

  movimentacoes: {
    all: ["movimentacoes"] as const,

    empresa: (empresaId: string | null) =>
      ["movimentacoes", empresaId] as const,
  },

  compras: {
    all: ["compras"] as const,

    empresa: (empresaId: string | null) =>
      ["compras", empresaId] as const,
  },

  despesas: {
    all: ["despesas"] as const,

    empresa: (empresaId: string | null) =>
      ["despesas", empresaId] as const,
  },

  categoriasDespesa: {
    all: ["categorias_despesa"] as const,

    empresa: (empresaId: string | null) =>
      ["categorias_despesa", empresaId] as const,
  },

  empresas: {
    all: ["empresas"] as const,

    usuario: (userId: string) =>
      ["empresas", "usuario", userId] as const,
  },
};