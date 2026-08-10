import {
  AlertTriangle,
  Boxes,
  Package,
  XCircle,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { brl, num } from "@/lib/format";

type EstoqueResumoProps = {
  totalProdutos: number;
  total: number;
  valorEstoque: number;
  zerados: number;
  baixo: number;
};

export function EstoqueResumo({
  totalProdutos,
  total,
  valorEstoque,
  zerados,
  baixo,
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

      <KpiCard
        label="SKUs zerados"
        value={num(zerados)}
        icon={XCircle}
        tone="destructive"
      />

      <KpiCard
        label="Estoque baixo"
        value={num(baixo)}
        icon={AlertTriangle}
        tone="warning"
      />
    </div>
  );
}