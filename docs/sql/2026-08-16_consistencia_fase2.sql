-- ============================================================
-- FASE 2 — CONSISTÊNCIA
-- Data: 2026-08-16
--
-- Objetivos:
-- 1. Padronizar códigos/SKUs como texto.
-- 2. Remover overload antigo de registrar_compra.
-- 3. Padronizar datas obrigatórias em compras e vendas.
-- 4. Normalizar tipos históricos de movimentações.
-- 5. Restringir domínios de movimentações e forma de pagamento.
-- ============================================================


-- ============================================================
-- 1. CÓDIGOS / SKUs COMO TEXTO
-- ============================================================

ALTER TABLE public.produtos
  ALTER COLUMN codigo TYPE text
  USING codigo::text;

ALTER TABLE public.compras
  ALTER COLUMN codigo TYPE text
  USING codigo::text;

ALTER TABLE public.vendas
  ALTER COLUMN codigo TYPE text
  USING codigo::text;


-- ============================================================
-- 2. REMOVER OVERLOAD ANTIGO DE registrar_compra
-- ============================================================

DROP FUNCTION IF EXISTS public.registrar_compra(
  uuid,
  numeric,
  numeric,
  text,
  date
);


-- ============================================================
-- 3. DATAS OBRIGATÓRIAS
-- ============================================================

ALTER TABLE public.compras
  ALTER COLUMN data SET DEFAULT CURRENT_DATE,
  ALTER COLUMN data SET NOT NULL;

ALTER TABLE public.vendas
  ALTER COLUMN data SET DEFAULT CURRENT_DATE,
  ALTER COLUMN data SET NOT NULL;


-- ============================================================
-- 4. NORMALIZAR TIPOS HISTÓRICOS DE MOVIMENTAÇÃO
-- ============================================================

UPDATE public.movimentacoes
SET tipo = 'saldo_inicial'
WHERE tipo IS NULL
  AND descricao = 'Saldo Inicial';


UPDATE public.movimentacoes
SET tipo = 'compra'
WHERE tipo IS NULL
  AND (
    descricao = 'Compra de Estoque'
    OR descricao ILIKE 'Pagamento compra:%'
  );


UPDATE public.movimentacoes
SET tipo = 'venda'
WHERE tipo IS NULL
  AND (
    descricao = 'Vendas'
    OR descricao ILIKE 'Venda:%'
  );


-- ============================================================
-- 5. TIPO DE MOVIMENTAÇÃO OBRIGATÓRIO
-- ============================================================

ALTER TABLE public.movimentacoes
  ALTER COLUMN tipo SET NOT NULL;


-- Cria a constraint somente se ainda não existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.movimentacoes'::regclass
      AND conname = 'movimentacoes_tipo_check'
  ) THEN
    ALTER TABLE public.movimentacoes
      ADD CONSTRAINT movimentacoes_tipo_check
      CHECK (
        tipo IN (
          'venda',
          'compra',
          'despesa',
          'saldo_inicial'
        )
      );
  END IF;
END
$$;


-- ============================================================
-- 6. FORMA DE PAGAMENTO DE COMPRAS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.compras'::regclass
      AND conname = 'compras_forma_pagamento_check'
  ) THEN
    ALTER TABLE public.compras
      ADD CONSTRAINT compras_forma_pagamento_check
      CHECK (
        forma_pagamento IN (
          'a_vista',
          'a_prazo'
        )
      );
  END IF;
END
$$;


-- ============================================================
-- OBSERVAÇÃO
-- ============================================================
--
-- As constraints abaixo já existiam antes desta migração e,
-- por isso, não são recriadas aqui:
--
-- compras_status_pagamento_check
--   status_pagamento IN ('pago', 'pendente')
--
-- despesas_status_check
--   status IN ('pago', 'pendente')
--
-- ============================================================