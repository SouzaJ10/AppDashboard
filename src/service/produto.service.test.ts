import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: fromMock,
    },
}));

import {
    excluirProduto,
    listarProdutos,
    salvarProduto,
} from "@/service/produto.service";

describe("produto.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("listarProdutos", () => {
        it("lista somente os produtos da empresa informada", async () => {
            const produtos = [
                {
                    id: "produto-1",
                    empresa_id: "empresa-1",
                    descricao: "Produto A",
                },
            ];

            const orderMock = vi.fn().mockResolvedValue({
                data: produtos,
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

            const resultado = await listarProdutos("empresa-1");

            expect(fromMock).toHaveBeenCalledWith("produtos");
            expect(selectMock).toHaveBeenCalledWith("*");
            expect(eqMock).toHaveBeenCalledWith(
                "empresa_id",
                "empresa-1",
            );
            expect(orderMock).toHaveBeenCalledWith("descricao");

            expect(resultado).toEqual(produtos);
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

            const resultado = await listarProdutos("empresa-1");

            expect(resultado).toEqual([]);
        });

        it("propaga erro ao falhar ao listar produtos", async () => {
            const erro = new Error("Erro ao listar produtos");

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
                listarProdutos("empresa-1"),
            ).rejects.toBe(erro);
        });
    });

    describe("excluirProduto", () => {
        it("exclui o produto somente dentro da empresa informada", async () => {
            const eqEmpresaMock = vi.fn().mockResolvedValue({
                error: null,
            });

            const eqIdMock = vi.fn().mockReturnValue({
                eq: eqEmpresaMock,
            });

            const deleteMock = vi.fn().mockReturnValue({
                eq: eqIdMock,
            });

            fromMock.mockReturnValue({
                delete: deleteMock,
            });

            await excluirProduto(
                "produto-1",
                "empresa-1",
            );

            expect(fromMock).toHaveBeenCalledWith("produtos");
            expect(deleteMock).toHaveBeenCalledTimes(1);
            expect(eqIdMock).toHaveBeenCalledWith(
                "id",
                "produto-1",
            );
            expect(eqEmpresaMock).toHaveBeenCalledWith(
                "empresa_id",
                "empresa-1",
            );
        });

        it("propaga erro ao excluir produto", async () => {
            const erro = new Error("Erro ao excluir produto");

            const eqEmpresaMock = vi.fn().mockResolvedValue({
                error: erro,
            });

            const eqIdMock = vi.fn().mockReturnValue({
                eq: eqEmpresaMock,
            });

            const deleteMock = vi.fn().mockReturnValue({
                eq: eqIdMock,
            });

            fromMock.mockReturnValue({
                delete: deleteMock,
            });

            await expect(
                excluirProduto(
                    "produto-1",
                    "empresa-1",
                ),
            ).rejects.toBe(erro);
        });
    });

    describe("salvarProduto", () => {
        it("atualiza o produto pelo id e pela empresa", async () => {
            const payload = {
                descricao: "Produto atualizado",
                preco_venda: 100,
            } as Parameters<typeof salvarProduto>[0];

            const eqEmpresaMock = vi.fn().mockResolvedValue({
                error: null,
            });

            const eqIdMock = vi.fn().mockReturnValue({
                eq: eqEmpresaMock,
            });

            const updateMock = vi.fn().mockReturnValue({
                eq: eqIdMock,
            });

            fromMock.mockReturnValue({
                update: updateMock,
            });

            await salvarProduto(
                payload,
                "empresa-1",
                "produto-1",
            );

            expect(fromMock).toHaveBeenCalledWith("produtos");
            expect(updateMock).toHaveBeenCalledWith(payload);
            expect(eqIdMock).toHaveBeenCalledWith(
                "id",
                "produto-1",
            );
            expect(eqEmpresaMock).toHaveBeenCalledWith(
                "empresa_id",
                "empresa-1",
            );
        });

        it("propaga erro ao atualizar produto", async () => {
            const erro = new Error("Erro ao atualizar produto");

            const payload = {
                descricao: "Produto atualizado",
            } as Parameters<typeof salvarProduto>[0];

            const eqEmpresaMock = vi.fn().mockResolvedValue({
                error: erro,
            });

            const eqIdMock = vi.fn().mockReturnValue({
                eq: eqEmpresaMock,
            });

            const updateMock = vi.fn().mockReturnValue({
                eq: eqIdMock,
            });

            fromMock.mockReturnValue({
                update: updateMock,
            });

            await expect(
                salvarProduto(
                    payload,
                    "empresa-1",
                    "produto-1",
                ),
            ).rejects.toBe(erro);
        });

        it("cria produto vinculado à empresa informada", async () => {
            const payload = {
                codigo: "PROD-001",
                descricao: "Produto novo",
            } as Parameters<typeof salvarProduto>[0];

            const insertMock = vi.fn().mockResolvedValue({
                error: null,
            });

            fromMock.mockReturnValue({
                insert: insertMock,
            });

            await salvarProduto(
                payload,
                "empresa-1",
            );

            expect(fromMock).toHaveBeenCalledWith("produtos");
            expect(insertMock).toHaveBeenCalledWith({
                ...payload,
                empresa_id: "empresa-1",
            });
        });

        it("usa a empresa recebida mesmo que o payload contenha outro empresa_id", async () => {
            const payload = {
                codigo: "PROD-001",
                descricao: "Produto novo",
                empresa_id: "empresa-incorreta",
            } as Parameters<typeof salvarProduto>[0];

            const insertMock = vi.fn().mockResolvedValue({
                error: null,
            });

            fromMock.mockReturnValue({
                insert: insertMock,
            });

            await salvarProduto(
                payload,
                "empresa-correta",
            );

            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    empresa_id: "empresa-correta",
                }),
            );
        });

        it("propaga erro ao criar produto", async () => {
            const erro = new Error("Erro ao criar produto");

            const payload = {
                codigo: "PROD-001",
                descricao: "Produto novo",
            } as Parameters<typeof salvarProduto>[0];

            const insertMock = vi.fn().mockResolvedValue({
                error: erro,
            });

            fromMock.mockReturnValue({
                insert: insertMock,
            });

            await expect(
                salvarProduto(
                    payload,
                    "empresa-1",
                ),
            ).rejects.toBe(erro);
        });
    });
});