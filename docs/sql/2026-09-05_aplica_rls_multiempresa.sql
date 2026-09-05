BEGIN;

-- ============================================================
-- RLS MULTIEMPRESA
--
-- Leitura:
--   qualquer usuário membro da empresa.
--
-- Escrita:
--   somente administrador da empresa.
--
-- As RPCs SECURITY DEFINER continuam responsáveis por validar
-- internamente empresa/role nas operações que passam por RPC.
-- ============================================================


-- ============================================================
-- CATEGORIAS_DESPESA
-- ============================================================

DROP POLICY IF EXISTS "cat_desp read admin"
ON public.categorias_despesa;

DROP POLICY IF EXISTS "cat_desp write admin"
ON public.categorias_despesa;

DROP POLICY IF EXISTS "categorias_despesa_select_empresa"
ON public.categorias_despesa;

DROP POLICY IF EXISTS "categorias_despesa_insert_admin_empresa"
ON public.categorias_despesa;

DROP POLICY IF EXISTS "categorias_despesa_update_admin_empresa"
ON public.categorias_despesa;

DROP POLICY IF EXISTS "categorias_despesa_delete_admin_empresa"
ON public.categorias_despesa;


CREATE POLICY "categorias_despesa_select_empresa"
ON public.categorias_despesa
FOR SELECT
TO authenticated
USING (
  public.is_empresa_member(empresa_id)
);


CREATE POLICY "categorias_despesa_insert_admin_empresa"
ON public.categorias_despesa
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "categorias_despesa_update_admin_empresa"
ON public.categorias_despesa
FOR UPDATE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "categorias_despesa_delete_admin_empresa"
ON public.categorias_despesa
FOR DELETE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


-- ============================================================
-- PRODUTOS
-- ============================================================

DROP POLICY IF EXISTS "produtos read admin"
ON public.produtos;

DROP POLICY IF EXISTS "produtos write admin"
ON public.produtos;

DROP POLICY IF EXISTS "produtos_select_empresa"
ON public.produtos;

DROP POLICY IF EXISTS "produtos_insert_admin_empresa"
ON public.produtos;

DROP POLICY IF EXISTS "produtos_update_admin_empresa"
ON public.produtos;

DROP POLICY IF EXISTS "produtos_delete_admin_empresa"
ON public.produtos;


CREATE POLICY "produtos_select_empresa"
ON public.produtos
FOR SELECT
TO authenticated
USING (
  public.is_empresa_member(empresa_id)
);


CREATE POLICY "produtos_insert_admin_empresa"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "produtos_update_admin_empresa"
ON public.produtos
FOR UPDATE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "produtos_delete_admin_empresa"
ON public.produtos
FOR DELETE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


-- ============================================================
-- COMPRAS
-- ============================================================

DROP POLICY IF EXISTS "compras read admin"
ON public.compras;

DROP POLICY IF EXISTS "compras write admin"
ON public.compras;

DROP POLICY IF EXISTS "compras_select_empresa"
ON public.compras;

DROP POLICY IF EXISTS "compras_insert_admin_empresa"
ON public.compras;

DROP POLICY IF EXISTS "compras_update_admin_empresa"
ON public.compras;

DROP POLICY IF EXISTS "compras_delete_admin_empresa"
ON public.compras;


CREATE POLICY "compras_select_empresa"
ON public.compras
FOR SELECT
TO authenticated
USING (
  public.is_empresa_member(empresa_id)
);


CREATE POLICY "compras_insert_admin_empresa"
ON public.compras
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "compras_update_admin_empresa"
ON public.compras
FOR UPDATE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "compras_delete_admin_empresa"
ON public.compras
FOR DELETE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


-- ============================================================
-- VENDAS
-- ============================================================

DROP POLICY IF EXISTS "vendas read admin"
ON public.vendas;

DROP POLICY IF EXISTS "vendas write admin"
ON public.vendas;

DROP POLICY IF EXISTS "vendas_select_empresa"
ON public.vendas;

DROP POLICY IF EXISTS "vendas_insert_admin_empresa"
ON public.vendas;

DROP POLICY IF EXISTS "vendas_update_admin_empresa"
ON public.vendas;

DROP POLICY IF EXISTS "vendas_delete_admin_empresa"
ON public.vendas;


CREATE POLICY "vendas_select_empresa"
ON public.vendas
FOR SELECT
TO authenticated
USING (
  public.is_empresa_member(empresa_id)
);


CREATE POLICY "vendas_insert_admin_empresa"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "vendas_update_admin_empresa"
ON public.vendas
FOR UPDATE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "vendas_delete_admin_empresa"
ON public.vendas
FOR DELETE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


-- ============================================================
-- DESPESAS
-- ============================================================

DROP POLICY IF EXISTS "despesas read admin"
ON public.despesas;

DROP POLICY IF EXISTS "despesas write admin"
ON public.despesas;

DROP POLICY IF EXISTS "despesas_select_empresa"
ON public.despesas;

DROP POLICY IF EXISTS "despesas_insert_admin_empresa"
ON public.despesas;

DROP POLICY IF EXISTS "despesas_update_admin_empresa"
ON public.despesas;

DROP POLICY IF EXISTS "despesas_delete_admin_empresa"
ON public.despesas;


CREATE POLICY "despesas_select_empresa"
ON public.despesas
FOR SELECT
TO authenticated
USING (
  public.is_empresa_member(empresa_id)
);


CREATE POLICY "despesas_insert_admin_empresa"
ON public.despesas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "despesas_update_admin_empresa"
ON public.despesas
FOR UPDATE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "despesas_delete_admin_empresa"
ON public.despesas
FOR DELETE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


-- ============================================================
-- MOVIMENTACOES
-- ============================================================

DROP POLICY IF EXISTS "mov read admin"
ON public.movimentacoes;

DROP POLICY IF EXISTS "mov write admin"
ON public.movimentacoes;

DROP POLICY IF EXISTS "movimentacoes_select_empresa"
ON public.movimentacoes;

DROP POLICY IF EXISTS "movimentacoes_insert_admin_empresa"
ON public.movimentacoes;

DROP POLICY IF EXISTS "movimentacoes_update_admin_empresa"
ON public.movimentacoes;

DROP POLICY IF EXISTS "movimentacoes_delete_admin_empresa"
ON public.movimentacoes;


CREATE POLICY "movimentacoes_select_empresa"
ON public.movimentacoes
FOR SELECT
TO authenticated
USING (
  public.is_empresa_member(empresa_id)
);


CREATE POLICY "movimentacoes_insert_admin_empresa"
ON public.movimentacoes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "movimentacoes_update_admin_empresa"
ON public.movimentacoes
FOR UPDATE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


CREATE POLICY "movimentacoes_delete_admin_empresa"
ON public.movimentacoes
FOR DELETE
TO authenticated
USING (
  public.has_empresa_role(
    empresa_id,
    'admin'::public.app_role
  )
);


COMMIT;