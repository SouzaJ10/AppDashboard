// Tipos para o módulo de despesas. As tabelas reais existem no banco APÓS
// aplicar: docs/sql/2026-06-28_despesas_module.sql

export type Despesa = {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data: string; // YYYY-MM-DD
  forma_pagamento: string | null;
  centro_custo: string | null;
  observacoes: string | null;
  status: "pago" | "pendente";
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoriaDespesa = {
  id: string;
  nome: string;
  cor: string | null;
  padrao: boolean;
  created_at: string;
};

export const CATEGORIAS_PADRAO = [
  "Aluguel", "Energia", "Água", "Internet", "Combustível", "Impostos",
  "Folha de pagamento", "Marketing", "Fornecedores", "Frete",
  "Taxas bancárias", "Outros",
] as const;

export const FORMAS_PAGAMENTO = [
  "Dinheiro", "PIX", "Débito", "Crédito", "Boleto", "Transferência", "Outros",
] as const;