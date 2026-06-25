-- ============================================
-- Migration v4 - Add new columns and tables
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Add address columns to contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS contato TEXT;

-- 2. Change valor_total from TEXT to DECIMAL if it's TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contratos' AND column_name = 'valor_total'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE contratos ALTER COLUMN valor_total TYPE DECIMAL(10,2) USING valor_total::DECIMAL(10,2);
  END IF;
END $$;

-- 3. Add role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'funcionario' CHECK (role IN ('gestor', 'funcionario', 'admin'));

-- 4. Add contrato_id to comprovantes_entrega (FK to contratos)
ALTER TABLE comprovantes_entrega ADD COLUMN IF NOT EXISTS contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL;

-- 5. Create email_logs table
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

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_ce_contrato_id ON comprovantes_entrega(contrato_id);
CREATE INDEX IF NOT EXISTS idx_el_contrato ON email_logs(contrato_id);
CREATE INDEX IF NOT EXISTS idx_el_created ON email_logs(created_at DESC);

-- 7. Enable RLS on email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for email_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'el_all' AND tablename = 'email_logs') THEN
    CREATE POLICY "el_all" ON email_logs FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'el_anon' AND tablename = 'email_logs') THEN
    CREATE POLICY "el_anon" ON email_logs FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Create devolucoes table
CREATE TABLE IF NOT EXISTS devolucoes (
  id TEXT PRIMARY KEY,
  numero TEXT,
  comprovante_id UUID REFERENCES comprovantes_entrega(id) ON DELETE SET NULL,
  contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL,
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
  itens JSONB DEFAULT '[]',
  condicoes JSONB DEFAULT '{}',
  metodo_entrega TEXT DEFAULT 'locadora_entrega',
  assinatura_imagem TEXT,
  status TEXT DEFAULT 'pendente',
  atendente TEXT,
  data TEXT,
  hora TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. RLS for devolucoes
ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dev_all' AND tablename = 'devolucoes') THEN
    CREATE POLICY "dev_all" ON devolucoes FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dev_anon' AND tablename = 'devolucoes') THEN
    CREATE POLICY "dev_anon" ON devolucoes FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Migration v4b - Add tipo_documento columns
-- ============================================

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'entrega';
ALTER TABLE comprovantes_entrega ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'entrega';
ALTER TABLE comprovantes_entrega ADD COLUMN IF NOT EXISTS condicoes_devolucao JSONB DEFAULT NULL;
