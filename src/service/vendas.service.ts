import { supabase } from "@/integrations/supabase/client";

export async function listarVendas(empresaId: string) {
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("data", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
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

export async function registrarVenda(
  input: RegistrarVendaInput,
  empresaId: string
) {
  const { data, error } = await supabase.rpc(
    "registrar_venda",
    {
      p_empresa_id: empresaId,
      p_produto_id: input.produtoId,
      p_quantidade: input.quantidade,
      p_valor_unitario: input.valorUnitario,
      p_desconto: input.desconto ?? 0,
      p_frete: input.frete ?? 0,
      p_cliente: input.cliente,
      p_observacoes: input.observacoes,
    }
  );

  if (error) {
    throw error;
  }

  return data as string;
}

export async function listarGiroProdutos(
  empresaId: string
) {
  const { data, error } = await supabase
    .from("vendas")
    .select("descricao, quantidade")
    .eq("empresa_id", empresaId);

  if (error) {
    throw error;
  }

  return data ?? [];
}