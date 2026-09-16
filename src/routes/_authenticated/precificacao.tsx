import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState, } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { brl, dateBR, num, pct } from "@/lib/format";
import { queryKeys } from "@/constants/queryKeys";
import { listarVendas } from "@/service/vendas.service";
import { useRealtime } from "@/hooks/useRealtime";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { agruparVendasPorProduto } from "@/lib/agregacao-produtos-vendas";
import {
  buscarProdutosRentabilidade,
  calcularRentabilidadeProdutos,
  filtrarVendasPorPeriodo,
  ORDENACOES_RENTABILIDADE,
  ordenarProdutosRentabilidade,
  PERIODOS_RENTABILIDADE,
  resolverPeriodoRentabilidade,
  type OrdenacaoRentabilidade,
  type PeriodoRentabilidade,
} from "@/lib/rentabilidade-produtos";

export const Route = createFileRoute(
  "/_authenticated/precificacao"
)({
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  useRealtime(["vendas"]);

  const { empresaId } = useEmpresa();
  const [periodo, setPeriodo] =
    useState<PeriodoRentabilidade>("todo");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] =
    useState<OrdenacaoRentabilidade>("faturamento");

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

  const intervalo = useMemo(
    () =>
      resolverPeriodoRentabilidade(
        periodo,
        dataInicial,
        dataFinal
      ),
    [periodo, dataInicial, dataFinal]
  );

  const vendasNoPeriodo = useMemo(
    () => filtrarVendasPorPeriodo(vendas, intervalo),
    [vendas, intervalo]
  );

  const grupos = useMemo(
    () => agruparVendasPorProduto(vendasNoPeriodo),
    [vendasNoPeriodo]
  );

  const metricas = useMemo(
    () => calcularRentabilidadeProdutos(grupos),
    [grupos]
  );

  const encontradas = useMemo(
    () => buscarProdutosRentabilidade(metricas, busca),
    [metricas, busca]
  );

  const linhas = useMemo(
    () => ordenarProdutosRentabilidade(encontradas, ordenacao),
    [encontradas, ordenacao]
  );

  const periodoAtivo = useMemo(() => {
    const label =
      PERIODOS_RENTABILIDADE.find(
        (opcao) => opcao.value === periodo
      )?.label ?? "Todo o período";

    if (periodo !== "personalizado") {
      return label;
    }

    if (intervalo.inicio && intervalo.fim) {
      return `${dateBR(intervalo.inicio)} até ${dateBR(intervalo.fim)}`;
    }

    if (intervalo.inicio) {
      return `A partir de ${dateBR(intervalo.inicio)}`;
    }

    if (intervalo.fim) {
      return `Até ${dateBR(intervalo.fim)}`;
    }

    return label;
  }, [periodo, intervalo]);

  return (
    <AppShell
      title="Precificação"
      subtitle="Custo, ROI e margem por produto"
    >
      <Section
        title="Filtros"
        className="mb-4"
      >
        <div className="flex flex-wrap gap-2">
          {PERIODOS_RENTABILIDADE.map((opcao) => (
            <Button
              key={opcao.value}
              type="button"
              size="sm"
              variant={
                periodo === opcao.value
                  ? "default"
                  : "outline"
              }
              aria-pressed={periodo === opcao.value}
              onClick={() => setPeriodo(opcao.value)}
            >
              {opcao.label}
            </Button>
          ))}
        </div>

        {periodo === "personalizado" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rentabilidade-data-inicial">
                Data inicial
              </Label>
              <Input
                id="rentabilidade-data-inicial"
                type="date"
                value={dataInicial}
                onChange={(event) =>
                  setDataInicial(event.target.value)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rentabilidade-data-final">
                Data final
              </Label>
              <Input
                id="rentabilidade-data-final"
                type="date"
                value={dataFinal}
                onChange={(event) =>
                  setDataFinal(event.target.value)
                }
                className="mt-1"
              />
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Buscar por produto ou código..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />

          <Select
            value={ordenacao}
            onValueChange={(value) =>
              setOrdenacao(value as OrdenacaoRentabilidade)
            }
          >
            <SelectTrigger aria-label="Ordenar produtos por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDENACOES_RENTABILIDADE.map((opcao) => (
                <SelectItem
                  key={opcao.value}
                  value={opcao.value}
                >
                  {opcao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Período ativo: {periodoAtivo} · {linhas.length}{" "}
          {linhas.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </div>
      </Section>

      <Section
        title="Análise por produto"
        description={`${linhas.length} itens com vendas`}
      >
        {linhas.length ===
          0 ? (
          <EmptyState title="Nenhum produto com vendas neste período ou busca" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Produto
                  </TableHead>

                  <TableHead className="text-right">
                    Quantidade
                  </TableHead>

                  <TableHead className="text-right">
                    Faturamento
                  </TableHead>

                  <TableHead className="text-right">
                    Preço médio
                  </TableHead>

                  <TableHead className="text-right">
                    Custo unit. conhecido
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
                    ROI com custo conhecido
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
                          r.rotulo
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        {num(
                          r.quantidade
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          r.faturamento
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          r.precoMedio
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {r.custoUnitarioConhecido ===
                          null
                          ? "—"
                          : brl(
                            r.custoUnitarioConhecido
                          )}

                        {r.vendasComCustoConhecido < r.vendas && (
                          <div className="mt-1 text-xs font-normal text-muted-foreground">
                            {r.vendasComCustoConhecido === 0
                              ? "Sem custo conhecido"
                              : `Custo conhecido em ${r.vendasComCustoConhecido} de ${r.vendas} vendas`}
                          </div>
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
                          (r.roiComCustoConhecido ===
                            null
                            ? "text-muted-foreground"
                            : r.roiComCustoConhecido <
                              0
                              ? "text-destructive"
                              : "text-success")
                        }
                      >
                        {r.roiComCustoConhecido ===
                          null
                          ? "—"
                          : pct(
                            r.roiComCustoConhecido
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
