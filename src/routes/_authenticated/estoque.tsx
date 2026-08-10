import { createFileRoute } from "@tanstack/react-router";
import { useProdutos } from "@/hooks/useProdutos";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { excluirProduto, } from "@/service/produto.service";
import { AppShell } from "@/components/layout/AppShell";
import { Section, EmptyState } from "@/components/dashboard/KpiCard";
import { ProdutoDialog } from "@/components/produtos/ProdutoDialog";
import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/useRealtime";
import { queryKeys } from "@/constants/queryKeys";
import { useGiroProdutos } from "@/hooks/useGiroProdutos";
import { EstoqueResumo } from "@/components/estoque/EstoqueResumo";
import { EstoqueFiltros } from "@/components/estoque/EstoqueFiltros";
import { TabelaProdutos } from "@/components/estoque/TabelaProdutos";
import { DetalhesProduto } from "@/components/estoque/DetalhesProduto";

export const Route = createFileRoute("/_authenticated/estoque")({ component: EstoquePage });

function EstoquePage() {
  useRealtime(["produtos", "vendas"]);

  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("__all");

  const [status, setStatus] = useState<
    "todos" | "ok" | "baixo" | "zerado" | "inativo"
  >("todos"); const [detalhes, setDetalhes] = useState<ProdutoFull | null>(null);

  const [ordemCodigo, setOrdemCodigo] =
    useState<"codigo-asc" | "codigo-desc">("codigo-asc");

  const { produtos, isLoading } = useProdutos();

  const { vendas } = useGiroProdutos();

  const giroMap = useMemo(() => {
    const m = new Map<string, number>();

    for (const v of vendas) {
      m.set(
        v.descricao ?? "",
        (m.get(v.descricao ?? "") ?? 0) +
        Number(v.quantidade ?? 0)
      );
    }

    return m;
  }, [vendas]);

  const categorias = useMemo(() => {
    const set = new Set<string>();

    for (const p of produtos) {
      if (p.categoria) {
        set.add(p.categoria);
      }
    }

    return Array.from(set).sort();
  }, [produtos]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();

    const resultado = produtos.filter((p) => {
      if (q) {
        const nome = (p.nome ?? p.descricao ?? "").toLowerCase();
        const desc = (p.descricao ?? "").toLowerCase();
        const marca = (p.marca ?? "").toLowerCase();

        if (
          !nome.includes(ql) &&
          !desc.includes(ql) &&
          !marca.includes(ql) &&
          !String(p.codigo).includes(q)
        ) {
          return false;
        }
      }

      if (
        categoria !== "__all" &&
        (p.categoria ?? "") !== categoria
      ) {
        return false;
      }

      const e = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);

      if (status === "ok" && !(e > min)) return false;
      if (status === "baixo" && !(e > 0 && e <= min)) return false;
      if (status === "zerado" && !(e <= 0)) return false;
      if (status === "inativo" && p.ativo !== false) return false;

      return true;
    });

    return [...resultado].sort((a, b) => {
      const codigoA = Number(a.codigo ?? 0);
      const codigoB = Number(b.codigo ?? 0);

      return ordemCodigo === "codigo-asc"
        ? codigoA - codigoB
        : codigoB - codigoA;
    });
  }, [produtos, q, categoria, status, ordemCodigo]);

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
  }, [produtos]);

  const empty = !isLoading && produtos.length === 0;

  const onDelete = async (p: ProdutoFull) => {
    try {
      await excluirProduto(p.id);

      toast.success("Produto excluído");

      await qc.invalidateQueries({
        queryKey: queryKeys.produtos.all,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao excluir produto"
      );
    }
  };

  return (
    <AppShell
      title="Produtos & Estoque"
      subtitle="Cadastro, controle e alertas"
      actions={<ProdutoDialog />}
    >
      <EstoqueResumo
        totalProdutos={k.totalProdutos}
        total={k.total}
        zerados={k.zerados}
        baixo={k.baixo}
        valorEstoque={k.valorEstoque}
      />

      <Section
        className="mt-6"
        title="Produtos"
        description={`${filtered.length} de ${produtos.length}`}
        actions={
          <EstoqueFiltros
            busca={q}
            categoria={categoria}
            status={status}
            categorias={categorias}
            ordemCodigo={ordemCodigo}
            onBuscaChange={setQ}
            onCategoriaChange={setCategoria}
            onStatusChange={setStatus}
            onOrdemCodigoChange={setOrdemCodigo}
          />
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
            <TabelaProdutos
              produtos={filtered.slice(0, 300)}
              giroMap={giroMap}
              onDetalhes={setDetalhes}
              onExcluir={onDelete}
            />
            {filtered.length > 300 && <div className="mt-2 text-xs text-muted-foreground">Mostrando 300 de {filtered.length}.</div>}
          </div>
        )}
      </Section>

      {/* Painel de detalhes */}
      <DetalhesProduto
        produto={detalhes}
        open={!!detalhes}
        onOpenChange={(open) => {
          if (!open) {
            setDetalhes(null);
          }
        }}
      />
    </AppShell>
  );
}
