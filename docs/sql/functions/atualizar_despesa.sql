CREATE OR REPLACE FUNCTION public.atualizar_despesa(
    p_despesa_id uuid,
    p_descricao text,
    p_valor numeric,
    p_data date,
    p_categoria text DEFAULT NULL,
    p_forma_pagamento text DEFAULT NULL,
    p_centro_custo text DEFAULT NULL,
    p_observacoes text DEFAULT NULL,
    p_status text DEFAULT 'pago'
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

    IF p_descricao IS NULL
       OR btrim(p_descricao) = '' THEN
        RAISE EXCEPTION 'Descrição é obrigatória.';
    END IF;

    IF p_valor IS NULL
       OR p_valor <= 0 THEN
        RAISE EXCEPTION 'O valor deve ser maior que zero.';
    END IF;

    IF p_status NOT IN ('pago', 'pendente') THEN
        RAISE EXCEPTION 'Status inválido.';
    END IF;

    UPDATE public.despesas
    SET
        descricao = btrim(p_descricao),
        categoria = NULLIF(btrim(p_categoria), ''),
        valor = p_valor,
        data = p_data,
        forma_pagamento = NULLIF(btrim(p_forma_pagamento), ''),
        centro_custo = NULLIF(btrim(p_centro_custo), ''),
        observacoes = NULLIF(btrim(p_observacoes), ''),
        status = p_status
    WHERE id = p_despesa_id;

    IF p_status = 'pago' THEN

        IF EXISTS (
            SELECT 1
            FROM public.movimentacoes
            WHERE tipo = 'despesa'
              AND referencia_id = p_despesa_id
        ) THEN

            UPDATE public.movimentacoes
            SET
                data = p_data,
                entrada = 0,
                saida = p_valor,
                descricao = CONCAT(
                    'Despesa: ',
                    btrim(p_descricao)
                ),
                categoria = COALESCE(
                    NULLIF(btrim(p_categoria), ''),
                    'Outros'
                )
            WHERE tipo = 'despesa'
              AND referencia_id = p_despesa_id;

        ELSE

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
                p_valor,
                CONCAT(
                    'Despesa: ',
                    btrim(p_descricao)
                ),
                'despesa',
                COALESCE(
                    NULLIF(btrim(p_categoria), ''),
                    'Outros'
                ),
                p_despesa_id
            );

        END IF;

    ELSE

        DELETE FROM public.movimentacoes
        WHERE tipo = 'despesa'
          AND referencia_id = p_despesa_id;

    END IF;

END;

$function$;

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