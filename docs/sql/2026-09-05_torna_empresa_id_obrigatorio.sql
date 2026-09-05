BEGIN;

-- ============================================================
-- EMPRESA_ID OBRIGATÓRIO NAS TABELAS DE NEGÓCIO
--
-- Pré-condição:
-- nenhuma linha existente pode possuir empresa_id nulo.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.produtos
    WHERE empresa_id IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.vendas
    WHERE empresa_id IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.compras
    WHERE empresa_id IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.despesas
    WHERE empresa_id IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.movimentacoes
    WHERE empresa_id IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.categorias_despesa
    WHERE empresa_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Não é possível tornar empresa_id obrigatório: existem registros sem empresa.';
  END IF;
END
$$;

ALTER TABLE public.produtos
  ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.vendas
  ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.compras
  ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.despesas
  ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.movimentacoes
  ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE public.categorias_despesa
  ALTER COLUMN empresa_id SET NOT NULL;

COMMIT;