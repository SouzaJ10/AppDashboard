import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscreve mudanças em tabelas Supabase e invalida queries do TanStack Query.
 * Uso: useRealtime(["vendas", "produtos", "movimentacoes"])
 */
export function useRealtime(tables: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(`realtime-${tables.join("-")}`);
    for (const t of tables) {
      channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: t },
        () => {
          // Invalida tanto a key singular quanto a "-all"
          qc.invalidateQueries({ queryKey: [t] });
          qc.invalidateQueries({ queryKey: [`${t}-all`] });
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join("|")]);
}
