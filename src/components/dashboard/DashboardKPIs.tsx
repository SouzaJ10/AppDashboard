import { TrendingUp, DollarSign, ShoppingCart, Package, Target, AlertTriangle, XCircle, Boxes, Wallet, BarChart3, CalendarDays, Clock3,} from "lucide-react";
import { KpiCard } from "./KpiCard";
import { brl, num, pct } from "@/lib/format";

type Props = {
  k: any;
  totalVendas: number;
};

export function DashboardKPIs({
  k,
  totalVendas,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* FINANCEIRO PRINCIPAL */}

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
        tone={
          k.lucro >= 0
            ? "success"
            : "destructive"
        }
        hint={`Custo ${brl(k.custoVendas)}`}
      />

      <KpiCard
        label="Lucro Líquido"
        value={brl(k.lucroLiquido)}
        icon={TrendingUp}
        tone={
          k.lucroLiquido >= 0
            ? "success"
            : "destructive"
        }
        hint={`Margem ${pct(k.margem)}`}
      />

      <KpiCard
        label="Saldo em Caixa"
        value={brl(k.saldoCaixa)}
        icon={Wallet}
        tone={
          k.saldoCaixa >= 0
            ? "success"
            : "destructive"
        }
        hint={`${brl(k.entradas)} entradas • ${brl(k.saidas)} saídas`}
      />

      {/* OBRIGAÇÕES */}

      <KpiCard
        label="Contas a Pagar"
        value={brl(k.valorContasPagar)}
        icon={Clock3}
        tone="default"
        hint={`${num(k.contasAPagar)} conta(s) pendente(s)`}
      />

      <KpiCard
        label="Valor Vencido"
        value={brl(k.valorVencido)}
        icon={AlertTriangle}
        tone={
          k.valorVencido > 0
            ? "destructive"
            : "default"
        }
        hint={`${num(k.contasVencidas)} conta(s) vencida(s)`}
      />

      <KpiCard
        label="Despesas Pendentes"
        value={brl(k.despesasPendentes)}
        icon={Clock3}
        tone="default"
        hint="Ainda não impactaram o caixa"
      />

      <KpiCard
        label="Despesas no Mês"
        value={brl(k.despesasMes)}
        icon={CalendarDays}
        tone="destructive"
      />

      {/* COMPRAS */}

      <KpiCard
        label="Compras no Mês"
        value={num(k.comprasMes)}
        icon={ShoppingCart}
        hint={brl(k.valorComprasMes)}
      />

      {/* VENDAS */}

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
        tone={
          k.roi >= 0
            ? "success"
            : "destructive"
        }
      />

      {/* ESTOQUE */}

      <KpiCard
        label="Produtos Cadastrados"
        value={num(k.totalProdutos)}
        icon={Package}
      />

      <KpiCard
        label="Valor em Estoque"
        value={brl(k.valorEstoque)}
        icon={Boxes}
        hint="Custo × quantidade"
      />

      <KpiCard
        label="Estoque Baixo"
        value={num(k.baixo)}
        icon={AlertTriangle}
        tone={
          k.baixo > 0
            ? "warning"
            : "default"
        }
      />

      <KpiCard
        label="Sem Estoque"
        value={num(k.zerados)}
        icon={XCircle}
        tone={
          k.zerados > 0
            ? "destructive"
            : "default"
        }
      />
    </div>
  );
}