-- ============================================
-- WhatsApp Queue - Mensagens pendentes quando WhatsApp desconectado
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id TEXT,
  comprovante_id UUID,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  contrato_data JSONB DEFAULT '{}',
  comprovante_data JSONB DEFAULT '{}',
  signatario_data JSONB DEFAULT '{}',
  pdf_base64 TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  erro_msg TEXT,
  tentativas INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_wq_status ON whatsapp_queue(status);
CREATE INDEX IF NOT EXISTS idx_wq_created ON whatsapp_queue(created_at DESC);

-- RLS
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Policies (anon - Worker access)
CREATE POLICY "wq_anon_all" ON whatsapp_queue FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "wq_auth_all" ON whatsapp_queue FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- Trigger
CREATE TRIGGER update_whatsapp_queue_updated_at
  BEFORE UPDATE ON whatsapp_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
