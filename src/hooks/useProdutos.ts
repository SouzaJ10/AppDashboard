import { useQuery } from "@tanstack/react-query";

import { listarProdutos } from "@/service/produto.service";
import { queryKeys } from "@/constants/queryKeys";

export function useProdutos() {
  const query = useQuery({
    queryKey: queryKeys.produtos.lista,
    queryFn: listarProdutos,
  });

  return {
    produtos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}