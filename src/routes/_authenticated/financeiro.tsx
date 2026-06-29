import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section } from "@/components/dashboard/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { brl, dateBR } from "@/lib/format";

type Periodo = "diario" | "semanal" | "mensal" | "anual";

export const Route = createFileRoute("/_authenticated/financeiro")({ component: FinanceiroPage });

function bucketKey(d: string, p: Periodo) {
  const dt = new Date(d + "T00:00:00");
  if (p === "diario") return dt.toISOString().slice(0, 10);
  if (p === "anual") return String(dt.getFullYear());
  if (p === "semanal") {
    const onejan = new Date(dt.getFullYear(), 0, 1);
    const week = Math.ceil((((dt.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    return `${dt.getFullYear()}-S${String(week).padStart(2, "0")}`;
  }
  return dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mensal");

  const { data: mov = [] } = useQuery({
    queryKey: ["mov-fin"],
    queryFn: async () => (await supabase.from("movimentacoes").select("*").order("data")).data ?? [],
  });

  const k = useMemo(() => {
    const ent = mov.reduce((s, m) => s + Number(m.entrada ?? 0), 0);
    const sai = mov.reduce((s, m) => s + Number(m.saida ?? 0), 0);
    return { ent, sai, saldo: ent - sai };
  }, [mov]);

  const series = useMemo(() => {
    const map = new Map<string, { label: string; entradas: number; saidas: number; saldo: number }>();
    for (const m of mov) {
      if (!m.data) continue;
      const k = bucketKey(m.data, periodo);
      const cur = map.get(k) ?? { label: k, entradas: 0, saidas: 0, saldo: 0 };
      cur.entradas += Number(m.entrada ?? 0);
      cur.saidas += Number(m.saida ?? 0);
      map.set(k, cur);
    }
    let acc = 0;
    const arr = Array.from(map.values());
    for (const v of arr) { acc += v.entradas - v.saidas; v.saldo = acc; }
    return arr;
  }, [mov, periodo]);

  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mov) {
      const desc = (m.descricao ?? "Outros").trim();
      const saida = Number(m.saida ?? 0);
      if (saida > 0) map.set(desc, (map.get(desc) ?? 0) + saida);
    }
    return Array.from(map, ([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [mov]);

  return (
    <AppShell title="Financeiro" subtitle="Fluxo de caixa e despesas">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Entradas" value={brl(k.ent)} icon={TrendingUp} tone="success" />
        <KpiCard label="Saídas" value={brl(k.sai)} icon={TrendingDown} tone="destructive" />
        <KpiCard label="Saldo" value={brl(k.saldo)} icon={Wallet} tone={k.saldo >= 0 ? "success" : "destructive"} />
      </div>

      <Section className="mt-6" title="Fluxo de caixa" actions={
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <TabsList>
            <TabsTrigger value="diario">Diário</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
            <TabsTrigger value="anual">Anual</TabsTrigger>
          </TabsList>
        </Tabs>
      }>
        <div className="h-80">
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis tickFormatter={(v) => `R$${Math.round(v)}`} fontSize={11} />
              <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
              <Legend />
              <Area type="monotone" dataKey="entradas" name="Entradas" stroke="var(--color-chart-2)" fill="url(#gEnt)" strokeWidth={2} />
              <Area type="monotone" dataKey="saidas" name="Saídas" stroke="var(--color-chart-5)" fill="url(#gSai)" strokeWidth={2} />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="var(--color-chart-3)" fill="transparent" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Top despesas por categoria">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={categorias} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={(v) => `R$${Math.round(v)}`} fontSize={11} />
                <YAxis type="category" dataKey="categoria" width={160} fontSize={10} tickFormatter={(s) => (s.length > 22 ? s.slice(0, 22) + "…" : s)} />
                <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                <Bar dataKey="valor" name="Saída" fill="var(--color-chart-5)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Últimas movimentações">
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Descrição</TableHead>
                <TableHead className="text-right">Entrada</TableHead><TableHead className="text-right">Saída</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {[...mov].reverse().slice(0, 100).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{dateBR(m.data)}</TableCell>
                    <TableCell className="max-w-xs truncate">{m.descricao}</TableCell>
                    <TableCell className="text-right text-success">{Number(m.entrada) > 0 ? brl(Number(m.entrada)) : "—"}</TableCell>
                    <TableCell className="text-right text-destructive">{Number(m.saida) > 0 ? brl(Number(m.saida)) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
