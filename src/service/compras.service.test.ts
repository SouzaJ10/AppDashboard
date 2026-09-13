import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

import {
  excluirCompra,
  listarCompras,
  listarProdutosParaCompra,
  pagarCompra,
  registrarCompra,
} from "@/service/compras.service";

describe("compras.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listarCompras", () => {
    it("lista somente as compras da empresa informada", async () => {
      const compras = [
        {
          id: "compra-1",
          empresa_id: "empresa-1",
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: compras,
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

      const resultado = await listarCompras("empresa-1");

      expect(fromMock).toHaveBeenCalledWith("compras");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith(
        "empresa_id",
        "empresa-1",
      );
      expect(orderMock).toHaveBeenCalledWith("data", {
        ascending: false,
      });

      expect(resultado).toEqual(compras);
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

      const resultado = await listarCompras("empresa-1");

      expect(resultado).toEqual([]);
    });

    it("propaga erro ao falhar ao listar compras", async () => {
      const erro = new Error("Erro ao listar compras");

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
        listarCompras("empresa-1"),
      ).rejects.toBe(erro);
    });
  });

  describe("listarProdutosParaCompra", () => {
    it("lista somente os produtos da empresa informada", async () => {
      const produtos = [
        {
          id: "produto-1",
          empresa_id: "empresa-1",
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

      const resultado =
        await listarProdutosParaCompra("empresa-1");

      expect(fromMock).toHaveBeenCalledWith("produtos");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith(
        "empresa_id",
        "empresa-1",
      );
      expect(orderMock).toHaveBeenCalledWith("descricao");

      expect(resultado).toEqual(produtos);
    });
  });

  describe("registrarCompra", () => {
    it("envia empresa e dados da compra para a RPC", async () => {
      rpcMock.mockResolvedValue({
        data: "compra-criada",
        error: null,
      });

      const resultado = await registrarCompra(
        {
          produtoId: "produto-1",
          quantidade: 5,
          custoUnitario: 20,
          data: "2026-09-12",
          fornecedor: "Fornecedor Teste",
          formaPagamento: "a_prazo",
          dataVencimento: "2026-10-12",
        },
        "empresa-1",
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "registrar_compra",
        {
          p_empresa_id: "empresa-1",
          p_produto_id: "produto-1",
          p_quantidade: 5,
          p_custo_unitario: 20,
          p_fornecedor: "Fornecedor Teste",
          p_data: "2026-09-12",
          p_forma_pagamento: "a_prazo",
          p_data_vencimento: "2026-10-12",
        },
      );

      expect(resultado).toBe("compra-criada");
    });

    it("usa a_vista como forma de pagamento padrão", async () => {
      rpcMock.mockResolvedValue({
        data: "compra-criada",
        error: null,
      });

      await registrarCompra(
        {
          produtoId: "produto-1",
          quantidade: 2,
          custoUnitario: 10,
        },
        "empresa-1",
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "registrar_compra",
        expect.objectContaining({
          p_forma_pagamento: "a_vista",
        }),
      );
    });

    it("propaga erro da RPC registrar_compra", async () => {
      const erro = new Error("Erro ao registrar compra");

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        registrarCompra(
          {
            produtoId: "produto-1",
            quantidade: 1,
            custoUnitario: 10,
          },
          "empresa-1",
        ),
      ).rejects.toBe(erro);
    });
  });

  describe("pagarCompra", () => {
    it("chama pagar_compra com o id correto", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await pagarCompra("compra-1");

      expect(rpcMock).toHaveBeenCalledWith(
        "pagar_compra",
        {
          p_compra_id: "compra-1",
        },
      );
    });

    it("propaga erro da RPC pagar_compra", async () => {
      const erro = new Error("Erro ao pagar compra");

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        pagarCompra("compra-1"),
      ).rejects.toBe(erro);
    });
  });

  describe("excluirCompra", () => {
    it("chama excluir_compra com o id correto", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await excluirCompra("compra-1");

      expect(rpcMock).toHaveBeenCalledWith(
        "excluir_compra",
        {
          p_compra_id: "compra-1",
        },
      );
    });

    it("propaga erro da RPC excluir_compra", async () => {
      const erro = new Error("Erro ao excluir compra");

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        excluirCompra("compra-1"),
      ).rejects.toBe(erro);
    });
  });
});