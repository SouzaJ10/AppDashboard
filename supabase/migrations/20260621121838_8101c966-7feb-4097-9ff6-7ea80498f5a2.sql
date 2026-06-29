-- Habilita Realtime nas tabelas operacionais
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;

-- REPLICA IDENTITY FULL para que UPDATE/DELETE enviem a linha completa
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.compras REPLICA IDENTITY FULL;
ALTER TABLE public.movimentacoes REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;