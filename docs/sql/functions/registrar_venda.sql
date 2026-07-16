CREATE OR REPLACE FUNCTION public.registrar_venda(
    p_produto_id UUID,
    p_quantidade NUMERIC,
    p_valor_unitario NUMERIC,
    p_desconto NUMERIC DEFAULT 0,
    p_frete NUMERIC DEFAULT 0,
    p_cliente TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_venda_id UUID;
    v_produto public.produtos%ROWTYPE;

    v_preco_total NUMERIC;
    v_custo NUMERIC;
    v_despesas NUMERIC;
    v_lucro NUMERIC;
    v_margem NUMERIC;
    v_descricao TEXT;
    v_novo_estoque NUMERIC;
BEGIN
    SELECT *
    INTO v_produto
    FROM public.produtos
    WHERE id = p_produto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado.';
    END IF;

    -- Produto inativo
IF v_produto.ativo = FALSE THEN
    RAISE EXCEPTION 'O produto está inativo e não pode ser vendido.';
END IF;

-- Quantidade inválida
IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
END IF;

-- Valor unitário inválido
IF p_valor_unitario <= 0 THEN
    RAISE EXCEPTION 'O valor unitário deve ser maior que zero.';
END IF;

-- Estoque insuficiente
IF v_produto.estoque_atual < p_quantidade THEN
    RAISE EXCEPTION
        'Estoque insuficiente. Disponível: %, solicitado: %.',
        v_produto.estoque_atual,
        p_quantidade;
END IF;

-- Calcula valores da venda
v_preco_total := (p_valor_unitario * p_quantidade) - COALESCE(p_desconto, 0);

v_despesas := COALESCE(p_frete, 0);

v_custo := v_produto.custo_compra * p_quantidade;

v_lucro := v_preco_total - v_custo - v_despesas;

IF v_preco_total > 0 THEN
    v_margem := v_lucro / v_preco_total;
ELSE
    v_margem := 0;
END IF;

v_novo_estoque := v_produto.estoque_atual - p_quantidade;

v_descricao := v_produto.descricao;

INSERT INTO public.vendas (
    produto_id,
    codigo,
    descricao,
    quantidade,
    preco_venda,
    despesas,
    custo,
    lucro,
    margem,
    data
)
VALUES (
    v_produto.id,
    v_produto.codigo,
    v_descricao,
    p_cliente,
    p_observacoes,
    p_quantidade,
    p_valor_unitario,
    v_preco_total,
    v_despesas,
    v_custo,
    v_lucro,
    v_margem,
    CURRENT_DATE
)
RETURNING id
INTO v_venda_id;

UPDATE public.produtos
SET estoque_atual = v_novo_estoque
WHERE id = v_produto.id;

INSERT INTO public.movimentacoes (
    data,
    entrada,
    saida,
    descricao
)
VALUES (
    CURRENT_DATE,
    v_preco_total,
    0,
    CONCAT(
        'Venda: ',
        v_produto.descricao,
        CASE
            WHEN p_cliente IS NOT NULL AND p_cliente <> ''
            THEN ' — ' || p_cliente
            ELSE ''
        END
    )
);

    RETURN v_venda_id;
END;
$$;