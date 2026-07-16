-- Adiciona novos campos estruturados à tabela de vendas

ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS cliente TEXT;

ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS observacoes TEXT;