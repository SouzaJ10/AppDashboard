// Extensões de tipos para colunas adicionadas manualmente em `produtos`.
// O arquivo gerado `types.ts` é regenerado automaticamente pela toolchain
// e não pode ser editado à mão. Use este tipo quando precisar dos novos
// campos (categoria, marca, custo_compra, preco_venda, etc.).
//
// As colunas reais existem no banco APÓS aplicar:
//   docs/sql/2026-06-27_produtos_full_fields.sql

export type ProdutoFull = {
  id: string;
  codigo: number;
  descricao: string;
  estoque_atual: number;
  estoque_minimo: number;
  created_at: string;
  updated_at: string;
  // ---- campos adicionados pela migration manual ----
  nome: string | null;
  categoria: string | null;
  marca: string | null;
  unidade: string;
  custo_compra: number;
  preco_venda: number;
  fornecedor: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export type ProdutoInsert = Partial<Omit<ProdutoFull, "id" | "created_at" | "updated_at">> & {
  codigo: number;
  descricao: string;
};

export type ProdutoUpdate = Partial<Omit<ProdutoFull, "id" | "created_at" | "updated_at">>;