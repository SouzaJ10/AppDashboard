import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState, } from "@/components/dashboard/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { brl, num, pct } from "@/lib/format";
import { queryKeys } from "@/constants/queryKeys";
import { listarVendas } from "@/service/vendas.service";
import { useRealtime } from "@/hooks/useRealtime";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { agruparVendasPorProduto } from "@/lib/agregacao-produtos-vendas";

export const Route = createFileRoute(
  "/_authenticated/precificacao"
)({
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  useRealtime(["vendas"]);

  const { empresaId } = useEmpresa();

  const { data: vendas = [] } = useQuery({
    queryKey: queryKeys.vendas.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarVendas(empresaId);
    },

    enabled: !!empresaId,
  });

  const linhas = useMemo(() => {
    return agruparVendasPorProduto(vendas)
      .map((grupo) => {
        const vendasProduto = grupo.vendas;

        const qtd = vendasProduto.reduce(
          (s, v) =>
            s + Number(v.quantidade ?? 0),
          0
        );

        const faturamento = vendasProduto.reduce(
          (s, v) =>
            s + Number(v.preco_venda ?? 0),
          0
        );

        const custo = vendasProduto.reduce(
          (s, v) =>
            s + Number(v.custo ?? 0),
          0
        );

        const despesas = vendasProduto.reduce(
          (s, v) =>
            s + Number(v.despesas ?? 0),
          0
        );

        const lucro = vendasProduto.reduce(
          (s, v) =>
            s + Number(v.lucro ?? 0),
          0
        );

        const precoMedio =
          qtd > 0
            ? faturamento / qtd
            : 0;

        const vendasComCusto =
          vendasProduto.filter(
            (v) =>
              Number(
                v.custo ?? 0
              ) > 0
          );

        const custoTotalConhecido =
          vendasComCusto.reduce(
            (s, v) =>
              s +
              Number(
                v.custo ?? 0
              ),
            0
          );

        const qtdComCusto =
          vendasComCusto.reduce(
            (s, v) =>
              s +
              Number(
                v.quantidade ?? 0
              ),
            0
          );

        const lucroComCusto =
          vendasComCusto.reduce(
            (s, v) =>
              s +
              Number(
                v.lucro ?? 0
              ),
            0
          );

        const temCustoConhecido =
          qtdComCusto > 0 &&
          custoTotalConhecido > 0;

        const custoUnit =
          temCustoConhecido
            ? custoTotalConhecido /
            qtdComCusto
            : null;

        const roi =
          temCustoConhecido
            ? lucroComCusto /
            custoTotalConhecido
            : null;

        const margem =
          faturamento > 0
            ? lucro / faturamento
            : 0;

        return {
          chave: grupo.chave,
          descricao: grupo.rotulo,
          qtd,
          faturamento,
          custo,
          despesas,
          lucro,
          precoMedio,
          custoUnit,
          roi,
          margem,
        };
      })
      .sort(
        (a, b) =>
          b.faturamento -
          a.faturamento
      );
  }, [vendas]);

  return (
    <AppShell
      title="Precificação"
      subtitle="Custo, ROI e margem por produto"
    >
      <Section
        title="Análise por produto"
        description={`${linhas.length} itens com vendas`}
      >
        {linhas.length ===
          0 ? (
          <EmptyState title="Sem dados de vendas" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Produto
                  </TableHead>

                  <TableHead className="text-right">
                    Qtd
                  </TableHead>

                  <TableHead className="text-right">
                    Preço médio
                  </TableHead>

                  <TableHead className="text-right">
                    Custo unit.
                  </TableHead>

                  <TableHead className="text-right">
                    Despesas
                  </TableHead>

                  <TableHead className="text-right">
                    Lucro
                  </TableHead>

                  <TableHead className="text-right">
                    Margem
                  </TableHead>

                  <TableHead className="text-right">
                    ROI
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {linhas
                  .slice(0, 200)
                  .map((r) => (
                    <TableRow
                      key={r.chave}
                    >
                      <TableCell className="max-w-xs truncate">
                        {
                          r.descricao
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        {num(
                          r.qtd
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          r.precoMedio
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {r.custoUnit ===
                          null
                          ? "—"
                          : brl(
                            r.custoUnit
                          )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          r.despesas
                        )}
                      </TableCell>

                      <TableCell
                        className={
                          "text-right " +
                          (r.lucro <
                            0
                            ? "text-destructive"
                            : "text-success")
                        }
                      >
                        {brl(
                          r.lucro
                        )}
                      </TableCell>

                      <TableCell
                        className={
                          "text-right " +
                          (r.margem <
                            0
                            ? "text-destructive"
                            : "text-success")
                        }
                      >
                        {pct(
                          r.margem
                        )}
                      </TableCell>

                      <TableCell
                        className={
                          "text-right " +
                          (r.roi ===
                            null
                            ? "text-muted-foreground"
                            : r.roi <
                              0
                              ? "text-destructive"
                              : "text-success")
                        }
                      >
                        {r.roi ===
                          null
                          ? "—"
                          : pct(
                            r.roi
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </AppShell>
  );
}
