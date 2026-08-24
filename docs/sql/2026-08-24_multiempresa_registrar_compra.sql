BEGIN;

-- A assinatura muda para incluir p_empresa_id.
-- Removemos a RPC antiga para não manter uma versão global acessível.
DROP FUNCTION IF EXISTS public.registrar_compra(
  uuid,
  numeric,
  numeric,
  text,
  date,
  text,
  date
);

CREATE FUNCTION public.registrar_compra(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_quantidade numeric,
  p_custo_unitario numeric,
  p_fornecedor text DEFAULT NULL,
  p_data date DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo'))::date,
  p_forma_pagamento text DEFAULT 'a_vista',
  p_data_vencimento date DEFAULT NULL
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

    IF p_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Empresa não informada.';
    END IF;

    -- Segurança multiempresa:
    -- mantém a regra atual de somente administradores,
    -- agora no escopo da empresa.
    IF NOT public.has_empresa_role(
        p_empresa_id,
        'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- O produto precisa pertencer à empresa informada.
    SELECT *
    INTO v_produto
    FROM public.produtos
    WHERE id = p_produto_id
      AND empresa_id = p_empresa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Produto não encontrado nesta empresa.';
    END IF;

    IF p_quantidade IS NULL
       OR p_quantidade <= 0 THEN
        RAISE EXCEPTION
            'A quantidade deve ser maior que zero.';
    END IF;

    IF p_custo_unitario IS NULL
       OR p_custo_unitario <= 0 THEN
        RAISE EXCEPTION
            'O custo unitário deve ser maior que zero.';
    END IF;

    IF p_forma_pagamento NOT IN (
        'a_vista',
        'a_prazo'
    ) THEN
        RAISE EXCEPTION
            'Forma de pagamento inválida.';
    END IF;

    IF p_forma_pagamento = 'a_prazo'
       AND p_data_vencimento IS NULL THEN
        RAISE EXCEPTION
            'Informe a data de vencimento da compra a prazo.';
    END IF;

    IF p_forma_pagamento = 'a_prazo'
       AND p_data_vencimento < p_data THEN
        RAISE EXCEPTION
            'A data de vencimento não pode ser anterior à data da compra.';
    END IF;

    v_custo_total :=
        p_quantidade *
        p_custo_unitario;

    IF p_forma_pagamento = 'a_vista' THEN
        v_status_pagamento := 'pago';
        v_data_pagamento := p_data;
    ELSE
        v_status_pagamento := 'pendente';
        v_data_pagamento := NULL;
    END IF;

    INSERT INTO public.compras (
        empresa_id,
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
        p_empresa_id,
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

    -- Atualiza estoque e sincroniza o produto com
    -- o último custo de compra registrado.
    UPDATE public.produtos
    SET
        estoque_atual =
            COALESCE(estoque_atual, 0)
            + p_quantidade,
        custo_compra =
            p_custo_unitario
    WHERE id = v_produto.id
      AND empresa_id = p_empresa_id;

    -- Compra à vista impacta o caixa imediatamente.
    IF p_forma_pagamento = 'a_vista' THEN

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

REVOKE ALL ON FUNCTION public.registrar_compra(
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  date,
  text,
  date
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.registrar_compra(
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  date,
  text,
  date
) FROM anon;

GRANT EXECUTE ON FUNCTION public.registrar_compra(
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  date,
  text,
  date
) TO authenticated;

COMMIT;