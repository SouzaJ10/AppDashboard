import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { listarVendas } from "@/service/vendas.service";
import { AppShell } from "@/components/layout/AppShell";
import {
  KpiCard,
  Section,
  EmptyState,
} from "@/components/dashboard/KpiCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brl, num, pct, dateBR, todayISO } from "@/lib/format";
import { exportToXlsx } from "@/lib/export-xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { NovaVendaDialog } from "@/components/vendas/NovaVendaDialog";
import { useRealtime } from "@/hooks/useRealtime";
import { queryKeys } from "@/constants/queryKeys";
import { useEmpresa } from "@/contexts/EmpresaContext";
import {
  filtrarVendas,
  listarOpcoesClientes,
  SEM_CLIENTE,
  TODOS_CLIENTES,
  type ClienteFiltro,
} from "@/lib/vendas-filtros";
import { agruparVendasPorProduto } from "@/lib/agregacao-produtos-vendas";
import {
  calcularMetricasComerciais,
  compararMetricasComerciais,
  PERIODOS_COMERCIAIS,
  resolverPeriodosComparacaoComercial,
  type ComparacaoValor,
  type IntervaloComercial,
  type PeriodoComercial,
  type TendenciaComparacao,
} from "@/lib/comparacao-comercial";

export const Route = createFileRoute("/_authenticated/vendas")({
  component: VendasPage,
});

function formatarComSinal(
  valor: number,
  formatar: (numero: number) => string
) {
  return valor > 0 ? `+${formatar(valor)}` : formatar(valor);
}

function textoVariacao(comparacao: ComparacaoValor) {
  if (comparacao.situacao === "sem_alteracao") {
    return "Sem alteração";
  }

  if (comparacao.situacao === "sem_base_anterior") {
    return "Sem base anterior";
  }

  if (
    comparacao.situacao === "base_negativa" ||
    comparacao.situacao === "cruzamento_sinal"
  ) {
    return "Sem percentual comparável";
  }

  return formatarComSinal(comparacao.variacao ?? 0, pct);
}

function ComparativoCard({
  label,
  value,
  previous,
  difference,
  variation,
  available,
  trend = "estavel",
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  previous?: ReactNode;
  difference?: ReactNode;
  variation?: ReactNode;
  available: boolean;
  trend?: TendenciaComparacao;
  icon: LucideIcon;
  tone?: "default" | "success" | "destructive" | "warning";
}) {
  const TrendIcon =
    trend === "melhora"
      ? ArrowUpRight
      : trend === "piora"
        ? ArrowDownRight
        : Minus;
  const trendClass =
    trend === "melhora"
      ? "text-success"
      : trend === "piora"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <KpiCard
      label={label}
      value={value}
      icon={icon}
      tone={tone}
    >
      {!available ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Comparação indisponível
        </div>
      ) : (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div>Anterior: {previous}</div>
          <div className={`flex flex-wrap items-center gap-1 ${trendClass}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>Diferença: {difference}</span>
            {variation && <span>· {variation}</span>}
          </div>
        </div>
      )}
    </KpiCard>
  );
}

function textoIntervalo(
  intervalo: IntervaloComercial,
  vazio: string
) {
  if (intervalo.inicio && intervalo.fim) {
    return `${dateBR(intervalo.inicio)} – ${dateBR(intervalo.fim)}`;
  }
  if (intervalo.inicio) {
    return `A partir de ${dateBR(intervalo.inicio)}`;
  }
  if (intervalo.fim) {
    return `Até ${dateBR(intervalo.fim)}`;
  }
  return vazio;
}

function VendasPage() {
  useRealtime([
    "vendas",
    "produtos",
    "movimentacoes",
  ]);

  const { empresaId } = useEmpresa();

  const [q, setQ] = useState("");
  const [periodo, setPeriodo] =
    useState<PeriodoComercial>("todo");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clienteFiltro, setClienteFiltro] =
    useState<ClienteFiltro>(TODOS_CLIENTES);

  const {
    data: vendas = [],
    isLoading,
  } = useQuery({
    queryKey: queryKeys.vendas.empresa(empresaId),

    queryFn: async () => {
      if (!empresaId) {
        return [];
      }

      return listarVendas(empresaId);
    },

    enabled: !!empresaId,
  });

  const clientes = useMemo(
    () => listarOpcoesClientes(vendas),
    [vendas]
  );

  const periodos = useMemo(
    () =>
      resolverPeriodosComparacaoComercial(
        periodo,
        from,
        to
      ),
    [periodo, from, to]
  );

  const filtered = useMemo(
    () =>
      filtrarVendas(vendas, {
        busca: q,
        cliente: clienteFiltro,
        dataInicial: periodos.atual.inicio,
        dataFinal: periodos.atual.fim,
      }),
    [vendas, q, clienteFiltro, periodos.atual]
  );

  const vendasAnteriores = useMemo(
    () =>
      periodos.anterior
        ? filtrarVendas(vendas, {
            busca: q,
            cliente: clienteFiltro,
            dataInicial: periodos.anterior.inicio,
            dataFinal: periodos.anterior.fim,
          })
        : [],
    [vendas, q, clienteFiltro, periodos.anterior]
  );

  const vendasVisiveis = filtered.slice(0, 200);

  const k = useMemo(
    () => calcularMetricasComerciais(filtered),
    [filtered]
  );

  const kAnterior = useMemo(
    () => calcularMetricasComerciais(vendasAnteriores),
    [vendasAnteriores]
  );

  const comparacao = useMemo(
    () =>
      periodos.anterior
        ? compararMetricasComerciais(k, kAnterior)
        : null,
    [k, kAnterior, periodos.anterior]
  );

  const intervaloAtual = textoIntervalo(
    periodos.atual,
    periodo === "todo" ? "Todo o período" : "Sem limites definidos"
  );
  const intervaloAnterior = periodos.anterior
    ? textoIntervalo(periodos.anterior, "")
    : "Comparação indisponível";

  const ranking = useMemo(() => {
    return agruparVendasPorProduto(filtered).map(
      (grupo) => ({
        chave: grupo.chave,
        descricao: grupo.rotulo,
        qtd: grupo.vendas.reduce(
          (s, v) =>
            s + Number(v.quantidade ?? 0),
          0
        ),
        faturamento: grupo.vendas.reduce(
          (s, v) =>
            s + Number(v.preco_venda ?? 0),
          0
        ),
        lucro: grupo.vendas.reduce(
          (s, v) =>
            s + Number(v.lucro ?? 0),
          0
        ),
      })
    );
  }, [filtered]);

  const topVendidos = [
    ...ranking,
  ]
    .sort(
      (a, b) =>
        b.qtd - a.qtd
    )
    .slice(0, 8);

  const topLucrativos = [
    ...ranking,
  ]
    .sort(
      (a, b) =>
        b.lucro - a.lucro
    )
    .slice(0, 8);

  const menosRentaveis = [
    ...ranking,
  ]
    .sort(
      (a, b) =>
        a.lucro - b.lucro
    )
    .slice(0, 5);

  const onExport = () => {
    if (vendasVisiveis.length === 0) {
      toast.info(
        "Não existem registros para exportar."
      );
      return;
    }

    const rows = vendasVisiveis.map((v) => ({
      Data: v.data
        ? dateBR(v.data)
        : "",
      Código: v.codigo ?? "",
      Produto: v.descricao ?? "",
      Quantidade: Number(v.quantidade ?? 0),
      "Valor unitário": Number(
        v.valor_unitario ?? 0
      ),
      "Total da venda": Number(
        v.preco_venda ?? 0
      ),
      "Custo total": Number(v.custo ?? 0),
      Despesas: Number(v.despesas ?? 0),
      Lucro: Number(v.lucro ?? 0),
      "Margem (decimal)": Number(v.margem ?? 0),
      Cliente: v.cliente ?? "",
      Observações: v.observacoes ?? "",
    }));

    exportToXlsx(
      `vendas_${todayISO()}`,
      { Vendas: rows }
    );
  };

  return (
    <AppShell
      title="Vendas"
      subtitle="Histórico, filtros e indicadores"
      actions={<NovaVendaDialog />}
    >
      <Section
        className="mb-4"
        title="Filtros"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Buscar produto, código ou cliente..."
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
          />

          <Select
            value={clienteFiltro}
            onValueChange={(value) =>
              setClienteFiltro(value as ClienteFiltro)
            }
          >
            <SelectTrigger aria-label="Filtrar por cliente">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={TODOS_CLIENTES}>
                Todos os clientes
              </SelectItem>

              <SelectItem value={SEM_CLIENTE}>
                Sem cliente
              </SelectItem>

              {clientes.map((cliente) => (
                <SelectItem
                  key={cliente.value}
                  value={cliente.value}
                >
                  {cliente.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PERIODOS_COMERCIAIS.map((opcao) => (
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
              <Label htmlFor="vendas-data-inicial">
                Data inicial
              </Label>
              <Input
                id="vendas-data-inicial"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="vendas-data-final">
                Data final
              </Label>
              <Input
                id="vendas-data-final"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          <div>Atual: {intervaloAtual}</div>
          <div>Anterior: {intervaloAnterior}</div>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ComparativoCard
          label="Faturamento"
          value={brl(k.faturamento)}
          previous={
            comparacao ? brl(comparacao.faturamento.anterior) : undefined
          }
          difference={
            comparacao
              ? formatarComSinal(comparacao.faturamento.diferenca, brl)
              : undefined
          }
          variation={
            comparacao
              ? textoVariacao(comparacao.faturamento)
              : undefined
          }
          available={!!comparacao}
          trend={comparacao?.faturamento.tendencia}
          icon={DollarSign}
        />

        <ComparativoCard
          label="Lucro"
          value={brl(k.lucro)}
          previous={
            comparacao ? brl(comparacao.lucro.anterior) : undefined
          }
          difference={
            comparacao
              ? formatarComSinal(comparacao.lucro.diferenca, brl)
              : undefined
          }
          variation={
            comparacao ? textoVariacao(comparacao.lucro) : undefined
          }
          available={!!comparacao}
          trend={comparacao?.lucro.tendencia}
          icon={TrendingUp}
          tone={
            k.lucro >= 0
              ? "success"
              : "destructive"
          }
        />

        <ComparativoCard
          label="Margem"
          value={pct(k.margem)}
          previous={
            comparacao ? pct(comparacao.margem.anterior) : undefined
          }
          difference={
            comparacao
              ? `${formatarComSinal(
                  comparacao.margem.diferencaPontosPercentuais,
                  (valor) =>
                    valor.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })
                )} p.p.`
              : undefined
          }
          available={!!comparacao}
          trend={comparacao?.margem.tendencia}
          icon={TrendingUp}
          tone={
            k.margem >= 0
              ? "success"
              : "destructive"
          }
        />

        <ComparativoCard
          label="Quantidade"
          value={num(k.quantidade)}
          previous={
            comparacao ? num(comparacao.quantidade.anterior) : undefined
          }
          difference={
            comparacao
              ? formatarComSinal(comparacao.quantidade.diferenca, num)
              : undefined
          }
          variation={
            comparacao
              ? textoVariacao(comparacao.quantidade)
              : undefined
          }
          available={!!comparacao}
          trend={comparacao?.quantidade.tendencia}
          icon={ShoppingCart}
        />

        <ComparativoCard
          label="Ticket médio por venda"
          value={brl(k.ticketMedioPorVenda)}
          previous={
            comparacao
              ? brl(comparacao.ticketMedioPorVenda.anterior)
              : undefined
          }
          difference={
            comparacao
              ? formatarComSinal(
                  comparacao.ticketMedioPorVenda.diferenca,
                  brl
                )
              : undefined
          }
          variation={
            comparacao
              ? textoVariacao(comparacao.ticketMedioPorVenda)
              : undefined
          }
          available={!!comparacao}
          trend={comparacao?.ticketMedioPorVenda.tendencia}
          icon={DollarSign}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Top produtos por quantidade">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={topVendidos}
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
                  fontSize={11}
                />

                <YAxis
                  type="category"
                  dataKey="descricao"
                  width={140}
                  fontSize={10}
                  tickFormatter={(s) =>
                    s.length > 18
                      ? s.slice(0, 18) + "…"
                      : s
                  }
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border:
                      "1px solid var(--color-border)",
                  }}
                />

                <Legend />

                <Bar
                  dataKey="qtd"
                  name="Quantidade"
                  fill="var(--color-chart-1)"
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

        <Section title="Top produtos por lucro">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={topLucrativos}
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
                    `R$${Math.round(v)}`
                  }
                  fontSize={11}
                />

                <YAxis
                  type="category"
                  dataKey="descricao"
                  width={140}
                  fontSize={10}
                  tickFormatter={(s) =>
                    s.length > 18
                      ? s.slice(0, 18) + "…"
                      : s
                  }
                />

                <Tooltip
                  formatter={(v: number) =>
                    brl(v)
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border:
                      "1px solid var(--color-border)",
                  }}
                />

                <Legend />

                <Bar
                  dataKey="lucro"
                  name="Lucro"
                  fill="var(--color-chart-2)"
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

        <Section
          title="Produtos menos rentáveis"
          className="xl:col-span-2"
        >
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
                  Faturamento
                </TableHead>

                <TableHead className="text-right">
                  Lucro
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {menosRentaveis.map(
                (r) => (
                  <TableRow
                    key={r.chave}
                  >
                    <TableCell className="font-medium">
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
                        r.faturamento
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
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </Section>
      </div>

      <Section
        title="Histórico de vendas"
        className="mt-6"
        description={`${filtered.length} registros`}
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
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma venda encontrada" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Data
                  </TableHead>

                  <TableHead>
                    Produto
                  </TableHead>

                  <TableHead>
                    Cliente
                  </TableHead>

                  <TableHead className="text-right">
                    Qtd
                  </TableHead>

                  <TableHead className="text-right">
                    Total da venda
                  </TableHead>

                  <TableHead className="text-right">
                    Custo
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
                </TableRow>
              </TableHeader>

              <TableBody>
                {vendasVisiveis.map((v) => (
                    <TableRow
                      key={v.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {dateBR(
                          v.data
                        )}
                      </TableCell>

                      <TableCell className="max-w-xs truncate">
                        {
                          v.descricao
                        }
                      </TableCell>

                      <TableCell className="max-w-xs truncate">
                        {v.cliente?.trim() || "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        {num(
                          Number(
                            v.quantidade
                          )
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          Number(
                            v.preco_venda
                          )
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          Number(
                            v.custo
                          )
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {brl(
                          Number(
                            v.despesas
                          )
                        )}
                      </TableCell>

                      <TableCell
                        className={
                          "text-right " +
                          (Number(
                            v.lucro
                          ) < 0
                            ? "text-destructive"
                            : "text-success")
                        }
                      >
                        {brl(
                          Number(
                            v.lucro
                          )
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {pct(
                          Number(
                            v.margem
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {filtered.length >
              200 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Mostrando 200 de{" "}
                  {filtered.length}.
                  Refine os filtros
                  para ver mais.
                </div>
              )}
          </div>
        )}
      </Section>
    </AppShell>
  );
}
