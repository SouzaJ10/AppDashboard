import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Target,
  AlertTriangle,
  XCircle,
  Boxes,
  Wallet,
  BarChart3,
} from "lucide-react";

import { KpiCard } from "./KpiCard";
import { brl, num, pct } from "@/lib/format";

type Props = {
  k: any;
  totalVendas: number;
};

export function DashboardKPIs({ k, totalVendas }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        label="Faturamento Total"
        value={brl(k.faturamento)}
        icon={DollarSign}
        tone="default"
        hint={`${totalVendas} vendas`}
      />

      <KpiCard
        label="Lucro Bruto"
        value={brl(k.lucro)}
        icon={TrendingUp}
        tone={k.lucro >= 0 ? "success" : "destructive"}
        hint={`Custo ${brl(k.custoVendas)}`}
      />

      <KpiCard
        label="Despesas"
        value={brl(k.despesasTotal)}
        icon={AlertTriangle}
        tone="destructive"
        hint={`Pagas ${brl(k.despesasPagas)}`}
      />

      <KpiCard
        label="Lucro Líquido"
        value={brl(k.lucroLiquido)}
        icon={TrendingUp}
        tone={k.lucroLiquido >= 0 ? "success" : "destructive"}
        hint={`Margem ${pct(k.margem)}`}
      />

      <KpiCard
        label="Saldo de Caixa"
        value={brl(k.saldoCaixa)}
        icon={Wallet}
        tone={k.saldoCaixa >= 0 ? "success" : "destructive"}
        hint="Receitas − despesas pagas"
      />

      <KpiCard
        label="Total de Vendas"
        value={num(totalVendas)}
        icon={ShoppingCart}
      />

      <KpiCard
        label="Quantidade Vendida"
        value={num(k.qtdVendida)}
        icon={BarChart3}
      />

      <KpiCard
        label="Ticket Médio"
        value={brl(k.ticket)}
        icon={Target}
      />

      <KpiCard
        label="ROI Médio"
        value={pct(k.roi)}
        icon={TrendingUp}
        tone={k.roi >= 0 ? "success" : "destructive"}
        hint={`Estoque ${num(k.estoqueTotal)} un.`}
      />

      <KpiCard
        label="Produtos cadastrados"
        value={num(k.totalProdutos)}
        icon={Package}
      />

      <KpiCard
        label="Valor em estoque"
        value={brl(k.valorEstoque)}
        icon={Boxes}
        hint="Custo × quantidade"
      />

      <KpiCard
        label="Estoque baixo"
        value={num(k.baixo)}
        icon={AlertTriangle}
        tone={k.baixo > 0 ? "warning" : "default"}
      />

      <KpiCard
        label="Sem estoque"
        value={num(k.zerados)}
        icon={XCircle}
        tone={k.zerados > 0 ? "destructive" : "default"}
      />
    </div>
  );
}