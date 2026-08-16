import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState } from "@/components/dashboard/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, } from "@/components/ui/tabs";
import { DespesaDialog } from "@/components/despesas/DespesaDialog";
import { useRealtime } from "@/hooks/useRealtime";
import { brl, dateBR } from "@/lib/format";
import { exportToXlsx } from "@/lib/export-xlsx";
import type { Despesa } from "@/integrations/supabase/despesas-extra";
import { Trash2, Download, Pencil, CheckCircle, } from "lucide-react";
import { toast } from "sonner";
import { queryKeys } from "@/constants/queryKeys";

type AbaDespesas = "historico" | "contas";

export const Route = createFileRoute("/_authenticated/despesas")({
  component: DespesasPage,
});

function DespesasPage() {
  useRealtime([
    "despesas",
    "categorias_despesa",
  ]);

  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] =
    useState("__all__");
  const [statusFilter, setStatusFilter] =
    useState("__all__");
  const [aba, setAba] =
    useState<AbaDespesas>("historico");

  const despesasQ = useQuery({
    queryKey: queryKeys.despesas.all,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("despesas")
          .select("*")
          .order("data", {
            ascending: false,
          });

      if (error) {
        throw error;
      }

      return (data ?? []).map((despesa) => ({
        ...despesa,
        forma_pagamento:
          despesa.forma_pagamento as Despesa["forma_pagamento"],
        status:
          despesa.status as Despesa["status"],
      }));
    },
  });

  const despesas =
    despesasQ.data ?? [];

  const missingTable =
    despesasQ.isError &&
    despesasQ.error instanceof Error &&
    (
      despesasQ.error.message
        .toLowerCase()
        .includes("does not exist") ||
      despesasQ.error.message
        .toLowerCase()
        .includes("schema cache")
    );

  const categorias = useMemo(() => {
    const set = new Set<string>();

    for (const despesa of despesas) {
      if (despesa.categoria) {
        set.add(despesa.categoria);
      }
    }

    return Array.from(set).sort(
      (a, b) =>
        a.localeCompare(b, "pt-BR")
    );
  }, [despesas]);

  const filtered = useMemo(() => {
    const termo =
      q.toLowerCase().trim();

    return despesas.filter(
      (despesa) => {
        if (
          catFilter !== "__all__" &&
          despesa.categoria !== catFilter
        ) {
          return false;
        }

        if (
          statusFilter !== "__all__" &&
          despesa.status !== statusFilter
        ) {
          return false;
        }

        if (!termo) {
          return true;
        }

        return (
          despesa.descricao
            ?.toLowerCase()
            .includes(termo) ||
          despesa.categoria
            ?.toLowerCase()
            .includes(termo) ||
          despesa.centro_custo
            ?.toLowerCase()
            .includes(termo)
        );
      }
    );
  }, [
    despesas,
    q,
    catFilter,
    statusFilter,
  ]);

  const pendentes = useMemo(
    () =>
      despesas.filter(
        (despesa) =>
          despesa.status === "pendente"
      ),
    [despesas]
  );

  const resumo = useMemo(() => {
    const hoje = new Date()
      .toISOString()
      .slice(0, 10);

    const mesAtual =
      hoje.slice(0, 7);

    const despesasMes =
      despesas.filter(
        (despesa) =>
          (despesa.data ?? "").slice(
            0,
            7
          ) === mesAtual
      );

    const pagas =
      despesas.filter(
        (despesa) =>
          despesa.status === "pago"
      );

    const pendentesLocais =
      despesas.filter(
        (despesa) =>
          despesa.status ===
          "pendente"
      );

    const totalHistorico =
      despesas.reduce(
        (total, despesa) =>
          total +
          Number(
            despesa.valor ?? 0
          ),
        0
      );

    const valorMes =
      despesasMes.reduce(
        (total, despesa) =>
          total +
          Number(
            despesa.valor ?? 0
          ),
        0
      );

    const valorPago =
      pagas.reduce(
        (total, despesa) =>
          total +
          Number(
            despesa.valor ?? 0
          ),
        0
      );

    const valorPendente =
      pendentesLocais.reduce(
        (total, despesa) =>
          total +
          Number(
            despesa.valor ?? 0
          ),
        0
      );

    return {
      despesasMes:
        despesasMes.length,
      valorMes,
      pagas: pagas.length,
      valorPago,
      pendentes:
        pendentesLocais.length,
      valorPendente,
      totalHistorico,
    };
  }, [despesas]);

  const onDelete = async (
    id: string
  ) => {
    try {
      const { error } =
        await supabase.rpc(
          "excluir_despesa",
          {
            p_despesa_id: id,
          }
        );

      if (error) {
        throw error;
      }

      toast.success(
        "Despesa excluída"
      );

      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.despesas.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.financeiro.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.movimentacoes.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.dashboard.all,
        }),
      ]);
    } catch (e) {
      toast.error(
        "Erro ao excluir",
        {
          description:
            e instanceof Error
              ? e.message
              : String(e),
        }
      );
    }
  };

  const onPay = async (despesa: Despesa) => {
    try {
      const { error } = await supabase.rpc(
        "atualizar_despesa",
        {
          p_despesa_id: despesa.id,
          p_descricao: despesa.descricao,
          p_valor: Number(despesa.valor),
          p_data:
            despesa.data ??
            new Date().toISOString().slice(0, 10),
          p_categoria:
            despesa.categoria ?? null,
          p_forma_pagamento:
            despesa.forma_pagamento ?? null,
          p_centro_custo:
            despesa.centro_custo ?? null,
          p_observacoes:
            despesa.observacoes ?? null,
          p_status: "pago",
        }
      );

      if (error) {
        throw error;
      }

      toast.success(
        "Despesa paga com sucesso!"
      );

      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.despesas.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.financeiro.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.movimentacoes.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.dashboard.all,
        }),
      ]);
    } catch (e) {
      toast.error(
        "Erro ao pagar despesa",
        {
          description:
            e instanceof Error
              ? e.message
              : String(e),
        }
      );
    }
  };

  const onExport = () => {
    const rows =
      filtered.map((d) => ({
        Data: d.data,
        Descrição: d.descricao,
        Categoria:
          d.categoria ?? "",
        Valor: Number(d.valor),
        "Forma de pagamento":
          d.forma_pagamento ?? "",
        "Centro de custo":
          d.centro_custo ?? "",
        Status: d.status,
        Observações:
          d.observacoes ?? "",
      }));

    exportToXlsx(
      `despesas_${new Date()
        .toISOString()
        .slice(0, 10)}`,
      {
        Despesas: rows,
      }
    );
  };

  const empty =
    !despesasQ.isLoading &&
    despesas.length === 0;

  return (
    <AppShell
      title="Despesas"
      subtitle="Saídas, custos e acompanhamento de despesas"
    >
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Despesas no mês
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {resumo.despesasMes}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Valor no mês
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {brl(resumo.valorMes)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Despesas pagas
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {resumo.pagas}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {brl(resumo.valorPago)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Despesas pendentes
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {resumo.pendentes}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Valor a pagar
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {brl(
              resumo.valorPendente
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Total histórico
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {brl(
              resumo.totalHistorico
            )}
          </p>
        </div>
      </div>

      <Section
        className="mt-6"
        title={
          aba === "historico"
            ? "Histórico de despesas"
            : "Contas a pagar"
        }
        description={
          aba === "historico"
            ? `${filtered.length} de ${despesas.length} despesas`
            : `${pendentes.length} despesa(s) pendente(s)`
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="mr-1 h-4 w-4" />
              Exportar
            </Button>

            <DespesaDialog />
          </div>
        }
      >
        <Tabs
          value={aba}
          onValueChange={(value) =>
            setAba(
              value as AbaDespesas
            )
          }
          className="mb-5"
        >
          <TabsList>
            <TabsTrigger value="historico">
              Histórico de despesas
            </TabsTrigger>

            <TabsTrigger value="contas">
              Contas a pagar

              {pendentes.length > 0 && (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {pendentes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {aba === "historico" && (
          <>
            {missingTable &&
              despesasQ.isFetched ? (
              <EmptyState
                title="Tabela despesas ainda não existe"
                description="Aplique o módulo de despesas no Supabase para começar a registrar despesas."
              />
            ) : empty ? (
              <EmptyState
                title="Nenhuma despesa registrada"
                description="Clique em Nova Despesa para começar."
              />
            ) : (
              <>
                <div className="mb-4 grid gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Buscar descrição, categoria, centro de custo..."
                    value={q}
                    onChange={(e) =>
                      setQ(
                        e.target.value
                      )
                    }
                  />

                  <Select
                    value={catFilter}
                    onValueChange={
                      setCatFilter
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="__all__">
                        Todas as categorias
                      </SelectItem>

                      {categorias.map(
                        (categoria) => (
                          <SelectItem
                            key={
                              categoria
                            }
                            value={
                              categoria
                            }
                          >
                            {
                              categoria
                            }
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={
                      setStatusFilter
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="__all__">
                        Todos os status
                      </SelectItem>

                      <SelectItem value="pago">
                        Pago
                      </SelectItem>

                      <SelectItem value="pendente">
                        Pendente
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filtered.length ===
                  0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma despesa
                      encontrada com
                      esses filtros.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            Data
                          </TableHead>

                          <TableHead>
                            Descrição
                          </TableHead>

                          <TableHead>
                            Categoria
                          </TableHead>

                          <TableHead>
                            Pagamento
                          </TableHead>

                          <TableHead>
                            Status
                          </TableHead>

                          <TableHead className="text-right">
                            Valor
                          </TableHead>

                          <TableHead className="text-right">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filtered.map(
                          (d) => (
                            <TableRow
                              key={d.id}
                            >
                              <TableCell>
                                {dateBR(
                                  d.data
                                )}
                              </TableCell>

                              <TableCell className="max-w-xs truncate font-medium">
                                {
                                  d.descricao
                                }
                              </TableCell>

                              <TableCell>
                                {d.categoria ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                {d.forma_pagamento ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    d.status ===
                                      "pago"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {d.status ===
                                    "pago"
                                    ? "Pago"
                                    : "Pendente"}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right font-medium text-destructive">
                                {brl(
                                  Number(
                                    d.valor
                                  )
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {d.status === "pendente" && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-success hover:text-success"
                                          aria-label="Pagar despesa"
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
                                                Você está prestes a marcar esta
                                                despesa como paga.
                                              </p>

                                              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                                <p>
                                                  <strong>Descrição:</strong>{" "}
                                                  {d.descricao}
                                                </p>

                                                <p>
                                                  <strong>Categoria:</strong>{" "}
                                                  {d.categoria ?? "—"}
                                                </p>

                                                <p>
                                                  <strong>Valor:</strong>{" "}
                                                  {brl(Number(d.valor))}
                                                </p>

                                                <p>
                                                  <strong>
                                                    Forma de pagamento:
                                                  </strong>{" "}
                                                  {d.forma_pagamento ?? "—"}
                                                </p>
                                              </div>

                                              <p>
                                                Ao confirmar, o valor será
                                                registrado como saída no caixa.
                                              </p>
                                            </div>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancelar
                                          </AlertDialogCancel>

                                          <AlertDialogAction
                                            onClick={() => onPay(d)}
                                          >
                                            Confirmar pagamento
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                  <DespesaDialog
                                    despesa={
                                      d
                                    }
                                  />

                                  <AlertDialog>
                                    <AlertDialogTrigger
                                      asChild
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Excluir despesa"
                                        title="Excluir despesa"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Excluir
                                          despesa?
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
                                              despesa
                                              e
                                              também
                                              sua
                                              movimentação
                                              financeira,
                                              caso
                                              já
                                              tenha
                                              sido
                                              paga.
                                            </p>

                                            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                              <p>
                                                <strong>
                                                  Descrição:
                                                </strong>{" "}
                                                {
                                                  d.descricao
                                                }
                                              </p>

                                              <p>
                                                <strong>
                                                  Categoria:
                                                </strong>{" "}
                                                {d.categoria ??
                                                  "—"}
                                              </p>

                                              <p>
                                                <strong>
                                                  Valor:
                                                </strong>{" "}
                                                {brl(
                                                  Number(
                                                    d.valor
                                                  )
                                                )}
                                              </p>

                                              <p>
                                                <strong>
                                                  Status:
                                                </strong>{" "}
                                                {d.status ===
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
                                              d.id
                                            )
                                          }
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Excluir
                                          despesa
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
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
                  {resumo.pendentes}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                  Total a pagar
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {brl(
                    resumo.valorPendente
                  )}
                </p>
              </div>
            </div>

            {pendentes.length ===
              0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">
                  Nenhuma despesa
                  pendente
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Todas as despesas
                  estão pagas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Data
                      </TableHead>

                      <TableHead>
                        Descrição
                      </TableHead>

                      <TableHead>
                        Categoria
                      </TableHead>

                      <TableHead>
                        Pagamento
                      </TableHead>

                      <TableHead className="text-right">
                        Valor
                      </TableHead>

                      <TableHead className="text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pendentes.map(
                      (d) => (
                        <TableRow
                          key={d.id}
                        >
                          <TableCell>
                            {dateBR(
                              d.data
                            )}
                          </TableCell>

                          <TableCell className="font-medium">
                            {
                              d.descricao
                            }
                          </TableCell>

                          <TableCell>
                            {d.categoria ??
                              "—"}
                          </TableCell>

                          <TableCell>
                            {d.forma_pagamento ??
                              "—"}
                          </TableCell>

                          <TableCell className="text-right font-medium text-destructive">
                            {brl(
                              Number(
                                d.valor
                              )
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm">
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Pagar
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
                                          Esta despesa será marcada
                                          como paga.
                                        </p>

                                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                                          <p>
                                            <strong>Descrição:</strong>{" "}
                                            {d.descricao}
                                          </p>

                                          <p>
                                            <strong>Categoria:</strong>{" "}
                                            {d.categoria ?? "—"}
                                          </p>

                                          <p>
                                            <strong>Valor:</strong>{" "}
                                            {brl(Number(d.valor))}
                                          </p>

                                          <p>
                                            <strong>
                                              Forma de pagamento:
                                            </strong>{" "}
                                            {d.forma_pagamento ?? "—"}
                                          </p>
                                        </div>

                                        <p>
                                          O valor será registrado como
                                          saída no fluxo de caixa.
                                        </p>
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>

                                    <AlertDialogAction
                                      onClick={() => onPay(d)}
                                    >
                                      Confirmar pagamento
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <DespesaDialog
                                despesa={d}
                                trigger={
                                  <Button
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Pencil className="mr-1 h-4 w-4" />
                                    Editar
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Section>
    </AppShell>
  );
}