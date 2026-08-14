CREATE OR REPLACE FUNCTION public.registrar_compra(
    p_produto_id uuid,
    p_quantidade numeric,
    p_custo_unitario numeric,
    p_fornecedor text DEFAULT NULL::text,
    p_data date DEFAULT CURRENT_DATE,
    p_forma_pagamento text DEFAULT 'a_vista'::text,
    p_data_vencimento date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_compra_id uuid;
    v_produto public.produtos%ROWTYPE;
    v_custo_total numeric;
    v_status_pagamento text;
    v_data_pagamento date;
BEGIN

    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    SELECT *
    INTO v_produto
    FROM public.produtos
    WHERE id = p_produto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado.';
    END IF;

    IF p_quantidade <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
    END IF;

    IF p_custo_unitario <= 0 THEN
        RAISE EXCEPTION 'O custo unitário deve ser maior que zero.';
    END IF;

    IF p_forma_pagamento NOT IN ('a_vista', 'a_prazo') THEN
        RAISE EXCEPTION 'Forma de pagamento inválida.';
    END IF;

    IF p_forma_pagamento = 'a_prazo'
       AND p_data_vencimento IS NULL THEN
        RAISE EXCEPTION 'Informe a data de vencimento da compra a prazo.';
    END IF;

    IF p_forma_pagamento = 'a_prazo'
       AND p_data_vencimento < p_data THEN
        RAISE EXCEPTION 'A data de vencimento não pode ser anterior à data da compra.';
    END IF;

    v_custo_total := p_quantidade * p_custo_unitario;

    IF p_forma_pagamento = 'a_vista' THEN
        v_status_pagamento := 'pago';
        v_data_pagamento := p_data;
    ELSE
        v_status_pagamento := 'pendente';
        v_data_pagamento := NULL;
    END IF;

    INSERT INTO public.compras (
        produto_id,
        codigo,
        descricao,
        quantidade,
        custo_unitario,
        custo_total,
        fornecedor,
        data,
        forma_pagamento,
        status_pagamento,
        data_vencimento,
        data_pagamento
    )
    VALUES (
        v_produto.id,
        v_produto.codigo,
        v_produto.descricao,
        p_quantidade,
        p_custo_unitario,
        v_custo_total,
        p_fornecedor,
        p_data,
        p_forma_pagamento,
        v_status_pagamento,
        CASE
            WHEN p_forma_pagamento = 'a_prazo'
            THEN p_data_vencimento
            ELSE NULL
        END,
        v_data_pagamento
    )
    RETURNING id
    INTO v_compra_id;

    UPDATE public.produtos
    SET estoque_atual = COALESCE(estoque_atual, 0) + p_quantidade
    WHERE id = v_produto.id;

    IF p_forma_pagamento = 'a_vista' THEN
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
            p_data,
            0,
            v_custo_total,
            CONCAT(
                'Compra: ',
                v_produto.descricao,
                CASE
                    WHEN p_fornecedor IS NOT NULL
                         AND p_fornecedor <> ''
                    THEN ' — ' || p_fornecedor
                    ELSE ''
                END
            ),
            'compra',
            'Compras',
            v_compra_id
        );
    END IF;

    RETURN v_compra_id;

END;

$function$;

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