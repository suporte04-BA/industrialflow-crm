-- ============================================
-- Migration: Add patrimonio to equipamentos table
-- Allows auto-fill of patrimônio numbers when creating contracts
-- ============================================

ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS patrimonio TEXT;

CREATE INDEX IF NOT EXISTS idx_eq_patrimonio ON equipamentos(patrimonio);
CREATE INDEX IF NOT EXISTS idx_eq_nome_lower ON equipamentos(LOWER(nome));
