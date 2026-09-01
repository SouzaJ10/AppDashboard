BEGIN;

CREATE OR REPLACE FUNCTION public.excluir_despesa(
    p_despesa_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_despesa public.despesas%ROWTYPE;

BEGIN

    -- Busca e bloqueia a despesa.
    -- A própria despesa determina a empresa da operação.
    SELECT *
    INTO v_despesa
    FROM public.despesas
    WHERE id = p_despesa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Despesa não encontrada.';
    END IF;

    IF v_despesa.empresa_id IS NULL THEN
        RAISE EXCEPTION
            'A despesa não está vinculada a uma empresa.';
    END IF;

    -- Segurança multiempresa:
    -- preserva a regra atual de somente administradores,
    -- agora dentro da empresa proprietária da despesa.
    IF NOT public.has_empresa_role(
        v_despesa.empresa_id,
        'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Remove somente a movimentação financeira
    -- pertencente à mesma empresa.
    DELETE FROM public.movimentacoes
    WHERE empresa_id = v_despesa.empresa_id
      AND tipo = 'despesa'
      AND referencia_id = v_despesa.id;

    -- Remove somente a despesa da empresa identificada.
    DELETE FROM public.despesas
    WHERE id = v_despesa.id
      AND empresa_id = v_despesa.empresa_id;

END;

$function$;

REVOKE ALL ON FUNCTION public.excluir_despesa(uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.excluir_despesa(uuid)
FROM anon;

GRANT EXECUTE ON FUNCTION public.excluir_despesa(uuid)
TO authenticated;

COMMIT;