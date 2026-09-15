import {
  AlertTriangle,
  Boxes,
  Package,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";

type EstoqueStatus =
  | "todos"
  | "ok"
  | "baixo"
  | "zerado"
  | "inativo";

type AlertaEstoque = "baixo" | "zerado";

type EstoqueResumoProps = {
  totalProdutos: number;
  total: number;
  valorEstoque: number;
  zerados: number;
  baixo: number;
  status: EstoqueStatus;
  onStatusChange: (status: AlertaEstoque) => void;
};

type AlertaEstoqueCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClassName: string;
  active: boolean;
  onClick: () => void;
};

function AlertaEstoqueCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  active,
  onClick,
}: AlertaEstoqueCardProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors",
        "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "border-primary ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>

          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {num(value)}
          </div>
        </div>

        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
            iconClassName
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

export function EstoqueResumo({
  totalProdutos,
  total,
  valorEstoque,
  zerados,
  baixo,
  status,
  onStatusChange,
}: EstoqueResumoProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Total de produtos"
        value={num(totalProdutos)}
        icon={Package}
      />

      <KpiCard
        label="Itens em estoque"
        value={num(total)}
        icon={Boxes}
        hint={`Valor: ${brl(valorEstoque)}`}
      />

      <AlertaEstoqueCard
        label="SKUs zerados"
        value={zerados}
        icon={XCircle}
        iconClassName="bg-destructive/10 text-destructive"
        active={status === "zerado"}
        onClick={() => onStatusChange("zerado")}
      />

      <AlertaEstoqueCard
        label="Estoque baixo"
        value={baixo}
        icon={AlertTriangle}
        iconClassName="bg-warning/10 text-warning"
        active={status === "baixo"}
        onClick={() => onStatusChange("baixo")}
      />
    </div>
  );
}
