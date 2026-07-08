import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, role } = await req.json();

    if (!SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set. Run: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-key>" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Ensure profiles table and trigger exist
    const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            email TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'funcionario' CHECK (role IN ('gestor', 'funcionario', 'admin')),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE OR REPLACE FUNCTION handle_new_user()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO profiles (id, full_name, email, role)
            VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'funcionario'));
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
          CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION handle_new_user();
        `
      }),
    });

    // Step 2: Create user via admin API
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to create user", details: createData }),
        { status: createRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Update profile role to gestor
    if (role) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${createData.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ role, full_name: fullName }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: createData.id, email: createData.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
