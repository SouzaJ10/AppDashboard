import { supabase } from "@/integrations/supabase/client";

export async function listarMovimentacoes(
  empresaId: string
) {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("data");

  if (error) {
    throw error;
  }

  return data ?? [];
}