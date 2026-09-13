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
  atualizarDespesa,
  criarCategoriaDespesa,
  excluirDespesa,
  listarCategoriasDespesa,
  listarDespesas,
  pagarDespesa,
  registrarDespesa,
} from "@/service/despesas.service";

describe("despesas.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listarDespesas", () => {
    it("lista somente as despesas da empresa informada", async () => {
      const despesas = [
        {
          id: "despesa-1",
          empresa_id: "empresa-1",
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: despesas,
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

      const resultado = await listarDespesas("empresa-1");

      expect(fromMock).toHaveBeenCalledWith("despesas");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith(
        "empresa_id",
        "empresa-1",
      );
      expect(orderMock).toHaveBeenCalledWith("data", {
        ascending: false,
      });

      expect(resultado).toEqual(despesas);
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

      const resultado = await listarDespesas("empresa-1");

      expect(resultado).toEqual([]);
    });

    it("propaga erro ao falhar ao listar despesas", async () => {
      const erro = new Error("Erro ao listar despesas");

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
        listarDespesas("empresa-1"),
      ).rejects.toBe(erro);
    });
  });

  describe("excluirDespesa", () => {
    it("chama excluir_despesa com o id correto", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await excluirDespesa("despesa-1");

      expect(rpcMock).toHaveBeenCalledWith(
        "excluir_despesa",
        {
          p_despesa_id: "despesa-1",
        },
      );
    });

    it("propaga erro da RPC excluir_despesa", async () => {
      const erro = new Error("Erro ao excluir despesa");

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        excluirDespesa("despesa-1"),
      ).rejects.toBe(erro);
    });
  });

  describe("pagarDespesa", () => {
    it("atualiza a despesa para pago preservando seus dados", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      const despesa = {
        id: "despesa-1",
        descricao: "Conta de energia",
        valor: 150,
        categoria: null,
        forma_pagamento: null,
        centro_custo: null,
        observacoes: null,
      } as Parameters<typeof pagarDespesa>[0];

      await pagarDespesa(
        despesa,
        "2026-09-12",
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "atualizar_despesa",
        {
          p_despesa_id: "despesa-1",
          p_descricao: "Conta de energia",
          p_valor: 150,
          p_data: "2026-09-12",
          p_categoria: undefined,
          p_forma_pagamento: undefined,
          p_centro_custo: undefined,
          p_observacoes: undefined,
          p_status: "pago",
        },
      );
    });

    it("propaga erro ao pagar despesa", async () => {
      const erro = new Error("Erro ao pagar despesa");

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      const despesa = {
        id: "despesa-1",
        descricao: "Conta de energia",
        valor: 150,
        categoria: null,
        forma_pagamento: null,
        centro_custo: null,
        observacoes: null,
      } as Parameters<typeof pagarDespesa>[0];

      await expect(
        pagarDespesa(
          despesa,
          "2026-09-12",
        ),
      ).rejects.toBe(erro);
    });
  });

  describe("listarCategoriasDespesa", () => {
    it("lista somente as categorias da empresa informada", async () => {
      const categorias = [
        {
          id: "categoria-1",
          nome: "Energia",
          empresa_id: "empresa-1",
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({
        data: categorias,
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
        await listarCategoriasDespesa("empresa-1");

      expect(fromMock).toHaveBeenCalledWith(
        "categorias_despesa",
      );
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith(
        "empresa_id",
        "empresa-1",
      );
      expect(orderMock).toHaveBeenCalledWith("nome");

      expect(resultado).toEqual(categorias);
    });

    it("retorna lista vazia quando não existem categorias", async () => {
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
        await listarCategoriasDespesa("empresa-1");

      expect(resultado).toEqual([]);
    });

    it("propaga erro ao falhar ao listar categorias", async () => {
      const erro = new Error(
        "Erro ao listar categorias",
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
        listarCategoriasDespesa("empresa-1"),
      ).rejects.toBe(erro);
    });
  });

  describe("criarCategoriaDespesa", () => {
    it("cria categoria vinculada à empresa correta", async () => {
      const insertMock = vi.fn().mockResolvedValue({
        error: null,
      });

      fromMock.mockReturnValue({
        insert: insertMock,
      });

      await criarCategoriaDespesa(
        "Energia",
        "empresa-1",
      );

      expect(fromMock).toHaveBeenCalledWith(
        "categorias_despesa",
      );

      expect(insertMock).toHaveBeenCalledWith({
        nome: "Energia",
        empresa_id: "empresa-1",
      });
    });

    it("ignora erro de categoria duplicada", async () => {
      const insertMock = vi.fn().mockResolvedValue({
        error: {
          message:
            "duplicate key value violates unique constraint",
        },
      });

      fromMock.mockReturnValue({
        insert: insertMock,
      });

      await expect(
        criarCategoriaDespesa(
          "Energia",
          "empresa-1",
        ),
      ).resolves.toBeUndefined();
    });

    it("propaga erros que não sejam de duplicidade", async () => {
      const erro = {
        message: "Erro de banco inesperado",
      };

      const insertMock = vi.fn().mockResolvedValue({
        error: erro,
      });

      fromMock.mockReturnValue({
        insert: insertMock,
      });

      await expect(
        criarCategoriaDespesa(
          "Energia",
          "empresa-1",
        ),
      ).rejects.toBe(erro);
    });
  });

  describe("registrarDespesa", () => {
    it("envia empresa e dados da despesa para registrar_despesa", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await registrarDespesa(
        {
          descricao: "Conta de energia",
          valor: 150,
          data: "2026-09-12",
          categoria: null,
          formaPagamento: null,
          centroCusto: null,
          observacoes: null,
          status: "pendente",
        },
        "empresa-1",
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "registrar_despesa",
        {
          p_empresa_id: "empresa-1",
          p_descricao: "Conta de energia",
          p_valor: 150,
          p_data: "2026-09-12",
          p_categoria: undefined,
          p_forma_pagamento: undefined,
          p_centro_custo: undefined,
          p_observacoes: undefined,
          p_status: "pendente",
        },
      );
    });

    it("propaga erro da RPC registrar_despesa", async () => {
      const erro = new Error(
        "Erro ao registrar despesa",
      );

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        registrarDespesa(
          {
            descricao: "Conta de energia",
            valor: 150,
            data: "2026-09-12",
            categoria: null,
            formaPagamento: null,
            centroCusto: null,
            observacoes: null,
            status: "pendente",
          },
          "empresa-1",
        ),
      ).rejects.toBe(erro);
    });
  });

  describe("atualizarDespesa", () => {
    it("envia os dados corretos para atualizar_despesa", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await atualizarDespesa(
        "despesa-1",
        {
          descricao: "Energia atualizada",
          valor: 200,
          data: "2026-09-13",
          categoria: null,
          formaPagamento: null,
          centroCusto: null,
          observacoes: null,
          status: "pago",
        },
      );

      expect(rpcMock).toHaveBeenCalledWith(
        "atualizar_despesa",
        {
          p_despesa_id: "despesa-1",
          p_descricao: "Energia atualizada",
          p_valor: 200,
          p_data: "2026-09-13",
          p_categoria: undefined,
          p_forma_pagamento: undefined,
          p_centro_custo: undefined,
          p_observacoes: undefined,
          p_status: "pago",
        },
      );
    });

    it("propaga erro da RPC atualizar_despesa", async () => {
      const erro = new Error(
        "Erro ao atualizar despesa",
      );

      rpcMock.mockResolvedValue({
        data: null,
        error: erro,
      });

      await expect(
        atualizarDespesa(
          "despesa-1",
          {
            descricao: "Conta de energia",
            valor: 150,
            data: "2026-09-12",
            categoria: null,
            formaPagamento: null,
            centroCusto: null,
            observacoes: null,
            status: "pendente",
          },
        ),
      ).rejects.toBe(erro);
    });
  });
});