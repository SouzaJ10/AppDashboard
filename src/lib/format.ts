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
export const todayISO = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const periodoMesCalendario = (referencia: string) => {
  const [ano, mes] = referencia.slice(0, 10).split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const prefixo = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;

  return {
    dataInicial: `${prefixo}-01`,
    dataFinal: `${prefixo}-${String(ultimoDia).padStart(2, "0")}`,
  };
};
