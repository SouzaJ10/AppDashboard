import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: fromMock,
    },
}));

import { listarEmpresasDoUsuario } from "@/service/empresa.service";

describe("empresa.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("listarEmpresasDoUsuario", () => {
        it("lista os vínculos do usuário e mapeia os dados da empresa", async () => {
            const data = [
                {
                    empresa_id: "empresa-1",
                    role: "admin",
                    empresas: {
                        id: "empresa-1",
                        nome: "Empresa A",
                    },
                },
                {
                    empresa_id: "empresa-2",
                    role: "user",
                    empresas: {
                        id: "empresa-2",
                        nome: "Empresa B",
                    },
                },
            ];

            const eqMock = vi.fn().mockResolvedValue({
                data,
                error: null,
            });

            const selectMock = vi.fn().mockReturnValue({
                eq: eqMock,
            });

            fromMock.mockReturnValue({
                select: selectMock,
            });

            const resultado =
                await listarEmpresasDoUsuario("usuario-1");

            expect(fromMock).toHaveBeenCalledWith(
                "empresa_usuarios",
            );

            expect(selectMock).toHaveBeenCalledTimes(1);

            const selectArgument =
                selectMock.mock.calls[0][0];

            expect(selectArgument).toContain("empresa_id");
            expect(selectArgument).toContain("role");
            expect(selectArgument).toContain(
                "empresas!inner",
            );
            expect(selectArgument).toContain("nome");

            expect(eqMock).toHaveBeenCalledWith(
                "user_id",
                "usuario-1",
            );

            expect(resultado).toEqual([
                {
                    empresaId: "empresa-1",
                    nome: "Empresa A",
                    role: "admin",
                },
                {
                    empresaId: "empresa-2",
                    nome: "Empresa B",
                    role: "user",
                },
            ]);
        });

        it("retorna lista vazia quando o Supabase retorna data nulo", async () => {
            const eqMock = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            const selectMock = vi.fn().mockReturnValue({
                eq: eqMock,
            });

            fromMock.mockReturnValue({
                select: selectMock,
            });

            const resultado =
                await listarEmpresasDoUsuario("usuario-1");

            expect(resultado).toEqual([]);
        });

        it("propaga erro ao falhar ao listar empresas", async () => {
            const erro = new Error(
                "Erro ao listar empresas",
            );

            const eqMock = vi.fn().mockResolvedValue({
                data: null,
                error: erro,
            });

            const selectMock = vi.fn().mockReturnValue({
                eq: eqMock,
            });

            fromMock.mockReturnValue({
                select: selectMock,
            });

            await expect(
                listarEmpresasDoUsuario("usuario-1"),
            ).rejects.toBe(erro);
        });
    });
});