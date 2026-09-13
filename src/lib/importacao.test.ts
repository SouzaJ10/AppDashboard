import {
    describe,
    expect,
    it,
} from "vitest";

import {
    calcularValoresVendaImportada,
    excelDateToISO,
    importacaoPronta,
    localizarProduto,
    num,
    str,
} from "@/lib/importacao";

describe("importacao", () => {
    describe("importacaoPronta", () => {
        it("não permite importar quando nenhuma aba está habilitada", () => {
            expect(
                importacaoPronta([]),
            ).toBe(false);
        });

        it("permite importar quando todas as abas habilitadas são válidas", () => {
            expect(
                importacaoPronta([
                    {
                        enabled: true,
                        kind: "compras",
                        mapping: {
                            codigo: "Código",
                            data: "Data",
                        },
                    },
                    {
                        enabled: true,
                        kind: "vendas",
                        mapping: {
                            data: "Data",
                        },
                    },
                ]),
            ).toBe(true);
        });

        it("bloqueia importação quando uma das abas habilitadas é inválida", () => {
            expect(
                importacaoPronta([
                    {
                        enabled: true,
                        kind: "compras",
                        mapping: {
                            codigo: "Código",
                            data: "Data",
                        },
                    },
                    {
                        enabled: true,
                        kind: "movimentacoes",
                        mapping: {
                            data: "Data",
                            tipo: null,
                        },
                    },
                ]),
            ).toBe(false);
        });

        it("ignora aba inválida quando ela está desabilitada", () => {
            expect(
                importacaoPronta([
                    {
                        enabled: true,
                        kind: "compras",
                        mapping: {
                            codigo: "Código",
                            data: "Data",
                        },
                    },
                    {
                        enabled: false,
                        kind: "movimentacoes",
                        mapping: {
                            data: null,
                            tipo: null,
                        },
                    },
                ]),
            ).toBe(true);
        });
    });

    describe("excelDateToISO", () => {
        it("converte string de data válida", () => {
            expect(
                excelDateToISO(
                    "2026-09-12",
                ),
            ).toBe("2026-09-12");
        });

        it("retorna null para string inválida", () => {
            expect(
                excelDateToISO(
                    "data-invalida",
                ),
            ).toBeNull();
        });

        it("converte objeto Date", () => {
            expect(
                excelDateToISO(
                    new Date(
                        "2026-09-12T12:00:00Z",
                    ),
                ),
            ).toBe("2026-09-12");
        });

        it("converte número serial do Excel", () => {
            expect(
                excelDateToISO(45292),
            ).toBe("2024-01-01");
        });

        it("retorna null quando não existe data", () => {
            expect(
                excelDateToISO(null),
            ).toBeNull();
        });
    });

    describe("num", () => {
        it("mantém valores numéricos", () => {
            expect(num(123.45)).toBe(
                123.45,
            );
        });

        it("converte valor decimal brasileiro simples", () => {
            expect(
                num("R$ 123,45"),
            ).toBe(123.45);
        });

        it("retorna zero para valor inválido", () => {
            expect(
                num("sem valor"),
            ).toBe(0);
        });
    });

    describe("str", () => {
        it("remove espaços das extremidades", () => {
            expect(
                str("  Produto A  "),
            ).toBe("Produto A");
        });

        it("retorna null para valor vazio", () => {
            expect(str("")).toBeNull();
            expect(str(null)).toBeNull();
        });
    });

    describe("localizarProduto", () => {
        const codeToId =
            new Map([
                ["SKU-001", "produto-1"],
            ]);

        const nameToId =
            new Map([
                [
                    "produto dois",
                    "produto-2",
                ],
            ]);

        const nameToCode =
            new Map([
                [
                    "produto dois",
                    "SKU-002",
                ],
            ]);

        const ambiguousNames =
            new Set([
                "produto duplicado",
            ]);

        it("prioriza localização pelo código", () => {
            expect(
                localizarProduto(
                    "SKU-001",
                    "Outro nome",
                    codeToId,
                    nameToId,
                    nameToCode,
                    ambiguousNames,
                ),
            ).toEqual({
                produto_id: "produto-1",
                codigo: "SKU-001",
                ambiguous: false,
            });
        });

        it("localiza pelo nome quando não encontra pelo código", () => {
            expect(
                localizarProduto(
                    null,
                    "Produto Dois",
                    codeToId,
                    nameToId,
                    nameToCode,
                    ambiguousNames,
                ),
            ).toEqual({
                produto_id: "produto-2",
                codigo: "SKU-002",
                ambiguous: false,
            });
        });

        it("sinaliza nome ambíguo", () => {
            expect(
                localizarProduto(
                    null,
                    "Produto Duplicado",
                    codeToId,
                    nameToId,
                    nameToCode,
                    ambiguousNames,
                ),
            ).toEqual({
                produto_id: null,
                codigo: "",
                ambiguous: true,
            });
        });

        it("retorna produto não localizado sem inventar vínculo", () => {
            expect(
                localizarProduto(
                    "SKU-INEXISTENTE",
                    "Produto inexistente",
                    codeToId,
                    nameToId,
                    nameToCode,
                    ambiguousNames,
                ),
            ).toEqual({
                produto_id: null,
                codigo:
                    "SKU-INEXISTENTE",
                ambiguous: false,
            });
        });
    });

    describe("calcularValoresVendaImportada", () => {
        it("preserva total, custo e lucro informados", () => {
            expect(
                calcularValoresVendaImportada({
                    quantidade: 2,
                    valorUnitario: 15,
                    totalInformado: 40,
                    custoInformado: 22,
                    custoUnitarioProduto: 10,
                    despesas: 3,
                    lucroInformado: 15,
                }),
            ).toEqual({
                precoTotal: 40,
                custo: 22,
                lucro: 15,
                margem: 0.375,
            });
        });

        it("calcula total quando ele não foi informado", () => {
            const resultado =
                calcularValoresVendaImportada({
                    quantidade: 2,
                    valorUnitario: 15,
                    totalInformado: 0,
                    custoInformado: 20,
                    custoUnitarioProduto: 10,
                    despesas: 1,
                    lucroInformado: 9,
                });

            expect(
                resultado.precoTotal,
            ).toBe(30);
        });

        it("usa custo do produto vezes quantidade quando o custo não foi informado", () => {
            const resultado =
                calcularValoresVendaImportada({
                    quantidade: 2,
                    valorUnitario: 15,
                    totalInformado: 30,
                    custoInformado: 0,
                    custoUnitarioProduto: 10,
                    despesas: 1,
                    lucroInformado: 0,
                });

            expect(resultado).toEqual({
                precoTotal: 30,
                custo: 20,
                lucro: 9,
                margem: 0.3,
            });
        });

        it("calcula lucro quando ele não foi informado", () => {
            const resultado =
                calcularValoresVendaImportada({
                    quantidade: 3,
                    valorUnitario: 20,
                    totalInformado: 60,
                    custoInformado: 30,
                    custoUnitarioProduto: 10,
                    despesas: 5,
                    lucroInformado: 0,
                });

            expect(resultado.lucro).toBe(
                25,
            );

            expect(resultado.margem).toBeCloseTo(
                25 / 60,
            );
        });

        it("usa margem zero quando o total da venda é zero", () => {
            const resultado =
                calcularValoresVendaImportada({
                    quantidade: 0,
                    valorUnitario: 0,
                    totalInformado: 0,
                    custoInformado: 0,
                    custoUnitarioProduto: 10,
                    despesas: 0,
                    lucroInformado: 0,
                });

            expect(resultado.margem).toBe(
                0,
            );
        });
    });
});