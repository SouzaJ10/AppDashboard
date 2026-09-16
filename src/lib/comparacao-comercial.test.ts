import { describe, expect, it } from "vitest";

import {
  calcularMetricasComerciais,
  compararMetricasComerciais,
  compararValor,
  resolverPeriodosComparacaoComercial,
} from "@/lib/comparacao-comercial";
import {
  filtrarVendas,
  TODOS_CLIENTES,
  type ClienteFiltro,
} from "@/lib/vendas-filtros";

type VendaTeste = {
  id: string;
  cliente: string | null;
  codigo: string | null;
  descricao: string | null;
  data: string;
  quantidade: number;
  preco_venda: number;
  lucro: number;
};

function venda(
  id: string,
  overrides: Partial<VendaTeste> = {}
): VendaTeste {
  return {
    id,
    cliente: "Cliente A",
    codigo: "001",
    descricao: "Produto A",
    data: "2026-09-15",
    quantidade: 1,
    preco_venda: 100,
    lucro: 30,
    ...overrides,
  };
}

function filtrar(
  vendas: VendaTeste[],
  intervalo: { inicio: string; fim: string },
  busca = "",
  cliente: ClienteFiltro = TODOS_CLIENTES
) {
  return filtrarVendas(vendas, {
    busca,
    cliente,
    dataInicial: intervalo.inicio,
    dataFinal: intervalo.fim,
  });
}

describe("períodos da comparação comercial", () => {
  const referencia = "2026-09-15";

  it("mantém Todo o período sem comparação", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "todo",
        "",
        "",
        referencia
      )
    ).toEqual({
      atual: { inicio: "", fim: "" },
      anterior: null,
    });
  });

  it("compara Hoje com ontem", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "hoje",
        "",
        "",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-09-15",
        fim: "2026-09-15",
      },
      anterior: {
        inicio: "2026-09-14",
        fim: "2026-09-14",
      },
    });
  });

  it("resolve janelas consecutivas de 7 dias com limites inclusivos", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "7d",
        "",
        "",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-09-09",
        fim: "2026-09-15",
      },
      anterior: {
        inicio: "2026-09-02",
        fim: "2026-09-08",
      },
    });
  });

  it("resolve janelas consecutivas de 30 dias", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "30d",
        "",
        "",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-08-17",
        fim: "2026-09-15",
      },
      anterior: {
        inicio: "2026-07-18",
        fim: "2026-08-16",
      },
    });
  });

  it("compara Este mês com o mesmo trecho do mês anterior", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "mes",
        "",
        "",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-09-01",
        fim: "2026-09-15",
      },
      anterior: {
        inicio: "2026-08-01",
        fim: "2026-08-15",
      },
    });
  });

  it("limita o dia equivalente ao fim de um mês anterior mais curto", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "mes",
        "",
        "",
        "2026-03-31"
      ).anterior
    ).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
  });

  it("compara Este ano com o mesmo trecho do ano anterior", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "ano",
        "",
        "",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-01-01",
        fim: "2026-09-15",
      },
      anterior: {
        inicio: "2025-01-01",
        fim: "2025-09-15",
      },
    });
  });

  it("ajusta 29 de fevereiro para 28 no ano anterior", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "ano",
        "",
        "",
        "2024-02-29"
      ).anterior
    ).toEqual({
      inicio: "2023-01-01",
      fim: "2023-02-28",
    });
  });

  it("resolve Personalizado com janela anterior de igual duração", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "personalizado",
        "2026-09-01",
        "2026-09-10",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-09-01",
        fim: "2026-09-10",
      },
      anterior: {
        inicio: "2026-08-22",
        fim: "2026-08-31",
      },
    });
  });

  it("mantém filtro personalizado parcial e torna a comparação indisponível", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "personalizado",
        "2026-09-01",
        "",
        referencia
      )
    ).toEqual({
      atual: { inicio: "2026-09-01", fim: "" },
      anterior: null,
    });
    expect(
      resolverPeriodosComparacaoComercial(
        "personalizado",
        "",
        "2026-09-10",
        referencia
      )
    ).toEqual({
      atual: { inicio: "", fim: "2026-09-10" },
      anterior: null,
    });
  });

  it("mantém intervalo invertido no atual e não cria comparação", () => {
    expect(
      resolverPeriodosComparacaoComercial(
        "personalizado",
        "2026-09-10",
        "2026-09-01",
        referencia
      )
    ).toEqual({
      atual: {
        inicio: "2026-09-10",
        fim: "2026-09-01",
      },
      anterior: null,
    });
  });
});

describe("filtragem dos conjuntos atual e anterior", () => {
  it("aplica busca e cliente igualmente partindo das vendas originais", () => {
    const periodos = resolverPeriodosComparacaoComercial(
      "7d",
      "",
      "",
      "2026-09-15"
    );
    const vendas = [
      venda("atual-alvo", { data: "2026-09-10" }),
      venda("anterior-alvo", { data: "2026-09-05" }),
      venda("outro-produto", {
        data: "2026-09-10",
        descricao: "Produto B",
      }),
      venda("outro-cliente", {
        data: "2026-09-05",
        cliente: "Cliente B",
      }),
    ];
    const cliente = "cliente:cliente a" as ClienteFiltro;

    const atual = filtrar(
      vendas,
      periodos.atual,
      "Produto A",
      cliente
    );
    const anterior = filtrar(
      vendas,
      periodos.anterior!,
      "Produto A",
      cliente
    );

    expect(atual.map((item) => item.id)).toEqual(["atual-alvo"]);
    expect(anterior.map((item) => item.id)).toEqual([
      "anterior-alvo",
    ]);
  });

  it("não mistura registros anteriores no conjunto atual", () => {
    const periodos = resolverPeriodosComparacaoComercial(
      "7d",
      "",
      "",
      "2026-09-15"
    );
    const vendas = [
      venda("atual", { data: "2026-09-09T23:30:00-03:00" }),
      venda("anterior", { data: "2026-09-08" }),
    ];

    expect(
      filtrar(vendas, periodos.atual).map((item) => item.id)
    ).toEqual(["atual"]);
    expect(
      filtrar(vendas, periodos.anterior!).map((item) => item.id)
    ).toEqual(["anterior"]);
  });
});

describe("métricas e variações comerciais", () => {
  it("calcula totais, margem agregada e ticket médio por registro", () => {
    const metricas = calcularMetricasComerciais([
      venda("venda-1", {
        quantidade: 2,
        preco_venda: 100,
        lucro: 10,
      }),
      venda("venda-2", {
        quantidade: 3,
        preco_venda: 300,
        lucro: 150,
      }),
    ]);

    expect(metricas).toEqual({
      faturamento: 400,
      lucro: 160,
      margem: 0.4,
      quantidade: 5,
      ticketMedioPorVenda: 200,
      vendas: 2,
    });
    expect(metricas.margem).not.toBe((0.1 + 0.5) / 2);
  });

  it("retorna margem e ticket zero sem vendas", () => {
    expect(calcularMetricasComerciais([])).toEqual({
      faturamento: 0,
      lucro: 0,
      margem: 0,
      quantidade: 0,
      ticketMedioPorVenda: 0,
      vendas: 0,
    });
  });

  it("calcula variação percentual com base anterior positiva", () => {
    expect(compararValor(120, 100)).toMatchObject({
      diferenca: 20,
      variacao: 0.2,
      situacao: "comparavel",
      tendencia: "melhora",
    });
  });

  it("trata base zero sem inventar percentual", () => {
    expect(compararValor(0, 0)).toMatchObject({
      diferenca: 0,
      variacao: 0,
      situacao: "sem_alteracao",
    });
    expect(compararValor(50, 0)).toMatchObject({
      diferenca: 50,
      variacao: null,
      situacao: "sem_base_anterior",
    });
  });

  it("classifica lucro negativo e cruzamentos sem percentual", () => {
    expect(compararValor(-50, -100)).toMatchObject({
      diferenca: 50,
      variacao: null,
      situacao: "base_negativa",
      tendencia: "melhora",
    });
    expect(compararValor(50, -100)).toMatchObject({
      diferenca: 150,
      variacao: null,
      situacao: "base_negativa",
      tendencia: "melhora",
    });
    expect(compararValor(-50, 100)).toMatchObject({
      diferenca: -150,
      variacao: null,
      situacao: "cruzamento_sinal",
      tendencia: "piora",
    });
  });

  it("compara margem em pontos percentuais", () => {
    const atual = calcularMetricasComerciais([
      venda("atual", { preco_venda: 100, lucro: 20 }),
    ]);
    const anterior = calcularMetricasComerciais([
      venda("anterior", { preco_venda: 100, lucro: 15 }),
    ]);
    const comparacao = compararMetricasComerciais(atual, anterior);

    expect(comparacao.margem).toMatchObject({
      atual: 0.2,
      anterior: 0.15,
      tendencia: "melhora",
    });
    expect(
      comparacao.margem.diferencaPontosPercentuais
    ).toBeCloseTo(5);
  });
});
