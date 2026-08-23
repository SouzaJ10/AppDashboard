import { useQuery } from "@tanstack/react-query";

import { listarProdutos } from "@/service/produto.service";
import { queryKeys } from "@/constants/queryKeys";
import { useEmpresa } from "@/contexts/EmpresaContext";

export function useProdutos() {
  const { empresaId } = useEmpresa();

  const query = useQuery({
    queryKey: queryKeys.produtos.listaEmpresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarProdutos(empresaId);
    },

    enabled: !!empresaId,
  });

  return {
    produtos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}