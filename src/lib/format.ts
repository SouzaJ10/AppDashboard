export const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (n: number | null | undefined, digits = 0) =>
  (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const pct = (n: number | null | undefined, digits = 1) =>
  `${((n ?? 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;

export const dateBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return dt.toLocaleDateString("pt-BR");
};
