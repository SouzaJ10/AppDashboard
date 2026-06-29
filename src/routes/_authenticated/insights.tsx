import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Section } from "@/components/dashboard/KpiCard";
import { brl, num, pct } from "@/lib/format";
import { TrendingUp, TrendingDown, AlertTriangle, Trophy, PackageX, Boxes, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/insights")({ component: InsightsPage });

type Insight = { icon: typeof Trophy; tone: "success" | "destructive" | "warning" | "default"; title: string; body: string };

function InsightsPage() {
  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-ins"],
    queryFn: async () => (await supabase.from("vendas").select("*").order("data")).data ?? [],
  });
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-ins"],
    queryFn: async () => (await supabase.from("produtos").select("*")).data ?? [],
  });
  const { data: mov = [] } = useQuery({
    queryKey: ["mov-ins"],
    queryFn: async () => (await supabase.from("movimentacoes").select("*").order("data")).data ?? [],
  });

  const insights: Insight[] = useMemo(() => {
    const out: Insight[] = [];
    if (vendas.length === 0) return out;

    // Aggregate by product
    const byProd = new Map<string, { qtd: number; fat: number; lucro: number }>();
    for (const v of vendas) {
      const k = v.descricao ?? "—";
      const c = byProd.get(k) ?? { qtd: 0, fat: 0, lucro: 0 };
      c.qtd += Number(v.quantidade ?? 0);
      c.fat += Number(v.preco_venda ?? 0);
      c.lucro += Number(v.lucro ?? 0);
      byProd.set(k, c);
    }
    const arr = Array.from(byProd, ([k, v]) => ({ produto: k, ...v }));
    const maisLucro = [...arr].sort((a, b) => b.lucro - a.lucro)[0];
    const menosLucro = [...arr].sort((a, b) => a.lucro - b.lucro)[0];
    const maiorGiro = [...arr].sort((a, b) => b.qtd - a.qtd)[0];

    if (maisLucro) out.push({ icon: Trophy, tone: "success",
      title: "Produto mais lucrativo",
      body: `“${maisLucro.produto}” gerou ${brl(maisLucro.lucro)} de lucro em ${num(maisLucro.qtd)} unidades.` });
    if (menosLucro && menosLucro.lucro < 0) out.push({ icon: TrendingDown, tone: "destructive",
      title: "Produto com prejuízo",
      body: `“${menosLucro.produto}” acumula prejuízo de ${brl(menosLucro.lucro)}. Reveja preço de venda ou custo.` });
    if (maiorGiro) out.push({ icon: Boxes, tone: "default",
      title: "Produto com maior giro",
      body: `“${maiorGiro.produto}” teve ${num(maiorGiro.qtd)} unidades vendidas.` });

    // Stock without sales
    const vendidosSet = new Set(byProd.keys());
    const parado = produtos.find((p) => Number(p.estoque_atual ?? 0) > 0 && !vendidosSet.has(p.descricao ?? ""));
    if (parado) out.push({ icon: PackageX, tone: "warning",
      title: "Produto parado em estoque",
      body: `“${parado.descricao}” está com ${num(Number(parado.estoque_atual))} unidades sem vendas registradas.` });

    // Trend: compare last 2 months
    const byMonth = new Map<string, number>();
    for (const v of vendas) {
      if (!v.data) continue;
      const m = v.data.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(v.preco_venda ?? 0));
    }
    const meses = Array.from(byMonth.entries()).sort();
    if (meses.length >= 2) {
      const [, prev] = meses[meses.length - 2];
      const [, cur] = meses[meses.length - 1];
      const delta = prev ? (cur - prev) / prev : 0;
      out.push({
        icon: delta >= 0 ? TrendingUp : TrendingDown,
        tone: delta >= 0 ? "success" : "destructive",
        title: delta >= 0 ? "Tendência de crescimento" : "Tendência de queda",
        body: `Faturamento do último mês variou ${pct(delta)} em relação ao anterior (${brl(cur)} vs ${brl(prev)}).`,
      });
    }

    // Cash alert
    const saldo = mov.reduce((s, m) => s + Number(m.entrada ?? 0) - Number(m.saida ?? 0), 0);
    if (saldo < 0) out.push({ icon: AlertTriangle, tone: "destructive",
      title: "Caixa negativo",
      body: `Seu fluxo de caixa está em ${brl(saldo)}. Avalie reduzir saídas ou aumentar entradas.` });

    return out;
  }, [vendas, produtos, mov]);

  const toneCls = (t: Insight["tone"]) =>
    t === "success" ? "border-success/30 bg-success/5"
    : t === "destructive" ? "border-destructive/30 bg-destructive/5"
    : t === "warning" ? "border-warning/40 bg-warning/5"
    : "border-primary/30 bg-primary/5";

  return (
    <AppShell title="Insights Inteligentes" subtitle="Resumo automático para o gestor">
      <Section title="Destaques do negócio" actions={<Lightbulb className="h-4 w-4 text-muted-foreground" />}>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Importe dados para gerar insights automáticos.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((i, idx) => {
              const Icon = i.icon;
              return (
                <div key={idx} className={cn("rounded-xl border p-4", toneCls(i.tone))}>
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5" />
                    <div>
                      <div className="text-sm font-semibold">{i.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </AppShell>
  );
}
