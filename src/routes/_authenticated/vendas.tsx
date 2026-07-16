import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listarVendas } from "@/service/vendas.service"; 
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section, EmptyState } from "@/components/dashboard/KpiCard";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, num, pct, dateBR } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { ShoppingCart, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { NovaVendaDialog } from "@/components/vendas/NovaVendaDialog";
import { useRealtime } from "@/hooks/useRealtime";
import { queryKeys } from "@/constants/queryKeys";

export const Route = createFileRoute("/_authenticated/vendas")({ component: VendasPage });

function VendasPage() {
  useRealtime(["vendas", "produtos", "movimentacoes"]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(""); 

const { data: vendas = [], isLoading } = useQuery({
  queryKey: queryKeys.vendas.all,
  queryFn: listarVendas,
});

  const filtered = useMemo(() => {
    return vendas.filter((v) => {
      if (q && !(v.descricao ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      if (from && (v.data ?? "") < from) return false;
      if (to && (v.data ?? "") > to) return false;
      return true;
    });
  }, [vendas, q, from, to]);

  const k = useMemo(() => {
    const fat = filtered.reduce((s, v) => s + Number(v.preco_venda ?? 0), 0);
    const lucro = filtered.reduce((s, v) => s + Number(v.lucro ?? 0), 0);
    const qtd = filtered.reduce((s, v) => s + Number(v.quantidade ?? 0), 0);
    const margem = fat ? lucro / fat : 0;
    return { fat, lucro, qtd, margem };
  }, [filtered]);

  const ranking = useMemo(() => {
    const map = new Map<string, { descricao: string; qtd: number; faturamento: number; lucro: number }>();
    for (const v of filtered) {
      const key = v.descricao ?? "Sem nome";
      const cur = map.get(key) ?? { descricao: key, qtd: 0, faturamento: 0, lucro: 0 };
      cur.qtd += Number(v.quantidade ?? 0);
      cur.faturamento += Number(v.preco_venda ?? 0);
      cur.lucro += Number(v.lucro ?? 0);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [filtered]);

  const topVendidos = [...ranking].sort((a, b) => b.qtd - a.qtd).slice(0, 8);
  const topLucrativos = [...ranking].sort((a, b) => b.lucro - a.lucro).slice(0, 8);
  const menosRentaveis = [...ranking].sort((a, b) => a.lucro - b.lucro).slice(0, 5);

  return (
    <AppShell title="Vendas" subtitle="Histórico, filtros e indicadores" actions={<NovaVendaDialog />}>
      <Section className="mb-4" title="Filtros">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Buscar por produto..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Faturamento" value={brl(k.fat)} icon={DollarSign} />
        <KpiCard label="Lucro" value={brl(k.lucro)} icon={TrendingUp} tone={k.lucro >= 0 ? "success" : "destructive"} />
        <KpiCard label="Margem" value={pct(k.margem)} icon={TrendingUp} tone={k.margem >= 0 ? "success" : "destructive"} />
        <KpiCard label="Qtd vendida" value={num(k.qtd)} icon={ShoppingCart} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Top produtos por quantidade">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topVendidos} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="descricao" width={140} fontSize={10} tickFormatter={(s) => (s.length > 18 ? s.slice(0, 18) + "…" : s)} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                <Legend />
                <Bar dataKey="qtd" name="Quantidade" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Top produtos por lucro">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topLucrativos} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={(v) => `R$${Math.round(v)}`} fontSize={11} />
                <YAxis type="category" dataKey="descricao" width={140} fontSize={10} tickFormatter={(s) => (s.length > 18 ? s.slice(0, 18) + "…" : s)} />
                <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                <Legend />
                <Bar dataKey="lucro" name="Lucro" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Produtos menos rentáveis" className="xl:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menosRentaveis.map((r) => (
                <TableRow key={r.descricao}>
                  <TableCell className="font-medium">{r.descricao}</TableCell>
                  <TableCell className="text-right">{num(r.qtd)}</TableCell>
                  <TableCell className="text-right">{brl(r.faturamento)}</TableCell>
                  <TableCell className={"text-right " + (r.lucro < 0 ? "text-destructive" : "text-success")}>{brl(r.lucro)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>

      <Section title="Histórico de vendas" className="mt-6" description={`${filtered.length} registros`} actions={<Trophy className="h-4 w-4 text-muted-foreground" />}>
        {isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div> :
          filtered.length === 0 ? <EmptyState title="Nenhuma venda encontrada" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap">{dateBR(v.data)}</TableCell>
                    <TableCell className="max-w-xs truncate">{v.descricao}</TableCell>
                    <TableCell className="text-right">{num(Number(v.quantidade))}</TableCell>
                    <TableCell className="text-right">{brl(Number(v.preco_venda))}</TableCell>
                    <TableCell className="text-right">{brl(Number(v.custo))}</TableCell>
                    <TableCell className="text-right">{brl(Number(v.despesas))}</TableCell>
                    <TableCell className={"text-right " + (Number(v.lucro) < 0 ? "text-destructive" : "text-success")}>{brl(Number(v.lucro))}</TableCell>
                    <TableCell className="text-right">{pct(Number(v.margem))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 200 && <div className="mt-2 text-xs text-muted-foreground">Mostrando 200 de {filtered.length}. Refine os filtros para ver mais.</div>}
          </div>
        )}
      </Section>
    </AppShell>
  );
}
