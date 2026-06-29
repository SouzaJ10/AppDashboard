-- =====================================================================
-- Módulo de Despesas e Fluxo de Caixa
-- Data: 2026-06-28
-- Aplicar manualmente no Supabase (SQL Editor ou psql).
-- Idempotente: pode ser re-executado.
-- =====================================================================

-- 1. TABELA categorias_despesa --------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_despesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor  TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_despesa TO authenticated;
GRANT ALL ON public.categorias_despesa TO service_role;

ALTER TABLE public.categorias_despesa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_desp read auth"  ON public.categorias_despesa;
DROP POLICY IF EXISTS "cat_desp write admin" ON public.categorias_despesa;
CREATE POLICY "cat_desp read auth"  ON public.categorias_despesa FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_desp write admin" ON public.categorias_despesa FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed categorias padrão (idempotente via UNIQUE em nome)
INSERT INTO public.categorias_despesa (nome, padrao) VALUES
  ('Aluguel', true), ('Energia', true), ('Água', true), ('Internet', true),
  ('Combustível', true), ('Impostos', true), ('Folha de pagamento', true),
  ('Marketing', true), ('Fornecedores', true), ('Frete', true),
  ('Taxas bancárias', true), ('Outros', true)
ON CONFLICT (nome) DO NOTHING;

-- 2. TABELA despesas ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  centro_custo TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS despesas_data_idx       ON public.despesas (data);
CREATE INDEX IF NOT EXISTS despesas_categoria_idx  ON public.despesas (categoria);
CREATE INDEX IF NOT EXISTS despesas_status_idx     ON public.despesas (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT ALL ON public.despesas TO service_role;

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "despesas read auth"   ON public.despesas;
DROP POLICY IF EXISTS "despesas write admin" ON public.despesas;
CREATE POLICY "despesas read auth"   ON public.despesas FOR SELECT TO authenticated USING (true);
CREATE POLICY "despesas write admin" ON public.despesas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Trigger updated_at (reusa função set_updated_at já existente) --
DROP TRIGGER IF EXISTS despesas_set_updated_at ON public.despesas;
CREATE TRIGGER despesas_set_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Realtime -------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categorias_despesa;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.despesas           REPLICA IDENTITY FULL;
ALTER TABLE public.categorias_despesa REPLICA IDENTITY FULL;

-- FIM --------------------------------------------------------------