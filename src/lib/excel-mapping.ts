/**
 * Mapeamento flexível de colunas Excel → campos canônicos.
 * Cada campo lista sinônimos aceitos (case-insensitive, sem acento).
 */

export type SheetKind = "estoque" | "compras" | "vendas" | "movimentacoes";

export const SHEET_NAME_HINTS: Record<SheetKind, string[]> = {
  estoque: ["estoque", "stock", "produtos", "inventario"],
  compras: ["compra", "purchase", "entrada", "fornecedor"],
  vendas: ["venda", "sale", "saida de produto", "faturamento"],
  movimentacoes: ["movimenta", "caixa", "fluxo", "financeiro", "cash"],
};

// chave canônica -> lista de sinônimos
export const FIELD_SYNONYMS: Record<SheetKind, Record<string, string[]>> = {
  estoque: {
    codigo: ["codigo", "código", "cod", "sku", "id"],
    descricao: ["descricao", "descrição", "produto", "nome", "item", "description"],
    estoque_atual: ["quantidade", "qtd", "estoque", "saldo", "qtde", "qty"],
    estoque_minimo: ["minimo", "mínimo", "estoque minimo", "min", "reposicao"],
  },
  compras: {
    codigo: ["codigo", "código", "cod", "sku"],
    descricao: ["descricao", "descrição", "produto", "nome", "item"],
    quantidade: ["qtd", "quantidade", "qtde", "qty"],
    custo_unitario: ["custo unit", "custo unitario", "custo unitário", "preco unit", "valor unit", "unit cost"],
    custo_total: ["custo total", "total", "valor total", "subtotal"],
    data: ["data", "date", "data compra", "dt"],
  },
  vendas: {
    codigo: [
      "codigo",
      "código",
      "cod",
      "sku",
      "pedido",
      "nº pedido",
      "numero pedido",
      "pedido venda"
    ],
    descricao: [
      "descricao",
      "descrição",
      "produto",
      "nome",
      "item"
    ],
    quantidade: [
      "qtd",
      "quantidade",
      "qtde"
    ],
    preco_venda: [
      "preco venda",
      "preço venda",
      "preco",
      "preço",
      "valor",
      "preço unit.",
      "preco unit.",
      "unitario",
      "unitário",
      "total"
    ],
    custo: [
      "custo",
      "cost"
    ],
    despesas: [
      "despesa",
      "despesas",
      "frete",
      "taxa"
    ],
    lucro: [
      "lucro",
      "resultado"
    ],
    data: [
      "data",
      "date"
    ],
  },
  movimentacoes: {
    data: ["data", "date", "dt"],
    entrada: ["entrada", "credito", "crédito", "receita", "in"],
    saida: ["saida", "saída", "debito", "débito", "despesa", "out"],
    descricao: ["descricao", "descrição", "historico", "histórico", "categoria", "tipo"],
  },
};

export const REQUIRED_FIELDS: Record<SheetKind, string[]> = {
  estoque: ["codigo", "descricao"],
  compras: ["codigo"],
  vendas: ["data"],
  movimentacoes: ["data"],
};

/** Normaliza string: minúscula, sem acento, trim, sem caracteres especiais */
export const normalize = (s: string): string =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[._\-/]+/g, " ")
    .replace(/\s+/g, " ");

/** Tenta inferir o tipo de aba pelo nome e/ou pelas colunas presentes */
export function detectSheetKind(sheetName: string, headers: string[]): SheetKind | null {
  const n = normalize(sheetName);
  for (const [kind, hints] of Object.entries(SHEET_NAME_HINTS) as [SheetKind, string[]][]) {
    if (hints.some((h) => n.includes(h))) return kind;
  }
  // fallback: por colunas presentes
  const heads = headers.map(normalize);
  const score = (kind: SheetKind) => {
    let s = 0;
    for (const syns of Object.values(FIELD_SYNONYMS[kind])) {
      if (heads.some((h) => syns.some((syn) => h.includes(syn)))) s++;
    }
    return s;
  };
  const ranked = (Object.keys(SHEET_NAME_HINTS) as SheetKind[])
    .map((k) => [k, score(k)] as const)
    .sort((a, b) => b[1] - a[1]);
  return ranked[0][1] >= 2 ? ranked[0][0] : null;
}

/** Mapeia headers → { campoCanonico: headerOriginal | null } */
export function autoMap(kind: SheetKind, headers: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const normHeaders = headers.map((h) => ({ orig: h, norm: normalize(h) }));
  for (const [field, syns] of Object.entries(FIELD_SYNONYMS[kind])) {
    const match = normHeaders.find((h) => syns.some((s) => h.norm === s)) ||
      normHeaders.find((h) => syns.some((s) => h.norm.includes(s)));
    out[field] = match?.orig ?? null;
  }
  return out;
}

/** Retorna campos obrigatórios não mapeados */
export function missingRequired(kind: SheetKind, mapping: Record<string, string | null>): string[] {
  return REQUIRED_FIELDS[kind].filter((f) => !mapping[f]);
}
