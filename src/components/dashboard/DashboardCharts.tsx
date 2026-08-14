import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Section } from "./KpiCard";
import { brl } from "@/lib/format";

type Props = {
  monthly: any[];
  fluxo: any[];
};

export function DashboardCharts({
  monthly,
  fluxo,
}: Props) {
  return (
    <div className="space-y-6">
      {/* DESEMPENHO COMERCIAL */}
      <Section
        title="Desempenho comercial"
        description="Evolução do faturamento e do lucro bruto ao longo dos meses"
      >
        <div className="h-80">
          <ResponsiveContainer>
            <AreaChart
              data={monthly}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="gFat"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0.28}
                  />

                  <stop
                    offset="100%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>

                <linearGradient
                  id="gLuc"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0.22}
                  />

                  <stop
                    offset="100%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />

              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) =>
                  v >= 1000
                    ? `R$${Math.round(v / 1000)}k`
                    : `R$${Math.round(v)}`
                }
              />

              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  borderRadius: 12,
                  border:
                    "1px solid var(--color-border)",
                  background:
                    "var(--color-background)",
                }}
              />

              <Legend />

              <Area
                type="monotone"
                dataKey="faturamento"
                name="Faturamento"
                stroke="var(--color-chart-1)"
                fill="url(#gFat)"
                strokeWidth={2.5}
                activeDot={{
                  r: 5,
                }}
              />

              <Area
                type="monotone"
                dataKey="lucro"
                name="Lucro bruto"
                stroke="var(--color-chart-2)"
                fill="url(#gLuc)"
                strokeWidth={2.5}
                activeDot={{
                  r: 5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* FLUXO DE CAIXA */}
      <Section
        title="Fluxo de caixa"
        description="Entradas, saídas e evolução do saldo acumulado"
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Entradas no período
            </p>

            <p className="mt-1 text-lg font-semibold">
              {brl(
                fluxo.reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.entradas ?? 0
                    ),
                  0
                )
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saídas no período
            </p>

            <p className="mt-1 text-lg font-semibold">
              {brl(
                fluxo.reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.saidas ?? 0
                    ),
                  0
                )
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Saldo acumulado
            </p>

            <p className="mt-1 text-lg font-semibold">
              {brl(
                fluxo.length > 0
                  ? Number(
                    fluxo[
                      fluxo.length - 1
                    ].saldo ?? 0
                  )
                  : 0
              )}
            </p>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer>
            <AreaChart
              data={fluxo}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 0,
              }}
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
                    stopOpacity={0.3}
                  />

                  <stop
                    offset="100%"
                    stopColor="var(--color-chart-3)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />

              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) =>
                  v >= 1000
                    ? `R$${Math.round(v / 1000)}k`
                    : `R$${Math.round(v)}`
                }
              />

              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  borderRadius: 12,
                  border:
                    "1px solid var(--color-border)",
                  background:
                    "var(--color-background)",
                }}
              />

              <Legend />

              <Area
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="var(--color-chart-2)"
                fill="transparent"
                strokeWidth={2}
                activeDot={{
                  r: 4,
                }}
              />

              <Area
                type="monotone"
                dataKey="saidas"
                name="Saídas"
                stroke="var(--color-chart-5)"
                fill="transparent"
                strokeWidth={2}
                activeDot={{
                  r: 4,
                }}
              />

              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo acumulado"
                stroke="var(--color-chart-3)"
                fill="url(#gSaldo)"
                strokeWidth={3}
                activeDot={{
                  r: 5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}