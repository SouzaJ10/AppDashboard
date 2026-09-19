import { describe, expect, it } from "vitest";
import { periodoMesCalendario } from "./format";

describe("periodoMesCalendario", () => {
  it.each([
    ["2026-09-16", "2026-09-01", "2026-09-30"],
    ["2026-01-20", "2026-01-01", "2026-01-31"],
    ["2026-02-10", "2026-02-01", "2026-02-28"],
    ["2028-02-10", "2028-02-01", "2028-02-29"],
  ])("resolve o mês calendário de %s", (referencia, dataInicial, dataFinal) => {
    expect(periodoMesCalendario(referencia)).toEqual({ dataInicial, dataFinal });
  });
});
