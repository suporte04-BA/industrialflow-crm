-- Migration: Ensure assinaturas table exists with all required columns
-- Run this in Supabase SQL Editor if signatures are not being saved

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprovante_id UUID REFERENCES comprovantes_entrega(id) ON DELETE CASCADE,
  nome_signatario TEXT NOT NULL,
  cpf_signatario TEXT,
  assinatura_imagem TEXT,
  data_assinatura TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  funcionario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fotos_entrega JSONB DEFAULT '[]',
  fotos_retirada JSONB DEFAULT '[]'
);

-- Add columns if table exists but missing columns (safe for existing tables)
DO $$ BEGIN
  ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS fotos_entrega JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS fotos_retirada JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS funcionario_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_as_comprovante ON assinaturas(comprovante_id);
CREATE INDEX IF NOT EXISTS idx_as_fotos_entrega ON assinaturas USING GIN (fotos_entrega);
CREATE INDEX IF NOT EXISTS idx_as_fotos_retirada ON assinaturas USING GIN (fotos_retirada);

-- RLS
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "as_all" ON assinaturas;
DROP POLICY IF EXISTS "as_anon" ON assinaturas;

CREATE POLICY "as_all" ON assinaturas FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "as_anon" ON assinaturas FOR ALL TO anon USING (true) WITH CHECK (true);
