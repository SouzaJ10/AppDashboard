import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import type { EstoqueFiltros } from "@/components/estoque/EstoqueFiltros";

import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";

type TabelaProdutosPropsTeste = {
  produtos: ProdutoFull[];
  giroMap: Map<string, number>;
};

const { produtos, vendas, tabelaProdutosMock } = vi.hoisted(() => ({
  produtos: [
    {
      id: "produto-a",
      empresa_id: "empresa-1",
      codigo: "A",
      descricao: "Terno Slim",
      estoque_atual: 10,
      estoque_minimo: 3,
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-01T10:00:00Z",
      nome: null,
      categoria: null,
      marca: null,
      unidade: "UN",
      custo_compra: 50,
      preco_venda: 100,
      fornecedor: null,
      observacoes: null,
      ativo: true,
    },
    {
      id: "produto-b",
      empresa_id: "empresa-1",
      codigo: "B",
      descricao: "Terno Slim",
      estoque_atual: 10,
      estoque_minimo: 3,
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-01T10:00:00Z",
      nome: null,
      categoria: null,
      marca: null,
      unidade: "UN",
      custo_compra: 50,
      preco_venda: 100,
      fornecedor: null,
      observacoes: null,
      ativo: true,
    },
    {
      id: "produto-c",
      empresa_id: "empresa-1",
      codigo: "C",
      descricao: "Terno Slim",
      estoque_atual: 10,
      estoque_minimo: 3,
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-01T10:00:00Z",
      nome: null,
      categoria: null,
      marca: null,
      unidade: "UN",
      custo_compra: 50,
      preco_venda: 100,
      fornecedor: null,
      observacoes: null,
      ativo: true,
    },
  ] as ProdutoFull[],
  vendas: [
    { produto_id: "produto-a", quantidade: 2 },
    { produto_id: "produto-a", quantidade: 3 },
    { produto_id: "produto-b", quantidade: 2 },
    { produto_id: null, quantidade: 10 },
  ],
  tabelaProdutosMock: vi.fn(
    (_props: TabelaProdutosPropsTeste) => null
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProdutos", () => ({
  useProdutos: () => ({
    produtos,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useGiroProdutos", () => ({
  useGiroProdutos: () => ({ vendas }),
}));

vi.mock("@/hooks/useRealtime", () => ({
  useRealtime: vi.fn(),
}));

vi.mock("@/contexts/EmpresaContext", () => ({
  useEmpresa: () => ({ empresaId: "empresa-1" }),
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children, actions }: { children: ReactNode; actions: ReactNode }) => <>{actions}{children}</>,
}));

vi.mock("@/components/dashboard/KpiCard", () => ({
  Section: ({ children, actions }: { children: ReactNode; actions: ReactNode }) => <>{actions}{children}</>,
  EmptyState: () => null,
}));

vi.mock("@/components/produtos/ProdutoDialog", () => ({
  ProdutoDialog: () => null,
}));

vi.mock("@/components/estoque/EstoqueResumo", () => ({
  EstoqueResumo: () => null,
}));

vi.mock("@/components/estoque/EstoqueFiltros", () => ({
  EstoqueFiltros: (p: ComponentProps<typeof EstoqueFiltros>) => <>
    <input aria-label="Busca" value={p.busca} onChange={(e) => p.onBuscaChange(e.target.value)} />
    <select aria-label="Categoria" value={p.categoria} onChange={(e) => p.onCategoriaChange(e.target.value)}>
      <option value="__all">Todas</option>
      {p.categorias.map((c) => <option key={c}>{c}</option>)}
    </select>
    <select aria-label="Status" value={p.status} onChange={(e) => p.onStatusChange(e.target.value as typeof p.status)}>
      {["todos", "ok", "baixo", "zerado", "inativo"].map((s) => <option key={s}>{s}</option>)}
    </select>
    <button onClick={() => p.onOrdemCodigoChange("codigo-desc")}>Ordem decrescente</button>
  </>,
}));

vi.mock("@/components/estoque/DetalhesProduto", () => ({
  DetalhesProduto: () => null,
}));

vi.mock("@/components/estoque/TabelaProdutos", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/estoque/TabelaProdutos")>(),
  TabelaProdutos: tabelaProdutosMock,
}));

vi.mock("@/lib/export-xlsx", () => ({ exportToXlsx: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { EstoquePage } from "@/routes/_authenticated/estoque";
import { exportToXlsx } from "@/lib/export-xlsx";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";

const originais = produtos.map((p) => ({ ...p }));
beforeEach(() => {
  vi.clearAllMocks();
  produtos.splice(0, produtos.length, ...originais.map((p) => ({ ...p })));
});
afterEach(cleanup);

function exportar() {
  fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
  return vi.mocked(exportToXlsx).mock.calls.at(-1)![1].Estoque;
}

function visiveis() {
  return tabelaProdutosMock.mock.calls.at(-1)![0].produtos;
}

describe("giro dos produtos em estoque", () => {
  it("soma somente vendas vinculadas e separa produtos com a mesma descrição", () => {
    render(<EstoquePage />);

    expect(tabelaProdutosMock).toHaveBeenCalledTimes(1);

    const props = tabelaProdutosMock.mock.calls[0][0];

    expect(props.produtos).toEqual(produtos);
    expect([...props.giroMap]).toEqual([
      ["produto-a", 5],
      ["produto-b", 2],
    ]);
    expect(props.giroMap.get("produto-c") ?? 0).toBe(0);
  });
});

describe("exportação operacional do estoque", () => {
  it("exporta o conjunto da tabela, giro por ID e valores numéricos sem campos técnicos", () => {
    produtos[0].nome = "Nome comercial";
    produtos[0].marca = "Marca A";
    render(<EstoquePage />);
    const rows = exportar();
    expect(exportToXlsx).toHaveBeenCalledWith(`estoque_${todayISO()}`, { Estoque: rows });
    expect(rows.map((r) => r.Código)).toEqual(visiveis().map((p) => p.codigo));
    expect(rows.map((r) => r.Giro)).toEqual([5, 2, 0]);
    expect(rows[0]).toEqual({
      Código: "A", Produto: "Nome comercial", Descrição: "Terno Slim",
      Categoria: "", Marca: "Marca A", Unidade: "UN",
      "Estoque atual": 10, "Estoque mínimo": 3, "Situação do estoque": "OK",
      Giro: 5, "Custo de compra unitário": 50, "Preço de venda unitário": 100,
      "Valor em estoque": 500, "Status do produto": "Ativo",
    });
  });

  it("combina busca, categoria e status no mesmo conjunto da tabela", () => {
    produtos[0].categoria = "Roupas";
    produtos[0].estoque_atual = 2;
    produtos[1].categoria = "Outra";
    produtos[1].estoque_atual = 2;
    produtos[2].categoria = "Roupas";
    render(<EstoquePage />);
    fireEvent.change(screen.getByLabelText("Busca"), { target: { value: "Terno" } });
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "Roupas" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "baixo" } });
    expect(exportar().map((r) => r.Código)).toEqual(["A"]);
    expect(visiveis().map((p) => p.codigo)).toEqual(["A"]);
    fireEvent.change(screen.getByLabelText("Busca"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(visiveis()).toEqual([]);
    expect(exportToXlsx).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith("Não existem registros para exportar.");
  });

  it("preserva ordenação numérica e o limite de 300 na tabela e no XLSX", () => {
    produtos.splice(0, produtos.length, ...Array.from({ length: 305 }, (_, i) => ({
      ...originais[0], id: `id-${i}`, codigo: String(i + 1),
    })));
    render(<EstoquePage />);
    fireEvent.click(screen.getByRole("button", { name: "Ordem decrescente" }));
    const rows = exportar();
    expect(rows).toHaveLength(300);
    expect(rows.map((r) => r.Código)).toEqual(visiveis().map((p) => p.codigo));
    expect(rows[0].Código).toBe("305");
    expect(rows[299].Código).toBe("6");
  });

  it.each([-1, 0, 3, 4])("preserva classificação de estoque %s e inatividade independente", (estoque) => {
    produtos[0].estoque_atual = estoque;
    produtos[0].ativo = false;
    render(<EstoquePage />);
    const rows = exportar();
    expect(rows[0]["Situação do estoque"]).toBe(estoque <= 0 ? "Zerado" : estoque <= 3 ? "Crítico" : "OK");
    expect(rows[0]["Status do produto"]).toBe("Inativo");
    expect(rows[1]["Status do produto"]).toBe("Ativo");
    expect(rows[0]["Valor em estoque"]).toBe(estoque * 50);
    expect(rows[0]).not.toHaveProperty("Descrição");
  });

  it("não gera arquivo quando não há produtos", () => {
    produtos.splice(0);
    render(<EstoquePage />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(exportToXlsx).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Não existem registros para exportar.");
  });
});
