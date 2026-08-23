DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Segurança: não prossegue se já existirem duplicidades
  -- dentro da mesma empresa.
  IF EXISTS (
    SELECT
      empresa_id,
      nome
    FROM public.categorias_despesa
    GROUP BY
      empresa_id,
      nome
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existem categorias duplicadas dentro da mesma empresa.';
  END IF;

  -- Localiza a constraint UNIQUE antiga somente sobre "nome".
  SELECT c.conname
    INTO v_constraint_name
  FROM pg_constraint c
  JOIN pg_class t
    ON t.oid = c.conrelid
  JOIN pg_namespace n
    ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'categorias_despesa'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 1
    AND (
      SELECT a.attname
      FROM pg_attribute a
      WHERE a.attrelid = t.oid
        AND a.attnum = c.conkey[1]
    ) = 'nome'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.categorias_despesa DROP CONSTRAINT %I',
      v_constraint_name
    );
  END IF;

  -- Cria a unicidade correta para multiempresa.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.categorias_despesa'::regclass
      AND conname = 'categorias_despesa_empresa_nome_key'
  ) THEN
    ALTER TABLE public.categorias_despesa
      ADD CONSTRAINT categorias_despesa_empresa_nome_key
      UNIQUE (empresa_id, nome);
  END IF;
END
$$;