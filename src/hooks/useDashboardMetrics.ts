import { useMemo } from "react";

type Props = {
    vendas: any[];
    produtos: any[];
    despesas: any[];
    movimentacoes: any[];
};

const monthLabel = (d: string | Date) => {
    const dt =
        typeof d === "string"
            ? new Date(d + (d.length === 10 ? "T00:00:00" : ""))
            : d;

    return dt.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
    });
};

export function useDashboardMetrics({
    vendas, produtos,
    despesas, movimentacoes,
}: Props) {
    const k = useMemo(() => {
        const faturamento = vendas.reduce(
            (s, v) => s + Number(v.preco_venda ?? 0),
            0
        );

        const lucro = vendas.reduce(
            (s, v) => s + Number(v.lucro ?? 0),
            0
        );

        const custoVendas = vendas.reduce(
            (s, v) => s + Number(v.custo ?? 0),
            0
        );

        const qtdVendida = vendas.reduce(
            (s, v) => s + Number(v.quantidade ?? 0),
            0
        );

        const despesasTotal = despesas.reduce(
            (s, d) => s + Number(d.valor ?? 0),
            0
        );

        const despesasPagas = despesas
            .filter((d) => d.status === "pago")
            .reduce((s, d) => s + Number(d.valor), 0);

        const lucroLiquido = lucro - despesasTotal;

        const margem =
            faturamento ? lucroLiquido / faturamento : 0;

        const ticket =
            vendas.length ? faturamento / vendas.length : 0;

        const entradas = movimentacoes.reduce(
            (s, m) => s + Number(m.entrada ?? 0),
            0
        );

        const saidas = movimentacoes.reduce(
            (s, m) => s + Number(m.saida ?? 0),
            0
        );

        const saldo = entradas - saidas;

        const estoqueTotal = produtos.reduce(
            (s, p) => s + Number(p.estoque_atual ?? 0),
            0
        );

        const roi =
            custoVendas ? lucro / custoVendas : 0;

        const totalProdutos = produtos.length;

        const zerados = produtos.filter(
            (p) => Number(p.estoque_atual ?? 0) <= 0
        ).length;

        const baixo = produtos.filter((p) => {
            const e = Number(p.estoque_atual ?? 0);
            const min = Number(p.estoque_minimo ?? 0);

            return e > 0 && e <= min;
        }).length;

        const valorEstoque = produtos.reduce(
            (s, p) =>
                s +
                Number(p.estoque_atual ?? 0) *
                Number(p.custo_compra ?? 0),
            0
        );

        const saldoCaixa = faturamento - despesasPagas;

        return {
            faturamento, lucro, lucroLiquido, despesasTotal, despesasPagas, margem, saldo,
            saldoCaixa, qtdVendida, ticket, estoqueTotal, roi, custoVendas, entradas, saidas,
            totalProdutos, zerados, baixo, valorEstoque,
        };
    }, [vendas, produtos, despesas, movimentacoes]);

    const fluxo = useMemo(() => {
    const map = new Map<
        string,
        {
            mes: string;
            entradas: number;
            saidas: number;
            saldo: number;
        }
    >();

    let acc = 0;

    const sorted = [...movimentacoes].sort((a, b) =>
        (a.data ?? "").localeCompare(b.data ?? "")
    );

    for (const m of sorted) {
        if (!m.data) continue;

        const mes = monthLabel(m.data);

        const cur = map.get(mes) ?? {
            mes,
            entradas: 0,
            saidas: 0,
            saldo: 0,
        };

        cur.entradas += Number(m.entrada ?? 0);
        cur.saidas += Number(m.saida ?? 0);

        map.set(mes, cur);
    }

    for (const item of map.values()) {
        acc += item.entradas - item.saidas;
        item.saldo = acc;
    }

    return Array.from(map.values());
}, [movimentacoes]);

    const monthly = useMemo(() => {
        const map = new Map<
            string,
            {
                mes: string;
                faturamento: number;
                lucro: number;
                custo: number;
                qtd: number;
            }
        >();

        for (const v of vendas) {
            if (!v.data) continue;

            const mes = monthLabel(v.data);

            const cur = map.get(mes) ?? {
                mes,
                faturamento: 0,
                lucro: 0,
                custo: 0,
                qtd: 0,
            };

            cur.faturamento += Number(v.preco_venda ?? 0);
            cur.lucro += Number(v.lucro ?? 0);
            cur.custo += Number(v.custo ?? 0);
            cur.qtd += Number(v.quantidade ?? 0);

            map.set(mes, cur);
        }

        return Array.from(map.values());
    }, [vendas]);

    return {
        k,
        monthly,
        fluxo,
    };
}