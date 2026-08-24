BEGIN;

CREATE OR REPLACE FUNCTION public.excluir_compra(
    p_compra_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_compra public.compras%ROWTYPE;
    v_estoque_atual numeric;
    v_movimentacao_id uuid;
    v_data_atual date;

BEGIN
    v_data_atual :=
        (now() AT TIME ZONE 'America/Sao_Paulo')::date;

    -- Busca e bloqueia a compra.
    -- A própria compra define qual é a empresa da operação.
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

    -- Verifica vínculo com produto.
    IF v_compra.produto_id IS NULL THEN
        RAISE EXCEPTION
            'A compra não possui produto vinculado.';
    END IF;

    -- Busca e bloqueia somente o produto da mesma empresa.
    SELECT estoque_atual
    INTO v_estoque_atual
    FROM public.produtos
    WHERE id = v_compra.produto_id
      AND empresa_id = v_compra.empresa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Produto da compra não encontrado nesta empresa.';
    END IF;

    -- Garante que é possível desfazer a entrada do estoque.
    IF COALESCE(v_estoque_atual, 0)
       < v_compra.quantidade THEN
        RAISE EXCEPTION
            'Não é possível excluir esta compra porque o estoque atual (%) é menor que a quantidade comprada (%).',
            COALESCE(v_estoque_atual, 0),
            v_compra.quantidade;
    END IF;

    -- Desfaz a entrada de estoque.
    -- Mantém o comportamento atual: custo_compra não é recalculado.
    UPDATE public.produtos
    SET estoque_atual =
        COALESCE(estoque_atual, 0)
        - v_compra.quantidade
    WHERE id = v_compra.produto_id
      AND empresa_id = v_compra.empresa_id;

    -- Remove movimentações novas vinculadas diretamente à compra,
    -- sempre dentro da mesma empresa.
    DELETE FROM public.movimentacoes
    WHERE empresa_id = v_compra.empresa_id
      AND tipo = 'compra'
      AND referencia_id = v_compra.id;

    -- Compatibilidade com movimentações históricas antigas
    -- que ainda possam não possuir referencia_id.
    IF v_compra.status_pagamento = 'pago' THEN

        IF v_compra.forma_pagamento = 'a_vista' THEN

            SELECT id
            INTO v_movimentacao_id
            FROM public.movimentacoes
            WHERE empresa_id = v_compra.empresa_id
              AND referencia_id IS NULL
              AND tipo = 'compra'
              AND saida = v_compra.custo_total
              AND data = COALESCE(
                  v_compra.data,
                  v_data_atual
              )
              AND descricao = CONCAT(
                  'Compra: ',
                  v_compra.descricao,
                  CASE
                      WHEN v_compra.fornecedor IS NOT NULL
                           AND v_compra.fornecedor <> ''
                      THEN ' — ' || v_compra.fornecedor
                      ELSE ''
                  END
              )
            ORDER BY created_at DESC
            LIMIT 1;

        ELSIF v_compra.forma_pagamento = 'a_prazo' THEN

            SELECT id
            INTO v_movimentacao_id
            FROM public.movimentacoes
            WHERE empresa_id = v_compra.empresa_id
              AND referencia_id IS NULL
              AND tipo = 'compra'
              AND saida = v_compra.custo_total
              AND data = COALESCE(
                  v_compra.data_pagamento,
                  v_data_atual
              )
              AND descricao = CONCAT(
                  'Pagamento compra: ',
                  v_compra.descricao,
                  CASE
                      WHEN v_compra.fornecedor IS NOT NULL
                           AND v_compra.fornecedor <> ''
                      THEN ' — ' || v_compra.fornecedor
                      ELSE ''
                  END
              )
            ORDER BY created_at DESC
            LIMIT 1;

        END IF;

        IF v_movimentacao_id IS NOT NULL THEN
            DELETE FROM public.movimentacoes
            WHERE id = v_movimentacao_id
              AND empresa_id = v_compra.empresa_id;
        END IF;

    END IF;

    -- Remove somente a compra pertencente à empresa identificada.
    DELETE FROM public.compras
    WHERE id = v_compra.id
      AND empresa_id = v_compra.empresa_id;

END;

$function$;

REVOKE ALL ON FUNCTION public.excluir_compra(uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.excluir_compra(uuid)
FROM anon;

GRANT EXECUTE ON FUNCTION public.excluir_compra(uuid)
TO authenticated;

COMMIT;