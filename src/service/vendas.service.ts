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