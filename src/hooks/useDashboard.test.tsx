import type { ReactNode } from "react";
import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    useEmpresaMock,
    listarVendasMock,
    listarComprasMock,
    listarMovimentacoesMock,
    listarProdutosMock,
    listarDespesasMock,
} = vi.hoisted(() => ({
    useEmpresaMock: vi.fn(),
    listarVendasMock: vi.fn(),
    listarComprasMock: vi.fn(),
    listarMovimentacoesMock: vi.fn(),
    listarProdutosMock: vi.fn(),
    listarDespesasMock: vi.fn(),
}));

vi.mock("@/contexts/EmpresaContext", () => ({
    useEmpresa: useEmpresaMock,
}));

vi.mock("@/service/vendas.service", () => ({
    listarVendas: listarVendasMock,
}));

vi.mock("@/service/compras.service", () => ({
    listarCompras: listarComprasMock,
}));

vi.mock(
    "@/service/movimentacoes.service",
    () => ({
        listarMovimentacoes:
            listarMovimentacoesMock,
    }),
);

vi.mock("@/service/produto.service", () => ({
    listarProdutos: listarProdutosMock,
}));

vi.mock("@/service/despesas.service", () => ({
    listarDespesas: listarDespesasMock,
}));

import { useDashboard } from "@/hooks/useDashboard";

function criarWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return function Wrapper({
        children,
    }: {
        children: ReactNode;
    }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe("useDashboard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("carrega todos os dados usando a empresa ativa", async () => {
        useEmpresaMock.mockReturnValue({
            empresaId: "empresa-a",
        });

        listarVendasMock.mockResolvedValue([
            { id: "venda-a" },
        ]);

        listarComprasMock.mockResolvedValue([
            { id: "compra-a" },
        ]);

        listarMovimentacoesMock.mockResolvedValue([
            { id: "movimentacao-a" },
        ]);

        listarProdutosMock.mockResolvedValue([
            { id: "produto-a" },
        ]);

        listarDespesasMock.mockResolvedValue([
            { id: "despesa-a" },
        ]);

        const { result } = renderHook(
            () => useDashboard(),
            {
                wrapper: criarWrapper(),
            },
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(listarVendasMock).toHaveBeenCalledWith(
            "empresa-a",
        );

        expect(listarComprasMock).toHaveBeenCalledWith(
            "empresa-a",
        );

        expect(
            listarMovimentacoesMock,
        ).toHaveBeenCalledWith("empresa-a");

        expect(listarProdutosMock).toHaveBeenCalledWith(
            "empresa-a",
        );

        expect(listarDespesasMock).toHaveBeenCalledWith(
            "empresa-a",
        );

        expect(result.current.vendas).toEqual([
            { id: "venda-a" },
        ]);

        expect(result.current.compras).toEqual([
            { id: "compra-a" },
        ]);

        expect(result.current.movimentacoes).toEqual([
            { id: "movimentacao-a" },
        ]);

        expect(result.current.produtos).toEqual([
            { id: "produto-a" },
        ]);

        expect(result.current.despesas).toEqual([
            { id: "despesa-a" },
        ]);
    });

    it("não consulta dados quando nenhuma empresa está selecionada", async () => {
        useEmpresaMock.mockReturnValue({
            empresaId: null,
        });

        const { result } = renderHook(
            () => useDashboard(),
            {
                wrapper: criarWrapper(),
            },
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(listarVendasMock).not.toHaveBeenCalled();
        expect(listarComprasMock).not.toHaveBeenCalled();

        expect(
            listarMovimentacoesMock,
        ).not.toHaveBeenCalled();

        expect(listarProdutosMock).not.toHaveBeenCalled();
        expect(listarDespesasMock).not.toHaveBeenCalled();

        expect(result.current.vendas).toEqual([]);
        expect(result.current.compras).toEqual([]);
        expect(result.current.movimentacoes).toEqual([]);
        expect(result.current.produtos).toEqual([]);
        expect(result.current.despesas).toEqual([]);
    });

    it("faz novas consultas ao trocar a empresa ativa", async () => {
        useEmpresaMock.mockReturnValue({
            empresaId: "empresa-a",
        });

        listarVendasMock.mockImplementation(
            async (empresaId: string) => [
                { empresaId },
            ],
        );

        listarComprasMock.mockImplementation(
            async (empresaId: string) => [
                { empresaId },
            ],
        );

        listarMovimentacoesMock.mockImplementation(
            async (empresaId: string) => [
                { empresaId },
            ],
        );

        listarProdutosMock.mockImplementation(
            async (empresaId: string) => [
                { empresaId },
            ],
        );

        listarDespesasMock.mockImplementation(
            async (empresaId: string) => [
                { empresaId },
            ],
        );

        const { result, rerender } = renderHook(
            () => useDashboard(),
            {
                wrapper: criarWrapper(),
            },
        );

        await waitFor(() => {
            expect(result.current.vendas).toEqual([
                { empresaId: "empresa-a" },
            ]);
        });

        useEmpresaMock.mockReturnValue({
            empresaId: "empresa-b",
        });

        rerender();

        await waitFor(() => {
            expect(result.current.vendas).toEqual([
                { empresaId: "empresa-b" },
            ]);
        });

        expect(listarVendasMock).toHaveBeenCalledWith(
            "empresa-a",
        );

        expect(listarVendasMock).toHaveBeenCalledWith(
            "empresa-b",
        );

        expect(listarComprasMock).toHaveBeenCalledWith(
            "empresa-b",
        );

        expect(
            listarMovimentacoesMock,
        ).toHaveBeenCalledWith("empresa-b");

        expect(listarProdutosMock).toHaveBeenCalledWith(
            "empresa-b",
        );

        expect(listarDespesasMock).toHaveBeenCalledWith(
            "empresa-b",
        );
    });
});