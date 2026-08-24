BEGIN;

-- A assinatura está mudando para incluir p_empresa_id.
-- Removemos explicitamente a RPC antiga para não deixar
-- uma versão global ainda acessível.
DROP FUNCTION IF EXISTS public.registrar_venda(
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text
);

CREATE FUNCTION public.registrar_venda(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_quantidade numeric,
  p_valor_unitario numeric,
  p_desconto numeric DEFAULT 0,
  p_frete numeric DEFAULT 0,
  p_cliente text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$

DECLARE
    v_venda_id uuid;
    v_produto public.produtos%ROWTYPE;

    v_preco_total numeric;
    v_custo numeric;
    v_despesas numeric;
    v_lucro numeric;
    v_margem numeric;
    v_descricao text;
    v_novo_estoque numeric;
    v_data date;

BEGIN
    v_data := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

    IF p_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Empresa não informada.';
    END IF;

    -- Segurança multiempresa:
    -- preserva a regra atual de que somente administradores
    -- podem registrar vendas, agora no escopo da empresa.
    IF NOT public.has_empresa_role(p_empresa_id, 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- O produto precisa obrigatoriamente pertencer
    -- à empresa informada.
    SELECT *
    INTO v_produto
    FROM public.produtos
    WHERE id = p_produto_id
      AND empresa_id = p_empresa_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado nesta empresa.';
    END IF;

    IF v_produto.ativo = FALSE THEN
        RAISE EXCEPTION 'O produto está inativo e não pode ser vendido.';
    END IF;

    IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
    END IF;

    IF p_valor_unitario IS NULL OR p_valor_unitario <= 0 THEN
        RAISE EXCEPTION 'O valor unitário deve ser maior que zero.';
    END IF;

    IF COALESCE(p_desconto, 0) < 0 THEN
        RAISE EXCEPTION 'O desconto não pode ser negativo.';
    END IF;

    IF COALESCE(p_frete, 0) < 0 THEN
        RAISE EXCEPTION 'O frete não pode ser negativo.';
    END IF;

    IF v_produto.estoque_atual < p_quantidade THEN
        RAISE EXCEPTION
            'Estoque insuficiente. Disponível: %, solicitado: %.',
            v_produto.estoque_atual,
            p_quantidade;
    END IF;

    v_preco_total :=
        (p_valor_unitario * p_quantidade)
        - COALESCE(p_desconto, 0);

    IF v_preco_total <= 0 THEN
        RAISE EXCEPTION
            'O desconto deve ser menor que o valor total da venda.';
    END IF;

    v_despesas := COALESCE(p_frete, 0);

    v_custo :=
        v_produto.custo_compra
        * p_quantidade;

    v_lucro :=
        v_preco_total
        - v_custo
        - v_despesas;

    IF v_preco_total > 0 THEN
        v_margem :=
            v_lucro / v_preco_total;
    ELSE
        v_margem := 0;
    END IF;

    v_novo_estoque :=
        v_produto.estoque_atual
        - p_quantidade;

    v_descricao := v_produto.descricao;

    INSERT INTO public.vendas (
        empresa_id,
        produto_id,
        codigo,
        descricao,
        quantidade,
        valor_unitario,
        preco_venda,
        despesas,
        custo,
        lucro,
        margem,
        data,
        cliente,
        observacoes
    )
    VALUES (
        p_empresa_id,
        v_produto.id,
        v_produto.codigo,
        v_descricao,
        p_quantidade,
        p_valor_unitario,
        v_preco_total,
        v_despesas,
        v_custo,
        v_lucro,
        v_margem,
        v_data,
        p_cliente,
        p_observacoes
    )
    RETURNING id
    INTO v_venda_id;

    UPDATE public.produtos
    SET estoque_atual = v_novo_estoque
    WHERE id = v_produto.id
      AND empresa_id = p_empresa_id;

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
        v_data,
        v_preco_total,
        0,
        CONCAT(
            'Venda: ',
            v_produto.descricao,
            CASE
                WHEN p_cliente IS NOT NULL
                     AND p_cliente <> ''
                THEN ' — ' || p_cliente
                ELSE ''
            END
        ),
        'venda',
        'Vendas',
        v_venda_id
    );

    RETURN v_venda_id;

END;

$function$;

-- Funções recebem EXECUTE de PUBLIC por padrão.
-- Removemos isso explicitamente e permitimos somente
-- usuários autenticados chamarem a RPC.
REVOKE ALL ON FUNCTION public.registrar_venda(
  uuid,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.registrar_venda(
  uuid,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text
) FROM anon;

GRANT EXECUTE ON FUNCTION public.registrar_venda(
  uuid,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text
) TO authenticated;

COMMIT;