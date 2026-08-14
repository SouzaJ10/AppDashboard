import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock3,
  DollarSign,
  Package,
  ShoppingCart,
  Target,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import { brl, num, pct } from "@/lib/format";

type Props = {
  k: any;
  totalVendas: number;
};

function MiniStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card/60 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-xl font-semibold tracking-tight">
          {value}
        </p>

        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardKPIs({
  k,
  totalVendas,
}: Props) {
  const lucroPositivo = k.lucroLiquido >= 0;
  const saldoPositivo = k.saldoCaixa >= 0;

  return (
    <div className="space-y-8">
      {/* RESUMO EXECUTIVO */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">
            Resumo executivo
          </h2>

          <p className="text-sm text-muted-foreground">
            Principais números financeiros do negócio
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* SALDO */}
          <div
            className={[
              "relative overflow-hidden rounded-2xl border p-6 shadow-sm",
              saldoPositivo
                ? "bg-gradient-to-br from-emerald-500/10 via-background to-background"
                : "bg-gradient-to-br from-destructive/10 via-background to-background",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Saldo em caixa
                </p>

                <p
                  className={[
                    "mt-2 text-3xl font-bold tracking-tight",
                    saldoPositivo
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive",
                  ].join(" ")}
                >
                  {brl(k.saldoCaixa)}
                </p>

                <p className="mt-3 text-xs text-muted-foreground">
                  {brl(k.entradas)} em entradas
                  <span className="mx-1">•</span>
                  {brl(k.saidas)} em saídas
                </p>
              </div>

              <div
                className={[
                  "grid h-12 w-12 place-items-center rounded-xl",
                  saldoPositivo
                    ? "bg-emerald-500/15"
                    : "bg-destructive/15",
                ].join(" ")}
              >
                <Wallet
                  className={[
                    "h-6 w-6",
                    saldoPositivo
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive",
                  ].join(" ")}
                />
              </div>
            </div>
          </div>

          {/* FATURAMENTO */}
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Faturamento
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {brl(k.faturamento)}
                </p>

                <p className="mt-3 text-xs text-muted-foreground">
                  {num(totalVendas)} vendas registradas
                </p>
              </div>

              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          {/* LUCRO */}
          <div
            className={[
              "relative overflow-hidden rounded-2xl border p-6 shadow-sm",
              lucroPositivo
                ? "bg-gradient-to-br from-sky-500/10 via-background to-background"
                : "bg-gradient-to-br from-destructive/10 via-background to-background",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Lucro líquido
                </p>

                <p
                  className={[
                    "mt-2 text-3xl font-bold tracking-tight",
                    lucroPositivo
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-destructive",
                  ].join(" ")}
                >
                  {brl(k.lucroLiquido)}
                </p>

                <p className="mt-3 text-xs text-muted-foreground">
                  Margem {pct(k.margem)}
                </p>
              </div>

              <div
                className={[
                  "grid h-12 w-12 place-items-center rounded-xl",
                  lucroPositivo
                    ? "bg-sky-500/15"
                    : "bg-destructive/15",
                ].join(" ")}
              >
                <TrendingUp
                  className={[
                    "h-6 w-6",
                    lucroPositivo
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-destructive",
                  ].join(" ")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OBRIGAÇÕES E OPERAÇÃO */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">
            Obrigações e operação
          </h2>

          <p className="text-sm text-muted-foreground">
            Compromissos financeiros e posição atual
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Contas a pagar"
            value={brl(k.valorContasPagar)}
            hint={`${num(k.contasAPagar)} conta(s) pendente(s)`}
            icon={Clock3}
          />

          <MiniStat
            label="Despesas pendentes"
            value={brl(k.despesasPendentes)}
            hint="Ainda não impactaram o caixa"
            icon={AlertTriangle}
          />

          <MiniStat
            label="Compras no mês"
            value={num(k.comprasMes)}
            hint={brl(k.valorComprasMes)}
            icon={ShoppingCart}
          />

          <MiniStat
            label="Valor em estoque"
            value={brl(k.valorEstoque)}
            hint="Custo × quantidade"
            icon={Boxes}
          />
        </div>
      </section>

      {/* INDICADORES OPERACIONAIS */}
      <section className="rounded-2xl border bg-card/50 p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              Indicadores operacionais
            </h2>

            <p className="text-sm text-muted-foreground">
              Eficiência comercial e desempenho
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Ticket médio
              </p>

              <p className="text-lg font-semibold">
                {brl(k.ticket)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Quantidade vendida
              </p>

              <p className="text-lg font-semibold">
                {num(k.qtdVendida)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                ROI médio
              </p>

              <p
                className={[
                  "text-lg font-semibold",
                  k.roi >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                ].join(" ")}
              >
                {pct(k.roi)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Produtos cadastrados
              </p>

              <p className="text-lg font-semibold">
                {num(k.totalProdutos)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ATENÇÃO */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">
            Atenção
          </h2>

          <p className="text-sm text-muted-foreground">
            Pontos que podem exigir ação
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center gap-4 border-b px-5 py-4">
            <div
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                k.baixo > 0
                  ? "bg-amber-500/15"
                  : "bg-emerald-500/15",
              ].join(" ")}
            >
              {k.baixo > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Estoque baixo
              </p>

              <p className="text-sm text-muted-foreground">
                {k.baixo > 0
                  ? `${num(k.baixo)} produto(s) precisam de atenção`
                  : "Nenhum produto com estoque baixo"}
              </p>
            </div>

            <span className="text-lg font-semibold">
              {num(k.baixo)}
            </span>
          </div>

          <div className="flex items-center gap-4 border-b px-5 py-4">
            <div
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                k.valorVencido > 0
                  ? "bg-destructive/15"
                  : "bg-emerald-500/15",
              ].join(" ")}
            >
              {k.valorVencido > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Contas vencidas
              </p>

              <p className="text-sm text-muted-foreground">
                {k.contasVencidas > 0
                  ? `${num(k.contasVencidas)} conta(s) vencida(s)`
                  : "Nenhuma conta vencida"}
              </p>
            </div>

            <span
              className={[
                "text-lg font-semibold",
                k.valorVencido > 0
                  ? "text-destructive"
                  : "",
              ].join(" ")}
            >
              {brl(k.valorVencido)}
            </span>
          </div>

          <div className="flex items-center gap-4 px-5 py-4">
            <div
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                k.zerados > 0
                  ? "bg-destructive/15"
                  : "bg-emerald-500/15",
              ].join(" ")}
            >
              {k.zerados > 0 ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Produtos sem estoque
              </p>

              <p className="text-sm text-muted-foreground">
                {k.zerados > 0
                  ? `${num(k.zerados)} produto(s) indisponível(is)`
                  : "Nenhum produto sem estoque"}
              </p>
            </div>

            <span className="text-lg font-semibold">
              {num(k.zerados)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}