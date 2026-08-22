import { supabase } from "@/integrations/supabase/client";
import type { Despesa } from "@/integrations/supabase/despesas-extra";

export async function listarVendasDashboard() {
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .order("data", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function listarComprasDashboard() {
  const { data, error } = await supabase
    .from("compras")
    .select("*")
    .order("data", { ascending: false });

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