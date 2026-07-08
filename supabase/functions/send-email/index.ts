import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TransObra <onboarding@resend.dev>";
const EMAIL_RECIPIENT = Deno.env.get("EMAIL_RECIPIENT") || "gestores@transobra.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildContratoCriadoHTML(data) {
  const c = data.contrato || {};
  const comp = data.comprovante || {};
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1C1C1C;color:white;padding:15px 20px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:18px;">TransObra - Novo Contrato Cadastrado</h1>
      </div>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px;">
        <p style="color:#333;font-size:14px;">Um novo contrato foi cadastrado no sistema. Comprovante de entrega gerado automaticamente.</p>
        <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #e0e0e0;">
          <h3 style="margin:0 0 10px;color:#1C1C1C;font-size:14px;">Dados do Contrato</h3>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Numero:</strong></td><td>${c.numero || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cliente:</strong></td><td>${c.cliente || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF/CNPJ:</strong></td><td>${c.cnpj || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>RG:</strong></td><td>${c.rg || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Atendente:</strong></td><td>${c.atendente || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Equipamentos:</strong></td><td>${Array.isArray(c.equipamentos) ? c.equipamentos.join(", ") : "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Periodo:</strong></td><td>${c.inicio || "-"} a ${c.fim || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Mensal:</strong></td><td>R$ ${Number(c.valorMensal || 0).toLocaleString("pt-BR")}/mes</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Total:</strong></td><td>R$ ${Number(c.valorTotal || 0).toLocaleString("pt-BR")}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Local Entrega:</strong></td><td>${c.localEntrega || "-"}</td></tr>
            ${c.endereco ? `<tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${c.endereco}${c.numero_endereco ? `, ${c.numero_endereco}` : ""}${c.bairro ? ` - ${c.bairro}` : ""}</td></tr>` : ""}
          </table>
        </div>
        ${comp.id ? `
        <div style="background:#fffbeb;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #fde68a;">
          <h3 style="margin:0 0 10px;color:#92400e;font-size:14px;">Comprovante Gerado Automaticamente</h3>
          <p style="font-size:13px;color:#555;">O comprovante de entrega foi criado e esta pendente de assinatura digital.</p>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Locatario:</strong></td><td>${comp.locatario || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${comp.endereco || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cidade:</strong></td><td>${comp.cidade || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Total:</strong></td><td>R$ ${Number(comp.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>` : ""}
        <p style="color:#999;font-size:11px;margin-top:20px;text-align:center;">TransObra CRM - Sistema de Gestao de Locacao</p>
      </div>
    </div>`;
}

function buildContratoAssinadoHTML(data) {
  const c = data.contrato || {};
  const comp = data.comprovante || {};
  const s = data.signatario || {};
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1C1C1C;color:white;padding:15px 20px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:18px;">TransObra - Contrato Assinado</h1>
      </div>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px;">
        <p style="color:#333;font-size:14px;">Um contrato foi assinado digitalmente.</p>
        ${c.id ? `
        <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #e0e0e0;">
          <h3 style="margin:0 0 10px;color:#1C1C1C;font-size:14px;">Dados do Contrato</h3>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Numero:</strong></td><td>${c.numero || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cliente:</strong></td><td>${c.cliente || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF/CNPJ:</strong></td><td>${c.cnpj || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>RG:</strong></td><td>${c.rg || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Atendente:</strong></td><td>${c.atendente || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Equipamentos:</strong></td><td>${Array.isArray(c.equipamentos) ? c.equipamentos.join(", ") : "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Periodo:</strong></td><td>${c.inicio || "-"} a ${c.fim || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Mensal:</strong></td><td>R$ ${Number(c.valorMensal || 0).toLocaleString("pt-BR")}/mes</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Total:</strong></td><td>R$ ${Number(c.valorTotal || 0).toLocaleString("pt-BR")}</td></tr>
            ${c.endereco ? `<tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${c.endereco}${c.numero_endereco ? `, ${c.numero_endereco}` : ""}${c.bairro ? ` - ${c.bairro}` : ""}</td></tr>` : ""}
            ${c.cidade ? `<tr><td style="padding:3px 0;"><strong>Cidade/UF:</strong></td><td>${c.cidade}/${c.estado || "-"}</td></tr>` : ""}
            ${c.cep ? `<tr><td style="padding:3px 0;"><strong>CEP:</strong></td><td>${c.cep}</td></tr>` : ""}
            ${c.telefone ? `<tr><td style="padding:3px 0;"><strong>Telefone:</strong></td><td>${c.telefone}</td></tr>` : ""}
            ${c.contato ? `<tr><td style="padding:3px 0;"><strong>Contato:</strong></td><td>${c.contato}</td></tr>` : ""}
            ${c.email ? `<tr><td style="padding:3px 0;"><strong>Email:</strong></td><td>${c.email}</td></tr>` : ""}
            ${c.localEntrega ? `<tr><td style="padding:3px 0;"><strong>Local Entrega:</strong></td><td>${c.localEntrega}</td></tr>` : ""}
          </table>
        </div>` : ""}
        ${comp.id ? `
        <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #e0e0e0;">
          <h3 style="margin:0 0 10px;color:#1C1C1C;font-size:14px;">Dados da Entrega</h3>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Locatario:</strong></td><td>${comp.locatario || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF:</strong></td><td>${comp.cpf || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>RG:</strong></td><td>${comp.rg || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${comp.endereco || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cidade:</strong></td><td>${comp.cidade || "-"}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Total:</strong></td><td>R$ ${Number(comp.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>` : ""}
        ${s.nome ? `
        <div style="background:#f0fdf4;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #bbf7d0;">
          <h3 style="margin:0 0 10px;color:#166534;font-size:14px;">Assinatura Digital</h3>
          <p style="font-size:13px;color:#555;"><strong>Signatario:</strong> ${s.nome}</p>
          <p style="font-size:13px;color:#555;"><strong>CPF:</strong> ${s.cpf || "-"}</p>
          <p style="font-size:13px;color:#555;"><strong>Data:</strong> ${s.data ? new Date(s.data).toLocaleString("pt-BR") : "-"}</p>
          ${s.assinaturaImagem ? `
          <div style="margin-top:10px;">
            <p style="font-size:13px;color:#555;"><strong>Assinatura:</strong></p>
            <img src="${s.assinaturaImagem}" style="max-width:300px;height:auto;border:1px solid #ddd;border-radius:4px;background:white;padding:5px;" />
          </div>` : ""}
        </div>` : ""}
        <p style="color:#999;font-size:11px;margin-top:20px;text-align:center;">TransObra CRM - Sistema de Gestao de Locacao</p>
      </div>
    </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tipo, destinatario: reqDest } = body;
    const to = reqDest || EMAIL_RECIPIENT;

    let htmlContent;
    let subject;

    if (tipo === "contrato_criado") {
      const c = body.contrato || {};
      subject = `Novo Contrato ${c.numero || c.id || ""} - ${c.cliente || ""}`;
      htmlContent = buildContratoCriadoHTML(body);
    } else {
      const c = body.contrato || {};
      const comp = body.comprovante || {};
      subject = `Contrato ${c.numero || c.id || comp.contrato || ""} assinado - ${comp.locatario || c.cliente || ""}`;
      htmlContent = buildContratoAssinadoHTML(body);
    }

    if (!RESEND_API_KEY) {
      console.log(`[EMAIL_SKIP] RESEND_API_KEY not configured. Subject: ${subject}, To: ${to}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "RESEND_API_KEY not configured", subject, to }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        subject,
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
