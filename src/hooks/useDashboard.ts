import { useQuery } from "@tanstack/react-query";
import { listarVendasDashboard, listarComprasDashboard, listarMovimentacoesDashboard, listarProdutosDashboard, } from "@/service/dashboard.service";
import { queryKeys } from "@/constants/queryKeys";
import { listarDespesas } from "@/service/despesas.service";

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

  const despesasQ = useQuery({
    queryKey: queryKeys.despesas.all,
    queryFn: listarDespesas,
  });

  return {
    vendas: vendas.data ?? [],
    compras: compras.data ?? [],
    movimentacoes: movimentacoes.data ?? [],
    produtos: produtos.data ?? [],
    despesas: despesasQ.data ?? [],

    loading:
      vendas.isLoading ||
      compras.isLoading ||
      movimentacoes.isLoading ||
      produtos.isLoading ||
      despesasQ.isLoading,
  };
}