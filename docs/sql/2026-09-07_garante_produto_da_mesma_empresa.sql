BEGIN;

-- ============================================================
-- GARANTIR QUE COMPRAS E VENDAS REFERENCIEM PRODUTOS
-- DA MESMA EMPRESA
--
-- Regras:
-- 1. Se produto_id estiver preenchido, o produto deve pertencer
--    à mesma empresa da compra/venda.
-- 2. Ao excluir um produto, somente produto_id vira NULL.
-- 3. empresa_id do histórico permanece intacto.
-- ============================================================


-- ------------------------------------------------------------
-- Validação defensiva antes de criar as constraints
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.compras c
    JOIN public.produtos p
      ON p.id = c.produto_id
    WHERE c.produto_id IS NOT NULL
      AND c.empresa_id <> p.empresa_id
  ) THEN
    RAISE EXCEPTION
      'Existem compras vinculadas a produtos de outra empresa.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.vendas v
    JOIN public.produtos p
      ON p.id = v.produto_id
    WHERE v.produto_id IS NOT NULL
      AND v.empresa_id <> p.empresa_id
  ) THEN
    RAISE EXCEPTION
      'Existem vendas vinculadas a produtos de outra empresa.';
  END IF;
END
$$;


-- ------------------------------------------------------------
-- Chave única necessária para a FK composta
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.produtos'::regclass
      AND conname = 'produtos_empresa_id_id_key'
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_empresa_id_id_key
      UNIQUE (empresa_id, id);
  END IF;
END
$$;


-- ------------------------------------------------------------
-- COMPRAS
-- ------------------------------------------------------------

ALTER TABLE public.compras
  DROP CONSTRAINT IF EXISTS compras_produto_id_fkey;

ALTER TABLE public.compras
  DROP CONSTRAINT IF EXISTS compras_empresa_produto_fkey;

ALTER TABLE public.compras
  ADD CONSTRAINT compras_empresa_produto_fkey
  FOREIGN KEY (empresa_id, produto_id)
  REFERENCES public.produtos (empresa_id, id)
  ON DELETE SET NULL (produto_id);


-- ------------------------------------------------------------
-- VENDAS
-- ------------------------------------------------------------

ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS vendas_produto_id_fkey;

ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS vendas_empresa_produto_fkey;

ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_empresa_produto_fkey
  FOREIGN KEY (empresa_id, produto_id)
  REFERENCES public.produtos (empresa_id, id)
  ON DELETE SET NULL (produto_id);


COMMIT;