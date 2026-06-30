const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TransObra <onboarding@resend.dev>";
const EMAIL_RECIPIENT = Deno.env.get("EMAIL_RECIPIENT") || "gestores@transobra.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "-";
  return esc(String(v));
}

function fmtMoney(v) {
  return Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function buildContratoCriadoHTML(data) {
  const c = data.contrato || {};
  const comp = data.comprovante || {};
  const equips = Array.isArray(c.equipamentos) ? c.equipamentos.join(", ") : "-";
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
            <tr><td style="padding:3px 0;"><strong>Numero:</strong></td><td>${fmt(c.numero)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cliente:</strong></td><td>${fmt(c.cliente)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF/CNPJ:</strong></td><td>${fmt(c.cnpj)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>RG:</strong></td><td>${fmt(c.rg)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Atendente:</strong></td><td>${fmt(c.atendente)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Equipamentos:</strong></td><td>${esc(equips)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Periodo:</strong></td><td>${fmt(c.inicio)} a ${fmt(c.fim)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Mensal:</strong></td><td>R$ ${fmtMoney(c.valorMensal)}/mes</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Total:</strong></td><td>R$ ${fmtMoney(c.valorTotal)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Local Entrega:</strong></td><td>${fmt(c.localEntrega)}</td></tr>
            ${c.endereco ? `<tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${fmt(c.endereco)}${c.numero_endereco ? `, ${esc(c.numero_endereco)}` : ""}${c.bairro ? ` - ${esc(c.bairro)}` : ""}</td></tr>` : ""}
          </table>
        </div>
        ${comp.id ? `
        <div style="background:#fffbeb;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #fde68a;">
          <h3 style="margin:0 0 10px;color:#92400e;font-size:14px;">Comprovante Gerado Automaticamente</h3>
          <p style="font-size:13px;color:#555;">O comprovante de entrega foi criado e esta pendente de assinatura digital.</p>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Locatario:</strong></td><td>${fmt(comp.locatario)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${fmt(comp.endereco)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cidade:</strong></td><td>${fmt(comp.cidade)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Total:</strong></td><td>R$ ${fmtMoney(comp.total)}</td></tr>
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
  const equips = Array.isArray(c.equipamentos) ? c.equipamentos.join(", ") : "-";
  const itens = Array.isArray(comp.itens) ? comp.itens : [];
  const itensHtml = itens.length > 0 ? itens.map((it) =>
    `<tr><td style="padding:3px 0;">${fmt(it.descricao)}</td><td>${it.quantidade || 1}</td><td>${fmt(it.patrimonio)}</td><td>${fmt(it.dataLocacao)} a ${fmt(it.dataDevolucao)}</td><td>R$ ${fmtMoney(it.valorUnitario)}</td></tr>`
  ).join("") : `<tr><td style="padding:3px 0;" colspan="5">-</td></tr>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1C1C1C;color:white;padding:15px 20px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:18px;">TransObra - Contrato Assinado Digitalmente</h1>
      </div>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px;">
        <p style="color:#333;font-size:14px;">O comprovante de entrega foi assinado digitalmente pelo recebedor do equipamento.</p>

        ${c.id ? `
        <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #e0e0e0;">
          <h3 style="margin:0 0 10px;color:#1C1C1C;font-size:14px;">Dados do Contrato</h3>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Numero:</strong></td><td>${fmt(c.numero)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cliente:</strong></td><td>${fmt(c.cliente)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF/CNPJ:</strong></td><td>${fmt(c.cnpj)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>RG:</strong></td><td>${fmt(c.rg)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Atendente:</strong></td><td>${fmt(c.atendente)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Equipamentos:</strong></td><td>${esc(equips)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Periodo:</strong></td><td>${fmt(c.inicio)} a ${fmt(c.fim)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Mensal:</strong></td><td>R$ ${fmtMoney(c.valorMensal)}/mes</td></tr>
            <tr><td style="padding:3px 0;"><strong>Valor Total:</strong></td><td>R$ ${fmtMoney(c.valorTotal)}</td></tr>
            ${c.localEntrega ? `<tr><td style="padding:3px 0;"><strong>Local Entrega:</strong></td><td>${fmt(c.localEntrega)}</td></tr>` : ""}
            ${c.endereco ? `<tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${fmt(c.endereco)}${c.numero_endereco ? `, ${esc(c.numero_endereco)}` : ""}${c.bairro ? ` - ${esc(c.bairro)}` : ""}</td></tr>` : ""}
            ${c.cidade ? `<tr><td style="padding:3px 0;"><strong>Cidade/UF:</strong></td><td>${fmt(c.cidade)}/${fmt(c.estado)}</td></tr>` : ""}
            ${c.cep ? `<tr><td style="padding:3px 0;"><strong>CEP:</strong></td><td>${fmt(c.cep)}</td></tr>` : ""}
            ${c.telefone ? `<tr><td style="padding:3px 0;"><strong>Telefone:</strong></td><td>${fmt(c.telefone)}</td></tr>` : ""}
            ${c.contato ? `<tr><td style="padding:3px 0;"><strong>Contato:</strong></td><td>${fmt(c.contato)}</td></tr>` : ""}
            ${c.email ? `<tr><td style="padding:3px 0;"><strong>Email:</strong></td><td>${fmt(c.email)}</td></tr>` : ""}
          </table>
        </div>` : ""}

        ${comp.id ? `
        <div style="background:white;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #e0e0e0;">
          <h3 style="margin:0 0 10px;color:#1C1C1C;font-size:14px;">Dados da Entrega</h3>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Locatario:</strong></td><td>${fmt(comp.locatario)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF:</strong></td><td>${fmt(comp.cpf)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>RG:</strong></td><td>${fmt(comp.rg)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Endereco:</strong></td><td>${fmt(comp.endereco)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Cidade:</strong></td><td>${fmt(comp.cidade)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Total:</strong></td><td>R$ ${fmtMoney(comp.total)}</td></tr>
          </table>
          ${itens.length > 0 ? `
          <div style="margin-top:10px;">
            <h4 style="margin:0 0 5px;color:#1C1C1C;font-size:13px;">Itens Entregues</h4>
            <table style="width:100%;font-size:12px;color:#555;border-collapse:collapse;">
              <thead><tr style="background:#f3f4f6;"><th style="padding:4px 6px;text-align:left;">Descricao</th><th style="padding:4px 6px;text-align:left;">Qtd</th><th style="padding:4px 6px;text-align:left;">Patrimonio</th><th style="padding:4px 6px;text-align:left;">Periodo</th><th style="padding:4px 6px;text-align:left;">Valor</th></tr></thead>
              <tbody>${itensHtml}</tbody>
            </table>
          </div>` : ""}
        </div>` : ""}

        ${s.nome ? `
        <div style="background:#f0fdf4;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #bbf7d0;">
          <h3 style="margin:0 0 10px;color:#166534;font-size:14px;">Assinatura Digital do Recebedor</h3>
          <table style="width:100%;font-size:13px;color:#555;">
            <tr><td style="padding:3px 0;"><strong>Nome:</strong></td><td>${fmt(s.nome)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>CPF:</strong></td><td>${fmt(s.cpf)}</td></tr>
            <tr><td style="padding:3px 0;"><strong>Data/Hora:</strong></td><td>${s.data ? new Date(s.data).toLocaleString("pt-BR") : "-"}</td></tr>
          </table>
          ${s.assinaturaImagem ? `
          <div style="margin-top:10px;">
            <p style="font-size:13px;color:#555;"><strong>Assinatura:</strong></p>
            <img src="${esc(s.assinaturaImagem)}" style="max-width:300px;height:auto;border:1px solid #ddd;border-radius:4px;background:white;padding:5px;" />
          </div>` : ""}
        </div>` : ""}

        <div style="background:#eff6ff;padding:12px;border-radius:6px;margin:15px 0;border:1px solid #bfdbfe;">
          <p style="font-size:12px;color:#1e40af;margin:0;">Este email foi gerado automaticamente pelo sistema TransObra CRM. A assinatura digital acima e valida como comprovante de recebimento do equipamento.</p>
        </div>

        <p style="color:#999;font-size:11px;margin-top:20px;text-align:center;">TransObra CRM - Sistema de Gestao de Locacao</p>
      </div>
    </div>`;
}


function buildDevolucaoHTML(data: any): string {
  const d = data.devolucao || {};
  const itens = d.itens || [];
  
  let itensHtml = '';
  for (const it of itens) {
    itensHtml += `<tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px">${fmt(it.descricao)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;text-align:center">${fmt(it.quantidade)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px;text-align:center">${fmt(it.qtdDevolvida)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:13px">${fmt(it.patrimonio)}</td>
    </tr>`;
  }

  const condicoes = d.condicoes || {};
  let condicoesHtml = '';
  if (condicoes.danificado) condicoesHtml += '<span style="color:#ea580c">Danificado/Sujo </span>';
  if (condicoes.extraviado) condicoesHtml += '<span style="color:#dc2626">Extraviado/Roubado </span>';
  if (condicoes.testarEmpresa) condicoesHtml += '<span style="color:#2563eb">Testar na empresa </span>';

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#1C1C1C;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
      <h1 style="margin:0;font-size:18px">Devolucao Registrada - TransObra</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.8">Comprovante de devolucao dos bens locados</p>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
      <h2 style="margin:0 0 12px;font-size:15px;color:#1C1C1C">Dados da Devolucao</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 0;color:#6b7280;width:120px">Numero</td><td style="padding:4px 0;font-weight:600">${fmt(d.numero)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Contrato</td><td style="padding:4px 0;font-weight:600">${fmt(d.contratoId)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Locatario</td><td style="padding:4px 0">${fmt(d.locatario)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Data</td><td style="padding:4px 0">${fmt(d.data)} ${fmt(d.hora)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Signatario</td><td style="padding:4px 0">${fmt(d.signatarioNome)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Local</td><td style="padding:4px 0">${fmt(d.localObra)}</td></tr>
      </table>
      ${itens.length > 0 ? `
      <h2 style="margin:20px 0 12px;font-size:15px;color:#1C1C1C">Itens Devolvidos</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left">Descricao</th>
          <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:center">Qtd</th>
          <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:center">Devolvida</th>
          <th style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:left">Patrimonio</th>
        </tr></thead>
        <tbody>${itensHtml}</tbody>
      </table>` : ''}
      ${condicoesHtml ? `<div style="margin-top:16px;padding:12px;background:#fef3c7;border-radius:8px;font-size:13px"><strong>Condicoes:</strong> ${condicoesHtml}</div>` : ''}
    </div>
  </div>`;
}

Deno.serve(async (req) => {
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
    } else if (tipo === "devolucao_registrada") {
      const dev = body.devolucao || {};
      subject = `Devolucao ${dev.numero || ''} - ${dev.locatario || ''}`;
      htmlContent = buildDevolucaoHTML(body);
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
