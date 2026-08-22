import { supabase } from "@/integrations/supabase/client";

import type { ProdutoFull, ProdutoInsert, ProdutoUpdate, } from "@/integrations/supabase/produtos-extra";

export async function listarProdutos() {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("descricao");
    if (error) throw error;
    return (data ?? []) as ProdutoFull[];
}

export async function excluirProduto(id: string) {
    const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

export async function salvarProduto(
    payload: ProdutoInsert | ProdutoUpdate,
    id?: string
) {
    if (id) {
        const { error } = await supabase
            .from("produtos")
            .update(payload)
            .eq("id", id);

        if (error) throw error;

        return;
    }

    const { error } = await supabase
        .from("produtos")
        .insert(payload as ProdutoInsert);

    if (error) throw error;
}