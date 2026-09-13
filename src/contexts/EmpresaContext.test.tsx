import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { listarEmpresasDoUsuarioMock } = vi.hoisted(() => ({
    listarEmpresasDoUsuarioMock: vi.fn(),
}));

vi.mock("@/service/empresa.service", () => ({
    listarEmpresasDoUsuario: listarEmpresasDoUsuarioMock,
}));

import {
    EmpresaProvider,
    useEmpresa,
} from "@/contexts/EmpresaContext";

const empresaAdmin = {
    empresaId: "empresa-a",
    nome: "Empresa A",
    role: "admin" as const,
};

const empresaUser = {
    empresaId: "empresa-b",
    nome: "Empresa B",
    role: "user" as const,
};

function ConsumidorEmpresa() {
    const {
        empresas,
        empresaAtual,
        empresaId,
        role,
        isAdmin,
        isLoading,
        selecionarEmpresa,
    } = useEmpresa();

    return (
        <div>
            <div data-testid="loading">
                {isLoading ? "carregando" : "pronto"}
            </div>

            <div data-testid="quantidade-empresas">
                {empresas.length}
            </div>

            <div data-testid="empresa-id">
                {empresaId ?? "nenhuma"}
            </div>

            <div data-testid="empresa-nome">
                {empresaAtual?.nome ?? "nenhuma"}
            </div>

            <div data-testid="role">
                {role ?? "nenhuma"}
            </div>

            <div data-testid="is-admin">
                {isAdmin ? "sim" : "nao"}
            </div>

            <button
                type="button"
                onClick={() =>
                    selecionarEmpresa("empresa-a")
                }
            >
                Selecionar Empresa A
            </button>

            <button
                type="button"
                onClick={() =>
                    selecionarEmpresa("empresa-b")
                }
            >
                Selecionar Empresa B
            </button>

            <button
                type="button"
                onClick={() =>
                    selecionarEmpresa("empresa-inexistente")
                }
            >
                Selecionar Empresa Inexistente
            </button>
        </div>
    );
}

function renderEmpresaProvider(
    userId = "usuario-1",
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <EmpresaProvider userId={userId}>
                <ConsumidorEmpresa />
            </EmpresaProvider>
        </QueryClientProvider>,
    );
}

describe("EmpresaContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("seleciona automaticamente quando o usuário possui apenas uma empresa", async () => {
        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                screen.getByTestId("empresa-id"),
            ).toHaveTextContent("empresa-a");
        });

        expect(
            screen.getByTestId("empresa-nome"),
        ).toHaveTextContent("Empresa A");

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("admin");

        expect(
            screen.getByTestId("is-admin"),
        ).toHaveTextContent("sim");

        expect(
            localStorage.getItem(
                "empresa_atual:usuario-1",
            ),
        ).toBe("empresa-a");
    });

    it("não escolhe uma empresa arbitrariamente quando existem múltiplas empresas sem seleção salva", async () => {
        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
            empresaUser,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                screen.getByTestId("quantidade-empresas"),
            ).toHaveTextContent("2");
        });

        expect(
            screen.getByTestId("empresa-id"),
        ).toHaveTextContent("nenhuma");

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("nenhuma");

        expect(
            screen.getByTestId("is-admin"),
        ).toHaveTextContent("nao");

        expect(
            localStorage.getItem(
                "empresa_atual:usuario-1",
            ),
        ).toBeNull();
    });

    it("restaura uma seleção salva válida", async () => {
        localStorage.setItem(
            "empresa_atual:usuario-1",
            "empresa-b",
        );

        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
            empresaUser,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                screen.getByTestId("empresa-id"),
            ).toHaveTextContent("empresa-b");
        });

        expect(
            screen.getByTestId("empresa-nome"),
        ).toHaveTextContent("Empresa B");

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("user");

        expect(
            screen.getByTestId("is-admin"),
        ).toHaveTextContent("nao");
    });

    it("remove uma seleção salva que não pertence mais ao usuário", async () => {
        localStorage.setItem(
            "empresa_atual:usuario-1",
            "empresa-inexistente",
        );

        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
            empresaUser,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                localStorage.getItem(
                    "empresa_atual:usuario-1",
                ),
            ).toBeNull();
        });

        expect(
            screen.getByTestId("empresa-id"),
        ).toHaveTextContent("nenhuma");

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("nenhuma");
    });

    it("seleciona uma empresa válida e persiste a escolha", async () => {
        const user = userEvent.setup();

        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
            empresaUser,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                screen.getByTestId("quantidade-empresas"),
            ).toHaveTextContent("2");
        });

        await user.click(
            screen.getByRole("button", {
                name: "Selecionar Empresa B",
            }),
        );

        expect(
            screen.getByTestId("empresa-id"),
        ).toHaveTextContent("empresa-b");

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("user");

        expect(
            screen.getByTestId("is-admin"),
        ).toHaveTextContent("nao");

        expect(
            localStorage.getItem(
                "empresa_atual:usuario-1",
            ),
        ).toBe("empresa-b");
    });

    it("ignora tentativa de selecionar empresa que não pertence ao usuário", async () => {
        const user = userEvent.setup();

        localStorage.setItem(
            "empresa_atual:usuario-1",
            "empresa-a",
        );

        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
            empresaUser,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                screen.getByTestId("empresa-id"),
            ).toHaveTextContent("empresa-a");
        });

        await user.click(
            screen.getByRole("button", {
                name: "Selecionar Empresa Inexistente",
            }),
        );

        expect(
            screen.getByTestId("empresa-id"),
        ).toHaveTextContent("empresa-a");

        expect(
            localStorage.getItem(
                "empresa_atual:usuario-1",
            ),
        ).toBe("empresa-a");
    });

    it("atualiza role e isAdmin ao trocar de empresa", async () => {
        const user = userEvent.setup();

        listarEmpresasDoUsuarioMock.mockResolvedValue([
            empresaAdmin,
            empresaUser,
        ]);

        renderEmpresaProvider();

        await waitFor(() => {
            expect(
                screen.getByTestId("quantidade-empresas"),
            ).toHaveTextContent("2");
        });

        await user.click(
            screen.getByRole("button", {
                name: "Selecionar Empresa A",
            }),
        );

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("admin");

        expect(
            screen.getByTestId("is-admin"),
        ).toHaveTextContent("sim");

        await user.click(
            screen.getByRole("button", {
                name: "Selecionar Empresa B",
            }),
        );

        expect(
            screen.getByTestId("empresa-id"),
        ).toHaveTextContent("empresa-b");

        expect(
            screen.getByTestId("role"),
        ).toHaveTextContent("user");

        expect(
            screen.getByTestId("is-admin"),
        ).toHaveTextContent("nao");
    });
});