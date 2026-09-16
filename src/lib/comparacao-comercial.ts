import { todayISO } from "@/lib/format";

export const PERIODOS_COMERCIAIS = [
  { value: "todo", label: "Todo o período" },
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export type PeriodoComercial =
  (typeof PERIODOS_COMERCIAIS)[number]["value"];

export type IntervaloComercial = {
  inicio: string;
  fim: string;
};

export type PeriodosComparacaoComercial = {
  atual: IntervaloComercial;
  anterior: IntervaloComercial | null;
};

type VendaComercial = {
  preco_venda: number | null;
  lucro: number | null;
  quantidade: number | null;
};

export type MetricasComerciais = {
  faturamento: number;
  lucro: number;
  margem: number;
  quantidade: number;
  ticketMedioPorVenda: number;
  vendas: number;
};

export type TendenciaComparacao = "melhora" | "piora" | "estavel";

export type SituacaoVariacao =
  | "comparavel"
  | "sem_alteracao"
  | "sem_base_anterior"
  | "base_negativa"
  | "cruzamento_sinal";

export type ComparacaoValor = {
  atual: number;
  anterior: number;
  diferenca: number;
  variacao: number | null;
  situacao: SituacaoVariacao;
  tendencia: TendenciaComparacao;
};

export type ComparacaoMargem = {
  atual: number;
  anterior: number;
  diferencaPontosPercentuais: number;
  tendencia: TendenciaComparacao;
};

export type ComparacaoMetricasComerciais = {
  faturamento: ComparacaoValor;
  lucro: ComparacaoValor;
  quantidade: ComparacaoValor;
  ticketMedioPorVenda: ComparacaoValor;
  margem: ComparacaoMargem;
};

function partesData(data: string) {
  const [ano, mes, dia] = data
    .slice(0, 10)
    .split("-")
    .map(Number);

  return { ano, mes, dia };
}

function dataLocal(data: string) {
  const { ano, mes, dia } = partesData(data);
  return new Date(ano, mes - 1, dia);
}

function dataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(data: string, dias: number) {
  const resultado = dataLocal(data);
  resultado.setDate(resultado.getDate() + dias);
  return dataISO(resultado);
}

function diasInclusivos(inicio: string, fim: string) {
  const inicioPartes = partesData(inicio);
  const fimPartes = partesData(fim);
  const inicioUtc = Date.UTC(
    inicioPartes.ano,
    inicioPartes.mes - 1,
    inicioPartes.dia
  );
  const fimUtc = Date.UTC(
    fimPartes.ano,
    fimPartes.mes - 1,
    fimPartes.dia
  );

  return Math.round((fimUtc - inicioUtc) / 86400000) + 1;
}

function fimMesAnterior(referencia: string) {
  const { ano, mes, dia } = partesData(referencia);
  const ultimoDia = new Date(ano, mes - 1, 0).getDate();
  return dataISO(
    new Date(ano, mes - 2, Math.min(dia, ultimoDia))
  );
}

function fimAnoAnterior(referencia: string) {
  const { ano, mes, dia } = partesData(referencia);
  const candidato = new Date(ano - 1, mes - 1, dia);

  if (candidato.getMonth() !== mes - 1) {
    return dataISO(new Date(ano - 1, mes, 0));
  }

  return dataISO(candidato);
}

export function resolverPeriodosComparacaoComercial(
  periodo: PeriodoComercial,
  dataInicial = "",
  dataFinal = "",
  referencia = todayISO()
): PeriodosComparacaoComercial {
  const hoje = referencia.slice(0, 10);

  switch (periodo) {
    case "todo":
      return {
        atual: { inicio: "", fim: "" },
        anterior: null,
      };
    case "hoje":
      return {
        atual: { inicio: hoje, fim: hoje },
        anterior: {
          inicio: adicionarDias(hoje, -1),
          fim: adicionarDias(hoje, -1),
        },
      };
    case "7d":
      return {
        atual: {
          inicio: adicionarDias(hoje, -6),
          fim: hoje,
        },
        anterior: {
          inicio: adicionarDias(hoje, -13),
          fim: adicionarDias(hoje, -7),
        },
      };
    case "30d":
      return {
        atual: {
          inicio: adicionarDias(hoje, -29),
          fim: hoje,
        },
        anterior: {
          inicio: adicionarDias(hoje, -59),
          fim: adicionarDias(hoje, -30),
        },
      };
    case "mes": {
      const { ano, mes } = partesData(hoje);
      const inicioAtual = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fimAnterior = fimMesAnterior(hoje);

      return {
        atual: { inicio: inicioAtual, fim: hoje },
        anterior: {
          inicio: fimAnterior.slice(0, 7) + "-01",
          fim: fimAnterior,
        },
      };
    }
    case "ano": {
      const { ano } = partesData(hoje);
      const fimAnterior = fimAnoAnterior(hoje);

      return {
        atual: { inicio: `${ano}-01-01`, fim: hoje },
        anterior: {
          inicio: `${ano - 1}-01-01`,
          fim: fimAnterior,
        },
      };
    }
    case "personalizado": {
      const inicio = dataInicial.slice(0, 10);
      const fim = dataFinal.slice(0, 10);
      const atual = { inicio, fim };

      if (!inicio || !fim || inicio > fim) {
        return { atual, anterior: null };
      }

      const dias = diasInclusivos(inicio, fim);
      const fimAnterior = adicionarDias(inicio, -1);

      return {
        atual,
        anterior: {
          inicio: adicionarDias(fimAnterior, -(dias - 1)),
          fim: fimAnterior,
        },
      };
    }
  }
}

export function calcularMetricasComerciais(
  vendas: VendaComercial[]
): MetricasComerciais {
  const faturamento = vendas.reduce(
    (soma, venda) => soma + Number(venda.preco_venda ?? 0),
    0
  );
  const lucro = vendas.reduce(
    (soma, venda) => soma + Number(venda.lucro ?? 0),
    0
  );
  const quantidade = vendas.reduce(
    (soma, venda) => soma + Number(venda.quantidade ?? 0),
    0
  );
  const totalVendas = vendas.length;

  return {
    faturamento,
    lucro,
    quantidade,
    margem: faturamento > 0 ? lucro / faturamento : 0,
    ticketMedioPorVenda:
      totalVendas > 0 ? faturamento / totalVendas : 0,
    vendas: totalVendas,
  };
}

function tendencia(diferenca: number): TendenciaComparacao {
  if (diferenca > 0) {
    return "melhora";
  }
  if (diferenca < 0) {
    return "piora";
  }
  return "estavel";
}

export function compararValor(
  atual: number,
  anterior: number
): ComparacaoValor {
  const diferenca = atual - anterior;

  if (anterior === 0) {
    return {
      atual,
      anterior,
      diferenca,
      variacao: atual === 0 ? 0 : null,
      situacao:
        atual === 0 ? "sem_alteracao" : "sem_base_anterior",
      tendencia: tendencia(diferenca),
    };
  }

  if (anterior < 0) {
    return {
      atual,
      anterior,
      diferenca,
      variacao: null,
      situacao: "base_negativa",
      tendencia: tendencia(diferenca),
    };
  }

  if (atual < 0) {
    return {
      atual,
      anterior,
      diferenca,
      variacao: null,
      situacao: "cruzamento_sinal",
      tendencia: tendencia(diferenca),
    };
  }

  return {
    atual,
    anterior,
    diferenca,
    variacao: diferenca / anterior,
    situacao: "comparavel",
    tendencia: tendencia(diferenca),
  };
}

export function compararMetricasComerciais(
  atual: MetricasComerciais,
  anterior: MetricasComerciais
): ComparacaoMetricasComerciais {
  const diferencaMargem = (atual.margem - anterior.margem) * 100;

  return {
    faturamento: compararValor(
      atual.faturamento,
      anterior.faturamento
    ),
    lucro: compararValor(atual.lucro, anterior.lucro),
    quantidade: compararValor(
      atual.quantidade,
      anterior.quantidade
    ),
    ticketMedioPorVenda: compararValor(
      atual.ticketMedioPorVenda,
      anterior.ticketMedioPorVenda
    ),
    margem: {
      atual: atual.margem,
      anterior: anterior.margem,
      diferencaPontosPercentuais: diferencaMargem,
      tendencia: tendencia(diferencaMargem),
    },
  };
}
