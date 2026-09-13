import type { ReactNode } from "react";
import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    renderHook,
    waitFor,
} from "@testing-library/react";
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    channelMock,
    removeChannelMock,
    onMock,
    subscribeMock,
    invalidateQueriesMock,
} = vi.hoisted(() => ({
    channelMock: vi.fn(),
    removeChannelMock: vi.fn(),
    onMock: vi.fn(),
    subscribeMock: vi.fn(),
    invalidateQueriesMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        channel: channelMock,
        removeChannel: removeChannelMock,
    },
}));

import { useRealtime } from "@/hooks/useRealtime";

function criarWrapper() {
    const queryClient = new QueryClient();

    queryClient.invalidateQueries =
        invalidateQueriesMock;

    return function Wrapper({
        children,
    }: {
        children: ReactNode;
    }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe("useRealtime", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        const channel = {
            on: onMock,
            subscribe: subscribeMock,
        };

        onMock.mockReturnValue(channel);
        subscribeMock.mockReturnValue(channel);
        channelMock.mockReturnValue(channel);
    });

    it("cria um canal com base nas tabelas informadas", () => {
        renderHook(
            () =>
                useRealtime([
                    "vendas",
                    "produtos",
                ]),
            {
                wrapper: criarWrapper(),
            },
        );

        expect(channelMock).toHaveBeenCalledWith(
            "realtime-vendas-produtos",
        );
    });

    it("registra uma inscrição realtime para cada tabela", () => {
        renderHook(
            () =>
                useRealtime([
                    "vendas",
                    "produtos",
                ]),
            {
                wrapper: criarWrapper(),
            },
        );

        expect(onMock).toHaveBeenCalledTimes(2);

        expect(onMock).toHaveBeenCalledWith(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "vendas",
            },
            expect.any(Function),
        );

        expect(onMock).toHaveBeenCalledWith(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "produtos",
            },
            expect.any(Function),
        );

        expect(subscribeMock).toHaveBeenCalledTimes(1);
    });

    it("invalida a família de queries correspondente quando recebe uma alteração", async () => {
        renderHook(
            () =>
                useRealtime([
                    "vendas",
                    "produtos",
                ]),
            {
                wrapper: criarWrapper(),
            },
        );

        const chamadaVendas =
            onMock.mock.calls.find(
                (call) =>
                    call[1]?.table === "vendas",
            );

        expect(chamadaVendas).toBeDefined();

        const callback = chamadaVendas?.[2];

        callback();

        await waitFor(() => {
            expect(
                invalidateQueriesMock,
            ).toHaveBeenCalledWith({
                queryKey: ["vendas"],
            });
        });
    });

    it("invalida produtos independentemente de vendas", async () => {
        renderHook(
            () =>
                useRealtime([
                    "vendas",
                    "produtos",
                ]),
            {
                wrapper: criarWrapper(),
            },
        );

        const chamadaProdutos =
            onMock.mock.calls.find(
                (call) =>
                    call[1]?.table === "produtos",
            );

        expect(chamadaProdutos).toBeDefined();

        const callback = chamadaProdutos?.[2];

        callback();

        await waitFor(() => {
            expect(
                invalidateQueriesMock,
            ).toHaveBeenCalledWith({
                queryKey: ["produtos"],
            });
        });
    });

    it("remove o canal ao desmontar o hook", () => {
        const channel = {
            on: onMock,
            subscribe: subscribeMock,
        };

        onMock.mockReturnValue(channel);
        subscribeMock.mockReturnValue(channel);
        channelMock.mockReturnValue(channel);

        const { unmount } = renderHook(
            () =>
                useRealtime([
                    "vendas",
                    "produtos",
                ]),
            {
                wrapper: criarWrapper(),
            },
        );

        unmount();

        expect(removeChannelMock).toHaveBeenCalledWith(
            channel,
        );
    });
});