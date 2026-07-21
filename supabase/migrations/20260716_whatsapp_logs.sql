-- Migration: Create whatsapp_logs table for Evolution API integration
-- Date: 2026-07-16
-- Description: Stores WhatsApp message logs for audit and retry

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL,
  comprovante_id UUID REFERENCES comprovantes_entrega(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  evolution_msg_id TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'entregue', 'lido', 'erro')),
  erro_msg TEXT,
  provider TEXT DEFAULT 'evolution',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wl_contrato ON whatsapp_logs(contrato_id);
CREATE INDEX IF NOT EXISTS idx_wl_comprovante ON whatsapp_logs(comprovante_id);
CREATE INDEX IF NOT EXISTS idx_wl_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_wl_created ON whatsapp_logs(created_at DESC);

-- RLS policies (mirror email_logs pattern)
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write
CREATE POLICY "wl_authenticated_all" ON whatsapp_logs 
  FOR ALL TO authenticated 
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Anon users can read/write (for demo/offline mode)
CREATE POLICY "wl_anon_all" ON whatsapp_logs 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);
