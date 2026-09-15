import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  ] satisfies ProdutoFull[],
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
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/dashboard/KpiCard", () => ({
  Section: ({ children }: { children: React.ReactNode }) => children,
  EmptyState: () => null,
}));

vi.mock("@/components/produtos/ProdutoDialog", () => ({
  ProdutoDialog: () => null,
}));

vi.mock("@/components/estoque/EstoqueResumo", () => ({
  EstoqueResumo: () => null,
}));

vi.mock("@/components/estoque/EstoqueFiltros", () => ({
  EstoqueFiltros: () => null,
}));

vi.mock("@/components/estoque/DetalhesProduto", () => ({
  DetalhesProduto: () => null,
}));

vi.mock("@/components/estoque/TabelaProdutos", () => ({
  TabelaProdutos: tabelaProdutosMock,
}));

import { EstoquePage } from "@/routes/_authenticated/estoque";

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
