import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  TrendingUp, DollarSign, ShoppingCart, Package, Percent, Wallet, BarChart3, Target,
  AlertTriangle, XCircle, Boxes,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section, EmptyState } from "@/components/dashboard/KpiCard";
import { brl, num, pct } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/useRealtime";
import type { Despesa } from "@/integrations/supabase/despesas-extra";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const monthLabel = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

function DashboardPage() {
  useRealtime(["vendas", "compras", "movimentacoes", "produtos", "despesas"]);
  const vendasQ = useQuery({
    queryKey: ["vendas"],
    queryFn: async () => (await supabase.from("vendas").select("*").order("data", { ascending: true })).data ?? [],
  });
  const comprasQ = useQuery({
    queryKey: ["compras"],
    queryFn: async () => (await supabase.from("compras").select("*")).data ?? [],
  });
  const movQ = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => (await supabase.from("movimentacoes").select("*")).data ?? [],
  });
  const produtosQ = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => (await supabase.from("produtos").select("*")).data ?? [],
  });
  const despesasQ = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas" as never).select("*");
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("does not exist") || m.includes("schema cache")) return [];
        throw error;
      }
      return (data ?? []) as unknown as Despesa[];
    },
  });

  const vendas = vendasQ.data ?? [];
  const compras = comprasQ.data ?? [];
  const mov = movQ.data ?? [];
  const produtos = produtosQ.data ?? [];
  const despesas = despesasQ.data ?? [];

  const k = useMemo(() => {
    const faturamento = vendas.reduce((s, v) => s + Number(v.preco_venda ?? 0), 0);
    const lucro = vendas.reduce((s, v) => s + Number(v.lucro ?? 0), 0);
    const custoVendas = vendas.reduce((s, v) => s + Number(v.custo ?? 0), 0);
    const qtdVendida = vendas.reduce((s, v) => s + Number(v.quantidade ?? 0), 0);
    const despesasTotal = despesas.reduce((s, d) => s + Number(d.valor ?? 0), 0);
    const despesasPagas = despesas.filter((d) => d.status === "pago").reduce((s, d) => s + Number(d.valor), 0);
    const lucroLiquido = lucro - despesasTotal;
    const margem = faturamento ? lucroLiquido / faturamento : 0;
    const ticket = vendas.length ? faturamento / vendas.length : 0;
    const entradas = mov.reduce((s, m) => s + Number(m.entrada ?? 0), 0);
    const saidas = mov.reduce((s, m) => s + Number(m.saida ?? 0), 0);
    const saldo = entradas - saidas;
    const estoqueTotal = produtos.reduce((s, p) => s + Number(p.estoque_atual ?? 0), 0);
    const roi = custoVendas ? lucro / custoVendas : 0;
    const totalProdutos = produtos.length;
    const zerados = produtos.filter((p) => Number(p.estoque_atual ?? 0) <= 0).length;
    const baixo = produtos.filter((p) => {
      const e = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);
      return e > 0 && e <= min;
    }).length;
    const valorEstoque = produtos.reduce(
      (s, p) => s + Number(p.estoque_atual ?? 0) * Number((p as { custo_compra?: number }).custo_compra ?? 0),
      0,
    );
    const saldoCaixa = faturamento - despesasPagas;
    return { faturamento, lucro, lucroLiquido, despesasTotal, despesasPagas, margem, saldo, saldoCaixa, qtdVendida, ticket, estoqueTotal, roi, custoVendas, entradas, saidas, totalProdutos, zerados, baixo, valorEstoque };
  }, [vendas, mov, produtos, despesas]);

  // Series por mês
  const monthly = useMemo(() => {
    const map = new Map<string, { mes: string; faturamento: number; lucro: number; custo: number; qtd: number }>();
    for (const v of vendas) {
      if (!v.data) continue;
      const m = monthLabel(v.data);
      const cur = map.get(m) ?? { mes: m, faturamento: 0, lucro: 0, custo: 0, qtd: 0 };
      cur.faturamento += Number(v.preco_venda ?? 0);
      cur.lucro += Number(v.lucro ?? 0);
      cur.custo += Number(v.custo ?? 0);
      cur.qtd += Number(v.quantidade ?? 0);
      map.set(m, cur);
    }
    return Array.from(map.values());
  }, [vendas]);

  const fluxo = useMemo(() => {
    const map = new Map<string, { mes: string; entradas: number; saidas: number; saldo: number }>();
    let acc = 0;
    const sorted = [...mov].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
    for (const m of sorted) {
      if (!m.data) continue;
      const lab = monthLabel(m.data);
      const cur = map.get(lab) ?? { mes: lab, entradas: 0, saidas: 0, saldo: 0 };
      cur.entradas += Number(m.entrada ?? 0);
      cur.saidas += Number(m.saida ?? 0);
      map.set(lab, cur);
    }
    for (const v of map.values()) { acc += v.entradas - v.saidas; v.saldo = acc; }
    return Array.from(map.values());
  }, [mov]);

  const loading = vendasQ.isLoading || comprasQ.isLoading || movQ.isLoading || produtosQ.isLoading;
  const empty = !loading && vendas.length === 0 && mov.length === 0 && produtos.length === 0;

  return (
    <AppShell title="Dashboard Executiva" subtitle="Visão geral em tempo real">
      {empty ? (
        <EmptyState
          title="Nenhum dado importado ainda"
          description="Importe sua planilha Excel para popular o sistema com produtos, vendas, compras e movimentações."
          action={<Button asChild><Link to="/importar">Importar planilha</Link></Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard label="Faturamento Total" value={brl(k.faturamento)} icon={DollarSign} tone="default" hint={`${vendas.length} vendas`} />
            <KpiCard label="Lucro Bruto" value={brl(k.lucro)} icon={TrendingUp} tone={k.lucro >= 0 ? "success" : "destructive"} hint={`Custo ${brl(k.custoVendas)}`} />
            <KpiCard label="Despesas" value={brl(k.despesasTotal)} icon={AlertTriangle} tone="destructive" hint={`Pagas ${brl(k.despesasPagas)}`} />
            <KpiCard label="Lucro Líquido" value={brl(k.lucroLiquido)} icon={TrendingUp} tone={k.lucroLiquido >= 0 ? "success" : "destructive"} hint={`Margem ${pct(k.margem)}`} />
            <KpiCard label="Saldo de Caixa" value={brl(k.saldoCaixa)} icon={Wallet} tone={k.saldoCaixa >= 0 ? "success" : "destructive"} hint="Receitas − despesas pagas" />
            <KpiCard label="Total de Vendas" value={num(vendas.length)} icon={ShoppingCart} />
            <KpiCard label="Quantidade Vendida" value={num(k.qtdVendida)} icon={BarChart3} />
            <KpiCard label="Ticket Médio" value={brl(k.ticket)} icon={Target} />
            <KpiCard label="ROI Médio" value={pct(k.roi)} icon={TrendingUp} tone={k.roi >= 0 ? "success" : "destructive"} hint={`Estoque ${num(k.estoqueTotal)} un.`} />
            <KpiCard label="Produtos cadastrados" value={num(k.totalProdutos)} icon={Package} />
            <KpiCard label="Valor em estoque" value={brl(k.valorEstoque)} icon={Boxes} hint="Custo × quantidade" />
            <KpiCard label="Estoque baixo" value={num(k.baixo)} icon={AlertTriangle} tone={k.baixo > 0 ? "warning" : "default"} />
            <KpiCard label="Sem estoque" value={num(k.zerados)} icon={XCircle} tone={k.zerados > 0 ? "destructive" : "default"} />
          </div>

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
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--color-chart-1)" fill="url(#gFat)" strokeWidth={2} />
                    <Area type="monotone" dataKey="lucro" name="Lucro" stroke="var(--color-chart-2)" fill="url(#gLuc)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Custos × Receita por mês">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Bar dataKey="faturamento" name="Receita" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="custo" name="Custo" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Fluxo de caixa (saldo acumulado)" className="xl:col-span-2">
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
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickFormatter={(v) => `R$${Math.round(v)}`} fontSize={11} />
                    <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                    <Legend />
                    <Area type="monotone" dataKey="entradas" name="Entradas" stroke="var(--color-chart-2)" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="saidas" name="Saídas" stroke="var(--color-chart-5)" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="var(--color-chart-3)" fill="url(#gSaldo)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        </>
      )}
    </AppShell>
  );
}