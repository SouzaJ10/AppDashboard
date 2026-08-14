import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/dashboard/KpiCard";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { Button } from "@/components/ui/button";

import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useRealtime } from "@/hooks/useRealtime";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  useRealtime([
    "vendas",
    "compras",
    "movimentacoes",
    "produtos",
    "despesas",
  ]);

  const {
    vendas,
    compras,
    movimentacoes: mov,
    produtos,
    despesas,
    loading,
  } = useDashboard();

  const {
    k,
    monthly,
    fluxo,
  } = useDashboardMetrics({
    vendas,
    compras,
    produtos,
    despesas,
    movimentacoes: mov,
  });

  const empty =
    !loading &&
    vendas.length === 0 &&
    mov.length === 0 &&
    produtos.length === 0;

  return (
    <AppShell
      title="Dashboard Executiva"
      subtitle="Visão geral em tempo real"
    >
      {empty ? (
        <EmptyState
          title="Nenhum dado importado ainda"
          description="Importe sua planilha Excel para popular o sistema com produtos, vendas, compras e movimentações."
          action={
            <Button asChild>
              <Link to="/importar">
                Importar planilha
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <DashboardKPIs
            k={k}
            totalVendas={vendas.length}
          />

          <div className="mt-6">
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