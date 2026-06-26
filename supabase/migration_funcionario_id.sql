-- Migration: Add funcionario_id to comprovantes_entrega
-- Run this via the run-sql edge function or Supabase SQL editor

-- Add funcionario_id column (UUID, references auth.users)
ALTER TABLE comprovantes_entrega 
ADD COLUMN IF NOT EXISTS funcionario_id UUID REFERENCES auth.users(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_comprovantes_entrega_funcionario_id 
ON comprovantes_entrega(funcionario_id);

-- Add constraint to contratos if needed
ALTER TABLE contratos 
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES auth.users(id);
