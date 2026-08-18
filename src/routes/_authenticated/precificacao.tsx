import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState } from "@/components/dashboard/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { brl, num, pct } from "@/lib/format";
import { queryKeys } from "@/constants/queryKeys";

export const Route = createFileRoute("/_authenticated/precificacao")({
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  const { data: vendas = [] } = useQuery({
    queryKey: queryKeys.precificacao.vendas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*");

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const linhas = useMemo(() => {
    const map = new Map<
      string,
      {
        descricao: string;
        qtd: number;
        faturamento: number;
        custo: number;
        despesas: number;
        lucro: number;
      }
    >();

    for (const v of vendas) {
      const key = v.descricao ?? "—";

      const cur = map.get(key) ?? {
        descricao: key,
        qtd: 0,
        faturamento: 0,
        custo: 0,
        despesas: 0,
        lucro: 0,
      };

      cur.qtd += Number(v.quantidade ?? 0);
      cur.faturamento += Number(v.preco_venda ?? 0);
      cur.custo += Number(v.custo ?? 0);
      cur.despesas += Number(v.despesas ?? 0);
      cur.lucro += Number(v.lucro ?? 0);

      map.set(key, cur);
    }

    return Array.from(map.values())
      .map((r) => {
        const precoMedio =
          r.qtd > 0
            ? r.faturamento / r.qtd
            : 0;

        const vendasProduto = vendas.filter(
          (v) => (v.descricao ?? "—") === r.descricao
        );

        const vendasComCusto = vendasProduto.filter(
          (v) => Number(v.custo ?? 0) > 0
        );

        const custoTotalConhecido = vendasComCusto.reduce(
          (s, v) => s + Number(v.custo ?? 0),
          0
        );

        const qtdComCusto = vendasComCusto.reduce(
          (s, v) => s + Number(v.quantidade ?? 0),
          0
        );

        const lucroComCusto = vendasComCusto.reduce(
          (s, v) => s + Number(v.lucro ?? 0),
          0
        );

        const temCustoConhecido =
          qtdComCusto > 0 &&
          custoTotalConhecido > 0;

        const custoUnit =
          temCustoConhecido
            ? custoTotalConhecido / qtdComCusto
            : null;

        const roi =
          temCustoConhecido
            ? lucroComCusto / custoTotalConhecido
            : null;

        const margem =
          r.faturamento > 0
            ? r.lucro / r.faturamento
            : 0;

        return {
          ...r,
          precoMedio,
          custoUnit,
          roi,
          margem,
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento);
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
        {linhas.length === 0 ? (
          <EmptyState title="Sem dados de vendas" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>

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
                {linhas.slice(0, 200).map((r) => (
                  <TableRow key={r.descricao}>
                    <TableCell className="max-w-xs truncate">
                      {r.descricao}
                    </TableCell>

                    <TableCell className="text-right">
                      {num(r.qtd)}
                    </TableCell>

                    <TableCell className="text-right">
                      {brl(r.precoMedio)}
                    </TableCell>

                    <TableCell className="text-right">
                      {r.custoUnit === null
                        ? "—"
                        : brl(r.custoUnit)}
                    </TableCell>

                    <TableCell className="text-right">
                      {brl(r.despesas)}
                    </TableCell>

                    <TableCell
                      className={
                        "text-right " +
                        (r.lucro < 0
                          ? "text-destructive"
                          : "text-success")
                      }
                    >
                      {brl(r.lucro)}
                    </TableCell>

                    <TableCell
                      className={
                        "text-right " +
                        (r.margem < 0
                          ? "text-destructive"
                          : "text-success")
                      }
                    >
                      {pct(r.margem)}
                    </TableCell>

                    <TableCell
                      className={
                        "text-right " +
                        (r.roi === null
                          ? "text-muted-foreground"
                          : r.roi < 0
                            ? "text-destructive"
                            : "text-success")
                      }
                    >
                      {r.roi === null
                        ? "—"
                        : pct(r.roi)}
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