import type { StatusDespesa } from "@/types/domain";

export const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Débito",
  "Crédito",
  "Boleto",
  "Transferência",
  "Outros",
] as const;

export type FormaPagamentoDespesa =
  (typeof FORMAS_PAGAMENTO)[number];

export type Despesa = {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data: string;
  forma_pagamento: FormaPagamentoDespesa | null;
  centro_custo: string | null;
  observacoes: string | null;
  status: StatusDespesa;
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
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Combustível",
  "Impostos",
  "Folha de pagamento",
  "Marketing",
  "Fornecedores",
  "Frete",
  "Taxas bancárias",
  "Outros",
] as const;