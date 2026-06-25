-- ============================================
-- TransObra CRM - Full Schema (v4)
-- Run this ENTIRE file in Supabase Dashboard > SQL Editor
-- Uses IF NOT EXISTS so it's safe to run multiple times
-- ============================================

-- Sequences
CREATE SEQUENCE IF NOT EXISTS os_seq START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS eq_seq START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS ct_seq START 1 INCREMENT 1;

-- ============================================
-- TABELA: Ordens de Servico
-- ============================================
CREATE TABLE IF NOT EXISTS ordens_servico (
  id TEXT PRIMARY KEY DEFAULT 'OS-' || LPAD(nextval('os_seq')::TEXT, 3, '0'),
  cliente TEXT NOT NULL,
  equipamento TEXT NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('normal', 'alta', 'urgente')),
  tecnico TEXT,
  abertura DATE DEFAULT CURRENT_DATE,
  previsao DATE,
  valor DECIMAL(10,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: Equipamentos
-- ============================================
CREATE TABLE IF NOT EXISTS equipamentos (
  id TEXT PRIMARY KEY DEFAULT 'EQ-' || LPAD(nextval('eq_seq')::TEXT, 3, '0'),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'locado', 'manutencao')),
  cliente TEXT DEFAULT '-',
  contrato TEXT DEFAULT '-',
  locacao_inicio DATE,
  locacao_fim DATE,
  valor_mensal DECIMAL(10,2) DEFAULT 0,
  horas_uso INTEGER DEFAULT 0,
  ultima_revisao DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: Contratos
-- ============================================
CREATE TABLE IF NOT EXISTS contratos (
  id TEXT PRIMARY KEY DEFAULT 'CT-' || LPAD(nextval('ct_seq')::TEXT, 3, '0'),
  cliente TEXT NOT NULL,
  cnpj TEXT,
  equipamentos JSONB DEFAULT '[]',
  inicio DATE NOT NULL,
  fim DATE NOT NULL,
  valor_total DECIMAL(10,2) DEFAULT 0,
  valor_mensal DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencendo', 'vencido', 'cancelado', 'entregue', 'assinado', 'devolvido')),
  assinado BOOLEAN DEFAULT FALSE,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  numero_endereco TEXT,
  data_contrato TEXT,
  hora_contrato TEXT,
  atendente TEXT,
  rg TEXT,
  numero TEXT,
  local_entrega TEXT,
  telefone_entrega TEXT,
  itens JSONB DEFAULT '[]',
  observacao TEXT,
  tipo_documento TEXT DEFAULT 'entrega',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: Comprovantes de Entrega
-- ============================================
CREATE TABLE IF NOT EXISTS comprovantes_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id),
  contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL,
  contrato TEXT NOT NULL,
  atendente TEXT,
  data TEXT,
  hora TEXT,
  locatario TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  fone TEXT,
  contato TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  local_entrega TEXT,
  telefone_entrega TEXT,
  itens JSONB DEFAULT '[]',
  total DECIMAL(10,2) DEFAULT 0,
  observacao TEXT,
  status TEXT DEFAULT 'entregue' CHECK (status IN ('entregue', 'pendente', 'cancelado', 'assinado')),
  assinado BOOLEAN DEFAULT FALSE,
  data_assinatura TEXT,
  nome_signatario TEXT,
  tipo_documento TEXT DEFAULT 'entrega',
  condicoes_devolucao JSONB DEFAULT NULL
);

-- ============================================
-- TABELA: Assinaturas
-- ============================================
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprovante_id UUID REFERENCES comprovantes_entrega(id) ON DELETE CASCADE,
  nome_signatario TEXT NOT NULL,
  cpf_signatario TEXT,
  assinatura_imagem TEXT,
  data_assinatura TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

-- ============================================
-- TABELA: Notas
-- ============================================
CREATE TABLE IF NOT EXISTS notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT DEFAULT 'Sem titulo',
  conteudo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: Usuarios (perfis)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'funcionario' CHECK (role IN ('gestor', 'funcionario', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: Logs de Email
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL,
  comprovante_id UUID REFERENCES comprovantes_entrega(id) ON DELETE SET NULL,
  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  corpo TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro', 'skipped')),
  erro_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- DEVOLUCOES
-- ============================================
CREATE TABLE IF NOT EXISTS devolucoes (
  id TEXT PRIMARY KEY,
  numero TEXT,
  comprovante_id TEXT,
  contrato_id TEXT,
  locatario TEXT,
  cnpj_locatario TEXT,
  cpf_signatario TEXT,
  rg_signatario TEXT,
  signatario_nome TEXT,
  local_obra TEXT,
  referencia TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  endereco TEXT,
  bairro TEXT,
  itens JSONB DEFAULT '[]'::jsonb,
  condicoes JSONB DEFAULT '{}'::jsonb,
  metodo_entrega TEXT DEFAULT 'locadora_entrega',
  assinatura_imagem TEXT,
  status TEXT DEFAULT 'pendente',
  atendente TEXT,
  data TEXT,
  hora TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_anon_select" ON devolucoes FOR SELECT USING (true);
CREATE POLICY "dev_anon_insert" ON devolucoes FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_anon_update" ON devolucoes FOR UPDATE USING (true);
CREATE POLICY "dev_anon_delete" ON devolucoes FOR DELETE USING (true);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente);
CREATE INDEX IF NOT EXISTS idx_os_created ON ordens_servico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eq_status ON equipamentos(status);
CREATE INDEX IF NOT EXISTS idx_eq_categoria ON equipamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_eq_created ON equipamentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_ct_cliente ON contratos(cliente);
CREATE INDEX IF NOT EXISTS idx_ct_fim ON contratos(fim);
CREATE INDEX IF NOT EXISTS idx_ce_created ON comprovantes_entrega(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_contrato ON comprovantes_entrega(contrato);
CREATE INDEX IF NOT EXISTS idx_ce_contrato_id ON comprovantes_entrega(contrato_id);
CREATE INDEX IF NOT EXISTS idx_as_comprovante ON assinaturas(comprovante_id);
CREATE INDEX IF NOT EXISTS idx_no_updated ON notas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_el_contrato ON email_logs(contrato_id);
CREATE INDEX IF NOT EXISTS idx_el_created ON email_logs(created_at DESC);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprovantes_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'os_all' AND tablename = 'ordens_servico') THEN
    CREATE POLICY "os_all" ON ordens_servico FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'eq_all' AND tablename = 'equipamentos') THEN
    CREATE POLICY "eq_all" ON equipamentos FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ct_all' AND tablename = 'contratos') THEN
    CREATE POLICY "ct_all" ON contratos FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ce_all' AND tablename = 'comprovantes_entrega') THEN
    CREATE POLICY "ce_all" ON comprovantes_entrega FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'as_all' AND tablename = 'assinaturas') THEN
    CREATE POLICY "as_all" ON assinaturas FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'no_all' AND tablename = 'notas') THEN
    CREATE POLICY "no_all" ON notas FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pr_select' AND tablename = 'profiles') THEN
    CREATE POLICY "pr_select" ON profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pr_update' AND tablename = 'profiles') THEN
    CREATE POLICY "pr_update" ON profiles FOR UPDATE TO authenticated USING (id = (select auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'el_all' AND tablename = 'email_logs') THEN
    CREATE POLICY "el_all" ON email_logs FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- Policies (anon - full access for demo/offline mode)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'os_anon' AND tablename = 'ordens_servico') THEN
    CREATE POLICY "os_anon" ON ordens_servico FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'eq_anon' AND tablename = 'equipamentos') THEN
    CREATE POLICY "eq_anon" ON equipamentos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ct_anon' AND tablename = 'contratos') THEN
    CREATE POLICY "ct_anon" ON contratos FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ce_anon' AND tablename = 'comprovantes_entrega') THEN
    CREATE POLICY "ce_anon" ON comprovantes_entrega FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'as_anon' AND tablename = 'assinaturas') THEN
    CREATE POLICY "as_anon" ON assinaturas FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'no_anon' AND tablename = 'notas') THEN
    CREATE POLICY "no_anon" ON notas FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'el_anon' AND tablename = 'email_logs') THEN
    CREATE POLICY "el_anon" ON email_logs FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON ordens_servico;
CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_notas_updated_at ON notas;
CREATE TRIGGER update_notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_comprovantes_updated_at ON comprovantes_entrega;
CREATE TRIGGER update_comprovantes_updated_at
  BEFORE UPDATE ON comprovantes_entrega
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTH TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assinaturas_public_read') THEN
    CREATE POLICY "assinaturas_public_read" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'assinaturas');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assinaturas_insert') THEN
    CREATE POLICY "assinaturas_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assinaturas');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_public_read') THEN
    CREATE POLICY "avatars_public_read" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_insert') THEN
    CREATE POLICY "avatars_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comprovantes_auth_read') THEN
    CREATE POLICY "comprovantes_auth_read" ON storage.objects
      FOR SELECT TO authenticated USING (bucket_id = 'comprovantes');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comprovantes_insert') THEN
    CREATE POLICY "comprovantes_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comprovantes');
  END IF;
END $$;

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO ordens_servico (id, cliente, equipamento, tipo, status, prioridade, tecnico, abertura, previsao, valor) VALUES
  ('OS-001', 'Construtora Alpha Ltda', 'Retroescavadeira CAT 416', 'Manutencao Preventiva', 'em_andamento', 'alta', 'Carlos Silva', '2026-04-20', '2026-04-25', 3200),
  ('OS-002', 'Mineracao Beta S/A', 'Escavadeira Komatsu PC200', 'Reparo Emergencial', 'pendente', 'urgente', 'Joao Mendes', '2026-04-22', '2026-04-24', 8500),
  ('OS-003', 'Agro Gamma Fazendas', 'Trator New Holland TL5.90', 'Revisao Geral', 'concluido', 'normal', 'Paulo Costa', '2026-04-15', '2026-04-18', 1800),
  ('OS-004', 'Prefeitura de Campinas', 'Compactador Dynapac CA250', 'Inspecao Tecnica', 'pendente', 'normal', 'Ricardo Lima', '2026-04-23', '2026-04-28', 650),
  ('OS-005', 'Construtora Delta', 'Grua Liebherr 130 EC-B', 'Manutencao Corretiva', 'em_andamento', 'alta', 'Carlos Silva', '2026-04-21', '2026-04-26', 12000),
  ('OS-006', 'Logistica Epsilon', 'Empilhadeira Toyota 7FBH', 'Manutencao Preventiva', 'concluido', 'normal', 'Joao Mendes', '2026-04-10', '2026-04-12', 980),
  ('OS-007', 'Siderurgica Zeta', 'Pa Carregadeira Volvo L90H', 'Reparo de Hidraulica', 'cancelado', 'alta', 'Paulo Costa', '2026-04-08', '2026-04-10', 4200),
  ('OS-008', 'Petro Eta Servicos', 'Perfuratriz Sandvik', 'Substituicao de Pecas', 'em_andamento', 'urgente', 'Ricardo Lima', '2026-04-22', '2026-04-27', 22000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipamentos (id, nome, categoria, status, cliente, contrato, locacao_inicio, locacao_fim, valor_mensal, horas_uso, ultima_revisao) VALUES
  ('EQ-001', 'Retroescavadeira CAT 416', 'Terraplanagem', 'locado', 'Construtora Alpha Ltda', 'CT-001', '2026-03-01', '2026-06-30', 8500, 342, '2026-03-15'),
  ('EQ-002', 'Escavadeira Komatsu PC200', 'Escavacao', 'manutencao', '-', '-', NULL, NULL, 0, 1205, '2026-02-20'),
  ('EQ-003', 'Trator New Holland TL5.90', 'Agricola', 'disponivel', '-', '-', NULL, NULL, 0, 876, '2026-04-18'),
  ('EQ-004', 'Compactador Dynapac CA250', 'Compactacao', 'locado', 'Prefeitura de Campinas', 'CT-003', '2026-04-01', '2026-04-30', 3200, 128, '2026-04-01'),
  ('EQ-005', 'Grua Liebherr 130 EC-B', 'Icamento', 'locado', 'Construtora Delta', 'CT-004', '2026-02-15', '2026-08-15', 18000, 560, '2026-03-01'),
  ('EQ-006', 'Empilhadeira Toyota 7FBH', 'Movimentacao', 'disponivel', '-', '-', NULL, NULL, 0, 2100, '2026-04-12'),
  ('EQ-007', 'Pa Carregadeira Volvo L90H', 'Terraplanagem', 'locado', 'Mineracao Beta S/A', 'CT-002', '2026-01-10', '2026-07-10', 12000, 980, '2026-03-20'),
  ('EQ-008', 'Perfuratriz Sandvik', 'Mineracao', 'manutencao', '-', '-', NULL, NULL, 0, 430, '2026-04-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contratos (id, cliente, cnpj, equipamentos, inicio, fim, valor_total, valor_mensal, status, assinado) VALUES
  ('CT-001', 'Construtora Alpha Ltda', '12.345.678/0001-90', '["Retroescavadeira CAT 416"]', '2026-03-01', '2026-06-30', 34000, 8500, 'ativo', true),
  ('CT-002', 'Mineracao Beta S/A', '98.765.432/0001-10', '["Pa Carregadeira Volvo L90H"]', '2026-01-10', '2026-07-10', 72000, 12000, 'ativo', true),
  ('CT-003', 'Prefeitura de Campinas', '45.678.901/0001-23', '["Compactador Dynapac CA250"]', '2026-04-01', '2026-04-30', 3200, 3200, 'vencendo', true),
  ('CT-004', 'Construtora Delta', '23.456.789/0001-45', '["Grua Liebherr 130 EC-B"]', '2026-02-15', '2026-08-15', 108000, 18000, 'ativo', false),
  ('CT-005', 'Agro Gamma Fazendas', '67.890.123/0001-67', '["Trator New Holland TL5.90"]', '2025-10-01', '2026-03-31', 28800, 4800, 'vencido', true),
  ('CT-006', 'Logistica Epsilon', '34.567.890/0001-89', '["Empilhadeira Toyota 7FBH"]', '2026-04-15', '2026-10-15', 14400, 2400, 'ativo', false)
ON CONFLICT (id) DO NOTHING;
