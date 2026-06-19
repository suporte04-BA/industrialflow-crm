// Supabase Edge Function: send-email
// Sends email notifications via Resend API
// Deploy: supabase functions deploy send-email --project-ref mbcdbclosomqpfboyffj

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TransObra <onboarding@resend.dev>";
const EMAIL_RECIPIENT = Deno.env.get("EMAIL_RECIPIENT") || "gestores@transobra.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { contrato, comprovante, signatario, destinatario } = await req.json();

    const to = destinatario || EMAIL_RECIPIENT;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1C1C1C; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 18px;">TransObra - Notificacao de Contrato</h1>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p style="color: #333; font-size: 14px;">Um contrato foi assinado e entregue.</p>
          ${contrato ? `
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #e0e0e0;">
            <h3 style="margin: 0 0 10px; color: #1C1C1C; font-size: 14px;">Dados do Contrato</h3>
            <table style="width: 100%; font-size: 13px; color: #555;">
              <tr><td style="padding: 3px 0;"><strong>Contrato:</strong></td><td>${contrato.id || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Cliente:</strong></td><td>${contrato.cliente || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>CNPJ:</strong></td><td>${contrato.cnpj || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Equipamentos:</strong></td><td>${Array.isArray(contrato.equipamentos) ? contrato.equipamentos.join(", ") : "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Periodo:</strong></td><td>${contrato.inicio || "-"} a ${contrato.fim || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Valor Mensal:</strong></td><td>R$ ${Number(contrato.valorMensal || 0).toLocaleString("pt-BR")}/mes</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Valor Total:</strong></td><td>R$ ${Number(contrato.valorTotal || 0).toLocaleString("pt-BR")}</td></tr>
            </table>
          </div>` : ""}
          ${comprovante ? `
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #e0e0e0;">
            <h3 style="margin: 0 0 10px; color: #1C1C1C; font-size: 14px;">Dados da Entrega</h3>
            <table style="width: 100%; font-size: 13px; color: #555;">
              <tr><td style="padding: 3px 0;"><strong>Locatario:</strong></td><td>${comprovante.locatario || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Endereco:</strong></td><td>${comprovante.endereco || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Cidade:</strong></td><td>${comprovante.cidade || "-"}</td></tr>
              <tr><td style="padding: 3px 0;"><strong>Total:</strong></td><td>R$ ${Number(comprovante.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>
            </table>
          </div>` : ""}
          ${signatario ? `
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #bbf7d0;">
            <h3 style="margin: 0 0 10px; color: #166534; font-size: 14px;">Assinatura</h3>
            <p style="font-size: 13px; color: #555;"><strong>Signatario:</strong> ${signatario.nome || "-"}</p>
            <p style="font-size: 13px; color: #555;"><strong>Data:</strong> ${signatario.data ? new Date(signatario.data).toLocaleString("pt-BR") : "-"}</p>
          </div>` : ""}
          <p style="color: #999; font-size: 11px; margin-top: 20px; text-align: center;">TransObra CRM - Sistema de Gestao de Locacao</p>
        </div>
      </div>
    `;

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: `Contrato ${contrato?.id || comprovante?.contrato || ""} assinado - ${comprovante?.locatario || contrato?.cliente || ""}`,
        html: htmlContent,
      }),
    });

    const result = await resendRes.json();

    if (resendRes.ok) {
      return new Response(
        JSON.stringify({ success: true, id: result.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: resendRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
