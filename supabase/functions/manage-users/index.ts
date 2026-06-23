import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "gestor" && profile.role !== "admin")) {
      return new Response(
        JSON.stringify({ error: "Only gestors and admins can manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, fullName, role } = body;
      if (!email || !password || !fullName) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: email, password, fullName" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: role || "funcionario" },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newUser.user) {
        await supabaseAdmin.from("profiles").upsert({
          id: newUser.user.id,
          full_name: fullName,
          email,
          role: role || "funcionario",
        });
      }

      return new Response(
        JSON.stringify({ success: true, user: { id: newUser.user?.id, email, fullName, role } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_role") {
      const { userId, role } = body;
      if (!userId || !role) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: userId, role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === user.id && role === "funcionario") {
        const { count } = await supabaseAdmin
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .in("role", ["gestor", "admin"]);

        if (count <= 1) {
          return new Response(
            JSON.stringify({ error: "Deve haver pelo menos um gestor no sistema." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, userId, role }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing required field: userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === user.id) {
        return new Response(
          JSON.stringify({ error: "Voce nao pode remover seu proprio usuario." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (targetProfile && (targetProfile.role === "gestor" || targetProfile.role === "admin")) {
        const { count } = await supabaseAdmin
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .in("role", ["gestor", "admin"]);

        if (count <= 1) {
          return new Response(
            JSON.stringify({ error: "Deve haver pelo menos um gestor no sistema." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, userId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: create, update_role, delete" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
