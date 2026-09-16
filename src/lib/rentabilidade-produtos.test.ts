import { describe, expect, it } from "vitest";

import { agruparVendasPorProduto } from "@/lib/agregacao-produtos-vendas";
import {
  buscarProdutosRentabilidade,
  calcularRentabilidadeProdutos,
  filtrarVendasPorPeriodo,
  ordenarProdutosRentabilidade,
  resolverPeriodoRentabilidade,
  type LinhaRentabilidadeProduto,
} from "@/lib/rentabilidade-produtos";

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
    data: "2026-09-15",
    created_at: "2026-09-15T10:00:00Z",
    quantidade: 1,
    preco_venda: 100,
    custo: 60,
    despesas: 5,
    lucro: 35,
    ...overrides,
  };
}

function analisar(vendas: VendaTeste[]) {
  return calcularRentabilidadeProdutos(
    agruparVendasPorProduto(vendas)
  );
}

describe("período da rentabilidade por produto", () => {
  const referencia = "2026-09-15";

  it("preserva todas as vendas em Todo o período", () => {
    const vendas = [
      venda("antiga", { data: "2020-01-01" }),
      venda("atual"),
    ];
    const intervalo = resolverPeriodoRentabilidade(
      "todo",
      "",
      "",
      referencia
    );

    expect(intervalo).toEqual({ inicio: "", fim: "" });
    expect(filtrarVendasPorPeriodo(vendas, intervalo)).toEqual(
      vendas
    );
  });

  it("inclui hoje e os 29 dias anteriores em Últimos 30 dias", () => {
    const intervalo = resolverPeriodoRentabilidade(
      "30d",
      "",
      "",
      referencia
    );
    const resultado = filtrarVendasPorPeriodo(
      [
        venda("antes", { data: "2026-08-16" }),
        venda("inicio", { data: "2026-08-17" }),
        venda("fim", { data: "2026-09-15" }),
        venda("depois", { data: "2026-09-16" }),
      ],
      intervalo
    );

    expect(intervalo).toEqual({
      inicio: "2026-08-17",
      fim: "2026-09-15",
    });
    expect(resultado.map((item) => item.id)).toEqual([
      "inicio",
      "fim",
    ]);
  });

  it("inclui hoje e os 89 dias anteriores em Últimos 90 dias", () => {
    const intervalo = resolverPeriodoRentabilidade(
      "90d",
      "",
      "",
      referencia
    );

    expect(intervalo).toEqual({
      inicio: "2026-06-18",
      fim: "2026-09-15",
    });
    expect(
      filtrarVendasPorPeriodo(
        [
          venda("antes", { data: "2026-06-17" }),
          venda("inicio", { data: "2026-06-18" }),
          venda("fim", { data: "2026-09-15" }),
        ],
        intervalo
      ).map((item) => item.id)
    ).toEqual(["inicio", "fim"]);
  });

  it("resolve Este mês e Este ano até hoje", () => {
    expect(
      resolverPeriodoRentabilidade(
        "mes",
        "",
        "",
        referencia
      )
    ).toEqual({
      inicio: "2026-09-01",
      fim: "2026-09-15",
    });
    expect(
      resolverPeriodoRentabilidade(
        "ano",
        "",
        "",
        referencia
      )
    ).toEqual({
      inicio: "2026-01-01",
      fim: "2026-09-15",
    });
  });

  it("aplica limites personalizados inclusivos e normaliza horário", () => {
    const intervalo = resolverPeriodoRentabilidade(
      "personalizado",
      "2026-09-10",
      "2026-09-12",
      referencia
    );
    const resultado = filtrarVendasPorPeriodo(
      [
        venda("antes", { data: "2026-09-09" }),
        venda("inicio", {
          data: "2026-09-10T23:30:00-03:00",
        }),
        venda("fim", { data: "2026-09-12" }),
        venda("depois", { data: "2026-09-13" }),
      ],
      intervalo
    );

    expect(resultado.map((item) => item.id)).toEqual([
      "inicio",
      "fim",
    ]);
  });

  it("aceita somente início ou somente fim no período personalizado", () => {
    const vendas = [
      venda("dia-9", { data: "2026-09-09" }),
      venda("dia-10", { data: "2026-09-10" }),
      venda("dia-11", { data: "2026-09-11" }),
    ];

    expect(
      filtrarVendasPorPeriodo(
        vendas,
        resolverPeriodoRentabilidade(
          "personalizado",
          "2026-09-10",
          "",
          referencia
        )
      ).map((item) => item.id)
    ).toEqual(["dia-10", "dia-11"]);
    expect(
      filtrarVendasPorPeriodo(
        vendas,
        resolverPeriodoRentabilidade(
          "personalizado",
          "",
          "2026-09-10",
          referencia
        )
      ).map((item) => item.id)
    ).toEqual(["dia-9", "dia-10"]);
  });

  it("retorna conjunto vazio para intervalo invertido", () => {
    const intervalo = resolverPeriodoRentabilidade(
      "personalizado",
      "2026-09-12",
      "2026-09-10",
      referencia
    );

    expect(
      filtrarVendasPorPeriodo([venda("venda")], intervalo)
    ).toEqual([]);
  });
});

describe("fluxo e métricas da rentabilidade por produto", () => {
  it("aplica período antes de agrupar e preserva identidade e snapshot", () => {
    const vendas = [
      venda("fora", {
        descricao: "Produto Antigo",
        data: "2026-08-01",
      }),
      venda("dentro-1", {
        descricao: "Produto Intermediário",
        data: "2026-09-10",
        quantidade: 2,
      }),
      venda("dentro-2", {
        descricao: "Produto Novo",
        data: "2026-09-11",
        quantidade: 3,
      }),
    ];
    const filtradas = filtrarVendasPorPeriodo(vendas, {
      inicio: "2026-09-01",
      fim: "2026-09-30",
    });
    const grupos = agruparVendasPorProduto(filtradas);
    const [linha] = calcularRentabilidadeProdutos(grupos);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].vendas.map((item) => item.id)).toEqual([
      "dentro-1",
      "dentro-2",
    ]);
    expect(linha).toMatchObject({
      chave: "produto:produto-1",
      rotulo: "Produto Novo",
      quantidade: 5,
    });
  });

  it("mantém vendas históricas sem produto_id independentes", () => {
    const linhas = analisar([
      venda("historica-1", { produto_id: null }),
      venda("historica-2", { produto_id: null }),
    ]);

    expect(linhas.map((linha) => linha.chave)).toEqual([
      "historico:venda:historica-1",
      "historico:venda:historica-2",
    ]);
  });

  it("busca descrição e código depois da agregação sem perder vendas do grupo", () => {
    const linhas = analisar([
      venda("antiga", {
        descricao: "Produto Antigo",
        codigo: "COD-ANTIGO",
        data: "2026-09-10",
        quantidade: 2,
      }),
      venda("nova", {
        descricao: "Produto Novo",
        codigo: "COD-NOVO",
        data: "2026-09-11",
        quantidade: 3,
      }),
    ]);

    const porDescricao = buscarProdutosRentabilidade(
      linhas,
      "  PRODUTO NOVO  "
    );
    const porCodigo = buscarProdutosRentabilidade(
      linhas,
      "cod-novo"
    );

    expect(porDescricao).toHaveLength(1);
    expect(porDescricao[0].quantidade).toBe(5);
    expect(porCodigo).toEqual(porDescricao);
  });

  it("preserva fórmulas globais e usa só custo conhecido em custo unitário e ROI", () => {
    const [linha] = analisar([
      venda("com-custo", {
        quantidade: 2,
        preco_venda: 200,
        custo: 100,
        despesas: 20,
        lucro: 80,
      }),
      venda("sem-custo", {
        quantidade: 3,
        preco_venda: 300,
        custo: 0,
        despesas: 30,
        lucro: 270,
      }),
    ]);

    expect(linha).toMatchObject({
      quantidade: 5,
      faturamento: 500,
      custo: 100,
      despesas: 50,
      lucro: 350,
      precoMedio: 100,
      margem: 0.7,
      custoUnitarioConhecido: 50,
      roiComCustoConhecido: 0.8,
      vendas: 2,
      vendasComCustoConhecido: 1,
    });
  });

  it("mantém custo unitário e ROI nulos quando nenhum custo é conhecido", () => {
    const [linha] = analisar([
      venda("sem-custo-1", { custo: 0 }),
      venda("sem-custo-2", { custo: -10 }),
    ]);

    expect(linha).toMatchObject({
      custoUnitarioConhecido: null,
      roiComCustoConhecido: null,
      vendas: 2,
      vendasComCustoConhecido: 0,
    });
  });
});

describe("ordenação da rentabilidade por produto", () => {
  function linha(
    chave: string,
    overrides: Partial<LinhaRentabilidadeProduto> = {}
  ): LinhaRentabilidadeProduto {
    return {
      chave,
      codigo: chave,
      descricao: chave,
      rotulo: chave,
      quantidade: 1,
      faturamento: 100,
      custo: 50,
      despesas: 10,
      lucro: 40,
      precoMedio: 100,
      custoUnitarioConhecido: 50,
      roiComCustoConhecido: 0.8,
      margem: 0.4,
      vendas: 1,
      vendasComCustoConhecido: 1,
      ...overrides,
    };
  }

  const linhas = [
    linha("A", {
      quantidade: 5,
      faturamento: 500,
      lucro: 50,
      margem: 0.1,
      roiComCustoConhecido: null,
    }),
    linha("B", {
      quantidade: 2,
      faturamento: 300,
      lucro: 150,
      margem: 0.5,
      roiComCustoConhecido: 1.5,
    }),
    linha("C", {
      quantidade: 8,
      faturamento: 400,
      lucro: 100,
      margem: 0.25,
      roiComCustoConhecido: 0.5,
    }),
  ];

  it("ordena decrescentemente por todas as métricas disponíveis", () => {
    expect(
      ordenarProdutosRentabilidade(linhas, "faturamento").map(
        (item) => item.chave
      )
    ).toEqual(["A", "C", "B"]);
    expect(
      ordenarProdutosRentabilidade(linhas, "lucro").map(
        (item) => item.chave
      )
    ).toEqual(["B", "C", "A"]);
    expect(
      ordenarProdutosRentabilidade(linhas, "margem").map(
        (item) => item.chave
      )
    ).toEqual(["B", "C", "A"]);
    expect(
      ordenarProdutosRentabilidade(linhas, "quantidade").map(
        (item) => item.chave
      )
    ).toEqual(["C", "A", "B"]);
  });

  it("ordena ROI decrescente e mantém valores nulos no final", () => {
    expect(
      ordenarProdutosRentabilidade(linhas, "roi").map(
        (item) => item.chave
      )
    ).toEqual(["B", "C", "A"]);
  });
});
