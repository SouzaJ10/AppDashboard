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
  listarGiroProdutos,
  listarVendas,
  registrarVenda,
} from "@/service/vendas.service";

describe("vendas.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listarVendas", () => {
    it("lista somente as vendas da empresa informada", async () => {
      const vendas = [
        {
          id: "venda-1",
          empresa_id: "empresa-1",
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: vendas,
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

      const resultado = await listarVendas("empresa-1");

      expect(fromMock).toHaveBeenCalledWith("vendas");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith(
        "empresa_id",
        "empresa-1",
      );
      expect(orderMock).toHaveBeenCalledWith("data", {
        ascending: false,
      });

      expect(resultado).toEqual(vendas);
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

      const resultado = await listarVendas("empresa-1");

      expect(resultado).toEqual([]);
    });

    it("propaga erro ao falhar ao listar vendas", async () => {
      const erro = new Error("Erro ao listar vendas");

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
        listarVendas("empresa-1"),
      ).rejects.toBe(erro);
    });
  });

  describe("registrarVenda", () => {
    it("envia empresa e dados da venda para a RPC", async () => {
      rpcMock.mockResolvedValue({
        data: "venda-criada",
        error: null,
      });

      const resultado = await registrarVenda(
        {
          produtoId: "produto-1",
          quantidade: 3,
          valorUnitario: 50,
          desconto: 5,
          frete: 10,
          cliente: "Cliente Teste",
          observacoes: "Observação teste",
        },
        "empresa-1",
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "registrar_venda",
        {
          p_empresa_id: "empresa-1",
          p_produto_id: "produto-1",
          p_quantidade: 3,
          p_valor_unitario: 50,
          p_desconto: 5,
          p_frete: 10,
          p_cliente: "Cliente Teste",
          p_observacoes: "Observação teste",
        },
      );

      expect(resultado).toBe("venda-criada");
    });

    it("usa zero como padrão para desconto e frete", async () => {
      rpcMock.mockResolvedValue({
        data: "venda-criada",
        error: null,
      });

      await registrarVenda(
        {
          produtoId: "produto-1",
          quantidade: 2,
          valorUnitario: 25,
        },
        "empresa-1",
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "registrar_venda",
        expect.objectContaining({
          p_empresa_id: "empresa-1",
          p_desconto: 0,
          p_frete: 0,
        }),
      );
    });

    it("propaga erro da RPC registrar_venda", async () => {
      const erro = new Error("Erro ao registrar venda");

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        registrarVenda(
          {
            produtoId: "produto-1",
            quantidade: 1,
            valorUnitario: 30,
          },
          "empresa-1",
        ),
      ).rejects.toBe(erro);
    });
  });

  describe("listarGiroProdutos", () => {
    it("lista o giro somente da empresa informada", async () => {
      const giro = [
        {
          descricao: "Produto A",
          quantidade: 4,
        },
      ];

      const eqMock = vi.fn().mockResolvedValue({
        data: giro,
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      fromMock.mockReturnValue({
        select: selectMock,
      });

      const resultado =
        await listarGiroProdutos("empresa-1");

      expect(fromMock).toHaveBeenCalledWith("vendas");
      expect(selectMock).toHaveBeenCalledWith(
        "descricao, quantidade",
      );
      expect(eqMock).toHaveBeenCalledWith(
        "empresa_id",
        "empresa-1",
      );

      expect(resultado).toEqual(giro);
    });

    it("retorna lista vazia quando o giro retorna data nulo", async () => {
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
        await listarGiroProdutos("empresa-1");

      expect(resultado).toEqual([]);
    });

    it("propaga erro ao falhar ao listar o giro", async () => {
      const erro = new Error("Erro ao listar giro");

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
        listarGiroProdutos("empresa-1"),
      ).rejects.toBe(erro);
    });
  });
});