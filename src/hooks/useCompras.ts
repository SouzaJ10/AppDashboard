import { useQuery } from "@tanstack/react-query";
import { listarCompras } from "@/service/compras.service";
import { queryKeys } from "@/constants/queryKeys";
import { useEmpresa } from "@/contexts/EmpresaContext";

export function useCompras() {
  const { empresaId } = useEmpresa();

  const query = useQuery({
    queryKey: queryKeys.compras.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarCompras(empresaId);
    },

    enabled: !!empresaId,
  });

  return {
    compras: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}