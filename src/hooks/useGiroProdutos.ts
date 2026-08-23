import { useQuery } from "@tanstack/react-query";

import { listarGiroProdutos } from "@/service/vendas.service";
import { queryKeys } from "@/constants/queryKeys";
import { useEmpresa } from "@/contexts/EmpresaContext";

export function useGiroProdutos() {
  const { empresaId } = useEmpresa();

  const query = useQuery({
    queryKey: queryKeys.produtos.giroEmpresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarGiroProdutos(empresaId);
    },

    enabled: !!empresaId,
  });

  return {
    vendas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}