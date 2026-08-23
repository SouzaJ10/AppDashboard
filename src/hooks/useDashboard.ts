import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { listarVendas } from "@/service/vendas.service";
import { listarCompras } from "@/service/compras.service";
import { listarMovimentacoes } from "@/service/movimentacoes.service";
import { listarProdutos } from "@/service/produto.service";
import { listarDespesas } from "@/service/despesas.service";
import { useEmpresa } from "@/contexts/EmpresaContext";
import type { Despesa } from "@/integrations/supabase/despesas-extra";

export function useDashboard() {
  const { empresaId } = useEmpresa();

  const vendas = useQuery({
    queryKey: queryKeys.vendas.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarVendas(empresaId);
    },

    enabled: !!empresaId,
  });

  const compras = useQuery({
    queryKey: queryKeys.compras.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarCompras(empresaId);
    },

    enabled: !!empresaId,
  });

  const movimentacoes = useQuery({
    queryKey: queryKeys.movimentacoes.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarMovimentacoes(empresaId);
    },

    enabled: !!empresaId,
  });

  const produtos = useQuery({
    queryKey: queryKeys.produtos.listaEmpresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarProdutos(empresaId);
    },

    enabled: !!empresaId,
  });

  const despesasQ = useQuery({
    queryKey: queryKeys.despesas.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarDespesas(empresaId);
    },

    enabled: !!empresaId,
  });

  return {
    vendas: vendas.data ?? [],
    compras: compras.data ?? [],
    movimentacoes: movimentacoes.data ?? [],
    produtos: produtos.data ?? [],
    despesas: (despesasQ.data ?? []) as Despesa[],

    loading:
      vendas.isLoading ||
      compras.isLoading ||
      movimentacoes.isLoading ||
      produtos.isLoading ||
      despesasQ.isLoading,
  };
}