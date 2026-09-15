import { describe, expect, it } from "vitest";

import {
  agruparVendasPorProduto,
  chaveProdutoVenda,
} from "@/lib/agregacao-produtos-vendas";

type VendaTeste = {
  id: string;
  produto_id: string | null;
  codigo: string | null;
  descricao: string | null;
  data: string;
  created_at: string;
  quantidade: number;
  preco_venda: number;
  custo: number;
  despesas: number;
  lucro: number;
};

function venda(
  id: string,
  overrides: Partial<VendaTeste> = {}
): VendaTeste {
  return {
    id,
    produto_id: "produto-1",
    codigo: "001",
    descricao: "Produto",
    data: "2026-09-01",
    created_at: "2026-09-01T10:00:00Z",
    quantidade: 1,
    preco_venda: 100,
    custo: 60,
    despesas: 5,
    lucro: 35,
    ...overrides,
  };
}

describe("agregação de vendas por produto", () => {
  it("agrupa descrições diferentes quando o produto_id é o mesmo", () => {
    const grupos = agruparVendasPorProduto([
      venda("venda-1", {
        descricao: "Produto Antigo",
      }),
      venda("venda-2", {
        descricao: "Produto Novo",
      }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].chave).toBe(
      "produto:produto-1"
    );
    expect(grupos[0].vendas).toHaveLength(2);
  });

  it("mantém separados produtos diferentes com a mesma descrição", () => {
    const grupos = agruparVendasPorProduto([
      venda("venda-1", {
        produto_id: "produto-a",
        descricao: "Terno Slim",
      }),
      venda("venda-2", {
        produto_id: "produto-b",
        descricao: "Terno Slim",
      }),
    ]);

    expect(grupos.map((grupo) => grupo.chave)).toEqual([
      "produto:produto-a",
      "produto:produto-b",
    ]);
  });

  it("mantém vendas históricas separadas mesmo com o mesmo código e descrição", () => {
    const grupos = agruparVendasPorProduto([
      venda("venda-1", {
        produto_id: null,
        codigo: "001",
        descricao: "Terno Slim",
      }),
      venda("venda-2", {
        produto_id: null,
        codigo: "001",
        descricao: "Terno Slim",
      }),
    ]);

    expect(grupos.map((grupo) => grupo.chave)).toEqual([
      "historico:venda:venda-1",
      "historico:venda:venda-2",
    ]);
  });

  it("mantém vendas históricas separadas quando só a descrição coincide", () => {
    const grupos = agruparVendasPorProduto([
      venda("venda-1", {
        produto_id: null,
        codigo: null,
        descricao: "Terno Slim",
      }),
      venda("venda-2", {
        produto_id: null,
        codigo: null,
        descricao: "Terno Slim",
      }),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos.every((grupo) =>
      grupo.vendas.length === 1
    )).toBe(true);
  });

  it("usa a identidade da venda histórica mesmo sem código", () => {
    const historica = venda("venda-sem-codigo", {
      produto_id: null,
      codigo: null,
    });

    expect(chaveProdutoVenda(historica)).toBe(
      "historico:venda:venda-sem-codigo"
    );
  });

  it("usa o snapshot mais recente para o rótulo do produto vinculado", () => {
    const grupos = agruparVendasPorProduto([
      venda("venda-antiga", {
        descricao: "Produto Antigo",
        data: "2026-09-10",
        created_at: "2026-09-10T12:00:00Z",
      }),
      venda("venda-nova", {
        descricao: "Produto Novo",
        data: "2026-09-11",
        created_at: "2026-09-11T08:00:00Z",
      }),
    ]);

    expect(grupos[0]).toMatchObject({
      codigo: "001",
      descricao: "Produto Novo",
      rotulo: "Produto Novo",
    });
  });

  it("usa created_at e id como desempates determinísticos do snapshot", () => {
    const grupos = agruparVendasPorProduto([
      venda("venda-a", {
        descricao: "Primeiro",
        created_at: "2026-09-10T10:00:00Z",
      }),
      venda("venda-b", {
        descricao: "Segundo",
        created_at: "2026-09-10T11:00:00Z",
      }),
      venda("venda-c", {
        descricao: "Terceiro",
        created_at: "2026-09-10T11:00:00Z",
      }),
    ]);

    expect(grupos[0].rotulo).toBe("Terceiro");
  });

  it("usa código quando não há descrição", () => {
    const [grupo] = agruparVendasPorProduto([
      venda("venda-1", {
        descricao: null,
        codigo: "SKU-001",
      }),
    ]);

    expect(grupo.rotulo).toBe("SKU-001");
  });

  it("usa rótulo neutro quando descrição e código estão ausentes", () => {
    const [grupo] = agruparVendasPorProduto([
      venda("venda-1", {
        produto_id: null,
        descricao: null,
        codigo: null,
      }),
    ]);

    expect(grupo.rotulo).toBe(
      "Produto não identificado"
    );
  });

  it("preserva todas as vendas e seus totais operacionais e financeiros", () => {
    const vendas = [
      venda("venda-1"),
      venda("venda-2", {
        quantidade: 2,
        preco_venda: 180,
        custo: 100,
        despesas: 10,
        lucro: 70,
      }),
      venda("venda-3", {
        produto_id: null,
        quantidade: 3,
        preco_venda: 240,
        custo: 120,
        despesas: 20,
        lucro: 100,
      }),
    ];

    const agrupadas = agruparVendasPorProduto(vendas)
      .flatMap((grupo) => grupo.vendas);

    const totais = (itens: VendaTeste[]) =>
      itens.reduce(
        (total, item) => ({
          quantidade: total.quantidade + item.quantidade,
          faturamento: total.faturamento + item.preco_venda,
          custo: total.custo + item.custo,
          despesas: total.despesas + item.despesas,
          lucro: total.lucro + item.lucro,
        }),
        {
          quantidade: 0,
          faturamento: 0,
          custo: 0,
          despesas: 0,
          lucro: 0,
        }
      );

    expect(agrupadas).toHaveLength(vendas.length);
    expect(totais(agrupadas)).toEqual(totais(vendas));
    expect(agrupadas).toEqual(
      expect.arrayContaining(vendas)
    );
  });
});
