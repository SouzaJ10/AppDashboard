-- ============================================================
-- FASE 4C.1 — ADICIONA EMPRESA AOS DADOS EXISTENTES
--
-- Estratégia expand:
--   1. adiciona empresa_id ainda nullable
--   2. associa todo o histórico à empresa inicial
--   3. cria FKs e índices
--
-- Nesta etapa NÃO:
--   - altera as RLS existentes
--   - altera as RPCs
--   - torna empresa_id NOT NULL
--   - remove unicidades globais
-- ============================================================

BEGIN;


-- ------------------------------------------------------------
-- 1. Adiciona empresa_id às tabelas de negócio
-- ------------------------------------------------------------

ALTER TABLE public.produtos
    ADD COLUMN empresa_id uuid;

ALTER TABLE public.vendas
    ADD COLUMN empresa_id uuid;

ALTER TABLE public.compras
    ADD COLUMN empresa_id uuid;

ALTER TABLE public.despesas
    ADD COLUMN empresa_id uuid;

ALTER TABLE public.movimentacoes
    ADD COLUMN empresa_id uuid;

ALTER TABLE public.categorias_despesa
    ADD COLUMN empresa_id uuid;


-- ------------------------------------------------------------
-- 2. Migra os dados históricos para a empresa inicial
-- ------------------------------------------------------------

DO $$
DECLARE
    v_empresa_id uuid;
    v_empresa_count integer;
BEGIN

    SELECT count(*)
    INTO v_empresa_count
    FROM public.empresas
    WHERE nome = 'Souza Prado Distribuidora';

    IF v_empresa_count <> 1 THEN
        RAISE EXCEPTION
            'Esperado exatamente 1 registro para Souza Prado Distribuidora, encontrados: %.',
            v_empresa_count;
    END IF;

    SELECT id
    INTO v_empresa_id
    FROM public.empresas
    WHERE nome = 'Souza Prado Distribuidora'
    LIMIT 1;


    UPDATE public.produtos
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    UPDATE public.vendas
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    UPDATE public.compras
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    UPDATE public.despesas
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    UPDATE public.movimentacoes
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    UPDATE public.categorias_despesa
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;


    -- Nenhum registro histórico pode permanecer sem empresa.

    IF EXISTS (
        SELECT 1 FROM public.produtos WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem produtos sem empresa.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.vendas WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem vendas sem empresa.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.compras WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem compras sem empresa.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.despesas WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem despesas sem empresa.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.movimentacoes WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem movimentações sem empresa.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.categorias_despesa
        WHERE empresa_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem categorias de despesa sem empresa.';
    END IF;

END;
$$;


-- ------------------------------------------------------------
-- 3. FKs para empresas
--
-- RESTRICT é intencional: excluir uma empresa não deve apagar
-- silenciosamente seus dados financeiros/operacionais.
-- ------------------------------------------------------------

ALTER TABLE public.produtos
    ADD CONSTRAINT produtos_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE RESTRICT;

ALTER TABLE public.vendas
    ADD CONSTRAINT vendas_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE RESTRICT;

ALTER TABLE public.compras
    ADD CONSTRAINT compras_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE RESTRICT;

ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE RESTRICT;

ALTER TABLE public.movimentacoes
    ADD CONSTRAINT movimentacoes_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE RESTRICT;

ALTER TABLE public.categorias_despesa
    ADD CONSTRAINT categorias_despesa_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE RESTRICT;


-- ------------------------------------------------------------
-- 4. Índices para o futuro filtro obrigatório por empresa
-- ------------------------------------------------------------

CREATE INDEX idx_produtos_empresa
    ON public.produtos(empresa_id);

CREATE INDEX idx_vendas_empresa
    ON public.vendas(empresa_id);

CREATE INDEX idx_compras_empresa
    ON public.compras(empresa_id);

CREATE INDEX idx_despesas_empresa
    ON public.despesas(empresa_id);

CREATE INDEX idx_movimentacoes_empresa
    ON public.movimentacoes(empresa_id);

CREATE INDEX idx_categorias_despesa_empresa
    ON public.categorias_despesa(empresa_id);


COMMIT;