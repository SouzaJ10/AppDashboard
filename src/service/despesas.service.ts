import { supabase } from "@/integrations/supabase/client";
import type { Despesa, FormaPagamentoDespesa, } from "@/integrations/supabase/despesas-extra";
import type { StatusDespesa } from "@/types/domain";

export async function listarDespesas(
    empresaId: string
) {
    const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("data", { ascending: false });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export type SalvarDespesaInput = {
    descricao: string;
    valor: number;
    data: string;
    categoria: string | null;
    formaPagamento: FormaPagamentoDespesa | null;
    centroCusto: string | null;
    observacoes: string | null;
    status: StatusDespesa;
};

export async function excluirDespesa(id: string) {
    const { error } = await supabase.rpc(
        "excluir_despesa",
        {
            p_despesa_id: id,
        }
    );

    if (error) {
        throw error;
    }
}

export async function pagarDespesa(
    despesa: Despesa,
    data: string
) {
    const { error } = await supabase.rpc(
        "atualizar_despesa",
        {
            p_despesa_id: despesa.id,
            p_descricao: despesa.descricao,
            p_valor: Number(despesa.valor),
            p_data: data,
            p_categoria: despesa.categoria ?? undefined,
            p_forma_pagamento: despesa.forma_pagamento ?? undefined,
            p_centro_custo: despesa.centro_custo ?? undefined,
            p_observacoes: despesa.observacoes ?? undefined,
            p_status: "pago",
        }
    );

    if (error) {
        throw error;
    }
}

export async function listarCategoriasDespesa(
    empresaId: string
) {
    const { data, error } = await supabase
        .from("categorias_despesa")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome");

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function criarCategoriaDespesa(
    nome: string,
    empresaId: string
) {
    const { error } = await supabase
        .from("categorias_despesa")
        .insert({
            nome,
            empresa_id: empresaId,
        });

    if (!error) {
        return;
    }

    const mensagem =
        error.message.toLowerCase();

    const categoriaDuplicada =
        mensagem.includes("duplicate") ||
        mensagem.includes("unique");

    if (!categoriaDuplicada) {
        throw error;
    }
}

export async function registrarDespesa(
    input: SalvarDespesaInput,
    empresaId: string
) {
    const { error } = await supabase.rpc(
        "registrar_despesa",
        {
            p_empresa_id: empresaId,
            p_descricao: input.descricao,
            p_valor: input.valor,
            p_data: input.data,
            p_categoria:
                input.categoria ?? undefined,
            p_forma_pagamento:
                input.formaPagamento ?? undefined,
            p_centro_custo:
                input.centroCusto ?? undefined,
            p_observacoes:
                input.observacoes ?? undefined,
            p_status: input.status,
        }
    );

    if (error) {
        throw error;
    }
}

export async function atualizarDespesa(
    id: string,
    input: SalvarDespesaInput
) {
    const { error } = await supabase.rpc(
        "atualizar_despesa",
        {
            p_despesa_id: id,
            p_descricao: input.descricao,
            p_valor: input.valor,
            p_data: input.data,
            p_categoria: input.categoria ?? undefined,
            p_forma_pagamento: input.formaPagamento ?? undefined,
            p_centro_custo: input.centroCusto ?? undefined,
            p_observacoes: input.observacoes ?? undefined,
            p_status: input.status,
        }
    );

    if (error) {
        throw error;
    }
}