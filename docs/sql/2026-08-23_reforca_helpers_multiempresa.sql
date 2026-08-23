-- ============================================================
-- FASE 4A.1 — HARDENING DOS HELPERS MULTIEMPRESA
-- ============================================================


-- Remove policies que ainda dependem das assinaturas antigas.

DROP POLICY IF EXISTS empresas_read_member
ON public.empresas;

DROP POLICY IF EXISTS empresa_usuarios_read
ON public.empresa_usuarios;


-- Remove os helpers antigos.

DROP FUNCTION IF EXISTS public.is_empresa_member(uuid, uuid);

DROP FUNCTION IF EXISTS public.has_empresa_role(
    uuid,
    uuid,
    public.app_role
);


-- ------------------------------------------------------------
-- O usuário da sessão pertence à empresa?
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_empresa_member(
    _empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

    SELECT EXISTS (
        SELECT 1
        FROM public.empresa_usuarios eu
        WHERE eu.user_id = auth.uid()
          AND eu.empresa_id = _empresa_id
    );

$function$;


-- ------------------------------------------------------------
-- O usuário da sessão possui determinada role na empresa?
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_empresa_role(
    _empresa_id uuid,
    _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

    SELECT EXISTS (
        SELECT 1
        FROM public.empresa_usuarios eu
        WHERE eu.user_id = auth.uid()
          AND eu.empresa_id = _empresa_id
          AND eu.role = _role
    );

$function$;


-- ------------------------------------------------------------
-- Permissões
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.is_empresa_member(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_empresa_member(uuid)
TO authenticated;


REVOKE EXECUTE ON FUNCTION public.has_empresa_role(
    uuid,
    public.app_role
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_empresa_role(
    uuid,
    public.app_role
)
TO authenticated;


-- ------------------------------------------------------------
-- Recria policies usando implicitamente auth.uid()
-- ------------------------------------------------------------

CREATE POLICY empresas_read_member
ON public.empresas
FOR SELECT
TO authenticated
USING (
    public.is_empresa_member(id)
);


CREATE POLICY empresa_usuarios_read
ON public.empresa_usuarios
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.has_empresa_role(
        empresa_id,
        'admin'::public.app_role
    )
);