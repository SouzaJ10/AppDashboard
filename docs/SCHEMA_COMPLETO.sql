-- =====================================================================
-- Gestão de Vendas DISTRIBUIDORA — Schema completo (PostgreSQL / Supabase)
-- Executar em um projeto Supabase NOVO de sua propriedade.
-- Ordem: extensões → tipos → tabelas+GRANT+RLS+policies → funções → triggers → realtime.
-- =====================================================================

-- 1. EXTENSÕES ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS -------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABELA profiles ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. TABELA user_roles -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 5. FUNÇÃO has_role ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 6. FUNÇÃO + TRIGGER handle_new_user ---------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'user'::public.app_role END);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. TABELA produtos ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INT UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  estoque_atual NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 3,
  -- Campos do módulo completo de gestão de produtos
  nome          TEXT,
  categoria     TEXT,
  marca         TEXT,
  unidade       TEXT    NOT NULL DEFAULT 'UN',
  custo_compra  NUMERIC NOT NULL DEFAULT 0,
  preco_venda   NUMERIC NOT NULL DEFAULT 0,
  fornecedor    TEXT,
  observacoes   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX IF NOT EXISTS produtos_nome_idx      ON public.produtos (lower(nome));
CREATE INDEX IF NOT EXISTS produtos_categoria_idx ON public.produtos (categoria);
CREATE INDEX IF NOT EXISTS produtos_ativo_idx     ON public.produtos (ativo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos read auth" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "produtos write admin" ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. TABELA compras ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  codigo INT,
  descricao TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  data DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compras_produto ON public.compras(produto_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON public.compras(data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras TO authenticated;
GRANT ALL ON public.compras TO service_role;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compras read auth" ON public.compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "compras write admin" ON public.compras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. TABELA vendas -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  codigo INT,
  descricao TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  preco_venda NUMERIC NOT NULL DEFAULT 0,
  despesas NUMERIC NOT NULL DEFAULT 0,
  custo NUMERIC NOT NULL DEFAULT 0,
  lucro NUMERIC NOT NULL DEFAULT 0,
  margem NUMERIC NOT NULL DEFAULT 0,
  data DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendas_produto ON public.vendas(produto_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas read auth" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendas write admin" ON public.vendas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. TABELA movimentacoes --------------------------------------------
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  entrada NUMERIC NOT NULL DEFAULT 0,
  saida NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_data ON public.movimentacoes(data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov read auth" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov write admin" ON public.movimentacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. EXECUTE perms para funções SECURITY DEFINER ---------------------
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 11b. FUNÇÃO + TRIGGER set_updated_at (mantém produtos.updated_at) ---
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS produtos_set_updated_at ON public.produtos;
CREATE TRIGGER produtos_set_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12. REALTIME --------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;

ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.compras REPLICA IDENTITY FULL;
ALTER TABLE public.movimentacoes REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;

-- 13. MÓDULO DE DESPESAS / FLUXO DE CAIXA -----------------------------
-- 13a. categorias_despesa
CREATE TABLE IF NOT EXISTS public.categorias_despesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor  TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_despesa TO authenticated;
GRANT ALL ON public.categorias_despesa TO service_role;
ALTER TABLE public.categorias_despesa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_desp read auth"  ON public.categorias_despesa FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_desp write admin" ON public.categorias_despesa FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.categorias_despesa (nome, padrao) VALUES
  ('Aluguel', true), ('Energia', true), ('Água', true), ('Internet', true),
  ('Combustível', true), ('Impostos', true), ('Folha de pagamento', true),
  ('Marketing', true), ('Fornecedores', true), ('Frete', true),
  ('Taxas bancárias', true), ('Outros', true)
ON CONFLICT (nome) DO NOTHING;

-- 13b. despesas
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  centro_custo TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS despesas_data_idx       ON public.despesas (data);
CREATE INDEX IF NOT EXISTS despesas_categoria_idx  ON public.despesas (categoria);
CREATE INDEX IF NOT EXISTS despesas_status_idx     ON public.despesas (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT ALL ON public.despesas TO service_role;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "despesas read auth"   ON public.despesas FOR SELECT TO authenticated USING (true);
CREATE POLICY "despesas write admin" ON public.despesas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS despesas_set_updated_at ON public.despesas;
CREATE TRIGGER despesas_set_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.despesas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categorias_despesa;
ALTER TABLE public.despesas           REPLICA IDENTITY FULL;
ALTER TABLE public.categorias_despesa REPLICA IDENTITY FULL;

-- =====================================================================
-- FIM. Não há views nem outros triggers. Auth é configurada no painel.
-- =====================================================================
