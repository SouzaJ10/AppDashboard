import { createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "@/hooks/useDashboard";
import { useMemo } from "react";
import { TrendingUp, DollarSign, ShoppingCart, Package, Percent, Wallet, BarChart3, Target, AlertTriangle, XCircle, Boxes, } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section, EmptyState } from "@/components/dashboard/KpiCard";
import { brl, num, pct } from "@/lib/format";
import { listarVendasDashboard, listarComprasDashboard, listarMovimentacoesDashboard, listarProdutosDashboard, listarDespesasDashboard, } from "@/service/dashboard.service";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/useRealtime";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const monthLabel = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

function DashboardPage() {
  useRealtime(["vendas", "compras", "movimentacoes", "produtos", "despesas"]);

  const {
    vendas, compras, movimentacoes: mov, produtos, despesas, loading,
  } = useDashboard();

  const {
    k,
    monthly,
    fluxo,
  } = useDashboardMetrics({
    vendas, produtos, despesas, movimentacoes: mov,
  });

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
          <DashboardKPIs
            k={k}
            totalVendas={vendas.length}
          />

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardCharts
              monthly={monthly}
              fluxo={fluxo}
            />
          </div>
        </>
      )}
    </AppShell>
  );
}