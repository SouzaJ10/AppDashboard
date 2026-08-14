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

    IF v_compra.produto_id IS NULL THEN
        RAISE EXCEPTION 'A compra não possui produto vinculado.';
    END IF;

    SELECT estoque_atual
    INTO v_estoque_atual
    FROM public.produtos
    WHERE id = v_compra.produto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto da compra não encontrado.';
    END IF;

    IF COALESCE(v_estoque_atual, 0) < v_compra.quantidade THEN
        RAISE EXCEPTION
            'Não é possível excluir esta compra porque o estoque atual (%) é menor que a quantidade comprada (%).',
            COALESCE(v_estoque_atual, 0),
            v_compra.quantidade;
    END IF;

    UPDATE public.produtos
    SET estoque_atual =
        COALESCE(estoque_atual, 0) - v_compra.quantidade
    WHERE id = v_compra.produto_id;

    DELETE FROM public.movimentacoes
    WHERE tipo = 'compra'
      AND referencia_id = v_compra.id;

    IF v_compra.status_pagamento = 'pago' THEN

        IF v_compra.forma_pagamento = 'a_vista' THEN

            SELECT id
            INTO v_movimentacao_id
            FROM public.movimentacoes
            WHERE referencia_id IS NULL
              AND saida = v_compra.custo_total
              AND data = COALESCE(v_compra.data, CURRENT_DATE)
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
            WHERE referencia_id IS NULL
              AND saida = v_compra.custo_total
              AND data = COALESCE(
                  v_compra.data_pagamento,
                  CURRENT_DATE
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
            WHERE id = v_movimentacao_id;
        END IF;

    END IF;

    DELETE FROM public.compras
    WHERE id = p_compra_id;

END;

$function$;

REVOKE EXECUTE ON FUNCTION public.excluir_compra(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.excluir_compra(uuid)
TO authenticated;