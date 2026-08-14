import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState } from "@/components/dashboard/KpiCard";
import { useCompras } from "@/hooks/useCompras";
import { NovaCompraDialog } from "@/components/compras/NovaCompraDialog";
import { excluirCompra, pagarCompra } from "@/service/compras.service";
import { queryKeys } from "@/constants/queryKeys";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/compras")({
    component: ComprasPage,
});

function ComprasPage() {
    const qc = useQueryClient();
    const { compras, isLoading } = useCompras();

    const [busca, setBusca] = useState("");
    const [fornecedorFiltro, setFornecedorFiltro] = useState("__all");

    const fornecedores = useMemo(() => {
        const set = new Set<string>();

        for (const compra of compras) {
            if (compra.fornecedor) {
                set.add(compra.fornecedor);
            }
        }

        return Array.from(set).sort((a, b) =>
            a.localeCompare(b, "pt-BR")
        );
    }, [compras]);

    // EXCLUSÃO DE COMPRA
    const onDelete = async (id: string) => {
        try {
            await excluirCompra(id);

            toast.success("Compra excluída com sucesso!");

            await Promise.all([
                qc.invalidateQueries({
                    queryKey: queryKeys.compras.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.produtos.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.produtos.giro,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.dashboard.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.movimentacoes.all,
                }),
            ]);
        } catch (e) {
            console.error("Erro ao excluir compra:", e);

            toast.error("Erro ao excluir compra", {
                description:
                    e instanceof Error
                        ? e.message
                        : "Ocorreu um erro inesperado.",
            });
        }
    };

    const onPay = async (id: string) => {
        try {
            await pagarCompra(id);

            toast.success("Compra paga com sucesso!");

            await Promise.all([
                qc.invalidateQueries({
                    queryKey: queryKeys.compras.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.movimentacoes.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.dashboard.all,
                }),
            ]);
        } catch (e) {
            console.error("Erro ao pagar compra:", e);

            toast.error("Erro ao pagar compra", {
                description:
                    e instanceof Error
                        ? e.message
                        : "Ocorreu um erro inesperado.",
            });
        }
    };

    const filtradas = useMemo(() => {
        const termo = busca.toLowerCase().trim();

        return compras.filter((compra) => {
            if (termo) {
                const codigo = String(compra.codigo ?? "");
                const descricao = (compra.descricao ?? "").toLowerCase();
                const fornecedor = (compra.fornecedor ?? "").toLowerCase();

                const encontrou =
                    codigo.includes(termo) ||
                    descricao.includes(termo) ||
                    fornecedor.includes(termo);

                if (!encontrou) return false;
            }

            if (
                fornecedorFiltro !== "__all" &&
                (compra.fornecedor ?? "") !== fornecedorFiltro
            ) {
                return false;
            }

            return true;
        });
    }, [compras, busca, fornecedorFiltro]);

    const resumo = useMemo(() => {
        const quantidade = filtradas.reduce(
            (s, compra) => s + Number(compra.quantidade ?? 0),
            0
        );

        const valorTotal = filtradas.reduce(
            (s, compra) => s + Number(compra.custo_total ?? 0),
            0
        );

        return {
            quantidade,
            valorTotal,
        };
    }, [filtradas]);

    const brl = (value: number) =>
        value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    const formatarData = (value: string | null) => {
        if (!value) return "—";

        return new Date(`${value}T00:00:00`).toLocaleDateString(
            "pt-BR"
        );
    };

    const empty = !isLoading && compras.length === 0;

    return (
        <AppShell
            title="Compras"
            subtitle="Registro e acompanhamento de compras"
        >
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Compras encontradas
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {filtradas.length}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Itens comprados
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {resumo.quantidade}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Valor total
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {brl(resumo.valorTotal)}
                    </p>
                </div>
            </div>

            <Section
                className="mt-6"
                title="Histórico de compras"
                description={`${filtradas.length} de ${compras.length} compras`}
                actions={<NovaCompraDialog />}
            >
                {empty ? (
                    <EmptyState
                        title="Nenhuma compra registrada"
                        description="Registre sua primeira compra para começar a acompanhar suas entradas."
                    />
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <Input
                                className="w-64"
                                placeholder="Buscar produto, código ou fornecedor..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                            />

                            <Select
                                value={fornecedorFiltro}
                                onValueChange={setFornecedorFiltro}
                            >
                                <SelectTrigger className="w-52">
                                    <SelectValue placeholder="Fornecedor" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="__all">
                                        Todos fornecedores
                                    </SelectItem>

                                    {fornecedores.map((fornecedor) => (
                                        <SelectItem
                                            key={fornecedor}
                                            value={fornecedor}
                                        >
                                            {fornecedor}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {filtradas.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Nenhuma compra encontrada com esses filtros.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="px-3 py-3 font-medium">
                                                Código
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Produto
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Quantidade
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Custo unitário
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Total
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Fornecedor
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Pagamento
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Status
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Vencimento
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Data
                                            </th>

                                            <th className="px-3 py-3 text-right font-medium">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filtradas.map((compra) => (
                                            <tr
                                                key={compra.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-3 py-3">
                                                    {compra.codigo ?? "—"}
                                                </td>

                                                <td className="px-3 py-3 font-medium">
                                                    {compra.descricao ?? "—"}
                                                </td>

                                                <td className="px-3 py-3">
                                                    {compra.quantidade ?? "—"}
                                                </td>

                                                <td className="px-3 py-3">
                                                    {brl(Number(compra.custo_unitario ?? 0))}
                                                </td>

                                                <td className="px-3 py-3 font-medium">
                                                    {brl(Number(compra.custo_total ?? 0))}
                                                </td>

                                                <td className="px-3 py-3 text-muted-foreground">
                                                    {compra.fornecedor ?? "—"}
                                                </td>

                                                <td className="px-3 py-3">
                                                    {compra.forma_pagamento === "a_prazo"
                                                        ? "A prazo"
                                                        : "À vista"}
                                                </td>

                                                <td className="px-3 py-3">
                                                    {compra.status_pagamento === "pago" ? (
                                                        <Badge variant="default">
                                                            Pago
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            Pendente
                                                        </Badge>
                                                    )}
                                                </td>

                                                <td className="px-3 py-3">
                                                    {formatarData(compra.data_vencimento)}
                                                </td>

                                                <td className="px-3 py-3">
                                                    {formatarData(compra.data)}
                                                </td>

                                                <td className="px-3 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {compra.forma_pagamento === "a_prazo" &&
                                                            compra.status_pagamento !== "pago" && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="text-success hover:text-success"
                                                                            aria-label="Pagar compra"
                                                                            title="Marcar como paga"
                                                                        >
                                                                            <CheckCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>

                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>
                                                                                Confirmar pagamento?
                                                                            </AlertDialogTitle>

                                                                            <AlertDialogDescription asChild>
                                                                                <div className="space-y-3">
                                                                                    <p>
                                                                                        Você está prestes a marcar esta compra como paga.
                                                                                    </p>

                                                                                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                                                                        <p>
                                                                                            <strong>Produto:</strong>{" "}
                                                                                            {compra.descricao ?? "—"}
                                                                                        </p>

                                                                                        <p>
                                                                                            <strong>Valor:</strong>{" "}
                                                                                            {brl(Number(compra.custo_total ?? 0))}
                                                                                        </p>

                                                                                        <p>
                                                                                            <strong>Vencimento:</strong>{" "}
                                                                                            {formatarData(compra.data_vencimento)}
                                                                                        </p>
                                                                                    </div>

                                                                                    <p>
                                                                                        Ao confirmar, o valor será lançado como saída no caixa.
                                                                                    </p>
                                                                                </div>
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>

                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>
                                                                                Cancelar
                                                                            </AlertDialogCancel>

                                                                            <AlertDialogAction
                                                                                onClick={() => onPay(compra.id)}
                                                                            >
                                                                                Confirmar pagamento
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-muted-foreground hover:text-destructive"
                                                                    aria-label="Excluir compra"
                                                                    title="Excluir compra"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>

                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        Excluir compra?
                                                                    </AlertDialogTitle>

                                                                    <AlertDialogDescription asChild>
                                                                        <div className="space-y-3">
                                                                            <p>
                                                                                Esta ação removerá a compra e desfará os efeitos
                                                                                relacionados ao estoque e ao financeiro.
                                                                            </p>

                                                                            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                                                                <p>
                                                                                    <strong>Produto:</strong>{" "}
                                                                                    {compra.descricao ?? "—"}
                                                                                </p>

                                                                                <p>
                                                                                    <strong>Quantidade:</strong>{" "}
                                                                                    {compra.quantidade ?? "—"}
                                                                                </p>

                                                                                <p>
                                                                                    <strong>Valor:</strong>{" "}
                                                                                    {brl(Number(compra.custo_total ?? 0))}
                                                                                </p>

                                                                                <p>
                                                                                    <strong>Pagamento:</strong>{" "}
                                                                                    {compra.forma_pagamento === "a_prazo"
                                                                                        ? "A prazo"
                                                                                        : "À vista"}
                                                                                </p>

                                                                                <p>
                                                                                    <strong>Status:</strong>{" "}
                                                                                    {compra.status_pagamento === "pago"
                                                                                        ? "Pago"
                                                                                        : "Pendente"}
                                                                                </p>
                                                                            </div>

                                                                            <p>
                                                                                Esta ação não pode ser desfeita.
                                                                            </p>
                                                                        </div>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>

                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        Cancelar
                                                                    </AlertDialogCancel>

                                                                    <AlertDialogAction
                                                                        onClick={() => onDelete(compra.id)}
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    >
                                                                        Excluir compra
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </Section>
        </AppShell>
    );
}