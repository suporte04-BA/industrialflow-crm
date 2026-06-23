-- ============================================
-- Migration v5 - Novas colunas para contratos
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Novas colunas na tabela contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS data_contrato TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS hora_contrato TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS atendente TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS local_entrega TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS telefone_entrega TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]';
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS observacao TEXT;

-- 2. Coluna numero_endereco (separate from id)
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS numero_endereco TEXT;

-- 3. Atualizar status CHECK para incluir 'entregue'
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_status_check;
ALTER TABLE contratos ADD CONSTRAINT contratos_status_check CHECK (status IN ('ativo', 'vencendo', 'vencido', 'cancelado', 'entregue'));
