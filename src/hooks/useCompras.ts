import { useQuery } from "@tanstack/react-query";
import { listarCompras } from "@/service/compras.service";
import { queryKeys } from "@/constants/queryKeys";

export function useCompras() {
  const query = useQuery({
    queryKey: queryKeys.compras.all,
    queryFn: listarCompras,
  });

  return {
    compras: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}