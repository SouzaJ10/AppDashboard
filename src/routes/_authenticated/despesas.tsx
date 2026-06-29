import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section, EmptyState } from "@/components/dashboard/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DespesaDialog } from "@/components/despesas/DespesaDialog";
import { useRealtime } from "@/hooks/useRealtime";
import { brl, dateBR } from "@/lib/format";
import { exportToXlsx } from "@/lib/export-xlsx";
import type { Despesa } from "@/integrations/supabase/despesas-extra";
import { Trash2, Download, TrendingDown, Calendar, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/despesas")({ component: DespesasPage });

function DespesasPage() {
  useRealtime(["despesas", "categorias_despesa"]);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");

  const despesasQ = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas" as never)
        .select("*")
        .order("data", { ascending: false });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("does not exist") || msg.includes("schema cache")) return [];
        throw error;
      }
      return (data ?? []) as unknown as Despesa[];
    },
  });

  const despesas = despesasQ.data ?? [];
  const missingTable = despesasQ.isError === false && despesas.length === 0 && despesasQ.fetchStatus === "idle";

  const categorias = useMemo(() => {
    const s = new Set<string>();
    for (const d of despesas) if (d.categoria) s.add(d.categoria);
    return Array.from(s).sort();
  }, [despesas]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return despesas.filter((d) => {
      if (catFilter !== "__all__" && d.categoria !== catFilter) return false;
      if (statusFilter !== "__all__" && d.status !== statusFilter) return false;
      if (!ql) return true;
      return (
        d.descricao?.toLowerCase().includes(ql) ||
        d.categoria?.toLowerCase().includes(ql) ||
        d.centro_custo?.toLowerCase().includes(ql)
      );
    });
  }, [despesas, q, catFilter, statusFilter]);

  const k = useMemo(() => {
    const now = new Date();
    const yyyymm = now.toISOString().slice(0, 7);
    const total = despesas.reduce((s, d) => s + Number(d.valor ?? 0), 0);
    const totalPagas = despesas.filter((d) => d.status === "pago").reduce((s, d) => s + Number(d.valor), 0);
    const totalPendentes = despesas.filter((d) => d.status === "pendente").reduce((s, d) => s + Number(d.valor), 0);
    const mes = despesas.filter((d) => (d.data ?? "").startsWith(yyyymm)).reduce((s, d) => s + Number(d.valor), 0);
    return { total, totalPagas, totalPendentes, mes };
  }, [despesas]);

  const onDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("despesas" as never).delete().eq("id", id);
      if (error) throw error;
      toast.success("Despesa excluída");
      qc.invalidateQueries({ queryKey: ["despesas"] });
    } catch (e) {
      toast.error("Erro ao excluir", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const onExport = () => {
    const rows = filtered.map((d) => ({
      Data: d.data,
      Descrição: d.descricao,
      Categoria: d.categoria ?? "",
      Valor: Number(d.valor),
      "Forma de pagamento": d.forma_pagamento ?? "",
      "Centro de custo": d.centro_custo ?? "",
      Status: d.status,
      Observações: d.observacoes ?? "",
    }));
    exportToXlsx(`despesas_${new Date().toISOString().slice(0, 10)}`, { Despesas: rows });
  };

  return (
    <AppShell title="Despesas" subtitle="Saídas, custos e contas a pagar"
      actions={<div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}><Download className="mr-1 h-4 w-4" /> Exportar</Button>
        <DespesaDialog />
      </div>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total despesas" value={brl(k.total)} icon={TrendingDown} tone="destructive" />
        <KpiCard label="Pagas" value={brl(k.totalPagas)} icon={Wallet} tone="success" />
        <KpiCard label="Pendentes" value={brl(k.totalPendentes)} icon={AlertCircle} tone="default" />
        <KpiCard label="No mês atual" value={brl(k.mes)} icon={Calendar} tone="default" />
      </div>

      <Section className="mt-6" title="Filtrar e buscar">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Buscar descrição, categoria, centro de custo..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os status</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section className="mt-6" title={`${filtered.length} despesa(s)`}>
        {missingTable && despesasQ.isFetched ? (
          <EmptyState title="Tabela despesas ainda não existe"
            description="Aplique docs/sql/2026-06-28_despesas_module.sql no Supabase para começar a registrar despesas." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma despesa encontrada" description="Clique em Nova Despesa para começar." />
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{dateBR(d.data)}</TableCell>
                    <TableCell className="max-w-xs truncate">{d.descricao}</TableCell>
                    <TableCell>{d.categoria ?? "—"}</TableCell>
                    <TableCell>{d.forma_pagamento ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === "pago" ? "default" : "outline"}>
                        {d.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">{brl(Number(d.valor))}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <DespesaDialog despesa={d} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A despesa "{d.descricao}" no valor de {brl(Number(d.valor))} será removida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(d.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </AppShell>
  );
}