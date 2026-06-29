import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, Section, EmptyState } from "@/components/dashboard/KpiCard";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Package, AlertTriangle, XCircle, Boxes, DollarSign, Trash2, Eye } from "lucide-react";
import { num, brl } from "@/lib/format";
import { ProdutoDialog } from "@/components/produtos/ProdutoDialog";
import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/useRealtime";

export const Route = createFileRoute("/_authenticated/estoque")({ component: EstoquePage });

function EstoquePage() {
  useRealtime(["produtos", "vendas"]);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<string>("__all");
  const [status, setStatus] = useState<"todos" | "ok" | "baixo" | "zerado" | "inativo">("todos");
  const [detalhes, setDetalhes] = useState<ProdutoFull | null>(null);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos-all"],
    queryFn: async () =>
      ((await supabase.from("produtos").select("*").order("codigo")).data ?? []) as unknown as ProdutoFull[],
  });
  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-giro"],
    queryFn: async () => (await supabase.from("vendas").select("descricao,quantidade")).data ?? [],
  });

  const giroMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vendas) m.set(v.descricao ?? "", (m.get(v.descricao ?? "") ?? 0) + Number(v.quantidade ?? 0));
    return m;
  }, [vendas]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtos) if (p.categoria) set.add(p.categoria);
    return Array.from(set).sort();
  }, [produtos]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return produtos.filter((p) => {
      if (q) {
        const nome = (p.nome ?? p.descricao ?? "").toLowerCase();
        const desc = (p.descricao ?? "").toLowerCase();
        const marca = (p.marca ?? "").toLowerCase();
        if (!nome.includes(ql) && !desc.includes(ql) && !marca.includes(ql) && !String(p.codigo).includes(q)) return false;
      }
      if (categoria !== "__all" && (p.categoria ?? "") !== categoria) return false;
      const e = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);
      if (status === "ok" && !(e > min)) return false;
      if (status === "baixo" && !(e > 0 && e <= min)) return false;
      if (status === "zerado" && !(e <= 0)) return false;
      if (status === "inativo" && p.ativo !== false) return false;
      return true;
    });
  }, [produtos, q, categoria, status]);

  const k = useMemo(() => {
    const totalProdutos = produtos.length;
    const total = produtos.reduce((s, p) => s + Number(p.estoque_atual ?? 0), 0);
    const valorEstoque = produtos.reduce(
      (s, p) => s + Number(p.estoque_atual ?? 0) * Number(p.custo_compra ?? 0),
      0,
    );
    const zerados = produtos.filter((p) => Number(p.estoque_atual ?? 0) <= 0).length;
    const baixo = produtos.filter((p) => {
      const e = Number(p.estoque_atual ?? 0);
      const m = Number(p.estoque_minimo ?? 0);
      return e > 0 && e <= m;
    }).length;
    return { totalProdutos, total, zerados, baixo, valorEstoque };
  }, [produtos, giroMap]);

  const empty = !isLoading && produtos.length === 0;
  const statusOf = (e: number, m: number) => {
    if (e <= 0) return { label: "Zerado", tone: "destructive" as const };
    if (e <= m) return { label: "Crítico", tone: "warning" as const };
    return { label: "OK", tone: "success" as const };
  };

  const onDelete = async (p: ProdutoFull) => {
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Produto excluído");
    qc.invalidateQueries();
  };

  return (
    <AppShell
      title="Produtos & Estoque"
      subtitle="Cadastro, controle e alertas"
      actions={<ProdutoDialog />}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total de produtos" value={num(k.totalProdutos)} icon={Package} />
        <KpiCard label="Itens em estoque" value={num(k.total)} icon={Boxes} hint={`Valor: ${brl(k.valorEstoque)}`} />
        <KpiCard label="SKUs zerados" value={num(k.zerados)} icon={XCircle} tone="destructive" />
        <KpiCard label="Estoque baixo" value={num(k.baixo)} icon={AlertTriangle} tone="warning" />
      </div>

      <Section
        className="mt-6"
        title="Produtos"
        description={`${filtered.length} de ${produtos.length}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="Buscar nome, código, marca..." value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas categorias</SelectItem>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="baixo">Estoque baixo</SelectItem>
                <SelectItem value="zerado">Zerado</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {empty ? (
          <EmptyState
            title="Nenhum produto cadastrado"
            description="Clique em ‘Novo Produto’ para cadastrar o primeiro item."
            action={<ProdutoDialog />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mín.</TableHead>
                  <TableHead className="text-right">Giro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 300).map((p) => {
                  const e = Number(p.estoque_atual ?? 0);
                  const m = Number(p.estoque_minimo ?? 0);
                  const giro = giroMap.get(p.descricao ?? "") ?? 0;
                  const st = statusOf(e, m);
                  const toneCls = st.tone === "destructive" ? "bg-destructive/15 text-destructive border-destructive/30"
                    : st.tone === "warning" ? "bg-warning/15 text-warning-foreground border-warning/30"
                    : "bg-success/15 text-success border-success/30";
                  const rowCls = st.tone === "destructive"
                    ? "bg-destructive/5"
                    : st.tone === "warning" ? "bg-warning/5" : "";
                  return (
                    <TableRow key={p.id} className={rowCls}>
                      <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        <div className="font-medium">{p.nome ?? p.descricao}</div>
                        {p.marca && <div className="text-[11px] text-muted-foreground">{p.marca}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.categoria ?? "—"}</TableCell>
                      <TableCell className="text-right">{brl(Number(p.preco_venda ?? 0))}</TableCell>
                      <TableCell className="text-right font-medium">{num(e)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{num(m)}</TableCell>
                      <TableCell className="text-right">{num(giro)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={toneCls}>{st.label}</Badge>
                        {p.ativo === false && (
                          <Badge variant="outline" className="ml-1 border-border text-muted-foreground">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Detalhes" onClick={() => setDetalhes(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <ProdutoDialog produto={p} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Excluir">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O produto
                                  <span className="font-semibold"> {p.nome ?? p.descricao} </span>
                                  será removido permanentemente. Vendas já registradas serão mantidas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(p)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length > 300 && <div className="mt-2 text-xs text-muted-foreground">Mostrando 300 de {filtered.length}.</div>}
          </div>
        )}
      </Section>

      {/* Painel de detalhes */}
      <AlertDialog open={!!detalhes} onOpenChange={(o) => !o && setDetalhes(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{detalhes?.nome ?? detalhes?.descricao}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
                <div><span className="text-muted-foreground">Código:</span> {detalhes?.codigo}</div>
                <div><span className="text-muted-foreground">Categoria:</span> {detalhes?.categoria ?? "—"}</div>
                <div><span className="text-muted-foreground">Marca:</span> {detalhes?.marca ?? "—"}</div>
                <div><span className="text-muted-foreground">Unidade:</span> {detalhes?.unidade ?? "—"}</div>
                <div><span className="text-muted-foreground">Custo:</span> {brl(Number(detalhes?.custo_compra ?? 0))}</div>
                <div><span className="text-muted-foreground">Preço:</span> {brl(Number(detalhes?.preco_venda ?? 0))}</div>
                <div><span className="text-muted-foreground">Estoque:</span> {num(Number(detalhes?.estoque_atual ?? 0))}</div>
                <div><span className="text-muted-foreground">Mínimo:</span> {num(Number(detalhes?.estoque_minimo ?? 0))}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Fornecedor:</span> {detalhes?.fornecedor ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Descrição:</span> {detalhes?.descricao ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Observações:</span> {detalhes?.observacoes ?? "—"}</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
