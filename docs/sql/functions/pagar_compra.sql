CREATE OR REPLACE FUNCTION public.pagar_compra(
    p_compra_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_compra public.compras%ROWTYPE;
    v_descricao text;
BEGIN

    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    SELECT *
    INTO v_compra
    FROM public.compras
    WHERE id = p_compra_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compra não encontrada.';
    END IF;

    IF COALESCE(v_compra.status_pagamento, 'pendente') = 'pago' THEN
        RAISE EXCEPTION 'Esta compra já está paga.';
    END IF;

    v_descricao := CONCAT(
        'Pagamento compra: ',
        v_compra.descricao,
        CASE
            WHEN v_compra.fornecedor IS NOT NULL
                 AND v_compra.fornecedor <> ''
            THEN ' — ' || v_compra.fornecedor
            ELSE ''
        END
    );

    INSERT INTO public.movimentacoes (
        data,
        entrada,
        saida,
        descricao,
        tipo,
        categoria,
        referencia_id
    )
    VALUES (
        CURRENT_DATE,
        0,
        v_compra.custo_total,
        v_descricao,
        'compra',
        'Compras',
        v_compra.id
    );

    UPDATE public.compras
    SET
        status_pagamento = 'pago',
        data_pagamento = CURRENT_DATE
    WHERE id = p_compra_id;

END;

$function$;

REVOKE EXECUTE ON FUNCTION public.pagar_compra(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pagar_compra(uuid)
TO authenticated;