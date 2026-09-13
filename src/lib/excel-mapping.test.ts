import { describe, expect, it } from "vitest";

import {
    autoMap,
    detectSheetKind,
    missingRequired,
    normalize,
} from "@/lib/excel-mapping";

describe("excel-mapping", () => {
    describe("normalize", () => {
        it("normaliza maiúsculas, acentos e separadores", () => {
            expect(
                normalize("  Preço_Venda  "),
            ).toBe("preco venda");

            expect(
                normalize("CUSTO-UNITÁRIO"),
            ).toBe("custo unitario");
        });
    });

    describe("detectSheetKind", () => {
        it("detecta estoque pelo nome da aba", () => {
            expect(
                detectSheetKind("Estoque Atual", []),
            ).toBe("estoque");
        });

        it("detecta compras pelo nome da aba", () => {
            expect(
                detectSheetKind("Compras", []),
            ).toBe("compras");
        });

        it("detecta vendas pelo nome da aba", () => {
            expect(
                detectSheetKind("Vendas 2026", []),
            ).toBe("vendas");
        });

        it("detecta movimentações pelo nome da aba", () => {
            expect(
                detectSheetKind("Fluxo de Caixa", []),
            ).toBe("movimentacoes");
        });

        it("usa os headers como fallback quando o nome não identifica a aba", () => {
            expect(
                detectSheetKind(
                    "Planilha1",
                    [
                        "Código",
                        "Descrição",
                        "Estoque Atual",
                        "Preço Venda",
                    ],
                ),
            ).toBe("estoque");
        });

        it("retorna null quando não há evidência suficiente", () => {
            expect(
                detectSheetKind(
                    "Planilha1",
                    ["Campo Aleatório"],
                ),
            ).toBeNull();
        });
    });

    describe("autoMap", () => {
        it("mapeia colunas de estoque usando sinônimos", () => {
            const mapping = autoMap(
                "estoque",
                [
                    "SKU",
                    "Produto",
                    "Qtd",
                    "Custo Unitário",
                    "Preço Venda",
                ],
            );

            expect(mapping.codigo).toBe("SKU");
            expect(mapping.descricao).toBe("Produto");
            expect(mapping.estoque_atual).toBe("Qtd");
            expect(mapping.custo_compra).toBe(
                "Custo Unitário",
            );
            expect(mapping.preco_venda).toBe(
                "Preço Venda",
            );
        });

        it("mapeia código e data de compras separadamente", () => {
            const mapping = autoMap(
                "compras",
                [
                    "Código",
                    "Data",
                    "Fornecedor",
                    "Quantidade",
                    "Custo Unitário",
                ],
            );

            expect(mapping.codigo).toBe("Código");
            expect(mapping.data).toBe("Data");
            expect(mapping.fornecedor).toBe(
                "Fornecedor",
            );
        });

        it("não usa a coluna Data como código de compra", () => {
            const mapping = autoMap(
                "compras",
                [
                    "Data",
                    "Fornecedor",
                    "Quantidade",
                ],
            );

            expect(mapping.codigo).toBeNull();
            expect(mapping.data).toBe("Data");
        });

        it("mapeia valor unitário e total da venda separadamente", () => {
            const mapping = autoMap(
                "vendas",
                [
                    "Data",
                    "Código",
                    "Valor Unitário",
                    "Valor Total",
                ],
            );

            expect(mapping.valor_unitario).toBe(
                "Valor Unitário",
            );

            expect(mapping.preco_venda).toBe(
                "Valor Total",
            );
        });

        it("mapeia tipo das movimentações", () => {
            const mapping = autoMap(
                "movimentacoes",
                [
                    "Data",
                    "Tipo",
                    "Entrada",
                    "Saída",
                ],
            );

            expect(mapping.tipo).toBe("Tipo");
            expect(mapping.data).toBe("Data");
            expect(mapping.entrada).toBe("Entrada");
            expect(mapping.saida).toBe("Saída");
        });
    });

    describe("missingRequired", () => {
        it("aceita compra quando código e data estão mapeados", () => {
            const mapping = autoMap(
                "compras",
                [
                    "Código",
                    "Data",
                ],
            );

            expect(
                missingRequired(
                    "compras",
                    mapping,
                ),
            ).toEqual([]);
        });

        it("considera inválida compra sem código", () => {
            const mapping = autoMap(
                "compras",
                [
                    "Data",
                    "Fornecedor",
                ],
            );

            expect(
                missingRequired(
                    "compras",
                    mapping,
                ),
            ).toContain("codigo");
        });

        it("considera inválida compra sem data", () => {
            const mapping = autoMap(
                "compras",
                [
                    "Código",
                    "Fornecedor",
                ],
            );

            expect(
                missingRequired(
                    "compras",
                    mapping,
                ),
            ).toContain("data");
        });

        it("exige data e tipo nas movimentações", () => {
            expect(
                missingRequired(
                    "movimentacoes",
                    {
                        data: "Data",
                        tipo: null,
                    },
                ),
            ).toEqual(["tipo"]);
        });
    });
});