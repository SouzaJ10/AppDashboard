type VendaParaAgrupamento = {
  id: string;
  produto_id: string | null;
  codigo: string | null;
  descricao: string | null;
  data: string | null;
  created_at: string | null;
};

export type GrupoVendasProduto<
  T extends VendaParaAgrupamento,
> = {
  chave: string;
  produtoId: string | null;
  codigo: string | null;
  descricao: string | null;
  rotulo: string;
  vendas: T[];
};

export function chaveProdutoVenda(
  venda: VendaParaAgrupamento
) {
  return venda.produto_id
    ? `produto:${venda.produto_id}`
    : `historico:venda:${venda.id}`;
}

function compararSnapshot(
  a: VendaParaAgrupamento,
  b: VendaParaAgrupamento
) {
  return (
    (a.data ?? "").localeCompare(b.data ?? "") ||
    (a.created_at ?? "").localeCompare(
      b.created_at ?? ""
    ) ||
    a.id.localeCompare(b.id)
  );
}

function rotuloSnapshot(
  venda: VendaParaAgrupamento
) {
  return (
    venda.descricao?.trim() ||
    venda.codigo?.trim() ||
    "Produto não identificado"
  );
}

export function agruparVendasPorProduto<
  T extends VendaParaAgrupamento,
>(vendas: T[]): GrupoVendasProduto<T>[] {
  const grupos = new Map<
    string,
    {
      produtoId: string | null;
      snapshot: T;
      vendas: T[];
    }
  >();

  for (const venda of vendas) {
    const chave = chaveProdutoVenda(venda);
    const grupo = grupos.get(chave);

    if (!grupo) {
      grupos.set(chave, {
        produtoId: venda.produto_id,
        snapshot: venda,
        vendas: [venda],
      });
      continue;
    }

    grupo.vendas.push(venda);

    if (
      compararSnapshot(venda, grupo.snapshot) > 0
    ) {
      grupo.snapshot = venda;
    }
  }

  return Array.from(
    grupos,
    ([chave, grupo]) => ({
      chave,
      produtoId: grupo.produtoId,
      codigo: grupo.snapshot.codigo,
      descricao: grupo.snapshot.descricao,
      rotulo: rotuloSnapshot(grupo.snapshot),
      vendas: grupo.vendas,
    })
  );
}
