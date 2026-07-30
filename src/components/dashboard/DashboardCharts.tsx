import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
    <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">

      <Section title="Faturamento × Lucro por mês">
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="gLuc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />

              <YAxis
                tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
                fontSize={11}
              />

              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                }}
              />

              <Legend />

              <Area
                type="monotone"
                dataKey="faturamento"
                name="Faturamento"
                stroke="var(--color-chart-1)"
                fill="url(#gFat)"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="lucro"
                name="Lucro"
                stroke="var(--color-chart-2)"
                fill="url(#gLuc)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Custos × Receita por mês">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />

              <YAxis
                tickFormatter={(v) => `R$${Math.round(v / 1000)}k`}
                fontSize={11}
              />

              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                }}
              />

              <Legend />

              <Bar
                dataKey="faturamento"
                name="Receita"
                fill="var(--color-chart-1)"
                radius={[6, 6, 0, 0]}
              />

              <Bar
                dataKey="custo"
                name="Custo"
                fill="var(--color-chart-5)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section
        title="Fluxo de caixa (saldo acumulado)"
        className="xl:col-span-2"
      >
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={fluxo}>
              <defs>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />

              <YAxis
                tickFormatter={(v) => `R$${Math.round(v)}`}
                fontSize={11}
              />

              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
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
              />

              <Area
                type="monotone"
                dataKey="saidas"
                name="Saídas"
                stroke="var(--color-chart-5)"
                fill="transparent"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo acumulado"
                stroke="var(--color-chart-3)"
                fill="url(#gSaldo)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

    </div>
  );
}