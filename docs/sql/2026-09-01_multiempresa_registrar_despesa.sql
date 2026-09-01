BEGIN;

-- A assinatura muda para incluir p_empresa_id.
-- A versão antiga precisa ser removida para não continuar
-- oferecendo uma RPC global sem isolamento por empresa.
DROP FUNCTION IF EXISTS public.registrar_despesa(
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
  p_status text DEFAULT 'pago'
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

    -- Segurança multiempresa:
    -- preserva a regra atual de somente administradores,
    -- agora no escopo da empresa.
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
        user_id
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
        v_user_id
    )
    RETURNING id
    INTO v_despesa_id;

    -- Somente despesa paga impacta o caixa.
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
  text
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
  text
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
  text
) TO authenticated;

COMMIT;