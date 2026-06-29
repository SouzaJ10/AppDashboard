-- ============================================================================
-- Migration manual: expandir a tabela `produtos` para o módulo completo
-- de gestão de produtos (Cadastro de Produtos / Estoque).
--
-- Como aplicar:
--   psql "$DATABASE_URL" -f docs/sql/2026-06-27_produtos_full_fields.sql
-- ou colar o conteúdo no SQL Editor do Supabase.
--
-- É idempotente: pode ser executada mais de uma vez sem efeitos colaterais.
-- ============================================================================

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS nome          text,
  ADD COLUMN IF NOT EXISTS categoria     text,
  ADD COLUMN IF NOT EXISTS marca         text,
  ADD COLUMN IF NOT EXISTS unidade       text    NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS custo_compra  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_venda   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fornecedor    text,
  ADD COLUMN IF NOT EXISTS observacoes   text,
  ADD COLUMN IF NOT EXISTS ativo         boolean NOT NULL DEFAULT true;

-- Inicializa `nome` a partir de `descricao` para registros existentes.
UPDATE public.produtos
   SET nome = descricao
 WHERE nome IS NULL;

-- Índices úteis para listagem e busca.
CREATE INDEX IF NOT EXISTS produtos_nome_idx       ON public.produtos (lower(nome));
CREATE INDEX IF NOT EXISTS produtos_categoria_idx  ON public.produtos (categoria);
CREATE INDEX IF NOT EXISTS produtos_ativo_idx      ON public.produtos (ativo);

-- Trigger genérica de updated_at (idempotente).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS produtos_set_updated_at ON public.produtos;
CREATE TRIGGER produtos_set_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS: as policies existentes em `produtos` continuam valendo. Esta migration
-- apenas adiciona colunas — não altera nem afrouxa policies já definidas.
-- ============================================================================