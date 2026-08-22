import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { listarVendas } from "@/service/vendas.service";
import { listarCompras } from "@/service/compras.service";
import { listarMovimentacoes } from "@/service/movimentacoes.service";
import { listarProdutos } from "@/service/produto.service";
import { listarDespesas } from "@/service/despesas.service";

export function useDashboard() {
  const vendas = useQuery({
    queryKey: queryKeys.vendas.all,
    queryFn: listarVendas,
  });

  const compras = useQuery({
    queryKey: queryKeys.compras.all,
    queryFn: listarCompras,
  });

  const movimentacoes = useQuery({
    queryKey: queryKeys.movimentacoes.all,
    queryFn: listarMovimentacoes,
  });

  const produtos = useQuery({
    queryKey: queryKeys.produtos.lista,
    queryFn: listarProdutos,
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