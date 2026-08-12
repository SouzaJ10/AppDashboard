import { supabase } from "@/integrations/supabase/client";

export async function listarCompras() {
    const { data, error } = await supabase
        .from("compras")
        .select("*")
        .order("data", { ascending: false });

    if (error) throw error;

    return data ?? [];
}

export async function buscarCompra(id: string) {
    const { data, error } = await supabase
        .from("compras")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    return data;
}

export async function excluirCompra(id: string) {
    const { error } = await supabase.rpc("excluir_compra", {
        p_compra_id: id,
    });
    if (error) {
        throw error;
    }
}

export async function listarProdutosParaCompra() {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("descricao");

    if (error) throw error;

    return data ?? [];
}

type RegistrarCompraInput = {
    produtoId: string;
    quantidade: number;
    custoUnitario: number;
    data?: string;
    fornecedor?: string;

};

export async function registrarCompra(input: RegistrarCompraInput) {
    const { data, error } = await supabase.rpc("registrar_compra", {
        p_produto_id: input.produtoId,
        p_quantidade: input.quantidade,
        p_custo_unitario: input.custoUnitario,
        p_fornecedor: input.fornecedor ?? null,
        p_data: input.data ?? new Date().toISOString().slice(0, 10),
    });

    if (error) {
        throw error;
    }

    return data as string;
}

async function buscarProdutoParaCompra(id: string) {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    return data;
}