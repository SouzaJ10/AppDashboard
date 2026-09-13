import {
    describe,
    expect,
    it,
} from "vitest";

import { classificarVencimento } from "@/lib/vencimentos";

describe("classificarVencimento", () => {
    const hoje = "2026-09-13";

    it("classifica conta vencida", () => {
        expect(
            classificarVencimento({
                dataVencimento: "2026-09-12",
                hoje,
            }),
        ).toBe("vencida");
    });

    it("classifica conta que vence hoje", () => {
        expect(
            classificarVencimento({
                dataVencimento: "2026-09-13",
                hoje,
            }),
        ).toBe("hoje");
    });

    it("classifica conta que vence nos próximos 7 dias", () => {
        expect(
            classificarVencimento({
                dataVencimento: "2026-09-20",
                hoje,
            }),
        ).toBe("proximos_7_dias");
    });

    it("classifica conta com vencimento superior a 7 dias como futura", () => {
        expect(
            classificarVencimento({
                dataVencimento: "2026-09-21",
                hoje,
            }),
        ).toBe("futura");
    });

    it("classifica conta sem vencimento", () => {
        expect(
            classificarVencimento({
                dataVencimento: null,
                hoje,
            }),
        ).toBe("sem_vencimento");
    });
});