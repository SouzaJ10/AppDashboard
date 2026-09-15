BEGIN;

ALTER TABLE public.despesas
    ADD COLUMN IF NOT EXISTS data_vencimento date NULL;

-- A lista de argumentos identifica a função no PostgreSQL.
-- Remove a assinatura anterior para evitar overload ambíguo no PostgREST.
DROP FUNCTION IF EXISTS public.registrar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text
);

CREATE FUNCTION public.registrar_despesa(
    p_empresa_id uuid,
    p_descricao text,
    p_valor numeric,
    p_data date DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo'))::date,
    p_categoria text DEFAULT NULL,
    p_forma_pagamento text DEFAULT NULL,
    p_centro_custo text DEFAULT NULL,
    p_observacoes text DEFAULT NULL,
    p_status text DEFAULT 'pago',
    p_data_vencimento date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_despesa_id uuid;
    v_user_id uuid;

BEGIN

    IF p_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Empresa não informada.';
    END IF;

    IF NOT public.has_empresa_role(
        p_empresa_id,
        'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    IF p_descricao IS NULL
       OR btrim(p_descricao) = '' THEN
        RAISE EXCEPTION 'Descrição é obrigatória.';
    END IF;

    IF p_valor IS NULL
       OR p_valor <= 0 THEN
        RAISE EXCEPTION 'O valor deve ser maior que zero.';
    END IF;

    IF p_status NOT IN (
        'pago',
        'pendente'
    ) THEN
        RAISE EXCEPTION 'Status inválido.';
    END IF;

    v_user_id := auth.uid();

    INSERT INTO public.despesas (
        empresa_id,
        descricao,
        categoria,
        valor,
        data,
        forma_pagamento,
        centro_custo,
        observacoes,
        status,
        user_id,
        data_vencimento
    )
    VALUES (
        p_empresa_id,
        btrim(p_descricao),
        NULLIF(btrim(p_categoria), ''),
        p_valor,
        p_data,
        NULLIF(btrim(p_forma_pagamento), ''),
        NULLIF(btrim(p_centro_custo), ''),
        NULLIF(btrim(p_observacoes), ''),
        p_status,
        v_user_id,
        p_data_vencimento
    )
    RETURNING id
    INTO v_despesa_id;

    -- Somente despesa paga impacta o caixa.
    -- O vencimento nunca é usado como data de movimentação.
    IF p_status = 'pago' THEN

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
            p_empresa_id,
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
            v_despesa_id
        );

    END IF;

    RETURN v_despesa_id;

END;

$function$;

REVOKE ALL ON FUNCTION public.registrar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text,
    date
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.registrar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text,
    date
) FROM anon;

GRANT EXECUTE ON FUNCTION public.registrar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text,
    date
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.registrar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text,
    date
) TO service_role;

-- Remove a assinatura anterior antes de criar a versão com vencimento.
DROP FUNCTION IF EXISTS public.atualizar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text
);

CREATE FUNCTION public.atualizar_despesa(
    p_despesa_id uuid,
    p_descricao text,
    p_valor numeric,
    p_data date,
    p_categoria text DEFAULT NULL,
    p_forma_pagamento text DEFAULT NULL,
    p_centro_custo text DEFAULT NULL,
    p_observacoes text DEFAULT NULL,
    p_status text DEFAULT 'pago',
    p_data_vencimento date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_despesa public.despesas%ROWTYPE;

BEGIN

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
            p_status,

        data_vencimento =
            p_data_vencimento

    WHERE id = v_despesa.id
      AND empresa_id =
          v_despesa.empresa_id;

    -- Se ficou paga, cria ou sincroniza a movimentação financeira.
    -- A data do caixa continua sendo p_data.
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
    text,
    date
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
    text,
    date
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
    text,
    date
)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.atualizar_despesa(
    uuid,
    text,
    numeric,
    date,
    text,
    text,
    text,
    text,
    text,
    date
)
TO service_role;

COMMIT;
