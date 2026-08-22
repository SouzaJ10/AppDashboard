import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState } from "@/components/dashboard/KpiCard";
import { useCompras } from "@/hooks/useCompras";
import { NovaCompraDialog } from "@/components/compras/NovaCompraDialog";
import { excluirCompra, pagarCompra, } from "@/service/compras.service";
import { queryKeys } from "@/constants/queryKeys";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compras")({
    component: ComprasPage,
});

type AbaCompras = "historico" | "contas";

function ComprasPage() {
    const qc = useQueryClient();

    const { compras, isLoading } = useCompras();

    const [busca, setBusca] = useState("");
    const [fornecedorFiltro, setFornecedorFiltro] =
        useState("__all");

    const [aba, setAba] =
        useState<AbaCompras>("historico");

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

                const descricao =
                    (compra.descricao ?? "").toLowerCase();

                const fornecedor =
                    (compra.fornecedor ?? "").toLowerCase();

                const encontrou =
                    codigo.includes(termo) ||
                    descricao.includes(termo) ||
                    fornecedor.includes(termo);

                if (!encontrou) {
                    return false;
                }
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
        const agora = new Date();
        const mesAtual = agora.toISOString().slice(0, 7);

        const comprasMes = compras.filter(
            (compra) =>
                (compra.data ?? "").slice(0, 7) === mesAtual
        );

        const quantidadeMes = comprasMes.reduce(
            (total, compra) =>
                total + Number(compra.quantidade ?? 0),
            0
        );

        const valorMes = comprasMes.reduce(
            (total, compra) =>
                total + Number(compra.custo_total ?? 0),
            0
        );

        const pagas = compras.filter(
            (compra) =>
                compra.status_pagamento === "pago"
        );

        const pendentes = compras.filter(
            (compra) =>
                compra.forma_pagamento === "a_prazo" &&
                compra.status_pagamento !== "pago"
        );

        const valorPago = pagas.reduce(
            (total, compra) =>
                total + Number(compra.custo_total ?? 0),
            0
        );

        const valorPendente = pendentes.reduce(
            (total, compra) =>
                total + Number(compra.custo_total ?? 0),
            0
        );

        return {
            comprasMes: comprasMes.length,
            quantidadeMes,
            valorMes,
            comprasPagas: pagas.length,
            valorPago,
            comprasPendentes: pendentes.length,
            valorPendente,
        };
    }, [compras]);

    const contasAPagar = useMemo(() => {
        return compras
            .filter(
                (compra) =>
                    compra.forma_pagamento === "a_prazo" &&
                    compra.status_pagamento !== "pago"
            )
            .sort((a, b) => {
                const dataA =
                    a.data_vencimento ?? "9999-12-31";

                const dataB =
                    b.data_vencimento ?? "9999-12-31";

                return dataA.localeCompare(dataB);
            });
    }, [compras]);

    const valorAPagar = useMemo(() => {
        return contasAPagar.reduce(
            (total, compra) =>
                total + Number(compra.custo_total ?? 0),
            0
        );
    }, [contasAPagar]);

    const brl = (value: number) =>
        value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    const formatarData = (value: string | null) => {
        if (!value) {
            return "—";
        }

        return new Date(
            `${value}T00:00:00`
        ).toLocaleDateString("pt-BR");
    };

    const hoje = new Date()
        .toISOString()
        .slice(0, 10);

    const empty =
        !isLoading && compras.length === 0;

    return (
        <AppShell
            title="Compras"
            subtitle="Registro, pagamentos e acompanhamento de compras"
        >
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Compras no mês
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {resumo.comprasMes}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Valor comprado no mês
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {brl(resumo.valorMes)}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Itens comprados no mês
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {resumo.quantidadeMes}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Compras pagas
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {resumo.comprasPagas}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        {brl(resumo.valorPago)}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Compras pendentes
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {resumo.comprasPendentes}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                        Valor a pagar
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {brl(resumo.valorPendente)}
                    </p>
                </div>
            </div>

            <Section
                className="mt-6"
                title={
                    aba === "historico"
                        ? "Histórico de compras"
                        : "Contas a pagar"
                }
                description={
                    aba === "historico"
                        ? `${filtradas.length} de ${compras.length} compras`
                        : `${contasAPagar.length} conta(s) pendente(s)`
                }
                actions={<NovaCompraDialog />}
            >
                <Tabs
                    value={aba}
                    onValueChange={(value) =>
                        setAba(value as AbaCompras)
                    }
                    className="mb-5"
                >
                    <TabsList>
                        <TabsTrigger value="historico">
                            Histórico de compras
                        </TabsTrigger>

                        <TabsTrigger value="contas">
                            Contas a pagar

                            {contasAPagar.length > 0 && (
                                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                                    {contasAPagar.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {aba === "historico" && (
                    <>
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
                                        onChange={(e) =>
                                            setBusca(e.target.value)
                                        }
                                    />

                                    <Select
                                        value={fornecedorFiltro}
                                        onValueChange={
                                            setFornecedorFiltro
                                        }
                                    >
                                        <SelectTrigger className="w-52">
                                            <SelectValue placeholder="Fornecedor" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="__all">
                                                Todos fornecedores
                                            </SelectItem>

                                            {fornecedores.map(
                                                (fornecedor) => (
                                                    <SelectItem
                                                        key={
                                                            fornecedor
                                                        }
                                                        value={
                                                            fornecedor
                                                        }
                                                    >
                                                        {
                                                            fornecedor
                                                        }
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {filtradas.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Nenhuma compra encontrada
                                            com esses filtros.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="w-full text-sm text-foreground">
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
                                                        Custo
                                                        unitário
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
                                                {filtradas.map(
                                                    (compra) => (
                                                        <tr
                                                            key={
                                                                compra.id
                                                            }
                                                            className="border-b last:border-0"
                                                        >
                                                            <td className="px-3 py-3">
                                                                {compra.codigo ??
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3 font-medium">
                                                                {compra.descricao ??
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {compra.quantidade ??
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {brl(
                                                                    Number(
                                                                        compra.custo_unitario ??
                                                                        0
                                                                    )
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-3 font-medium">
                                                                {brl(
                                                                    Number(
                                                                        compra.custo_total ??
                                                                        0
                                                                    )
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-3 text-muted-foreground">
                                                                {compra.fornecedor ??
                                                                    "—"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {compra.forma_pagamento ===
                                                                    "a_prazo"
                                                                    ? "A prazo"
                                                                    : "À vista"}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {compra.status_pagamento ===
                                                                    "pago" ? (
                                                                    <Badge>
                                                                        Pago
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline">
                                                                        Pendente
                                                                    </Badge>
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {formatarData(
                                                                    compra.data_vencimento
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-3">
                                                                {formatarData(
                                                                    compra.data
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-3 text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    {compra.forma_pagamento ===
                                                                        "a_prazo" &&
                                                                        compra.status_pagamento !==
                                                                        "pago" && (
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger
                                                                                    asChild
                                                                                >
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
                                                                                            Confirmar
                                                                                            pagamento?
                                                                                        </AlertDialogTitle>

                                                                                        <AlertDialogDescription
                                                                                            asChild
                                                                                        >
                                                                                            <div className="space-y-3">
                                                                                                <p>
                                                                                                    Você
                                                                                                    está
                                                                                                    prestes
                                                                                                    a
                                                                                                    marcar
                                                                                                    esta
                                                                                                    compra
                                                                                                    como
                                                                                                    paga.
                                                                                                </p>

                                                                                                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                                                                                    <p>
                                                                                                        <strong>
                                                                                                            Produto:
                                                                                                        </strong>{" "}
                                                                                                        {compra.descricao ??
                                                                                                            "—"}
                                                                                                    </p>

                                                                                                    <p>
                                                                                                        <strong>
                                                                                                            Valor:
                                                                                                        </strong>{" "}
                                                                                                        {brl(
                                                                                                            Number(
                                                                                                                compra.custo_total ??
                                                                                                                0
                                                                                                            )
                                                                                                        )}
                                                                                                    </p>

                                                                                                    <p>
                                                                                                        <strong>
                                                                                                            Vencimento:
                                                                                                        </strong>{" "}
                                                                                                        {formatarData(
                                                                                                            compra.data_vencimento
                                                                                                        )}
                                                                                                    </p>
                                                                                                </div>

                                                                                                <p>
                                                                                                    Ao
                                                                                                    confirmar,
                                                                                                    o
                                                                                                    valor
                                                                                                    será
                                                                                                    lançado
                                                                                                    como
                                                                                                    saída
                                                                                                    no
                                                                                                    caixa.
                                                                                                </p>
                                                                                            </div>
                                                                                        </AlertDialogDescription>
                                                                                    </AlertDialogHeader>

                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>
                                                                                            Cancelar
                                                                                        </AlertDialogCancel>

                                                                                        <AlertDialogAction
                                                                                            onClick={() =>
                                                                                                onPay(
                                                                                                    compra.id
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            Confirmar
                                                                                            pagamento
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        )}

                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger
                                                                            asChild
                                                                        >
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
                                                                                    Excluir
                                                                                    compra?
                                                                                </AlertDialogTitle>

                                                                                <AlertDialogDescription
                                                                                    asChild
                                                                                >
                                                                                    <div className="space-y-3">
                                                                                        <p>
                                                                                            Esta
                                                                                            ação
                                                                                            removerá
                                                                                            a
                                                                                            compra
                                                                                            e
                                                                                            desfará
                                                                                            os
                                                                                            efeitos
                                                                                            relacionados
                                                                                            ao
                                                                                            estoque
                                                                                            e
                                                                                            ao
                                                                                            financeiro.
                                                                                        </p>

                                                                                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                                                                            <p>
                                                                                                <strong>
                                                                                                    Produto:
                                                                                                </strong>{" "}
                                                                                                {compra.descricao ??
                                                                                                    "—"}
                                                                                            </p>

                                                                                            <p>
                                                                                                <strong>
                                                                                                    Quantidade:
                                                                                                </strong>{" "}
                                                                                                {compra.quantidade ??
                                                                                                    "—"}
                                                                                            </p>

                                                                                            <p>
                                                                                                <strong>
                                                                                                    Valor:
                                                                                                </strong>{" "}
                                                                                                {brl(
                                                                                                    Number(
                                                                                                        compra.custo_total ??
                                                                                                        0
                                                                                                    )
                                                                                                )}
                                                                                            </p>

                                                                                            <p>
                                                                                                <strong>
                                                                                                    Pagamento:
                                                                                                </strong>{" "}
                                                                                                {compra.forma_pagamento ===
                                                                                                    "a_prazo"
                                                                                                    ? "A prazo"
                                                                                                    : "À vista"}
                                                                                            </p>

                                                                                            <p>
                                                                                                <strong>
                                                                                                    Status:
                                                                                                </strong>{" "}
                                                                                                {compra.status_pagamento ===
                                                                                                    "pago"
                                                                                                    ? "Pago"
                                                                                                    : "Pendente"}
                                                                                            </p>
                                                                                        </div>

                                                                                        <p>
                                                                                            Esta
                                                                                            ação
                                                                                            não
                                                                                            pode
                                                                                            ser
                                                                                            desfeita.
                                                                                        </p>
                                                                                    </div>
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>

                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>
                                                                                    Cancelar
                                                                                </AlertDialogCancel>

                                                                                <AlertDialogAction
                                                                                    onClick={() =>
                                                                                        onDelete(
                                                                                            compra.id
                                                                                        )
                                                                                    }
                                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                                >
                                                                                    Excluir
                                                                                    compra
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {aba === "contas" && (
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-sm text-muted-foreground">
                                    Contas pendentes
                                </p>

                                <p className="mt-1 text-2xl font-semibold">
                                    {contasAPagar.length}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-sm text-muted-foreground">
                                    Total a pagar
                                </p>

                                <p className="mt-1 text-2xl font-semibold">
                                    {brl(valorAPagar)}
                                </p>
                            </div>
                        </div>

                        {contasAPagar.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center">
                                <p className="font-medium">
                                    Nenhuma conta pendente
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Todas as compras a prazo estão
                                    pagas.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="px-3 py-3 font-medium">
                                                Fornecedor
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Produto
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Vencimento
                                            </th>

                                            <th className="px-3 py-3 font-medium">
                                                Situação
                                            </th>

                                            <th className="px-3 py-3 text-right font-medium">
                                                Valor
                                            </th>

                                            <th className="px-3 py-3 text-right font-medium">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {contasAPagar.map(
                                            (compra) => {
                                                const vencimento =
                                                    compra.data_vencimento ??
                                                    "";

                                                const vencida =
                                                    Boolean(
                                                        vencimento
                                                    ) &&
                                                    vencimento <
                                                    hoje;

                                                const venceHoje =
                                                    vencimento ===
                                                    hoje;

                                                return (
                                                    <tr
                                                        key={
                                                            compra.id
                                                        }
                                                        className="border-b last:border-0"
                                                    >
                                                        <td className="px-3 py-3">
                                                            {compra.fornecedor ??
                                                                "—"}
                                                        </td>

                                                        <td className="px-3 py-3 font-medium">
                                                            {compra.descricao ??
                                                                "—"}
                                                        </td>

                                                        <td className="px-3 py-3">
                                                            {formatarData(
                                                                compra.data_vencimento
                                                            )}
                                                        </td>

                                                        <td className="px-3 py-3">
                                                            {vencida ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-destructive/40 text-destructive"
                                                                >
                                                                    Vencida
                                                                </Badge>
                                                            ) : venceHoje ? (
                                                                <Badge variant="outline">
                                                                    Vence
                                                                    hoje
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">
                                                                    Pendente
                                                                </Badge>
                                                            )}
                                                        </td>

                                                        <td className="px-3 py-3 text-right font-medium">
                                                            {brl(
                                                                Number(
                                                                    compra.custo_total ??
                                                                    0
                                                                )
                                                            )}
                                                        </td>

                                                        <td className="px-3 py-3 text-right">
                                                            <AlertDialog>
                                                                <AlertDialogTrigger
                                                                    asChild
                                                                >
                                                                    <Button size="sm">
                                                                        <CheckCircle className="mr-1 h-4 w-4" />
                                                                        Pagar
                                                                    </Button>
                                                                </AlertDialogTrigger>

                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>
                                                                            Confirmar
                                                                            pagamento?
                                                                        </AlertDialogTitle>

                                                                        <AlertDialogDescription
                                                                            asChild
                                                                        >
                                                                            <div className="space-y-3">
                                                                                <p>
                                                                                    Você
                                                                                    está
                                                                                    prestes
                                                                                    a
                                                                                    pagar
                                                                                    esta
                                                                                    conta.
                                                                                </p>

                                                                                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                                                                    <p>
                                                                                        <strong>
                                                                                            Fornecedor:
                                                                                        </strong>{" "}
                                                                                        {compra.fornecedor ??
                                                                                            "—"}
                                                                                    </p>

                                                                                    <p>
                                                                                        <strong>
                                                                                            Produto:
                                                                                        </strong>{" "}
                                                                                        {compra.descricao ??
                                                                                            "—"}
                                                                                    </p>

                                                                                    <p>
                                                                                        <strong>
                                                                                            Valor:
                                                                                        </strong>{" "}
                                                                                        {brl(
                                                                                            Number(
                                                                                                compra.custo_total ??
                                                                                                0
                                                                                            )
                                                                                        )}
                                                                                    </p>

                                                                                    <p>
                                                                                        <strong>
                                                                                            Vencimento:
                                                                                        </strong>{" "}
                                                                                        {formatarData(
                                                                                            compra.data_vencimento
                                                                                        )}
                                                                                    </p>
                                                                                </div>

                                                                                <p>
                                                                                    O
                                                                                    valor
                                                                                    será
                                                                                    registrado
                                                                                    como
                                                                                    saída
                                                                                    no
                                                                                    caixa.
                                                                                </p>
                                                                            </div>
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>

                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>
                                                                            Cancelar
                                                                        </AlertDialogCancel>

                                                                        <AlertDialogAction
                                                                            onClick={() =>
                                                                                onPay(
                                                                                    compra.id
                                                                                )
                                                                            }
                                                                        >
                                                                            Confirmar
                                                                            pagamento
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Section>
        </AppShell>
    );
}