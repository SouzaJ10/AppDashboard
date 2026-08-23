import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarEmpresasDoUsuario, type EmpresaMembership, } from "@/service/empresa.service";
import { queryKeys } from "@/constants/queryKeys";

type EmpresaContextValue = {
    empresas: EmpresaMembership[];
    empresaAtual: EmpresaMembership | null;
    empresaId: string | null;
    role: EmpresaMembership["role"] | null;
    isAdmin: boolean;
    isLoading: boolean;
    selecionarEmpresa: (empresaId: string) => void;
};

const EmpresaContext =
    createContext<EmpresaContextValue | null>(null);

type EmpresaProviderProps = {
    userId: string;
    children: ReactNode;
};

export function EmpresaProvider({
    userId,
    children,
}: EmpresaProviderProps) {
    const storageKey = `empresa_atual:${userId}`;

    const [empresaIdSelecionada, setEmpresaIdSelecionada] =
        useState<string | null>(() => {
            if (typeof window === "undefined") {
                return null;
            }

            return localStorage.getItem(storageKey);
        });

    const {
        data: empresas = [],
        isLoading,
    } = useQuery({
        queryKey: queryKeys.empresas.usuario(userId),
        queryFn: () => listarEmpresasDoUsuario(userId),
    });

    useEffect(() => {
        if (isLoading) {
            return;
        }

        // Com apenas uma empresa, podemos selecioná-la
        // automaticamente sem ambiguidade.
        if (empresas.length === 1) {
            const unicaEmpresa = empresas[0];

            setEmpresaIdSelecionada(
                unicaEmpresa.empresaId
            );

            localStorage.setItem(
                storageKey,
                unicaEmpresa.empresaId
            );

            return;
        }

        // Se a empresa salva deixou de pertencer ao usuário,
        // removemos a seleção inválida.
        if (
            empresaIdSelecionada &&
            !empresas.some(
                (empresa) =>
                    empresa.empresaId === empresaIdSelecionada
            )
        ) {
            setEmpresaIdSelecionada(null);
            localStorage.removeItem(storageKey);
        }
    }, [
        empresas,
        empresaIdSelecionada,
        isLoading,
        storageKey,
    ]);

    const empresaAtual = useMemo(
        () =>
            empresas.find(
                (empresa) =>
                    empresa.empresaId === empresaIdSelecionada
            ) ?? null,
        [empresas, empresaIdSelecionada]
    );

    const selecionarEmpresa = (
        empresaId: string
    ) => {
        const pertenceAoUsuario =
            empresas.some(
                (empresa) =>
                    empresa.empresaId === empresaId
            );

        if (!pertenceAoUsuario) {
            return;
        }

        setEmpresaIdSelecionada(empresaId);

        localStorage.setItem(
            storageKey,
            empresaId
        );
    };

    const value = useMemo<EmpresaContextValue>(
        () => ({
            empresas,
            empresaAtual,
            empresaId:
                empresaAtual?.empresaId ?? null,
            role:
                empresaAtual?.role ?? null,
            isAdmin:
                empresaAtual?.role === "admin",
            isLoading,
            selecionarEmpresa,
        }),
        [
            empresas,
            empresaAtual,
            isLoading,
        ]
    );

    return (
        <EmpresaContext.Provider value={value}>
            {children}
        </EmpresaContext.Provider>
    );
}

export function useEmpresa() {
    const context = useContext(EmpresaContext);

    if (!context) {
        throw new Error(
            "useEmpresa deve ser usado dentro de EmpresaProvider."
        );
    }

    return context;
}