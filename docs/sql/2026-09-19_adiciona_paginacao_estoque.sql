BEGIN;

-- ============================================================
-- PILOTO DE ESTOQUE — CONSULTAS PAGINADAS E AGREGAÇÕES
--
-- Este arquivo cria somente objetos de leitura. As funções usam
-- SECURITY INVOKER para manter as policies RLS de produtos e
-- vendas ativas para o usuário da sessão.
-- ============================================================


-- ------------------------------------------------------------
-- Ordenação natural dos códigos
--
-- kn trata sequências de dígitos numericamente. ks-level1 e
-- deterministic = false aproximam sensitivity = "base" do
-- Intl.Collator, ignorando diferenças de caixa e acento. Não é
-- usado ka-shifted, portanto pontuação não é ignorada.
-- ------------------------------------------------------------

CREATE COLLATION public.codigo_natural_pt_br (
  provider = icu,
  locale = 'pt-BR-u-kn-ks-level1',
  deterministic = false
);

COMMENT ON COLLATION public.codigo_natural_pt_br IS
  'Ordenação natural de códigos do estoque, destinada a aproximar localeCompare pt-BR com numeric=true e sensitivity=base.';


-- ------------------------------------------------------------
-- Lista paginada de produtos do estoque
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.listar_produtos_estoque(
  p_empresa_id uuid,
  p_busca text DEFAULT '',
  p_categoria text DEFAULT NULL,
  p_status text DEFAULT 'todos',
  p_ordem_codigo text DEFAULT 'codigo-asc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  items jsonb,
  total bigint,
  page integer,
  page_size integer,
  total_pages integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_total bigint;
  v_page integer;
  v_total_pages integer;
  v_offset integer;
  v_items jsonb;
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não informada.'
      USING ERRCODE = '22023';
  END IF;

  IF public.is_empresa_member(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso negado.'
      USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL
     OR p_status NOT IN ('todos', 'ok', 'baixo', 'zerado', 'inativo') THEN
    RAISE EXCEPTION 'Status de estoque inválido: %.', p_status
      USING ERRCODE = '22023';
  END IF;

  IF p_ordem_codigo IS NULL
     OR p_ordem_codigo NOT IN ('codigo-asc', 'codigo-desc') THEN
    RAISE EXCEPTION 'Ordenação de código inválida: %.', p_ordem_codigo
      USING ERRCODE = '22023';
  END IF;

  IF p_page IS NULL OR p_page < 1 THEN
    RAISE EXCEPTION 'A página deve ser maior ou igual a 1.'
      USING ERRCODE = '22023';
  END IF;

  IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 500 THEN
    RAISE EXCEPTION 'O tamanho da página deve estar entre 1 e 500.'
      USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
  INTO v_total
  FROM public.produtos AS p
  WHERE p.empresa_id = p_empresa_id
    AND (
      COALESCE(p_busca, '') = ''
      OR strpos(
        lower(COALESCE(p.nome, p.descricao, '')),
        lower(COALESCE(p_busca, ''))
      ) > 0
      OR strpos(
        lower(COALESCE(p.descricao, '')),
        lower(COALESCE(p_busca, ''))
      ) > 0
      OR strpos(
        lower(COALESCE(p.marca, '')),
        lower(COALESCE(p_busca, ''))
      ) > 0
      OR strpos(p.codigo, COALESCE(p_busca, '')) > 0
    )
    AND (
      p_categoria IS NULL
      OR p_categoria = ''
      OR p.categoria = p_categoria
    )
    AND CASE p_status
      WHEN 'zerado' THEN COALESCE(p.estoque_atual, 0) <= 0
      WHEN 'baixo' THEN
        COALESCE(p.estoque_atual, 0) > 0
        AND COALESCE(p.estoque_atual, 0)
          <= COALESCE(p.estoque_minimo, 0)
      WHEN 'ok' THEN
        COALESCE(p.estoque_atual, 0)
          > COALESCE(p.estoque_minimo, 0)
      WHEN 'inativo' THEN p.ativo IS FALSE
      ELSE TRUE
    END;

  v_total_pages := GREATEST(
    CEIL(v_total::numeric / p_page_size)::integer,
    1
  );
  v_page := LEAST(p_page, v_total_pages);
  v_offset := (v_page - 1) * p_page_size;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(produto_paginado)
      ORDER BY
        (
          CASE
            WHEN p_ordem_codigo = 'codigo-asc'
              THEN produto_paginado.codigo
          END
        ) COLLATE public.codigo_natural_pt_br ASC,
        (
          CASE
            WHEN p_ordem_codigo = 'codigo-desc'
              THEN produto_paginado.codigo
          END
        ) COLLATE public.codigo_natural_pt_br DESC,
        produto_paginado.id ASC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT p.*
    FROM public.produtos AS p
    WHERE p.empresa_id = p_empresa_id
      AND (
        COALESCE(p_busca, '') = ''
        OR strpos(
          lower(COALESCE(p.nome, p.descricao, '')),
          lower(COALESCE(p_busca, ''))
        ) > 0
        OR strpos(
          lower(COALESCE(p.descricao, '')),
          lower(COALESCE(p_busca, ''))
        ) > 0
        OR strpos(
          lower(COALESCE(p.marca, '')),
          lower(COALESCE(p_busca, ''))
        ) > 0
        OR strpos(p.codigo, COALESCE(p_busca, '')) > 0
      )
      AND (
        p_categoria IS NULL
        OR p_categoria = ''
        OR p.categoria = p_categoria
      )
      AND CASE p_status
        WHEN 'zerado' THEN COALESCE(p.estoque_atual, 0) <= 0
        WHEN 'baixo' THEN
          COALESCE(p.estoque_atual, 0) > 0
          AND COALESCE(p.estoque_atual, 0)
            <= COALESCE(p.estoque_minimo, 0)
        WHEN 'ok' THEN
          COALESCE(p.estoque_atual, 0)
            > COALESCE(p.estoque_minimo, 0)
        WHEN 'inativo' THEN p.ativo IS FALSE
        ELSE TRUE
      END
    ORDER BY
      (
        CASE
          WHEN p_ordem_codigo = 'codigo-asc' THEN p.codigo
        END
      ) COLLATE public.codigo_natural_pt_br ASC,
      (
        CASE
          WHEN p_ordem_codigo = 'codigo-desc' THEN p.codigo
        END
      ) COLLATE public.codigo_natural_pt_br DESC,
      p.id ASC
    LIMIT p_page_size
    OFFSET v_offset
  ) AS produto_paginado;

  RETURN QUERY
  SELECT
    v_items,
    v_total,
    v_page,
    p_page_size,
    v_total_pages;
END;
$function$;


-- ------------------------------------------------------------
-- Resumo global do estoque da empresa
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resumo_estoque(
  p_empresa_id uuid
)
RETURNS TABLE (
  total_produtos bigint,
  total_unidades numeric,
  valor_total_estoque numeric,
  skus_zerados bigint,
  skus_baixos bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não informada.'
      USING ERRCODE = '22023';
  END IF;

  IF public.is_empresa_member(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso negado.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    count(*) AS total_produtos,
    COALESCE(
      sum(COALESCE(p.estoque_atual, 0::numeric)),
      0::numeric
    )::numeric AS total_unidades,
    COALESCE(
      sum(
        COALESCE(p.estoque_atual, 0::numeric)
        * COALESCE(p.custo_compra, 0::numeric)
      ),
      0::numeric
    )::numeric AS valor_total_estoque,
    count(*) FILTER (
      WHERE COALESCE(p.estoque_atual, 0) <= 0
    ) AS skus_zerados,
    count(*) FILTER (
      WHERE COALESCE(p.estoque_atual, 0) > 0
        AND COALESCE(p.estoque_atual, 0)
          <= COALESCE(p.estoque_minimo, 0)
    ) AS skus_baixos
  FROM public.produtos AS p
  WHERE p.empresa_id = p_empresa_id;
END;
$function$;


-- ------------------------------------------------------------
-- Giro dos produtos exibidos na página atual
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.giro_produtos_estoque(
  p_empresa_id uuid,
  p_produto_ids uuid[]
)
RETURNS TABLE (
  produto_id uuid,
  quantidade_vendida numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não informada.'
      USING ERRCODE = '22023';
  END IF;

  IF public.is_empresa_member(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso negado.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    v.produto_id,
    sum(v.quantidade)::numeric AS quantidade_vendida
  FROM public.vendas AS v
  INNER JOIN public.produtos AS p
    ON p.empresa_id = v.empresa_id
   AND p.id = v.produto_id
  WHERE v.empresa_id = p_empresa_id
    AND p.empresa_id = p_empresa_id
    AND v.produto_id IS NOT NULL
    AND v.produto_id = ANY(
      COALESCE(p_produto_ids, ARRAY[]::uuid[])
    )
  GROUP BY v.produto_id;
END;
$function$;


-- ------------------------------------------------------------
-- Categorias globais disponíveis para a empresa
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.listar_categorias_produtos(
  p_empresa_id uuid
)
RETURNS TABLE (
  categoria text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa não informada.'
      USING ERRCODE = '22023';
  END IF;

  IF public.is_empresa_member(p_empresa_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso negado.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT p.categoria
  FROM public.produtos AS p
  WHERE p.empresa_id = p_empresa_id
    AND p.categoria IS NOT NULL
    AND p.categoria <> ''
  ORDER BY p.categoria;
END;
$function$;


-- ------------------------------------------------------------
-- Permissões
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.listar_produtos_estoque(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.listar_produtos_estoque(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.listar_produtos_estoque(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) FROM service_role;

GRANT EXECUTE ON FUNCTION public.listar_produtos_estoque(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  integer
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resumo_estoque(uuid)
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.resumo_estoque(uuid)
FROM anon;

REVOKE EXECUTE ON FUNCTION public.resumo_estoque(uuid)
FROM service_role;

GRANT EXECUTE ON FUNCTION public.resumo_estoque(uuid)
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.giro_produtos_estoque(uuid, uuid[])
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.giro_produtos_estoque(uuid, uuid[])
FROM anon;

REVOKE EXECUTE ON FUNCTION public.giro_produtos_estoque(uuid, uuid[])
FROM service_role;

GRANT EXECUTE ON FUNCTION public.giro_produtos_estoque(uuid, uuid[])
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.listar_categorias_produtos(uuid)
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.listar_categorias_produtos(uuid)
FROM anon;

REVOKE EXECUTE ON FUNCTION public.listar_categorias_produtos(uuid)
FROM service_role;

GRANT EXECUTE ON FUNCTION public.listar_categorias_produtos(uuid)
TO authenticated;

-- Índices serão avaliados somente após EXPLAIN das consultas reais.

COMMIT;
