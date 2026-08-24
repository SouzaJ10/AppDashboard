BEGIN;

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
    v_data date;

BEGIN
    v_data :=
        (now() AT TIME ZONE 'America/Sao_Paulo')::date;

    -- A própria compra determina a empresa da operação.
    SELECT *
    INTO v_compra
    FROM public.compras
    WHERE id = p_compra_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compra não encontrada.';
    END IF;

    IF v_compra.empresa_id IS NULL THEN
        RAISE EXCEPTION
            'A compra não está vinculada a uma empresa.';
    END IF;

    -- Segurança multiempresa:
    -- mantém a regra atual de somente administradores,
    -- agora no escopo da empresa proprietária da compra.
    IF NOT public.has_empresa_role(
        v_compra.empresa_id,
        'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Impede pagamento duplicado e, junto com FOR UPDATE,
    -- protege também contra chamadas concorrentes.
    IF COALESCE(
        v_compra.status_pagamento,
        'pendente'
    ) = 'pago' THEN
        RAISE EXCEPTION
            'Esta compra já está paga.';
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
        empresa_id,
        data,
        entrada,
        saida,
        descricao,
        tipo,
        categoria,
        referencia_id
    )
    VALUES (
        v_compra.empresa_id,
        v_data,
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
        data_pagamento = v_data
    WHERE id = v_compra.id
      AND empresa_id = v_compra.empresa_id;

END;

$function$;

REVOKE ALL ON FUNCTION public.pagar_compra(uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.pagar_compra(uuid)
FROM anon;

GRANT EXECUTE ON FUNCTION public.pagar_compra(uuid)
TO authenticated;

COMMIT;