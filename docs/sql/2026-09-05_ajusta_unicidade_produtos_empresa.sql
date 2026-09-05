BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.produtos
    GROUP BY empresa_id, codigo
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existem produtos duplicados para a mesma empresa e código.';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.produtos'::regclass
      AND conname = 'produtos_empresa_id_codigo_key'
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_empresa_id_codigo_key
      UNIQUE (empresa_id, codigo);
  END IF;
END
$$;

ALTER TABLE public.produtos
  DROP CONSTRAINT IF EXISTS produtos_codigo_key;

COMMIT;