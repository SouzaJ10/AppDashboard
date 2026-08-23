import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";

type AppRole =
    Database["public"]["Enums"]["app_role"];

export type EmpresaMembership = {
    empresaId: string;
    nome: string;
    role: AppRole;
};

export async function listarEmpresasDoUsuario(
    userId: string
): Promise<EmpresaMembership[]> {
    const { data, error } = await supabase
        .from("empresa_usuarios")
        .select(`
      empresa_id,
      role,
      empresas!inner (
        id,
        nome
      )
    `)
        .eq("user_id", userId);

    if (error) {
        throw error;
    }

    return (data ?? []).map((item) => ({
        empresaId: item.empresa_id,
        nome: item.empresas.nome,
        role: item.role,
    }));
}