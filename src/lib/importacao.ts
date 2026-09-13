import * as XLSX from "xlsx";

import {
    type SheetKind,
    missingRequired,
} from "@/lib/excel-mapping";

export type SheetValidationInfo = {
    enabled: boolean;
    kind: SheetKind | null;
    mapping: Record<string, string | null>;
};

export function importacaoPronta(
    sheets: SheetValidationInfo[],
): boolean {
    const enabledSheets = sheets.filter(
        (sheet) =>
            sheet.enabled &&
            sheet.kind,
    );

    return (
        enabledSheets.length > 0 &&
        enabledSheets.every(
            (sheet) =>
                missingRequired(
                    sheet.kind as SheetKind,
                    sheet.mapping,
                ).length === 0,
        )
    );
}

export function excelDateToISO(
    value: unknown,
): string | null {
    if (!value) {
        return null;
    }

    if (typeof value === "string") {
        const date = new Date(value);

        return isNaN(date.getTime())
            ? null
            : date.toISOString().slice(0, 10);
    }

    if (typeof value === "number") {
        const date =
            XLSX.SSF.parse_date_code(value);

        if (!date) {
            return null;
        }

        return `${date.y}-${String(
            date.m,
        ).padStart(2, "0")}-${String(
            date.d,
        ).padStart(2, "0")}`;
    }

    if (value instanceof Date) {
        return value
            .toISOString()
            .slice(0, 10);
    }

    return null;
}

export function num(
    value: unknown,
): number {
    if (
        value == null ||
        value === ""
    ) {
        return 0;
    }

    const number =
        typeof value === "number"
            ? value
            : Number(
                String(value)
                    .replace(
                        /[^\d,.-]/g,
                        "",
                    )
                    .replace(",", "."),
            );

    return isFinite(number)
        ? number
        : 0;
}

export function str(
    value: unknown,
): string | null {
    return value == null ||
        value === ""
        ? null
        : String(value).trim();
}

export function localizarProduto(
    codigo: string | null,
    nome: string,
    codeToId: ReadonlyMap<
        string,
        string
    >,
    nameToId: ReadonlyMap<
        string,
        string
    >,
    nameToCode: ReadonlyMap<
        string,
        string
    >,
    ambiguousNames: ReadonlySet<string>,
) {
    if (codigo) {
        const id =
            codeToId.get(codigo);

        if (id) {
            return {
                produto_id: id,
                codigo,
                ambiguous: false,
            };
        }
    }

    const nomeNormalizado =
        nome
            .trim()
            .toLowerCase();

    if (
        ambiguousNames.has(
            nomeNormalizado,
        )
    ) {
        return {
            produto_id: null,
            codigo: codigo ?? "",
            ambiguous: true,
        };
    }

    const id =
        nameToId.get(
            nomeNormalizado,
        );

    if (id) {
        return {
            produto_id: id,
            codigo:
                nameToCode.get(
                    nomeNormalizado,
                ) ??
                codigo ??
                "",
            ambiguous: false,
        };
    }

    return {
        produto_id: null,
        codigo: codigo ?? "",
        ambiguous: false,
    };
}

type CalcularValoresVendaInput = {
    quantidade: number;
    valorUnitario: number;
    totalInformado: number;
    custoInformado: number;
    custoUnitarioProduto: number;
    despesas: number;
    lucroInformado: number;
};

export function calcularValoresVendaImportada({
    quantidade,
    valorUnitario,
    totalInformado,
    custoInformado,
    custoUnitarioProduto,
    despesas,
    lucroInformado,
}: CalcularValoresVendaInput) {
    const precoTotal =
        totalInformado > 0
            ? totalInformado
            : quantidade * valorUnitario;

    const custo =
        custoInformado > 0
            ? custoInformado
            : custoUnitarioProduto *
            quantidade;

    const lucro =
        lucroInformado !== 0
            ? lucroInformado
            : precoTotal -
            custo -
            despesas;

    const margem =
        precoTotal > 0
            ? lucro / precoTotal
            : 0;

    return {
        precoTotal,
        custo,
        lucro,
        margem,
    };
}