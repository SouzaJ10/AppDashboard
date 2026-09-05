export type ProdutoFull = {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  estoque_atual: number;
  estoque_minimo: number;
  created_at: string;
  updated_at: string;

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

export type ProdutoInsert =
  Partial<
    Omit<
      ProdutoFull,
      | "id"
      | "empresa_id"
      | "created_at"
      | "updated_at"
    >
  > & {
    codigo: string;
    descricao: string;
  };

export type ProdutoUpdate =
  Partial<
    Omit<
      ProdutoFull,
      | "id"
      | "empresa_id"
      | "created_at"
      | "updated_at"
    >
  >;