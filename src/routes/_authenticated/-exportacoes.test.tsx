import type { ComponentType, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Despesa } from "@/integrations/supabase/despesas-extra";

const dados = vi.hoisted(() => ({
  vendas: Array.from({ length: 202 }, (_, i) => ({
    id: `v-${i}`, produto_id: "produto-a", codigo: String(i), descricao: "Produto A",
    cliente: "Cliente A", data: i === 201 ? "2026-08-10" : "2026-09-10", created_at: "2026-09-10",
    quantidade: 2, valor_unitario: 50, preco_venda: 100, custo: 20,
    despesas: 10, lucro: 70, margem: 0.35, observacoes: "Nota",
  })),
  compras: [
    { id: "c-1", descricao: "Compra pendente", fornecedor: "Fornecedor A", data: "2026-09-01", data_vencimento: "2026-09-15", forma_pagamento: "a_prazo", status_pagamento: "pendente", quantidade: 2, custo_unitario: 30, custo_total: 60 },
    { id: "c-2", descricao: "Compra paga", fornecedor: "Fornecedor B", data: "2026-08-01", data_vencimento: null, forma_pagamento: "a_vista", status_pagamento: "pago", quantidade: 1, custo_unitario: 20, custo_total: 20 },
  ],
  despesas: [
    { id: "d-1", descricao: "Aluguel pago", categoria: "Aluguel", valor: 100, data: "2026-09-01", data_vencimento: "2026-09-05", forma_pagamento: "PIX", centro_custo: "Loja", observacoes: "Nota", status: "pago", user_id: null, created_at: "", updated_at: "" },
    { id: "d-2", descricao: "Energia pendente", categoria: "Energia", valor: 50, data: "2026-08-01", data_vencimento: null, forma_pagamento: null, centro_custo: null, observacoes: null, status: "pendente", user_id: null, created_at: "", updated_at: "" },
  ] satisfies Despesa[],
}));

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === "vendas" ? dados.vendas : dados.despesas, isLoading: false, isError: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/hooks/useCompras", () => ({ useCompras: () => ({ compras: dados.compras, isLoading: false }) }));
vi.mock("@/hooks/useRealtime", () => ({ useRealtime: vi.fn() }));
vi.mock("@/contexts/EmpresaContext", () => ({ useEmpresa: () => ({ empresaId: "empresa-1" }) }));
vi.mock("@/service/vendas.service", () => ({ listarVendas: vi.fn() }));
vi.mock("@/service/compras.service", () => ({ excluirCompra: vi.fn(), pagarCompra: vi.fn() }));
vi.mock("@/service/despesas.service", () => ({ listarDespesas: vi.fn(), excluirDespesa: vi.fn(), pagarDespesa: vi.fn() }));
vi.mock("@/components/vendas/NovaVendaDialog", () => ({ NovaVendaDialog: () => null }));
vi.mock("@/components/compras/NovaCompraDialog", () => ({ NovaCompraDialog: () => null }));
vi.mock("@/components/despesas/DespesaDialog", () => ({ DespesaDialog: () => null }));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/dashboard/KpiCard", () => ({
  Section: ({ children, actions }: { children: ReactNode; actions: ReactNode }) => <>{actions}{children}</>,
  KpiCard: () => null, EmptyState: () => null,
}));
vi.mock("recharts", () => Object.fromEntries([
  "BarChart", "Bar", "XAxis", "YAxis", "Tooltip", "CartesianGrid", "ResponsiveContainer", "Legend",
].map((name) => [name, () => null])));
vi.mock("@/components/ui/table", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/ui/table")>(),
  // Estes testes inspecionam o payload, não as células do histórico.
  TableBody: () => null,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
}));
vi.mock("@/components/ui/tabs", async () => {
  const { createContext, useContext } = await import("react");
  const Context = createContext<(v: string) => void>(() => {});
  return {
    Tabs: ({ children, onValueChange }: { children: ReactNode; onValueChange: (v: string) => void }) => <Context.Provider value={onValueChange}>{children}</Context.Provider>,
    TabsList: ({ children }: { children: ReactNode }) => children,
    TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => {
      const change = useContext(Context);
      return <button onClick={() => change(value)}>{children}</button>;
    },
  };
});
vi.mock("@/lib/export-xlsx", () => ({ exportToXlsx: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { Route as VendasRoute } from "./vendas";
import { Route as ComprasRoute } from "./compras";
import { Route as DespesasRoute } from "./despesas";
import { exportToXlsx } from "@/lib/export-xlsx";
import { dateBR, todayISO } from "@/lib/format";
import { toast } from "sonner";

const Vendas = VendasRoute.options.component as ComponentType;
const Compras = ComprasRoute.options.component as ComponentType;
const Despesas = DespesasRoute.options.component as ComponentType;
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
function exportar() {
  fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
  return vi.mocked(exportToXlsx).mock.calls.at(-1)!;
}

describe("payloads das exportações operacionais", () => {
  it("Vendas preserva o recorte atual de 200 e a margem armazenada como número", () => {
    render(<Vendas />);
    const [nome, sheets] = exportar();
    expect(nome).toBe(`vendas_${todayISO()}`);
    expect(sheets.Vendas).toHaveLength(200);
    expect(sheets.Vendas.map((r) => r.Código)).toEqual(dados.vendas.slice(0, 200).map((v) => v.codigo));
    expect(sheets.Vendas[0]).toMatchObject({ "Custo total": 20, "Total da venda": 100, "Margem (decimal)": 0.35, Lucro: 70 });
    expect(sheets.Vendas[0]).not.toHaveProperty("Custo");
    expect(sheets.Vendas[0]).not.toHaveProperty("Margem");
    fireEvent.change(screen.getByPlaceholderText("Buscar produto, código ou cliente..."), { target: { value: "inexistente" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(exportToXlsx).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith("Não existem registros para exportar.");
  });

  it("Vendas não exporta venda encontrada somente no período anterior", () => {
    render(<Vendas />);
    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-30" } });
    fireEvent.change(screen.getByPlaceholderText("Buscar produto, código ou cliente..."), { target: { value: "201" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(exportToXlsx).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Não existem registros para exportar.");
  });

  it("Compras muda só o nome das contas a pagar e mantém a seleção pendente", () => {
    render(<Compras />);
    expect(exportar()[1].Compras).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Contas a pagar/i }));
    const [nome, sheets] = exportar();
    expect(nome).toBe(`contas_a_pagar_compras_${todayISO()}`);
    expect(sheets).toEqual({ "Contas a pagar": [{
      Fornecedor: "Fornecedor A", Produto: "Compra pendente", Vencimento: dateBR("2026-09-15"),
      "Situação do vencimento": expect.any(String), Valor: 60, "Status do pagamento": "Pendente",
    }] });
  });

  it("Despesas explicita datas e status nas duas abas sem misturar seus conjuntos", () => {
    render(<Despesas />);
    const historico = exportar()[1].Despesas;
    expect(historico.map((r) => r.Descrição)).toEqual(dados.despesas.map((d) => d.descricao));
    expect(historico[0]).toEqual({
      "Data da despesa": dateBR("2026-09-01"), Descrição: "Aluguel pago", Categoria: "Aluguel", Valor: 100,
      "Forma de pagamento": "PIX", "Centro de custo": "Loja", Status: "Pago", Observações: "Nota",
      "Data de vencimento": dateBR("2026-09-05"),
    });
    expect(historico[1]).toMatchObject({ Status: "Pendente", "Data de vencimento": "" });
    fireEvent.change(screen.getByPlaceholderText("Buscar descrição, categoria, centro de custo..."), { target: { value: "Aluguel" } });
    expect(exportar()[1].Despesas).toEqual([historico[0]]);
    fireEvent.click(screen.getByRole("button", { name: /Contas a pagar/i }));
    const [nome, sheets] = exportar();
    expect(nome).toBe(`contas_a_pagar_despesas_${todayISO()}`);
    expect(sheets["Contas a pagar"]).toEqual([{ ...historico[1], "Situação do vencimento": "Sem vencimento" }]);
  });
});
