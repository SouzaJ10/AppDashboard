import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider,
} from "@tanstack/react-router";

const compras = vi.hoisted(() => [
  { id: "vencida", descricao: "Compra vencida", fornecedor: "A", data: "2026-09-01", data_vencimento: "2026-09-15", forma_pagamento: "a_prazo", status_pagamento: "pendente", custo_total: 100 },
  { id: "hoje", descricao: "Compra hoje", fornecedor: "B", data: "2026-09-02", data_vencimento: "2026-09-16", forma_pagamento: "a_prazo", status_pagamento: "pendente", custo_total: 200 },
  { id: "proxima", descricao: "Compra próxima", fornecedor: "A", data: "2026-09-03", data_vencimento: "2026-09-20", forma_pagamento: "a_prazo", status_pagamento: "pendente", custo_total: 300 },
  { id: "sem", descricao: "Compra sem vencimento", fornecedor: "B", data: "2026-08-01", data_vencimento: null, forma_pagamento: "a_prazo", status_pagamento: "pendente", custo_total: 400 },
  { id: "paga", descricao: "Compra paga", fornecedor: "A", data: "2026-09-03", data_vencimento: "2026-09-15", forma_pagamento: "a_prazo", status_pagamento: "pago", custo_total: 500 },
  { id: "vista", descricao: "Compra à vista", fornecedor: "A", data: "2026-09-03", data_vencimento: "2026-09-15", forma_pagamento: "a_vista", status_pagamento: "pendente", custo_total: 600 },
]);

vi.mock("@/hooks/useCompras", () => ({ useCompras: () => ({ compras, isLoading: false }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === "compras" ? compras : [] }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/contexts/EmpresaContext", () => ({ useEmpresa: () => ({ empresaId: "empresa-1" }) }));
vi.mock("@/hooks/useRealtime", () => ({ useRealtime: vi.fn() }));
vi.mock("@/service/compras.service", () => ({ listarCompras: vi.fn(), pagarCompra: vi.fn(), excluirCompra: vi.fn() }));
vi.mock("@/service/movimentacoes.service", () => ({ listarMovimentacoes: vi.fn() }));
vi.mock("@/components/compras/NovaCompraDialog", () => ({ NovaCompraDialog: () => null }));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/lib/export-xlsx", () => ({ exportToXlsx: vi.fn() }));
vi.mock("@/lib/format", async (original) => ({
  ...await original<typeof import("@/lib/format")>(), todayISO: () => "2026-09-16",
}));
vi.mock("recharts", () => Object.fromEntries([
  "AreaChart", "Area", "XAxis", "YAxis", "Tooltip", "ResponsiveContainer", "CartesianGrid", "Legend", "BarChart", "Bar",
].map((name) => [name, () => null])));
// Mantemos o Router real; o seletor nativo evita depender do layout/pointer do Radix no JSDOM.
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => <select aria-label="Filtro" value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
}));

import { Route as ComprasRoute } from "./compras";
import { Route as FinanceiroRoute } from "./financeiro";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { exportToXlsx } from "@/lib/export-xlsx";

const Financeiro = FinanceiroRoute.options.component!;
const k = {
  lucroLiquido: 0, saldoCaixa: 0, entradas: 0, saidas: 0, faturamento: 0, margem: 0,
  valorContasPagar: 1000, contasAPagar: 4, despesasPendentes: 0, comprasMes: 0,
  valorComprasMes: 0, valorEstoque: 0, ticket: 0, qtdVendida: 0, roi: 0,
  totalProdutos: 0, baixo: 0, valorVencido: 100, contasVencidas: 1, zerados: 0,
};

async function abrir(url: string) {
  const root = createRootRoute({ component: Outlet });
  const authenticated = createRoute({ getParentRoute: () => root, id: "_authenticated", component: Outlet });
  // Inicializa a própria file route, como faz routeTree.gen.ts, incluindo seus hooks vinculados.
  const route = ComprasRoute.update({ id: "/compras", path: "/compras", getParentRoute: () => authenticated } as never);
  const dashboard = createRoute({ getParentRoute: () => authenticated, path: "dashboard", component: () => <DashboardKPIs k={k} totalVendas={0} /> });
  const financeiro = createRoute({ getParentRoute: () => authenticated, path: "financeiro", component: Financeiro });
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({ routeTree: root.addChildren([authenticated.addChildren([route, dashboard, financeiro])]), history, defaultPendingMinMs: 0 });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByText(url.startsWith("/compras") ? "Compras no mês" : url.startsWith("/dashboard") ? "Resumo executivo" : "Saldo em caixa");
  return { router, history };
}

function produtosExibidos() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[1].textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("Compras: contexto reproduzível na URL", () => {
  it("sem parâmetros mantém Histórico e todos os registros", async () => {
    const { router } = await abrir("/compras");
    expect(screen.getByRole("tab", { name: "Histórico de compras" })).toHaveAttribute("aria-selected", "true");
    expect(produtosExibidos()).toEqual(compras.map((c) => c.descricao));
    expect(router.state.location.search).not.toHaveProperty("vencimento");
  });

  it("URL direta de contas inicializa aba/filtro e preserva exatamente as quatro pendentes a prazo", async () => {
    await abrir("/compras?aba=contas");
    expect(screen.getByRole("tab", { name: /Contas a pagar/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox")).toHaveValue("__all__");
    expect(produtosExibidos()).toEqual(["Compra vencida", "Compra hoje", "Compra próxima", "Compra sem vencimento"]);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(vi.mocked(exportToXlsx).mock.calls[0][1]["Contas a pagar"].map((r) => r.Produto)).toEqual(produtosExibidos());
  });

  it("URL direta vencida exclui hoje, pagas e à vista, com lista/exportação idênticas", async () => {
    await abrir("/compras?aba=contas&vencimento=vencida");
    expect(screen.getByRole("combobox")).toHaveValue("vencida");
    expect(produtosExibidos()).toEqual(["Compra vencida"]);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(vi.mocked(exportToXlsx).mock.calls[0][1]["Contas a pagar"]).toEqual([expect.objectContaining({ Produto: "Compra vencida", Valor: 100 })]);
    expect(screen.getByRole("button", { name: /Vencidas/ })).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["/compras?aba=invalida&vencimento=invalido", "/compras?aba=contas&vencimento=invalido"])("parâmetros inválidos têm fallback seguro: %s", async (url) => {
    await abrir(url);
    if (url.includes("aba=contas")) {
      expect(screen.getByRole("combobox")).toHaveValue("__all__");
      expect(produtosExibidos()).toHaveLength(4);
    } else {
      expect(screen.getByRole("tab", { name: "Histórico de compras" })).toHaveAttribute("aria-selected", "true");
      expect(produtosExibidos()).toHaveLength(6);
    }
  });

  it("troca de aba/filtro atualiza URL e voltar/avançar restaura controles e lista", async () => {
    const { router, history } = await abrir("/compras");
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Contas a pagar/ }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(router.state.location.search).toMatchObject({ aba: "contas" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "vencida" } });
    await waitFor(() => expect(router.state.location.search).toMatchObject({ aba: "contas", vencimento: "vencida" }));
    expect(produtosExibidos()).toEqual(["Compra vencida"]);
    await act(async () => { history.back(); });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("__all__"));
    expect(produtosExibidos()).toHaveLength(4);
    await act(async () => { history.back(); });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Histórico de compras" })).toHaveAttribute("aria-selected", "true"));
    await act(async () => { history.forward(); });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("__all__"));
    await act(async () => { history.forward(); });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("vencida"));
    expect(produtosExibidos()).toEqual(["Compra vencida"]);
  });

  it("cards locais usam a mesma URL, sem tornar Vencendo em 7 dias interativo", async () => {
    const { router } = await abrir("/compras?aba=contas");
    fireEvent.click(screen.getByRole("button", { name: /Vencidas/ }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ vencimento: "vencida" }));
    fireEvent.click(screen.getByRole("button", { name: /Total a pagar/ }));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("__all__"));
    expect(router.state.location.search).not.toHaveProperty("vencimento");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "hoje" } });
    await waitFor(() => expect(produtosExibidos()).toEqual(["Compra hoje"]));
    fireEvent.click(screen.getByRole("button", { name: /Contas pendentes/ }));
    await waitFor(() => expect(produtosExibidos()).toHaveLength(4));
    expect(screen.queryByRole("button", { name: /Vencendo em 7 dias/ })).not.toBeInTheDocument();
  });

  it("busca, fornecedor e período continuam locais e combinados, sem limitar contas", async () => {
    const { router } = await abrir("/compras");
    fireEvent.change(screen.getByPlaceholderText("Buscar produto, código ou fornecedor..."), { target: { value: "Compra" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-01" } });
    expect(produtosExibidos()).toEqual(["Compra vencida"]);
    expect(router.state.location.search).toEqual({ aba: "historico" });
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Contas a pagar/ }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(produtosExibidos()).toHaveLength(4));
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Histórico de compras" }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.getByLabelText("Data final")).toHaveValue("2026-09-01"));
    expect(produtosExibidos()).toEqual(["Compra vencida"]);
    expect(router.state.location.search).toEqual({ aba: "historico" });
  });
});

describe("indicadores abrem os registros que explicam seus números", () => {
  it.each([
    ["/dashboard", "Ver contas a pagar", undefined, 4, 1000],
    ["/dashboard", "Ver contas vencidas", "vencida", 1, 100],
    ["/financeiro", "Ver contas a pagar", undefined, 4, 1000],
    ["/financeiro", "Ver contas vencidas", "vencida", 1, 100],
  ])("%s: %s", async (origem, nome, vencimento, quantidade, valor) => {
    const { router } = await abrir(origem);
    const link = screen.getByRole("link", { name: nome });
    const destino = new URL(link.getAttribute("href")!, "http://localhost");
    expect(destino.pathname).toBe("/compras");
    expect(destino.searchParams.get("aba")).toBe("contas");
    expect(destino.searchParams.get("vencimento")).toBe(vencimento ?? null);
    expect(destino.searchParams.size).toBe(vencimento ? 2 : 1);
    expect(link.className).toContain("focus-visible:ring-2");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    fireEvent.click(link);
    await waitFor(() => expect(router.state.location.pathname).toBe("/compras"));
    await screen.findByRole("combobox");
    expect(produtosExibidos()).toHaveLength(quantidade);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    const rows = vi.mocked(exportToXlsx).mock.calls[0][1]["Contas a pagar"];
    expect(rows.map((r) => r.Produto)).toEqual(produtosExibidos());
    expect(rows.reduce((s, r) => s + Number(r.Valor), 0)).toBe(valor);
  });
});
