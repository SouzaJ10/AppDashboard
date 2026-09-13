import { describe, expect, it } from "vitest";

import { queryKeys } from "@/constants/queryKeys";

describe("queryKeys multiempresa", () => {
    it("separa vendas por empresa", () => {
        expect(
            queryKeys.vendas.empresa("empresa-a"),
        ).toEqual(["vendas", "empresa-a"]);

        expect(
            queryKeys.vendas.empresa("empresa-a"),
        ).not.toEqual(
            queryKeys.vendas.empresa("empresa-b"),
        );
    });

    it("separa produtos por empresa", () => {
        expect(
            queryKeys.produtos.listaEmpresa(
                "empresa-a",
            ),
        ).toEqual([
            "produtos",
            "empresa-a",
            "lista",
        ]);

        expect(
            queryKeys.produtos.listaEmpresa(
                "empresa-a",
            ),
        ).not.toEqual(
            queryKeys.produtos.listaEmpresa(
                "empresa-b",
            ),
        );
    });

    it("separa movimentações por empresa", () => {
        expect(
            queryKeys.movimentacoes.empresa(
                "empresa-a",
            ),
        ).not.toEqual(
            queryKeys.movimentacoes.empresa(
                "empresa-b",
            ),
        );
    });

    it("separa compras por empresa", () => {
        expect(
            queryKeys.compras.empresa("empresa-a"),
        ).not.toEqual(
            queryKeys.compras.empresa("empresa-b"),
        );
    });

    it("separa despesas por empresa", () => {
        expect(
            queryKeys.despesas.empresa("empresa-a"),
        ).not.toEqual(
            queryKeys.despesas.empresa("empresa-b"),
        );
    });

    it("separa categorias por empresa", () => {
        expect(
            queryKeys.categoriasDespesa.empresa(
                "empresa-a",
            ),
        ).not.toEqual(
            queryKeys.categoriasDespesa.empresa(
                "empresa-b",
            ),
        );
    });

    it("separa a lista de empresas por usuário", () => {
        expect(
            queryKeys.empresas.usuario("usuario-a"),
        ).toEqual([
            "empresas",
            "usuario",
            "usuario-a",
        ]);

        expect(
            queryKeys.empresas.usuario("usuario-a"),
        ).not.toEqual(
            queryKeys.empresas.usuario("usuario-b"),
        );
    });

    it("mantém as raízes de invalidação independentes", () => {
        expect(queryKeys.vendas.all).toEqual([
            "vendas",
        ]);

        expect(queryKeys.compras.all).toEqual([
            "compras",
        ]);

        expect(queryKeys.despesas.all).toEqual([
            "despesas",
        ]);

        expect(queryKeys.movimentacoes.all).toEqual([
            "movimentacoes",
        ]);

        expect(queryKeys.produtos.all).toEqual([
            "produtos",
        ]);
    });
});