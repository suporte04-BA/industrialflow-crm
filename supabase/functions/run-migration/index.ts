// Temporary Edge Function to run SQL migration
// Deploy, call once, then delete

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const migrations = [
    // 1. Add address columns to contratos
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS endereco TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS bairro TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cidade TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS estado TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cep TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS telefone TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS email TEXT`,
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS contato TEXT`,

    // 2. Add contrato_id to comprovantes_entrega
    `ALTER TABLE comprovantes_entrega ADD COLUMN IF NOT EXISTS contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL`,

    // 3. Create email_logs table
    `CREATE TABLE IF NOT EXISTS email_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contrato_id TEXT REFERENCES contratos(id) ON DELETE SET NULL,
      comprovante_id UUID REFERENCES comprovantes_entrega(id) ON DELETE SET NULL,
      destinatario TEXT NOT NULL,
      assunto TEXT NOT NULL,
      corpo TEXT NOT NULL,
      status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
      erro_msg TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // 4. Enable RLS on email_logs
    `ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY`,

    // 5. Add indexes
    `CREATE INDEX IF NOT EXISTS idx_ce_contrato_id ON comprovantes_entrega(contrato_id)`,
    `CREATE INDEX IF NOT EXISTS idx_el_contrato ON email_logs(contrato_id)`,
    `CREATE INDEX IF NOT EXISTS idx_el_created ON email_logs(created_at DESC)`,

    // 6. RLS policies for email_logs (with existence check)
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'el_all' AND tablename = 'email_logs') THEN
        CREATE POLICY "el_all" ON email_logs FOR ALL TO authenticated USING ((select auth.uid()) IS NOT NULL);
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'el_anon' AND tablename = 'email_logs') THEN
        CREATE POLICY "el_anon" ON email_logs FOR ALL TO anon USING (true) WITH CHECK (true);
      END IF;
    END $$`,
  ];

  const results = [];
  for (const sql of migrations) {
    try {
      const { error } = await supabase.rpc("exec_sql", { query: sql }).single();
      if (error) {
        // Try direct query approach
        const { error: err2 } = await supabase.from("_migrations").select().limit(1);
        results.push({ sql: sql.substring(0, 50), status: "attempted", error: error.message });
      } else {
        results.push({ sql: sql.substring(0, 50), status: "ok" });
      }
    } catch (e) {
      results.push({ sql: sql.substring(0, 50), status: "error", error: e.message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
