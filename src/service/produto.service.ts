import { supabase } from "@/integrations/supabase/client";

import type { ProdutoFull, ProdutoInsert, ProdutoUpdate,} from "@/integrations/supabase/produtos-extra";

export async function listarProdutos() {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("descricao");
    if (error) throw error;
    return (data ?? []) as ProdutoFull[];
}

export async function buscarProduto(id: string) {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();
    if (error) throw error;
    return data as ProdutoFull;
}

export async function criarProduto(produto: ProdutoInsert) {
    const { error } = await supabase
        .from("produtos")
        .insert(produto);
    if (error) throw error;
}

export async function atualizarProduto(
    id: string,
    produto: ProdutoUpdate
) {
    const { error } = await supabase
        .from("produtos")
        .update(produto)
        .eq("id", id);
    if (error) throw error;
}

export async function excluirProduto(id: string) {
    const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

export async function salvarProduto(
    payload: Record<string, unknown>,
    id?: string
) {
    if (id) {
        const { error } = await supabase
            .from("produtos")
            .update(payload as never)
            .eq("id", id);
        if (error) throw error;
        return;
    }
    
    const { error } = await supabase
        .from("produtos")
        .insert(payload as never)
    if (error) throw error;
}