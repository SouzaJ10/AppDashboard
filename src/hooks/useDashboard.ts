import { useQuery } from "@tanstack/react-query";

import {
  listarVendasDashboard,
  listarComprasDashboard,
  listarMovimentacoesDashboard,
  listarProdutosDashboard,
  listarDespesasDashboard,
} from "@/service/dashboard.service";

import { queryKeys } from "@/constants/queryKeys";

export function useDashboard() {
  const vendas = useQuery({
    queryKey: queryKeys.vendas.all,
    queryFn: listarVendasDashboard,
  });

  const compras = useQuery({
    queryKey: queryKeys.compras.all,
    queryFn: listarComprasDashboard,
  });

  const movimentacoes = useQuery({
    queryKey: queryKeys.movimentacoes.all,
    queryFn: listarMovimentacoesDashboard,
  });

  const produtos = useQuery({
    queryKey: queryKeys.produtos.all,
    queryFn: listarProdutosDashboard,
  });

  const despesas = useQuery({
    queryKey: queryKeys.despesas.all,
    queryFn: listarDespesasDashboard,
  });

  return {
    vendas: vendas.data ?? [],
    compras: compras.data ?? [],
    movimentacoes: movimentacoes.data ?? [],
    produtos: produtos.data ?? [],
    despesas: despesas.data ?? [],

    loading:
      vendas.isLoading ||
      compras.isLoading ||
      movimentacoes.isLoading ||
      produtos.isLoading ||
      despesas.isLoading,
  };
}