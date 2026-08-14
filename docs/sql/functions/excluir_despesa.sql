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

    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    SELECT *
    INTO v_despesa
    FROM public.despesas
    WHERE id = p_despesa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Despesa não encontrada.';
    END IF;

    DELETE FROM public.movimentacoes
    WHERE tipo = 'despesa'
      AND referencia_id = p_despesa_id;

    DELETE FROM public.despesas
    WHERE id = p_despesa_id;

END;

$function$;

REVOKE EXECUTE ON FUNCTION public.excluir_despesa(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.excluir_despesa(uuid)
TO authenticated;