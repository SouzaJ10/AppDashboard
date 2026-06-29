import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState } from "@/components/dashboard/KpiCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { useRealtime } from "@/hooks/useRealtime";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Minus, CalendarDays, TrendingUp,
  Activity, Sparkles,
} from "lucide-react";
export const Route = createFileRoute("/_authenticated/faturamento")({
  component: FaturamentoPage,
});
// ---------- helpers de data ----------
const DAY = 86400000;
// Parse de string "YYYY-MM-DD" no fuso LOCAL (evita o off-by-one do toISOString).
const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
// Formata Date para "YYYY-MM-DD" em horário LOCAL (NUNCA usar toISOString aqui:
// em fusos negativos como America/Sao_Paulo isso devolve o dia anterior).
const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfWeek = (d: Date) => { // segunda-feira
  const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDays = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
const isoWeek = (d: Date) => {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((x.getTime() - yearStart.getTime()) / DAY) + 1) / 7);
  return { year: x.getUTCFullYear(), week };
};
type PresetKey = "hoje" | "7d" | "30d" | "90d" | "mes" | "ano" | "custom";
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "mes", label: "Este mês" },
  { key: "ano", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];
function resolveRange(preset: PresetKey, from: string, to: string) {
  const now = new Date();
  const today = startOfDay(now);
  switch (preset) {
    case "hoje": return { from: today, to: today };
    case "7d": return { from: addDays(today, -6), to: today };
    case "30d": return { from: addDays(today, -29), to: today };
    case "90d": return { from: addDays(today, -89), to: today };
    case "mes": return { from: startOfMonth(today), to: today };
    case "ano": return { from: startOfYear(today), to: today };
    case "custom":
      return {
        from: from ? toDate(from) : addDays(today, -29),
        to: to ? toDate(to) : today,
      };
  }
}
// ---------- KPI com delta ----------
function DeltaKpi({
  label, value, previous, hint,
}: {
  label: string; value: number; previous: number; hint?: string;
}) {
  const diff = value - previous;
  const ratio = previous === 0 ? (value === 0 ? 0 : 1) : diff / Math.abs(previous);
  const dir: "up" | "down" | "flat" = Math.abs(diff) < 0.005 ? "flat" : diff > 0 ? "up" : "down";
  const Arrow = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const color =
    dir === "up" ? "text-success bg-success/10 border-success/20"
      : dir === "down" ? "text-destructive bg-destructive/10 border-destructive/20"
      : "text-muted-foreground bg-muted border-border";
  const pctText = previous === 0
    ? (value === 0 ? "—" : "novo")
    : `${(ratio * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{brl(value)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", color)}>
          <Arrow className="h-3.5 w-3.5" /> {pctText}
        </span>
        <span className="text-xs text-muted-foreground">
          {hint ?? "vs período anterior"} · {brl(previous)}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Diferença: <span className={dir === "down" ? "text-destructive" : dir === "up" ? "text-success" : ""}>{brl(diff)}</span>
      </div>
    </div>
  );
}
// ---------- página ----------
function FaturamentoPage() {
  useRealtime(["vendas"]);
  const [preset, setPreset] = useState<PresetKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [chartTab, setChartTab] = useState<"diario" | "semanal" | "mensal" | "anual">("diario");
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas"],
    queryFn: async () =>
      (await supabase.from("vendas").select("data,preco_venda").order("data", { ascending: true })).data ?? [],
  });
  const range = useMemo(() => resolveRange(preset, from, to), [preset, from, to]);
  // Soma por dia (mapa data -> faturamento). Chave = string crua "YYYY-MM-DD"
  // exatamente como vem do banco — sem conversão de fuso.
  const dailyMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vendas) {
      if (!v.data) continue;
      // garante que pegamos só "YYYY-MM-DD" mesmo se vier "YYYY-MM-DDT..."
      const key = String(v.data).slice(0, 10);
      m.set(key, (m.get(key) ?? 0) + Number(v.preco_venda ?? 0));
    }
    return m;
  }, [vendas]);
  const sumBetween = (a: Date, b: Date) => {
    if (b < a) return 0;
    let total = 0;
    const start = startOfDay(a).getTime();
    const end = startOfDay(b).getTime();
    for (const [d, val] of dailyMap) {
      const t = toDate(d).getTime();
      if (t >= start && t <= end) total += val;
    }
    return total;
  };
  // ---------- KPIs comparativos (janela equivalente) ----------
  // Para um comparativo justo, o período anterior usa o MESMO número de dias
  // já decorridos do período atual (ex.: mês atual dia 1→hoje vs mês anterior
  // dia 1→mesmo dia-do-mês). Isso evita comparar uma semana parcial com a
  // semana cheia anterior.
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);

  const weekStart = startOfWeek(today);
  const daysIntoWeek = diffDays(weekStart, today); // 0..6
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekSameOffset = addDays(lastWeekStart, daysIntoWeek);

  const monthStart = startOfMonth(today);
  const lastMonthStart = startOfMonth(addDays(monthStart, -1));
  const lastMonthEndFull = addDays(monthStart, -1);
  // hoje.day pode não existir em meses curtos (ex: 31 jan vs 28 fev) — clamp.
  const lastMonthSameOffset = new Date(
    Math.min(
      new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth(), today.getDate()).getTime(),
      lastMonthEndFull.getTime(),
    ),
  );

  const yearStart = startOfYear(today);
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  // mesmo mês/dia do ano anterior (clamp para 28/02 em ano não-bissexto).
  const lastYearSameOffset = (() => {
    const cand = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    if (cand.getMonth() !== today.getMonth()) {
      // overflow (ex.: 29/02 → 01/03) — recua para o último dia do mês.
      return new Date(today.getFullYear() - 1, today.getMonth() + 1, 0);
    }
    return cand;
  })();

  const kpis = {
    hoje:   { v: sumBetween(today, today),       p: sumBetween(yesterday, yesterday) },
    semana: { v: sumBetween(weekStart, today),   p: sumBetween(lastWeekStart, lastWeekSameOffset) },
    mes:    { v: sumBetween(monthStart, today),  p: sumBetween(lastMonthStart, lastMonthSameOffset) },
    ano:    { v: sumBetween(yearStart, today),   p: sumBetween(lastYearStart, lastYearSameOffset) },
  };
  // ---------- séries para gráficos (respeitando o filtro) ----------
  const daily = useMemo(() => {
    const arr: { label: string; data: string; faturamento: number }[] = [];
    const start = startOfDay(range.from);
    const end = startOfDay(range.to);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = ymd(d);
      arr.push({
        data: key,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        faturamento: dailyMap.get(key) ?? 0,
      });
    }
    return arr;
  }, [dailyMap, range]);
  const totalPeriodo = daily.reduce((s, d) => s + d.faturamento, 0);
  const weekly = useMemo(() => {
    const map = new Map<string, { label: string; faturamento: number; sort: number }>();
    for (const d of daily) {
      const { year, week } = isoWeek(toDate(d.data));
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      const sort = year * 100 + week;
      const cur = map.get(key) ?? { label: `S${week}/${String(year).slice(2)}`, faturamento: 0, sort };
      cur.faturamento += d.faturamento;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [daily]);
  const monthly = useMemo(() => {
    const map = new Map<string, { label: string; faturamento: number; sort: number }>();
    // mensal usa TODO o histórico para “visualizar todo o histórico”
    for (const [d, val] of dailyMap) {
      const dt = toDate(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const sort = dt.getFullYear() * 100 + dt.getMonth();
      const cur = map.get(key) ?? {
        label: dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        faturamento: 0, sort,
      };
      cur.faturamento += val;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [dailyMap]);
  const yearly = useMemo(() => {
    const map = new Map<number, { label: string; faturamento: number }>();
    for (const [d, val] of dailyMap) {
      const y = toDate(d).getFullYear();
      const cur = map.get(y) ?? { label: String(y), faturamento: 0 };
      cur.faturamento += val;
      map.set(y, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([, v]) => v);
  }, [dailyMap]);
  // ---------- tendência (últimos 90 dias) ----------
  const tendencia = useMemo(() => {
    const end = today;
    const start = addDays(end, -89);
    const series: number[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      series.push(dailyMap.get(ymd(d)) ?? 0);
    }
    const half = Math.floor(series.length / 2);
    const a = series.slice(0, half).reduce((s, v) => s + v, 0);
    const b = series.slice(half).reduce((s, v) => s + v, 0);
    const ratio = a === 0 ? (b === 0 ? 0 : 1) : (b - a) / a;
    let label = "Estável", tone: "success" | "destructive" | "warning" | "default" = "default";
    if (ratio >= 0.25) { label = "Crescimento acelerado"; tone = "success"; }
    else if (ratio >= 0.05) { label = "Crescimento consistente"; tone = "success"; }
    else if (ratio <= -0.25) { label = "Queda acentuada"; tone = "destructive"; }
    else if (ratio <= -0.05) { label = "Queda de faturamento"; tone = "destructive"; }
    else { label = "Estável"; tone = "warning"; }
    return { ratio, label, tone, total: a + b, firstHalf: a, secondHalf: b };
  }, [dailyMap, today]);
  const toneClass = {
    success: "text-success bg-success/10 border-success/20",
    destructive: "text-destructive bg-destructive/10 border-destructive/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    default: "text-primary bg-primary/10 border-primary/20",
  }[tendencia.tone];
  const empty = !isLoading && vendas.length === 0;
  return (
    <AppShell title="Análise de Faturamento" subtitle="Visão gerencial e comparativos de crescimento">
      {empty ? (
        <EmptyState
          title="Nenhuma venda registrada"
          description="Importe sua planilha ou registre vendas para começar a visualizar o faturamento."
        />
      ) : (
        <>
          {/* KPIs comparativos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DeltaKpi label="Faturamento Hoje" value={kpis.hoje.v} previous={kpis.hoje.p} hint="vs ontem" />
            <DeltaKpi label="Faturamento Esta Semana" value={kpis.semana.v} previous={kpis.semana.p} hint="vs semana anterior" />
            <DeltaKpi label="Faturamento Este Mês" value={kpis.mes.v} previous={kpis.mes.p} hint="vs mês anterior" />
            <DeltaKpi label="Faturamento Este Ano" value={kpis.ano.v} previous={kpis.ano.p} hint="vs ano anterior" />
          </div>
          {/* Tendência */}
          <Section
            className="mt-6"
            title="Tendência do Negócio"
            description="Análise baseada nos últimos 90 dias (primeira metade × segunda metade)"
            actions={<Activity className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium", toneClass)}>
                <Sparkles className="h-4 w-4" /> {tendencia.label}
              </span>
              <span className="text-sm text-muted-foreground">
                Variação:{" "}
                <span className={tendencia.ratio >= 0 ? "text-success" : "text-destructive"}>
                  {(tendencia.ratio * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                1ª metade: {brl(tendencia.firstHalf)} · 2ª metade: {brl(tendencia.secondHalf)}
              </span>
            </div>
          </Section>
          {/* Filtros */}
          <Section
            className="mt-6"
            title="Filtros"
            description="Atualizam KPIs do período e o gráfico diário/semanal"
            actions={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={preset === p.key ? "default" : "outline"}
                  onClick={() => setPreset(p.key)}
                >
                  {p.label}
                </Button>
              ))}
              {preset === "custom" && (
                <div className="ml-2 flex items-center gap-2">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Total do período: {brl(totalPeriodo)}
                </Badge>
              </div>
            </div>
          </Section>
          {/* Gráficos */}
          <Section
            className="mt-6"
            title="Faturamento por período"
            actions={
              <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as typeof chartTab)}>
                <TabsList>
                  <TabsTrigger value="diario">Diário</TabsTrigger>
                  <TabsTrigger value="semanal">Semanal</TabsTrigger>
                  <TabsTrigger value="mensal">Mensal</TabsTrigger>
                  <TabsTrigger value="anual">Anual</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            <div className="h-80">
              <ResponsiveContainer>
                {chartTab === "diario" ? (
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="gFatDia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--color-chart-1)" fill="url(#gFatDia)" strokeWidth={2} />
                  </AreaChart>
                ) : chartTab === "semanal" ? (
                  <BarChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Bar dataKey="faturamento" name="Faturamento" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : chartTab === "mensal" ? (
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="gFatMes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--color-chart-3)" fill="url(#gFatMes)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={yearly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Bar dataKey="faturamento" name="Faturamento" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            {chartTab === "mensal" && (
              <p className="mt-2 text-xs text-muted-foreground">Histórico completo — independente do filtro acima.</p>
            )}
            {chartTab === "anual" && (
              <p className="mt-2 text-xs text-muted-foreground">Comparativo entre todos os anos com vendas.</p>
            )}
          </Section>
        </>
      )}
    </AppShell>
  );
}