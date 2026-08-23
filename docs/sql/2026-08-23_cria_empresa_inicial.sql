-- ============================================================
-- FASE 4B — EMPRESA INICIAL
--
-- Cria a empresa inicial e associa como admin somente
-- o usuário que atualmente:
--   - possui profile
--   - possui role global "admin"
--
-- O script aborta se não existir exatamente 1 usuário
-- nessa condição.
-- ============================================================

DO $$
DECLARE
    v_admin_id uuid;
    v_empresa_id uuid;
    v_admin_count integer;
BEGIN

    -- --------------------------------------------------------
    -- Garante que existe exatamente um admin válido atualmente.
    -- --------------------------------------------------------

    SELECT COUNT(DISTINCT ur.user_id)
    INTO v_admin_count
    FROM public.user_roles ur
    INNER JOIN public.profiles p
        ON p.id = ur.user_id
    WHERE ur.role = 'admin'::public.app_role;

    IF v_admin_count <> 1 THEN
        RAISE EXCEPTION
            'Esperado exatamente 1 admin com profile, encontrados: %.',
            v_admin_count;
    END IF;


    SELECT ur.user_id
    INTO v_admin_id
    FROM public.user_roles ur
    INNER JOIN public.profiles p
        ON p.id = ur.user_id
    WHERE ur.role = 'admin'::public.app_role
    LIMIT 1;


    -- --------------------------------------------------------
    -- Reutiliza a empresa caso este script seja executado
    -- novamente; caso contrário, cria a empresa.
    -- --------------------------------------------------------

    SELECT id
    INTO v_empresa_id
    FROM public.empresas
    WHERE nome = 'Souza Prado Distribuidora'
    ORDER BY created_at
    LIMIT 1;


    IF v_empresa_id IS NULL THEN
        INSERT INTO public.empresas (
            nome,
            created_by
        )
        VALUES (
            'Souza Prado Distribuidora',
            v_admin_id
        )
        RETURNING id
        INTO v_empresa_id;
    END IF;


    -- --------------------------------------------------------
    -- Vincula somente o admin existente à empresa.
    -- --------------------------------------------------------

    INSERT INTO public.empresa_usuarios (
        empresa_id,
        user_id,
        role
    )
    VALUES (
        v_empresa_id,
        v_admin_id,
        'admin'::public.app_role
    )
    ON CONFLICT (empresa_id, user_id)
    DO UPDATE SET
        role = 'admin'::public.app_role;

END;
$$;