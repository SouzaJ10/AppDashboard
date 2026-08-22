import { supabase } from "@/integrations/supabase/client";

export async function listarMovimentacoes() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*")
    .order("data");

  if (error) throw error;

  return data ?? [];
}