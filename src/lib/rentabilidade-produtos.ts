import { todayISO } from "@/lib/format";
import type { GrupoVendasProduto } from "@/lib/agregacao-produtos-vendas";

export const PERIODOS_RENTABILIDADE = [
  { value: "todo", label: "Todo o período" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export type PeriodoRentabilidade =
  (typeof PERIODOS_RENTABILIDADE)[number]["value"];

export const ORDENACOES_RENTABILIDADE = [
  { value: "faturamento", label: "Faturamento" },
  { value: "lucro", label: "Lucro" },
  { value: "margem", label: "Margem" },
  { value: "roi", label: "ROI com custo conhecido" },
  { value: "quantidade", label: "Quantidade" },
] as const;

export type OrdenacaoRentabilidade =
  (typeof ORDENACOES_RENTABILIDADE)[number]["value"];

export type IntervaloRentabilidade = {
  inicio: string;
  fim: string;
};

type VendaComData = {
  data: string | null;
};

type VendaParaRentabilidade = {
  id: string;
  produto_id: string | null;
  codigo: string | null;
  descricao: string | null;
  data: string | null;
  created_at: string | null;
  quantidade: number | null;
  preco_venda: number | null;
  custo: number | null;
  despesas: number | null;
  lucro: number | null;
};

export type LinhaRentabilidadeProduto = {
  chave: string;
  codigo: string | null;
  descricao: string | null;
  rotulo: string;
  quantidade: number;
  faturamento: number;
  custo: number;
  despesas: number;
  lucro: number;
  precoMedio: number;
  custoUnitarioConhecido: number | null;
  roiComCustoConhecido: number | null;
  margem: number;
  vendas: number;
  vendasComCustoConhecido: number;
};

function dataLocal(data: string) {
  const [ano, mes, dia] = data
    .slice(0, 10)
    .split("-")
    .map(Number);

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

export function resolverPeriodoRentabilidade(
  periodo: PeriodoRentabilidade,
  dataInicial = "",
  dataFinal = "",
  referencia = todayISO()
): IntervaloRentabilidade {
  const hoje = referencia.slice(0, 10);

  switch (periodo) {
    case "todo":
      return { inicio: "", fim: "" };
    case "30d":
      return {
        inicio: adicionarDias(hoje, -29),
        fim: hoje,
      };
    case "90d":
      return {
        inicio: adicionarDias(hoje, -89),
        fim: hoje,
      };
    case "mes":
      return {
        inicio: `${hoje.slice(0, 7)}-01`,
        fim: hoje,
      };
    case "ano":
      return {
        inicio: `${hoje.slice(0, 4)}-01-01`,
        fim: hoje,
      };
    case "personalizado":
      return {
        inicio: dataInicial.slice(0, 10),
        fim: dataFinal.slice(0, 10),
      };
  }
}

export function filtrarVendasPorPeriodo<
  T extends VendaComData,
>(vendas: T[], intervalo: IntervaloRentabilidade) {
  return vendas.filter((venda) => {
    const data = venda.data?.slice(0, 10) ?? "";

    if (!data && (intervalo.inicio || intervalo.fim)) {
      return false;
    }

    if (intervalo.inicio && data < intervalo.inicio) {
      return false;
    }

    if (intervalo.fim && data > intervalo.fim) {
      return false;
    }

    return true;
  });
}

export function calcularRentabilidadeProdutos<
  T extends VendaParaRentabilidade,
>(grupos: GrupoVendasProduto<T>[]): LinhaRentabilidadeProduto[] {
  return grupos.map((grupo) => {
    const quantidade = grupo.vendas.reduce(
      (soma, venda) =>
        soma + Number(venda.quantidade ?? 0),
      0
    );
    const faturamento = grupo.vendas.reduce(
      (soma, venda) =>
        soma + Number(venda.preco_venda ?? 0),
      0
    );
    const custo = grupo.vendas.reduce(
      (soma, venda) =>
        soma + Number(venda.custo ?? 0),
      0
    );
    const despesas = grupo.vendas.reduce(
      (soma, venda) =>
        soma + Number(venda.despesas ?? 0),
      0
    );
    const lucro = grupo.vendas.reduce(
      (soma, venda) =>
        soma + Number(venda.lucro ?? 0),
      0
    );
    const vendasComCusto = grupo.vendas.filter(
      (venda) => Number(venda.custo ?? 0) > 0
    );
    const custoTotalConhecido = vendasComCusto.reduce(
      (soma, venda) =>
        soma + Number(venda.custo ?? 0),
      0
    );
    const quantidadeComCusto = vendasComCusto.reduce(
      (soma, venda) =>
        soma + Number(venda.quantidade ?? 0),
      0
    );
    const lucroComCusto = vendasComCusto.reduce(
      (soma, venda) =>
        soma + Number(venda.lucro ?? 0),
      0
    );
    const temCustoConhecido =
      quantidadeComCusto > 0 && custoTotalConhecido > 0;

    return {
      chave: grupo.chave,
      codigo: grupo.codigo,
      descricao: grupo.descricao,
      rotulo: grupo.rotulo,
      quantidade,
      faturamento,
      custo,
      despesas,
      lucro,
      precoMedio:
        quantidade > 0 ? faturamento / quantidade : 0,
      custoUnitarioConhecido: temCustoConhecido
        ? custoTotalConhecido / quantidadeComCusto
        : null,
      roiComCustoConhecido: temCustoConhecido
        ? lucroComCusto / custoTotalConhecido
        : null,
      margem: faturamento > 0 ? lucro / faturamento : 0,
      vendas: grupo.vendas.length,
      vendasComCustoConhecido: vendasComCusto.length,
    };
  });
}

function normalizarBusca(valor: string | null | undefined) {
  return (valor ?? "").trim().toLocaleLowerCase("pt-BR");
}

export function buscarProdutosRentabilidade(
  linhas: LinhaRentabilidadeProduto[],
  busca: string
) {
  const termo = normalizarBusca(busca);

  if (!termo) {
    return linhas;
  }

  return linhas.filter((linha) =>
    [linha.descricao, linha.codigo].some((valor) =>
      normalizarBusca(valor).includes(termo)
    )
  );
}

function valorOrdenacao(
  linha: LinhaRentabilidadeProduto,
  ordenacao: OrdenacaoRentabilidade
) {
  switch (ordenacao) {
    case "faturamento":
      return linha.faturamento;
    case "lucro":
      return linha.lucro;
    case "margem":
      return linha.margem;
    case "roi":
      return linha.roiComCustoConhecido;
    case "quantidade":
      return linha.quantidade;
  }
}

export function ordenarProdutosRentabilidade(
  linhas: LinhaRentabilidadeProduto[],
  ordenacao: OrdenacaoRentabilidade
) {
  return [...linhas].sort((a, b) => {
    const valorA = valorOrdenacao(a, ordenacao);
    const valorB = valorOrdenacao(b, ordenacao);

    if (ordenacao === "roi") {
      if (valorA === null && valorB !== null) {
        return 1;
      }
      if (valorA !== null && valorB === null) {
        return -1;
      }
    }

    const diferencaPrincipal =
      Number(valorB ?? 0) - Number(valorA ?? 0);

    if (diferencaPrincipal !== 0) {
      return diferencaPrincipal;
    }

    if (ordenacao !== "faturamento") {
      const diferencaFaturamento =
        b.faturamento - a.faturamento;

      if (diferencaFaturamento !== 0) {
        return diferencaFaturamento;
      }
    }

    return (
      a.rotulo.localeCompare(b.rotulo, "pt-BR", {
        sensitivity: "base",
      }) || a.chave.localeCompare(b.chave)
    );
  });
}
