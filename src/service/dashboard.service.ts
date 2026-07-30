import { supabase } from "@/integrations/supabase/client";
import type { Despesa } from "@/integrations/supabase/despesas-extra";

export async function listarVendasDashboard() {
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .order("data", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function listarComprasDashboard() {
  const { data, error } = await supabase
    .from("compras")
    .select("*");

  if (error) throw error;

  return data ?? [];
}

export async function listarMovimentacoesDashboard() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*");

  if (error) throw error;

  return data ?? [];
}

export async function listarProdutosDashboard() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*");

  if (error) throw error;

  return data ?? [];
}

export async function listarDespesasDashboard() {
  const { data, error } = await supabase
    .from("despesas" as never)
    .select("*");

  if (error) {
    const m = error.message.toLowerCase();

    if (
      m.includes("does not exist") ||
      m.includes("schema cache")
    ) {
      return [];
    }

    throw error;
  }

  return (data ?? []) as unknown as Despesa[];
}