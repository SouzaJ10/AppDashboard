import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listarMovimentacoes } from "@/service/movimentacoes.service";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section } from "@/components/dashboard/KpiCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Line, ComposedChart,} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { useRealtime } from "@/hooks/useRealtime";
import { brl, dateBR, pct, todayISO } from "@/lib/format";
import { exportToXlsx } from "@/lib/export-xlsx";
import { Download, TrendingUp, TrendingDown, Wallet, Percent, DollarSign, Receipt, } from "lucide-react";
import { queryKeys } from "@/constants/queryKeys";
import { listarDespesas } from "@/service/despesas.service";
import { listarVendas } from "@/service/vendas.service";
import { useEmpresa } from "@/contexts/EmpresaContext";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  component: FluxoCaixaPage,
});

type Periodo = "diario" | "mensal" | "anual";

const monthLabel = (d: string) => {
  const dt = new Date(d + "T00:00:00");

  return dt.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
};

const dayLabel = (d: string) => dateBR(d);

const yearLabel = (d: string) =>
  String(
    new Date(
      d + "T00:00:00"
    ).getFullYear()
  );

const bucket = (
  d: string,
  p: Periodo
) =>
  p === "diario"
    ? d
    : p === "anual"
      ? yearLabel(d)
      : monthLabel(d);

function FluxoCaixaPage() {
  useRealtime([
    "vendas",
    "despesas",
    "movimentacoes",
  ]);

  const { empresaId } = useEmpresa();

  const [periodo, setPeriodo] =
    useState<Periodo>("mensal");

  const vendasQ = useQuery({
    queryKey:
      queryKeys.vendas.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarVendas(empresaId);
    },

    enabled: !!empresaId,
  });

  const despesasQ = useQuery({
    queryKey: queryKeys.despesas.all,
    queryFn: listarDespesas,
  });

  const movimentacoesQ = useQuery({
    queryKey: queryKeys.movimentacoes.all,
    queryFn: listarMovimentacoes,
  });

  const vendas =
    vendasQ.data ?? [];

  const despesas =
    despesasQ.data ?? [];

  const movimentacoes =
    movimentacoesQ.data ?? [];

  const k = useMemo(() => {
    const receitas =
      vendas.reduce(
        (s, v) =>
          s +
          Number(
            v.preco_venda ?? 0
          ),
        0
      );

    const custoVendas =
      vendas.reduce(
        (s, v) =>
          s +
          Number(v.custo ?? 0),
        0
      );

    const despesasVendas =
      vendas.reduce(
        (s, v) =>
          s +
          Number(
            v.despesas ?? 0
          ),
        0
      );

    const desp =
      despesas.reduce(
        (s, d) =>
          s +
          Number(d.valor ?? 0),
        0
      );

    const despPagas =
      despesas
        .filter(
          (d) =>
            d.status === "pago"
        )
        .reduce(
          (s, d) =>
            s +
            Number(
              d.valor ?? 0
            ),
          0
        );

    const entradasCaixa =
      movimentacoes.reduce(
        (s, m) =>
          s +
          Number(
            m.entrada ?? 0
          ),
        0
      );

    const saidasCaixa =
      movimentacoes.reduce(
        (s, m) =>
          s +
          Number(
            m.saida ?? 0
          ),
        0
      );

    const saldo =
      entradasCaixa -
      saidasCaixa;

    const lucroLiquido =
      receitas -
      custoVendas -
      despesasVendas -
      desp;

    const margem =
      receitas
        ? lucroLiquido /
        receitas
        : 0;

    const ticket =
      vendas.length
        ? receitas /
        vendas.length
        : 0;

    const ym =
      todayISO().slice(0, 7);

    const vendasMes =
      vendas.filter(
        (v) =>
          (
            v.data ?? ""
          ).startsWith(ym)
      );

    const recMes =
      vendasMes.reduce(
        (s, v) =>
          s +
          Number(
            v.preco_venda ?? 0
          ),
        0
      );

    const custoMes =
      vendasMes.reduce(
        (s, v) =>
          s +
          Number(
            v.custo ?? 0
          ),
        0
      );

    const despesasVendasMes =
      vendasMes.reduce(
        (s, v) =>
          s +
          Number(
            v.despesas ?? 0
          ),
        0
      );

    const despMes =
      despesas
        .filter(
          (d) =>
            (
              d.data ?? ""
            ).startsWith(ym)
        )
        .reduce(
          (s, d) =>
            s +
            Number(
              d.valor ?? 0
            ),
          0
        );

    const resultadoMes =
      recMes -
      custoMes -
      despesasVendasMes -
      despMes;

    return {
      receitas,
      custoVendas,
      desp,
      despPagas,
      lucroLiquido,
      margem,
      saldo,
      ticket,
      resultadoMes,
      entradasCaixa,
      saidasCaixa,
    };
  }, [
    vendas,
    despesas,
    movimentacoes,
  ]);

  // Série financeira real por período.
  // Entradas e saídas vêm exclusivamente de movimentacoes.
  const series = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        raw: string;
        entradas: number;
        saidas: number;
        saldo: number;
        resultado: number;
      }
    >();

    const touch = (
      raw: string
    ) => {
      const key =
        bucket(raw, periodo);

      let cur =
        map.get(key);

      if (!cur) {
        cur = {
          label: key,
          raw,
          entradas: 0,
          saidas: 0,
          saldo: 0,
          resultado: 0,
        };

        map.set(
          key,
          cur
        );
      }

      return cur;
    };

    for (
      const m
      of movimentacoes
    ) {
      if (!m.data) {
        continue;
      }

      const cur =
        touch(m.data);

      cur.entradas +=
        Number(
          m.entrada ?? 0
        );

      cur.saidas +=
        Number(
          m.saida ?? 0
        );
    }

    const arr =
      Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.raw.localeCompare(
            b.raw
          )
      );

    let saldoAcumulado = 0;

    for (const item of arr) {
      item.resultado =
        item.entradas -
        item.saidas;

      saldoAcumulado +=
        item.resultado;

      item.saldo =
        saldoAcumulado;
    }

    return arr;
  }, [
    movimentacoes,
    periodo,
  ]);

  const despesasPorCategoria =
    useMemo(() => {
      const m =
        new Map<
          string,
          number
        >();

      for (
        const d
        of despesas
      ) {
        const c =
          d.categoria ||
          "Outros";

        m.set(
          c,
          (m.get(c) ?? 0) +
          Number(d.valor)
        );
      }

      return Array.from(
        m,
        ([categoria, valor]) => ({
          categoria,
          valor,
        })
      ).sort(
        (a, b) =>
          b.valor -
          a.valor
      );
    }, [despesas]);

  const receitasVsCustos =
    useMemo(() => {
      const map = new Map<
        string,
        {
          label: string;
          raw: string;
          Receitas: number;
          Custos: number;
          Despesas: number;
        }
      >();

      const touch = (
        raw: string
      ) => {
        const key =
          bucket(
            raw,
            periodo
          );

        let cur =
          map.get(key);

        if (!cur) {
          cur = {
            label: key,
            raw,
            Receitas: 0,
            Custos: 0,
            Despesas: 0,
          };

          map.set(
            key,
            cur
          );
        }

        return cur;
      };

      // Resultado comercial das vendas
      for (
        const v
        of vendas
      ) {
        if (!v.data) {
          continue;
        }

        const cur =
          touch(v.data);

        cur.Receitas +=
          Number(
            v.preco_venda ?? 0
          );

        cur.Custos +=
          Number(
            v.custo ?? 0
          );

        // Frete/despesas diretamente vinculadas à venda
        cur.Despesas +=
          Number(
            v.despesas ?? 0
          );
      }

      // Despesas operacionais cadastradas
      for (
        const d
        of despesas
      ) {
        if (!d.data) {
          continue;
        }

        const cur =
          touch(d.data);

        cur.Despesas +=
          Number(
            d.valor ?? 0
          );
      }

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.raw.localeCompare(
            b.raw
          )
      );
    }, [
      vendas,
      despesas,
      periodo,
    ]);

  const onExport = () => {
    exportToXlsx(
      `fluxo_caixa_${new Date()
        .toISOString()
        .slice(0, 10)}`,
      {
        "Fluxo de caixa":
          series.map((s) => ({
            Periodo:
              s.label,
            Entradas:
              s.entradas,
            Saidas:
              s.saidas,
            Resultado:
              s.resultado,
            "Saldo acumulado":
              s.saldo,
          })),

        "Resultado economico":
          receitasVsCustos.map(
            (s) => ({
              Periodo:
                s.label,
              Receitas:
                s.Receitas,
              Custos:
                s.Custos,
              Despesas:
                s.Despesas,
              Resultado:
                s.Receitas -
                s.Custos -
                s.Despesas,
            })
          ),

        "Despesas por categoria":
          despesasPorCategoria.map(
            (c) => ({
              Categoria:
                c.categoria,
              Valor:
                c.valor,
            })
          ),

        Vendas:
          vendas.map(
            (v) => ({
              Data:
                v.data,
              Codigo:
                v.codigo,
              Descricao:
                v.descricao,
              Quantidade:
                v.quantidade,
              Valor:
                v.preco_venda,
              Custo:
                v.custo,
              Despesas:
                v.despesas,
              Lucro:
                v.lucro,
              Margem:
                v.margem,
            })
          ),

        Despesas:
          despesas.map(
            (d) => ({
              Data:
                d.data,
              Descricao:
                d.descricao,
              Categoria:
                d.categoria,
              Valor:
                d.valor,
              Status:
                d.status,
              Pagamento:
                d.forma_pagamento,
            })
          ),

        Movimentacoes:
          movimentacoes.map(
            (m) => ({
              Data:
                m.data,
              Tipo:
                m.tipo,
              Categoria:
                m.categoria,
              Descricao:
                m.descricao,
              Entrada:
                m.entrada,
              Saida:
                m.saida,
              Referencia:
                m.referencia_id,
            })
          ),
      }
    );
  };

  return (
    <AppShell
      title="Fluxo de Caixa"
      subtitle="Receitas, despesas, saldo e resultado operacional"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="mr-1 h-4 w-4" />
          Exportar
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Receita total"
          value={brl(k.receitas)}
          icon={TrendingUp}
          tone="success"
        />

        <KpiCard
          label="Despesas totais"
          value={brl(k.desp)}
          icon={TrendingDown}
          tone="destructive"
        />

        <KpiCard
          label="Lucro líquido"
          value={brl(
            k.lucroLiquido
          )}
          icon={DollarSign}
          tone={
            k.lucroLiquido >= 0
              ? "success"
              : "destructive"
          }
          hint={`Margem ${pct(
            k.margem
          )}`}
        />

        <KpiCard
          label="Saldo atual"
          value={brl(k.saldo)}
          icon={Wallet}
          tone={
            k.saldo >= 0
              ? "success"
              : "destructive"
          }
          hint="Entradas − saídas realizadas"
        />

        <KpiCard
          label="Ticket médio"
          value={brl(k.ticket)}
          icon={Receipt}
          tone="default"
        />

        <KpiCard
          label="Resultado do mês"
          value={brl(
            k.resultadoMes
          )}
          icon={Percent}
          tone={
            k.resultadoMes >= 0
              ? "success"
              : "destructive"
          }
        />

        <KpiCard
          label="Custo das vendas"
          value={brl(
            k.custoVendas
          )}
          icon={TrendingDown}
          tone="default"
        />

        <KpiCard
          label="Despesas pagas"
          value={brl(
            k.despPagas
          )}
          icon={Wallet}
          tone="default"
        />
      </div>

      <Section
        className="mt-6"
        title="Entradas × Saídas"
        actions={
          <Tabs
            value={periodo}
            onValueChange={(v) =>
              setPeriodo(
                v as Periodo
              )
            }
          >
            <TabsList>
              <TabsTrigger value="diario">
                Diário
              </TabsTrigger>

              <TabsTrigger value="mensal">
                Mensal
              </TabsTrigger>

              <TabsTrigger value="anual">
                Anual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <div className="h-80">
          <ResponsiveContainer>
            <ComposedChart
              data={series}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />

              <XAxis
                dataKey="label"
                fontSize={11}
              />

              <YAxis
                tickFormatter={(v) =>
                  `R$${Math.round(
                    v / 1000
                  )}k`
                }
                fontSize={11}
              />

              <Tooltip
                formatter={(
                  v: number
                ) => brl(v)}
              />

              <Legend />

              <Bar
                dataKey="entradas"
                name="Entradas"
                fill="var(--color-chart-2)"
                radius={[
                  4,
                  4,
                  0,
                  0,
                ]}
              />

              <Bar
                dataKey="saidas"
                name="Saídas"
                fill="var(--color-chart-5)"
                radius={[
                  4,
                  4,
                  0,
                  0,
                ]}
              />

              <Line
                type="monotone"
                dataKey="resultado"
                name="Resultado operacional"
                stroke="var(--color-chart-3)"
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Evolução do saldo acumulado">
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart
                data={series}
              >
                <defs>
                  <linearGradient
                    id="gSaldo"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--color-chart-3)"
                      stopOpacity={
                        0.35
                      }
                    />

                    <stop
                      offset="100%"
                      stopColor="var(--color-chart-3)"
                      stopOpacity={
                        0
                      }
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />

                <XAxis
                  dataKey="label"
                  fontSize={11}
                />

                <YAxis
                  tickFormatter={(v) =>
                    `R$${Math.round(
                      v / 1000
                    )}k`
                  }
                  fontSize={11}
                />

                <Tooltip
                  formatter={(
                    v: number
                  ) => brl(v)}
                />

                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo acumulado"
                  stroke="var(--color-chart-3)"
                  fill="url(#gSaldo)"
                  strokeWidth={
                    2.5
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Despesas por categoria">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={
                  despesasPorCategoria
                }
                layout="vertical"
                margin={{
                  left: 20,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />

                <XAxis
                  type="number"
                  tickFormatter={(v) =>
                    `R$${Math.round(
                      v
                    )}`
                  }
                  fontSize={11}
                />

                <YAxis
                  type="category"
                  dataKey="categoria"
                  width={140}
                  fontSize={10}
                />

                <Tooltip
                  formatter={(
                    v: number
                  ) => brl(v)}
                />

                <Bar
                  dataKey="valor"
                  name="Despesa"
                  fill="var(--color-chart-5)"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section
        className="mt-6"
        title="Receitas × Custos × Despesas"
      >
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart
              data={
                receitasVsCustos
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />

              <XAxis
                dataKey="label"
                fontSize={11}
              />

              <YAxis
                tickFormatter={(v) =>
                  `R$${Math.round(
                    v / 1000
                  )}k`
                }
                fontSize={11}
              />

              <Tooltip
                formatter={(
                  v: number
                ) => brl(v)}
              />

              <Legend />

              <Bar
                dataKey="Receitas"
                fill="var(--color-chart-2)"
                radius={[4,4,0,0,]}
              />

              <Bar
                dataKey="Custos"
                fill="var(--color-chart-4)"
                radius={[ 4, 4, 0, 0,
                ]}
              />

              <Bar
                dataKey="Despesas"
                fill="var(--color-chart-5)"
                radius={[ 4, 4, 0, 0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section
        className="mt-6"
        title="Resumo por período"
      >
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Período
                </TableHead>

                <TableHead className="text-right">
                  Entradas
                </TableHead>

                <TableHead className="text-right">
                  Saídas
                </TableHead>

                <TableHead className="text-right">
                  Resultado
                </TableHead>

                <TableHead className="text-right">
                  Saldo acumulado
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {series.map(
                (s) => (
                  <TableRow
                    key={
                      s.label
                    }
                  >
                    <TableCell>
                      {periodo ===
                        "diario"
                        ? dayLabel(
                          s.raw
                        )
                        : s.label}
                    </TableCell>

                    <TableCell className="text-right text-success">
                      {brl(
                        s.entradas
                      )}
                    </TableCell>

                    <TableCell className="text-right text-destructive">
                      {brl(
                        s.saidas
                      )}
                    </TableCell>

                    <TableCell
                      className={`text-right font-medium ${s.resultado >=
                        0
                        ? "text-success"
                        : "text-destructive"
                        }`}
                    >
                      {brl(
                        s.resultado
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {brl(
                        s.saldo
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Section>
    </AppShell>
  );
}