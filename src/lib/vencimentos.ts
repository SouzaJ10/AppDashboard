export type StatusVencimento =
    | "vencida"
    | "hoje"
    | "proximos_7_dias"
    | "futura"
    | "sem_vencimento";

type ClassificarVencimentoInput = {
    dataVencimento: string | null;
    hoje: string;
};

export function classificarVencimento({
    dataVencimento,
    hoje,
}: ClassificarVencimentoInput): StatusVencimento {
    if (!dataVencimento) {
        return "sem_vencimento";
    }

    if (dataVencimento < hoje) {
        return "vencida";
    }

    if (dataVencimento === hoje) {
        return "hoje";
    }

    const hojeDate = new Date(
        `${hoje}T00:00:00`,
    );

    const vencimentoDate = new Date(
        `${dataVencimento}T00:00:00`,
    );

    const diffMs =
        vencimentoDate.getTime() -
        hojeDate.getTime();

    const diffDias = Math.round(
        diffMs / 86_400_000,
    );

    if (diffDias <= 7) {
        return "proximos_7_dias";
    }

    return "futura";
}