-- ============================================================
-- SECURITY HARDENING
-- Data: 2026-08-14
--
-- Objetivo:
-- - Restringir dados comerciais/financeiros a administradores
-- - Restringir profiles ao próprio usuário
-- - Restringir user_roles ao próprio usuário
-- - Remover execução anônima/pública das RPCs críticas
-- - Exigir role admin dentro das funções SECURITY DEFINER
--
-- IMPORTANTE:
-- No Supabase Auth também deve permanecer DESATIVADO:
--   "Allow new users to sign up"
-- Essa configuração pertence ao Auth e não é controlada
-- por esta migration SQL.
-- ============================================================


-- ============================================================
-- 1. GARANTIR RLS NAS TABELAS EXPOSTAS
-- ============================================================

ALTER TABLE public.categorias_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. PROFILES
-- Usuário pode ler e atualizar somente o próprio perfil
-- ============================================================

DROP POLICY IF EXISTS "profiles read all auth"
ON public.profiles;

DROP POLICY IF EXISTS "profiles read own"
ON public.profiles;

CREATE POLICY "profiles read own"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = id
);


DROP POLICY IF EXISTS "profiles update own"
ON public.profiles;

CREATE POLICY "profiles update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = id
)
WITH CHECK (
    (SELECT auth.uid()) = id
);


-- ============================================================
-- 3. USER_ROLES
-- Usuário só pode consultar a própria role
-- ============================================================

DROP POLICY IF EXISTS "user_roles read own"
ON public.user_roles;

CREATE POLICY "user_roles read own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);


-- ============================================================
-- 4. CATEGORIAS DE DESPESA
-- ============================================================

DROP POLICY IF EXISTS "cat_desp read auth"
ON public.categorias_despesa;

DROP POLICY IF EXISTS "cat_desp read admin"
ON public.categorias_despesa;

CREATE POLICY "cat_desp read admin"
ON public.categorias_despesa
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "cat_desp write admin"
ON public.categorias_despesa;

CREATE POLICY "cat_desp write admin"
ON public.categorias_despesa
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);


-- ============================================================
-- 5. PRODUTOS
-- ============================================================

DROP POLICY IF EXISTS "produtos read auth"
ON public.produtos;

DROP POLICY IF EXISTS "produtos read admin"
ON public.produtos;

CREATE POLICY "produtos read admin"
ON public.produtos
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "produtos write admin"
ON public.produtos;

CREATE POLICY "produtos write admin"
ON public.produtos
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);


-- ============================================================
-- 6. COMPRAS
-- ============================================================

DROP POLICY IF EXISTS "compras read auth"
ON public.compras;

DROP POLICY IF EXISTS "compras read admin"
ON public.compras;

CREATE POLICY "compras read admin"
ON public.compras
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "compras write admin"
ON public.compras;

CREATE POLICY "compras write admin"
ON public.compras
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);


-- ============================================================
-- 7. DESPESAS
-- ============================================================

DROP POLICY IF EXISTS "despesas read auth"
ON public.despesas;

DROP POLICY IF EXISTS "despesas read admin"
ON public.despesas;

CREATE POLICY "despesas read admin"
ON public.despesas
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "despesas write admin"
ON public.despesas;

CREATE POLICY "despesas write admin"
ON public.despesas
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);


-- ============================================================
-- 8. MOVIMENTAÇÕES
-- ============================================================

DROP POLICY IF EXISTS "mov read auth"
ON public.movimentacoes;

DROP POLICY IF EXISTS "mov read admin"
ON public.movimentacoes;

CREATE POLICY "mov read admin"
ON public.movimentacoes
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "mov write admin"
ON public.movimentacoes;

CREATE POLICY "mov write admin"
ON public.movimentacoes
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);


-- ============================================================
-- 9. VENDAS
-- Remove policies antigas que aceitavam qualquer autenticado
-- ============================================================

DROP POLICY IF EXISTS "vendas authenticated all"
ON public.vendas;

DROP POLICY IF EXISTS "vendas read auth"
ON public.vendas;

DROP POLICY IF EXISTS "vendas read admin"
ON public.vendas;

CREATE POLICY "vendas read admin"
ON public.vendas
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
);


DROP POLICY IF EXISTS "vendas write admin"
ON public.vendas;

CREATE POLICY "vendas write admin"
ON public.vendas
FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
);


-- ============================================================
-- 10. PROTEGER EXECUÇÃO DAS RPCs
-- ============================================================

-- Registrar venda
REVOKE EXECUTE ON FUNCTION public.registrar_venda(
    uuid,
    numeric,
    numeric,
    numeric,
    numeric,
    text,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_venda(
    uuid,
    numeric,
    numeric,
    numeric,
    numeric,
    text,
    text
)
TO authenticated;


-- Registrar compra - versão atual
REVOKE EXECUTE ON FUNCTION public.registrar_compra(
    uuid,
    numeric,
    numeric,
    text,
    date,
    text,
    date
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_compra(
    uuid,
    numeric,
    numeric,
    text,
    date,
    text,
    date
)
TO authenticated;


-- Registrar compra - assinatura antiga
-- Mantida sem acesso pelo frontend
REVOKE EXECUTE ON FUNCTION public.registrar_compra(
    uuid,
    numeric,
    numeric,
    text,
    date
)
FROM PUBLIC, anon, authenticated;


-- Pagar compra
REVOKE EXECUTE ON FUNCTION public.pagar_compra(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pagar_compra(uuid)
TO authenticated;


-- Excluir compra
REVOKE EXECUTE ON FUNCTION public.excluir_compra(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.excluir_compra(uuid)
TO authenticated;


-- Registrar despesa
REVOKE EXECUTE ON FUNCTION public.registrar_despesa(
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_despesa(
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text
)
TO authenticated;


-- Atualizar despesa
REVOKE EXECUTE ON FUNCTION public.atualizar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.atualizar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text
)
TO authenticated;


-- Excluir despesa
REVOKE EXECUTE ON FUNCTION public.excluir_despesa(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.excluir_despesa(uuid)
TO authenticated;


-- has_role
-- Necessária para as próprias policies RLS.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)
TO authenticated;


-- ============================================================
-- 11. VALIDAÇÃO
-- ============================================================

-- SELECT policies
SELECT
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;


-- Policies de escrita
SELECT
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
ORDER BY tablename, cmd, policyname;


-- Permissões das RPCs críticas
SELECT
    p.oid::regprocedure::text AS assinatura,
    p.prosecdef AS security_definer,
    has_function_privilege(
        'anon',
        p.oid,
        'EXECUTE'
    ) AS anon_can_execute,
    has_function_privilege(
        'authenticated',
        p.oid,
        'EXECUTE'
    ) AS authenticated_can_execute,
    has_function_privilege(
        'public',
        p.oid,
        'EXECUTE'
    ) AS public_can_execute
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'registrar_venda',
      'registrar_compra',
      'excluir_compra',
      'pagar_compra',
      'registrar_despesa',
      'atualizar_despesa',
      'excluir_despesa',
      'has_role'
  )
ORDER BY assinatura;