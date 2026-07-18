import { supabase } from "@/integrations/supabase/client";

export async function listarVendas() {
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .order("data", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function buscarVenda(id: string) {
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function excluirVenda(id: string) {
  const { error } = await supabase
    .from("vendas")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";

export async function listarProdutosParaVenda() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("descricao");

  if (error) {
    throw error;
  }

  return (data ?? []) as ProdutoFull[];
}

type RegistrarVendaInput = {
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  frete?: number;
  cliente?: string;
  observacoes?: string;
};

export async function registrarVenda(input: RegistrarVendaInput) {
  const { data, error } = await supabase.rpc("registrar_venda", {
    p_produto_id: input.produtoId,
    p_quantidade: input.quantidade,
    p_valor_unitario: input.valorUnitario,
    p_desconto: input.desconto ?? 0,
    p_frete: input.frete ?? 0,
    p_cliente: input.cliente,
    p_observacoes: input.observacoes,
  });

  if (error) {
    throw error;
  }

  return data as string;
}