-- Migration: Add photos columns to assinaturas table
-- Run this in Supabase SQL Editor

-- Add photos columns for delivery and pickup documentation
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS fotos_entrega JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fotos_retirada JSONB DEFAULT '[]';

-- Add funcionario_id column if not exists
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS funcionario_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_as_fotos ON assinaturas USING GIN (fotos_entrega);
