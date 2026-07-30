import { useQuery } from "@tanstack/react-query";

import { listarGiroProdutos } from "@/service/vendas.service";
import { queryKeys } from "@/constants/queryKeys";

export function useGiroProdutos() {
  const query = useQuery({
    queryKey: queryKeys.produtos.giro,
    queryFn: listarGiroProdutos,
  });

  return {
    vendas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}