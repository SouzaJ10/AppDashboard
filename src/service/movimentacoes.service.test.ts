import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: fromMock,
    },
}));

import { listarMovimentacoes } from "@/service/movimentacoes.service";

describe("movimentacoes.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("listarMovimentacoes", () => {
        it("lista somente as movimentações da empresa informada", async () => {
            const movimentacoes = [
                {
                    id: "movimentacao-1",
                    empresa_id: "empresa-1",
                    tipo: "entrada",
                },
            ];

            const orderMock = vi.fn().mockResolvedValue({
                data: movimentacoes,
                error: null,
            });

            const eqMock = vi.fn().mockReturnValue({
                order: orderMock,
            });

            const selectMock = vi.fn().mockReturnValue({
                eq: eqMock,
            });

            fromMock.mockReturnValue({
                select: selectMock,
            });

            const resultado =
                await listarMovimentacoes("empresa-1");

            expect(fromMock).toHaveBeenCalledWith(
                "movimentacoes",
            );

            expect(selectMock).toHaveBeenCalledWith("*");

            expect(eqMock).toHaveBeenCalledWith(
                "empresa_id",
                "empresa-1",
            );

            expect(orderMock).toHaveBeenCalledWith("data");

            expect(resultado).toEqual(movimentacoes);
        });

        it("retorna lista vazia quando o Supabase retorna data nulo", async () => {
            const orderMock = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            const eqMock = vi.fn().mockReturnValue({
                order: orderMock,
            });

            const selectMock = vi.fn().mockReturnValue({
                eq: eqMock,
            });

            fromMock.mockReturnValue({
                select: selectMock,
            });

            const resultado =
                await listarMovimentacoes("empresa-1");

            expect(resultado).toEqual([]);
        });

        it("propaga erro ao falhar ao listar movimentações", async () => {
            const erro = new Error(
                "Erro ao listar movimentações",
            );

            const orderMock = vi.fn().mockResolvedValue({
                data: null,
                error: erro,
            });

            const eqMock = vi.fn().mockReturnValue({
                order: orderMock,
            });

            const selectMock = vi.fn().mockReturnValue({
                eq: eqMock,
            });

            fromMock.mockReturnValue({
                select: selectMock,
            });

            await expect(
                listarMovimentacoes("empresa-1"),
            ).rejects.toBe(erro);
        });
    });
});