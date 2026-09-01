BEGIN;

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

    -- Busca e bloqueia a despesa.
    -- A própria despesa determina a empresa da operação.
    SELECT *
    INTO v_despesa
    FROM public.despesas
    WHERE id = p_despesa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Despesa não encontrada.';
    END IF;

    IF v_despesa.empresa_id IS NULL THEN
        RAISE EXCEPTION
            'A despesa não está vinculada a uma empresa.';
    END IF;

    -- Segurança multiempresa:
    -- mantém a regra atual de somente administradores,
    -- agora no escopo da empresa proprietária da despesa.
    IF NOT public.has_empresa_role(
        v_despesa.empresa_id,
        'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    IF p_descricao IS NULL
       OR btrim(p_descricao) = '' THEN
        RAISE EXCEPTION
            'Descrição é obrigatória.';
    END IF;

    IF p_valor IS NULL
       OR p_valor <= 0 THEN
        RAISE EXCEPTION
            'O valor deve ser maior que zero.';
    END IF;

    IF p_status NOT IN (
        'pago',
        'pendente'
    ) THEN
        RAISE EXCEPTION
            'Status inválido.';
    END IF;

    UPDATE public.despesas
    SET
        descricao =
            btrim(p_descricao),

        categoria =
            NULLIF(
                btrim(p_categoria),
                ''
            ),

        valor =
            p_valor,

        data =
            p_data,

        forma_pagamento =
            NULLIF(
                btrim(p_forma_pagamento),
                ''
            ),

        centro_custo =
            NULLIF(
                btrim(p_centro_custo),
                ''
            ),

        observacoes =
            NULLIF(
                btrim(p_observacoes),
                ''
            ),

        status =
            p_status

    WHERE id = v_despesa.id
      AND empresa_id =
          v_despesa.empresa_id;

    -- Se ficou paga, cria ou sincroniza
    -- a movimentação financeira.
    IF p_status = 'pago' THEN

        IF EXISTS (
            SELECT 1
            FROM public.movimentacoes
            WHERE empresa_id =
                    v_despesa.empresa_id
              AND tipo = 'despesa'
              AND referencia_id =
                    v_despesa.id
        ) THEN

            UPDATE public.movimentacoes
            SET
                data =
                    p_data,

                entrada =
                    0,

                saida =
                    p_valor,

                descricao =
                    CONCAT(
                        'Despesa: ',
                        btrim(p_descricao)
                    ),

                categoria =
                    COALESCE(
                        NULLIF(
                            btrim(p_categoria),
                            ''
                        ),
                        'Outros'
                    )

            WHERE empresa_id =
                    v_despesa.empresa_id
              AND tipo = 'despesa'
              AND referencia_id =
                    v_despesa.id;

        ELSE

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
                v_despesa.empresa_id,
                p_data,
                0,
                p_valor,
                CONCAT(
                    'Despesa: ',
                    btrim(p_descricao)
                ),
                'despesa',
                COALESCE(
                    NULLIF(
                        btrim(p_categoria),
                        ''
                    ),
                    'Outros'
                ),
                v_despesa.id
            );

        END IF;

    ELSE

        -- Pago -> Pendente:
        -- remove a saída do fluxo de caixa
        -- somente dentro da mesma empresa.
        DELETE FROM public.movimentacoes
        WHERE empresa_id =
                v_despesa.empresa_id
          AND tipo = 'despesa'
          AND referencia_id =
                v_despesa.id;

    END IF;

END;

$function$;

REVOKE ALL ON FUNCTION public.atualizar_despesa(
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
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.atualizar_despesa(
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
FROM anon;

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

COMMIT;