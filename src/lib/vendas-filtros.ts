export const TODOS_CLIENTES = "__todos_clientes__";
export const SEM_CLIENTE = "__sem_cliente__";

const PREFIXO_CLIENTE = "cliente:";

export type ClienteFiltro =
  | typeof TODOS_CLIENTES
  | typeof SEM_CLIENTE
  | `${typeof PREFIXO_CLIENTE}${string}`;

type VendaFiltravel = {
  cliente: string | null;
  codigo: string | null;
  descricao: string | null;
  data: string | null;
};

type FiltrosVendas = {
  busca: string;
  cliente: ClienteFiltro;
  dataInicial: string;
  dataFinal: string;
};

export type OpcaoCliente = {
  value: ClienteFiltro;
  label: string;
};

export function normalizarTextoFiltro(
  value: string | null | undefined
) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function valorFiltroCliente(
  cliente: string | null
): ClienteFiltro {
  const chave = normalizarTextoFiltro(cliente);

  return chave
    ? `${PREFIXO_CLIENTE}${chave}`
    : SEM_CLIENTE;
}

export function listarOpcoesClientes(
  vendas: VendaFiltravel[]
) {
  const opcoes = new Map<ClienteFiltro, string>();

  for (const venda of vendas) {
    const label = venda.cliente?.trim();

    if (!label) {
      continue;
    }

    const value = valorFiltroCliente(venda.cliente);

    if (!opcoes.has(value)) {
      opcoes.set(value, label);
    }
  }

  return Array.from(
    opcoes,
    ([value, label]) => ({ value, label })
  ).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", {
      sensitivity: "base",
    })
  );
}

export function filtrarVendas<
  T extends VendaFiltravel,
>(vendas: T[], filtros: FiltrosVendas) {
  const busca = normalizarTextoFiltro(
    filtros.busca
  );

  return vendas.filter((venda) => {
    if (
      busca &&
      ![
        venda.descricao,
        venda.codigo,
        venda.cliente,
      ].some((value) =>
        normalizarTextoFiltro(value).includes(busca)
      )
    ) {
      return false;
    }

    if (
      filtros.cliente !== TODOS_CLIENTES &&
      valorFiltroCliente(venda.cliente) !==
        filtros.cliente
    ) {
      return false;
    }

    if (
      filtros.dataInicial &&
      (venda.data ?? "") < filtros.dataInicial
    ) {
      return false;
    }

    if (
      filtros.dataFinal &&
      (venda.data ?? "") > filtros.dataFinal
    ) {
      return false;
    }

    return true;
  });
}
