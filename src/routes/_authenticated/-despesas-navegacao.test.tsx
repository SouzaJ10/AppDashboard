import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider,
} from "@tanstack/react-router";
import type { Despesa } from "@/integrations/supabase/despesas-extra";

const despesas = vi.hoisted(() => {
  const pendentes: Despesa[] = [
    { id: "vencida", descricao: "Aluguel vencido", data: "2027-01-01", data_vencimento: "2026-09-15", valor: 100, categoria: "Aluguel" },
    { id: "hoje", descricao: "Energia hoje", data: "2020-01-01", data_vencimento: "2026-09-16", valor: 200, categoria: "Energia" },
    { id: "amanha", descricao: "Energia amanhã", data: "2026-09-02", data_vencimento: "2026-09-17", valor: 300, categoria: "Energia" },
    { id: "limite", descricao: "Energia em sete dias", data: "2026-09-03", data_vencimento: "2026-09-23", valor: 350, categoria: "Energia" },
    { id: "futura", descricao: "Aluguel futuro", data: "2020-01-01", data_vencimento: "2026-09-24", valor: 400, categoria: "Aluguel" },
    { id: "sem", descricao: "Aluguel sem vencimento", data: "2020-01-01", data_vencimento: null, valor: 500, categoria: "Aluguel" },
  ].map((d) => ({
    ...d, status: "pendente", forma_pagamento: null, centro_custo: "Loja", observacoes: null,
    user_id: null, created_at: "", updated_at: "",
  }));
  return [
    ...pendentes,
    ...pendentes.map((d) => ({ ...d, id: `paga-${d.id}`, descricao: `Paga ${d.id}`, status: "pago" as const })),
  ];
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: despesas, isLoading: false, isError: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/contexts/EmpresaContext", () => ({ useEmpresa: () => ({ empresaId: "empresa-1" }) }));
vi.mock("@/hooks/useRealtime", () => ({ useRealtime: vi.fn() }));
vi.mock("@/service/despesas.service", () => ({ listarDespesas: vi.fn(), pagarDespesa: vi.fn(), excluirDespesa: vi.fn() }));
vi.mock("@/components/despesas/DespesaDialog", () => ({ DespesaDialog: () => null }));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/lib/export-xlsx", () => ({ exportToXlsx: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/format", async (original) => ({
  ...await original<typeof import("@/lib/format")>(), todayISO: () => "2026-09-16",
}));
// O Router e Tabs são reais. O seletor nativo evita depender do layout/pointer do Radix no JSDOM.
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => <select aria-label="Filtro" value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
}));

import { Route as DespesasRoute } from "./despesas";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { exportToXlsx } from "@/lib/export-xlsx";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";

const k = {
  lucroLiquido: 0, saldoCaixa: 0, entradas: 0, saidas: 0, faturamento: 0, margem: 0,
  valorContasPagar: 0, contasAPagar: 0, despesasPendentes: 1850, comprasMes: 0,
  valorComprasMes: 0, valorEstoque: 0, ticket: 0, qtdVendida: 0, roi: 0,
  totalProdutos: 0, baixo: 0, valorVencido: 0, contasVencidas: 0, zerados: 0,
};
const casos = [
  { status: "vencida", label: "Vencidas", ids: ["vencida"], valor: 100 },
  { status: "hoje", label: "Vence hoje", ids: ["hoje"], valor: 200 },
  { status: "proximos_7_dias", label: "Próximos 7 dias", ids: ["amanha", "limite"], valor: 650 },
  { status: "futura", label: "Futuras", ids: ["futura"], valor: 400 },
  { status: "sem_vencimento", label: "Sem vencimento", ids: ["sem"], valor: 500 },
] as const;

async function abrir(url: string) {
  const root = createRootRoute({ component: Outlet });
  const authenticated = createRoute({ getParentRoute: () => root, id: "_authenticated", component: Outlet });
  const route = DespesasRoute.update({ id: "/despesas", path: "/despesas", getParentRoute: () => authenticated } as never);
  const dashboard = createRoute({ getParentRoute: () => authenticated, path: "dashboard", component: () => <DashboardKPIs k={k} totalVendas={0} /> });
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({ routeTree: root.addChildren([authenticated.addChildren([route, dashboard])]), history, defaultPendingMinMs: 0 });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByText(url.startsWith("/despesas") ? "Despesas no mês" : "Resumo executivo");
  return { router, history };
}

function descricoesExibidas() {
  const table = screen.getByRole("table");
  const headers = within(table).getAllByRole("columnheader");
  const indice = headers.findIndex((h) => h.textContent?.trim() === "Descrição");
  return within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[indice].textContent);
}

function exportarContas() {
  fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
  const [nome, sheets] = vi.mocked(exportToXlsx).mock.calls.at(-1)!;
  expect(nome).toBe("contas_a_pagar_despesas_2026-09-16");
  expect(Object.keys(sheets)).toEqual(["Contas a pagar"]);
  expect(sheets["Contas a pagar"].map((r) => r.Descrição)).toEqual(descricoesExibidas());
  return sheets["Contas a pagar"];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("Despesas: URL e paridade dos vencimentos", () => {
  it("sem parâmetros abre Histórico, sem aplicar vencimento", async () => {
    await abrir("/despesas");
    expect(screen.getByRole("tab", { name: "Histórico de despesas" })).toHaveAttribute("aria-selected", "true");
    expect(descricoesExibidas()).toEqual(despesas.map((d) => d.descricao));
  });

  it("aba=contas sem vencimento mostra todas e somente as pendentes", async () => {
    await abrir("/despesas?aba=contas");
    expect(screen.getByRole("tab", { name: /Contas a pagar/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox")).toHaveValue("__all__");
    expect(descricoesExibidas()).toEqual(despesas.filter((d) => d.status === "pendente").map((d) => d.descricao));
    expect(exportarContas().reduce((s, r) => s + Number(r.Valor), 0)).toBe(1850);
  });

  it.each(casos)("URL direta $status inicializa os controles, lista e XLSX pelo vencimento, não por data", async ({ status, label, ids, valor }) => {
    await abrir(`/despesas?aba=contas&vencimento=${status}`);
    expect(screen.getByRole("combobox")).toHaveValue(status);
    const esperadas = despesas.filter((d) => (ids as readonly string[]).includes(d.id));
    expect(descricoesExibidas()).toEqual(esperadas.map((d) => d.descricao));
    const card = screen.getByRole("button", { name: new RegExp(`^${label}`) });
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByText(String(ids.length))).toBeInTheDocument();
    expect(card.textContent).toContain(brl(valor));
    const rows = exportarContas();
    expect(rows.reduce((s, r) => s + Number(r.Valor), 0)).toBe(valor);
    expect(rows.map((r) => r.Status)).toEqual(ids.map(() => "Pendente"));
    expect(Object.keys(rows[0])).toEqual([
      "Data da despesa", "Descrição", "Categoria", "Valor", "Forma de pagamento", "Centro de custo", "Status", "Observações", "Data de vencimento", "Situação do vencimento",
    ]);
    expect(rows[0]["Data da despesa"]).toBe(dateBR(esperadas[0].data));
    expect(rows[0]["Data de vencimento"]).toBe(esperadas[0].data_vencimento ? dateBR(esperadas[0].data_vencimento) : "");
  });

  it.each([
    "/despesas?aba=invalida&vencimento=invalido",
    "/despesas?aba=contas&vencimento=invalido",
  ])("parâmetros inválidos têm fallback seguro: %s", async (url) => {
    await abrir(url);
    if (url.includes("aba=contas")) {
      expect(screen.getByRole("combobox")).toHaveValue("__all__");
      expect(descricoesExibidas()).toHaveLength(6);
    } else {
      expect(screen.getByRole("tab", { name: "Histórico de despesas" })).toHaveAttribute("aria-selected", "true");
      expect(descricoesExibidas()).toHaveLength(12);
    }
  });

  it("troca de aba/seletor atualiza a URL e voltar/avançar restaura a interface", async () => {
    const { router, history } = await abrir("/despesas");
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Contas a pagar/ }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(router.state.location.search).toEqual({ aba: "contas" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "vencida" } });
    await waitFor(() => expect(router.state.location.search).toEqual({ aba: "contas", vencimento: "vencida" }));
    expect(descricoesExibidas()).toEqual(["Aluguel vencido"]);
    await act(async () => { history.back(); });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("__all__"));
    expect(descricoesExibidas()).toHaveLength(6);
    await act(async () => { history.back(); });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Histórico de despesas" })).toHaveAttribute("aria-selected", "true"));
    await act(async () => { history.forward(); });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("__all__"));
    await act(async () => { history.forward(); });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("vencida"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "__all__" } });
    await waitFor(() => expect(router.state.location.search).toEqual({ aba: "contas" }));
  });

  it.each(casos)("card $label aplica o mesmo search/seletor e aria-pressed", async ({ status, label, ids }) => {
    const { router } = await abrir("/despesas?aba=contas");
    const card = screen.getByRole("button", { name: new RegExp(`^${label}`) });
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(card.className).toContain("focus-visible:ring-2");
    fireEvent.click(card);
    await waitFor(() => expect(router.state.location.search).toEqual({ aba: "contas", vencimento: status }));
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox")).toHaveValue(status);
    expect(descricoesExibidas()).toHaveLength(ids.length);
    for (const outro of casos.filter((c) => c.status !== status)) {
      expect(screen.getByRole("button", { name: new RegExp(`^${outro.label}`) })).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.getByRole("button", { name: /^Contas pendentes/ })).toHaveTextContent("6");
    expect(screen.getByRole("button", { name: /^Total a pagar/ }).textContent).toContain(brl(1850));
  });

  it.each(["Contas pendentes", "Total a pagar"])("card %s remove vencimento e mostra todas", async (label) => {
    const { router } = await abrir("/despesas?aba=contas&vencimento=vencida");
    const card = screen.getByRole("button", { name: new RegExp(`^${label}`) });
    expect(card).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(card);
    await waitFor(() => expect(router.state.location.search).toEqual({ aba: "contas" }));
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(descricoesExibidas()).toHaveLength(6);
    expect(exportarContas()).toHaveLength(6);
  });

  it("card é acionável por teclado", async () => {
    const { router } = await abrir("/despesas?aba=contas");
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^Vence hoje/ }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(router.state.location.search).toEqual({ aba: "contas", vencimento: "hoje" }));
    expect(descricoesExibidas()).toEqual(["Energia hoje"]);
  });

  it("filtros do Histórico continuam locais e combinados, ignorando vencimento", async () => {
    const { router } = await abrir("/despesas?aba=historico&vencimento=vencida");
    fireEvent.change(screen.getByPlaceholderText("Buscar descrição, categoria, centro de custo..."), { target: { value: "Energia" } });
    const [categoria, status] = screen.getAllByRole("combobox");
    fireEvent.change(categoria, { target: { value: "Energia" } });
    fireEvent.change(status, { target: { value: "pendente" } });
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-09-02" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-02" } });
    expect(descricoesExibidas()).toEqual(["Energia amanhã"]);
    expect(router.state.location.search).toEqual({ aba: "historico", vencimento: "vencida" });
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Contas a pagar/ }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(descricoesExibidas()).toEqual(["Aluguel vencido"]));
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Histórico de despesas" }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.getByLabelText("Data final")).toHaveValue("2026-09-02"));
    expect(descricoesExibidas()).toEqual(["Energia amanhã"]);
    expect(router.state.location.search).toEqual({ aba: "historico", vencimento: "vencida" });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(vi.mocked(exportToXlsx).mock.calls[0][1].Despesas.map((r) => r.Descrição)).toEqual(descricoesExibidas());
  });

  it("reabrir a URL selecionada reproduz o contexto sem estado efêmero", async () => {
    const { router } = await abrir("/despesas?aba=contas");
    fireEvent.click(screen.getByRole("button", { name: /^Sem vencimento/ }));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("sem_vencimento"));
    const url = router.state.location.href;
    cleanup();
    await abrir(url);
    expect(screen.getByRole("combobox")).toHaveValue("sem_vencimento");
    expect(descricoesExibidas()).toEqual(["Aluguel sem vencimento"]);
  });

  it("conjunto vazio não gera XLSX", async () => {
    await abrir("/despesas?aba=historico&vencimento=vencida");
    fireEvent.change(screen.getByPlaceholderText("Buscar descrição, categoria, centro de custo..."), { target: { value: "inexistente" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(exportToXlsx).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Não existem registros para exportar.");
  });
});

it("Dashboard Despesas pendentes abre todas as pendentes com o mesmo valor", async () => {
  const { router } = await abrir("/dashboard");
  const link = screen.getByRole("link", { name: "Ver despesas pendentes" });
  const destino = new URL(link.getAttribute("href")!, "http://localhost");
  expect(destino.pathname).toBe("/despesas");
  expect(destino.searchParams.get("aba")).toBe("contas");
  expect(destino.searchParams.size).toBe(1);
  expect(link.className).toContain("focus-visible:ring-2");
  fireEvent.click(link);
  await waitFor(() => expect(router.state.location.pathname).toBe("/despesas"));
  await screen.findByRole("combobox");
  expect(screen.getByRole("combobox")).toHaveValue("__all__");
  expect(descricoesExibidas()).toHaveLength(6);
  expect(exportarContas().reduce((s, r) => s + Number(r.Valor), 0)).toBe(k.despesasPendentes);
});
