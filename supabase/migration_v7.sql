-- ============================================
-- Migration v7 - Colunas faltantes para devolucao
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Adicionar referencia na tabela contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS referencia TEXT DEFAULT NULL;

-- 2. Adicionar condicoes_devolucao na tabela contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS condicoes_devolucao JSONB DEFAULT NULL;
