/**
 * Mapeamento flexível de colunas Excel → campos canônicos.
 * Cada campo lista sinônimos aceitos
 * (case-insensitive e sem acento).
 */

export type SheetKind =
  | "estoque"
  | "compras"
  | "vendas"
  | "movimentacoes";

export const SHEET_NAME_HINTS: Record<
  SheetKind,
  string[]
> = {
  estoque: [
    "estoque",
    "stock",
    "produtos",
    "inventario",
  ],

  compras: [
    "compra",
    "purchase",
    "entrada",
    "fornecedor",
  ],

  vendas: [
    "venda",
    "sale",
    "saida de produto",
    "faturamento",
  ],

  movimentacoes: [
    "movimenta",
    "caixa",
    "fluxo",
    "financeiro",
    "cash",
  ],
};

// chave canônica -> lista de sinônimos
export const FIELD_SYNONYMS: Record<
  SheetKind,
  Record<string, string[]>
> = {
  estoque: {
    codigo: [
      "codigo",
      "código",
      "cod",
      "sku",
      "id",
    ],

    descricao: [
      "descricao",
      "descrição",
      "produto",
      "nome",
      "item",
      "description",
    ],

    estoque_atual: [
      "estoque_atual",
      "estoque atual",
      "quantidade",
      "qtd",
      "estoque",
      "saldo",
      "qtde",
      "qty",
    ],

    estoque_minimo: [
      "estoque_minimo",
      "estoque minimo",
      "estoque mínimo",
      "minimo",
      "mínimo",
      "min",
      "reposicao",
      "reposição",
    ],

    custo_compra: [
      "custo_compra",
      "custo compra",
      "custo",
      "custo unit",
      "custo unitario",
      "custo unitário",
      "preco custo",
      "preço custo",
      "unit cost",
    ],

    preco_venda: [
      "preco_venda",
      "preco venda",
      "preço venda",
      "preco de venda",
      "preço de venda",
      "valor venda",
      "selling price",
    ],
  },

  compras: {
    codigo: [
      "codigo",
      "data",
      "código",
      "cod",
      "sku",
    ],

    descricao: [
      "descricao",
      "descrição",
      "produto",
      "nome",
      "item",
    ],

    quantidade: [
      "quantidade",
      "qtd",
      "qtde",
      "qty",
    ],

    custo_unitario: [
      "custo_unitario",
      "custo unitario",
      "custo unitário",
      "custo unit",
      "preco unit",
      "preço unit",
      "valor unit",
      "unit cost",
    ],

    custo_total: [
      "custo_total",
      "custo total",
      "total",
      "valor total",
      "subtotal",
    ],

    data: [
      "data",
      "date",
      "data compra",
      "dt",
    ],

    fornecedor: [
      "fornecedor",
      "supplier",
      "vendor",
    ],
  },

  vendas: {
    codigo: [
      "codigo",
      "código",
      "cod",
      "sku",
    ],

    descricao: [
      "descricao",
      "descrição",
      "produto",
      "nome",
      "item",
    ],

    quantidade: [
      "quantidade",
      "qtd",
      "qtde",
    ],

    valor_unitario: [
      "valor_unitario",
      "valor unitario",
      "valor unitário",
      "preco unitario",
      "preço unitário",
      "preco unit.",
      "preço unit.",
      "preco",
      "preço",
      "valor unit",
      "unitario",
      "unitário",
    ],

    preco_venda: [
      "preco_venda",
      "preco venda",
      "preço venda",
      "total",
      "valor total",
      "total venda",
      "valor da venda",
      "valor venda",
      "total pedido",
      "subtotal",
      "faturamento",
    ],

    custo: [
      "custo",
      "cost",
    ],

    despesas: [
      "despesa",
      "despesas",
      "frete",
      "taxa",
    ],

    lucro: [
      "lucro",
      "resultado",
    ],

    data: [
      "data",
      "date",
    ],
  },

  movimentacoes: {
    data: [
      "data",
      "date",
      "dt",
    ],

    tipo: [
      "tipo",
      "type",
      "natureza",
      "movimento",
      "movimentacao",
      "movimentação",
    ],

    entrada: [
      "entrada",
      "credito",
      "crédito",
      "receita",
      "in",
    ],

    saida: [
      "saida",
      "saída",
      "debito",
      "débito",
      "despesa",
      "out",
    ],

    descricao: [
      "descricao",
      "descrição",
      "historico",
      "histórico",
      "categoria",
      "memo",
    ],
  },
};

export const REQUIRED_FIELDS: Record<
  SheetKind,
  string[]
> = {
  estoque: [
    "codigo",
    "descricao",
  ],

  compras: [
    "codigo",
  ],

  vendas: [
    "data",
  ],

  movimentacoes: [
    "data",
    "tipo",
  ],
};

/**
 * Normaliza string:
 * minúscula, sem acento, trim
 * e sem separadores especiais.
 */
export const normalize = (
  value: string
): string =>
  String(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(/[._\-/]+/g, " ")
    .replace(/\s+/g, " ");

/**
 * Tenta inferir o tipo de aba
 * pelo nome e/ou pelas colunas presentes.
 */
export function detectSheetKind(
  sheetName: string,
  headers: string[]
): SheetKind | null {
  const normalizedName =
    normalize(sheetName);

  for (
    const [kind, hints] of Object.entries(
      SHEET_NAME_HINTS
    ) as [
      SheetKind,
      string[],
    ][]
  ) {
    if (
      hints.some((hint) =>
        normalizedName.includes(
          normalize(hint)
        )
      )
    ) {
      return kind;
    }
  }

  // fallback: por colunas presentes
  const normalizedHeaders =
    headers.map(normalize);

  const score = (
    kind: SheetKind
  ) => {
    let total = 0;

    for (
      const synonyms of Object.values(
        FIELD_SYNONYMS[kind]
      )
    ) {
      if (
        normalizedHeaders.some(
          (header) =>
            synonyms.some(
              (synonym) =>
                header.includes(
                  normalize(synonym)
                )
            )
        )
      ) {
        total++;
      }
    }

    return total;
  };

  const ranked = (
    Object.keys(
      SHEET_NAME_HINTS
    ) as SheetKind[]
  )
    .map(
      (kind) =>
        [
          kind,
          score(kind),
        ] as const
    )
    .sort(
      (a, b) =>
        b[1] - a[1]
    );

  return ranked[0][1] >= 2
    ? ranked[0][0]
    : null;
}

/**
 * Mapeia headers →
 * { campoCanonico: headerOriginal | null }
 */
export function autoMap(
  kind: SheetKind,
  headers: string[]
): Record<
  string,
  string | null
> {
  const out: Record<
    string,
    string | null
  > = {};

  const normalizedHeaders =
    headers.map((header) => ({
      orig: header,
      norm: normalize(header),
    }));

  for (
    const [
      field,
      synonyms,
    ] of Object.entries(
      FIELD_SYNONYMS[kind]
    )
  ) {
    const normalizedSynonyms =
      synonyms.map(normalize);

    // Primeiro procura igualdade exata.
    const exactMatch =
      normalizedHeaders.find(
        (header) =>
          normalizedSynonyms.some(
            (synonym) =>
              header.norm ===
              synonym
          )
      );

    // Só depois tenta correspondência parcial.
    const partialMatch =
      exactMatch ??
      normalizedHeaders.find(
        (header) =>
          normalizedSynonyms.some(
            (synonym) =>
              header.norm.includes(
                synonym
              )
          )
      );

    out[field] =
      partialMatch?.orig ??
      null;
  }

  return out;
}

/**
 * Retorna campos obrigatórios
 * não mapeados.
 */
export function missingRequired(
  kind: SheetKind,
  mapping: Record<
    string,
    string | null
  >
): string[] {
  return REQUIRED_FIELDS[
    kind
  ].filter(
    (field) =>
      !mapping[field]
  );
}