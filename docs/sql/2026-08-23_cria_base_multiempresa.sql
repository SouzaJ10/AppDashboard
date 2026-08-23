-- ============================================================
-- FASE 4A — BASE MULTIEMPRESA
--
-- Nesta etapa:
--   - cria empresas
--   - cria associação usuário <-> empresa
--   - cria helpers de autorização por empresa
--   - ativa RLS nas novas tabelas
--
-- Ainda NÃO altera:
--   - tabelas de negócio
--   - user_roles
--   - handle_new_user
--   - RPCs operacionais existentes
-- ============================================================


-- ------------------------------------------------------------
-- EMPRESAS
-- ------------------------------------------------------------

CREATE TABLE public.empresas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    nome text NOT NULL
        CHECK (btrim(nome) <> ''),

    created_at timestamptz NOT NULL DEFAULT now(),

    created_by uuid NULL
        REFERENCES auth.users(id)
        ON DELETE SET NULL
);


-- ------------------------------------------------------------
-- USUÁRIOS DE CADA EMPRESA
-- ------------------------------------------------------------

CREATE TABLE public.empresa_usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    empresa_id uuid NOT NULL
        REFERENCES public.empresas(id)
        ON DELETE CASCADE,

    user_id uuid NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    role public.app_role NOT NULL
        DEFAULT 'user'::public.app_role,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT empresa_usuarios_empresa_user_key
        UNIQUE (empresa_id, user_id)
);


CREATE INDEX empresa_usuarios_user_id_idx
    ON public.empresa_usuarios(user_id);

CREATE INDEX empresa_usuarios_empresa_id_idx
    ON public.empresa_usuarios(empresa_id);


-- ------------------------------------------------------------
-- HELPER: USUÁRIO PERTENCE À EMPRESA?
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_empresa_member(
    _user_id uuid,
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
        WHERE eu.user_id = _user_id
          AND eu.empresa_id = _empresa_id
    );

$function$;


-- ------------------------------------------------------------
-- HELPER: USUÁRIO POSSUI ROLE NA EMPRESA?
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_empresa_role(
    _user_id uuid,
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
        WHERE eu.user_id = _user_id
          AND eu.empresa_id = _empresa_id
          AND eu.role = _role
    );

$function$;


-- ------------------------------------------------------------
-- SEGURANÇA DAS FUNÇÕES
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.is_empresa_member(
    uuid,
    uuid
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_empresa_member(
    uuid,
    uuid
)
TO authenticated;


REVOKE EXECUTE ON FUNCTION public.has_empresa_role(
    uuid,
    uuid,
    public.app_role
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_empresa_role(
    uuid,
    uuid,
    public.app_role
)
TO authenticated;


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

ALTER TABLE public.empresas
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.empresa_usuarios
ENABLE ROW LEVEL SECURITY;


-- Um usuário só pode visualizar empresas das quais participa.
CREATE POLICY empresas_read_member
ON public.empresas
FOR SELECT
TO authenticated
USING (
    public.is_empresa_member(
        auth.uid(),
        id
    )
);


-- Um usuário pode visualizar:
--   - sua própria associação
--   - ou associações da empresa na qual ele é admin
CREATE POLICY empresa_usuarios_read
ON public.empresa_usuarios
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    public.has_empresa_role(
        auth.uid(),
        empresa_id,
        'admin'::public.app_role
    )
);


-- ------------------------------------------------------------
-- PRIVILÉGIOS
--
-- Nesta primeira etapa não permitimos INSERT/UPDATE/DELETE
-- direto pelo frontend.
--
-- A criação inicial será feita de maneira controlada.
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE
    public.empresas,
    public.empresa_usuarios
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE
    public.empresas,
    public.empresa_usuarios
TO authenticated;