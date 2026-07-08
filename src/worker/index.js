import { LOGO_BASE64 } from './logo-base64.js';

const ALLOWED_ORIGINS = [
  'https://transobras.suporte04.workers.dev',
  'https://industrialflow-crm.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    ...SECURITY_HEADERS,
  };
}

function json(data, status = 200, corsHeaders = null) {
  const h = corsHeaders || getCorsHeaders({ headers: new Headers() });
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...h, 'Content-Type': 'application/json' },
  });
}

function computeVencimentoDias(dataFim) {
  if (!dataFim) return null;
  const hoje = new Date();
  const fim = new Date(dataFim);
  return Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
}

function isValidId(id) {
  return id && /^[a-zA-Z0-9_-]{1,128}$/.test(id) && !id.includes('/');
}

function sanitizeEdgeFuncName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '-';
  return esc(String(v));
}

function fmtMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtDateBR(v) {
  if (!v) return '-';
  try { return new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return esc(String(v)); }
}

async function parseBody(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    return { error: 'Content-Type must be application/json' };
  }
  try {
    const body = await request.json();
    return { data: body };
  } catch {
    return { error: 'Invalid JSON body' };
  }
}

async function supabaseRequest(env, method, path, body = null, authHeader = null) {
  const url = `${env.SUPABASE_URL}/rest/v1${path}`;
  const headers = {
    'apikey': env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
  if (authHeader) headers['Authorization'] = authHeader;

  const opts = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: res.status, data };
}

function buildAssunto(tipo, contrato, comprovante) {
  const numero = contrato?.numero || contrato?.id || comprovante?.contrato || '';
  const cliente = contrato?.cliente || '';
  switch (tipo) {
    case 'contrato_criado': return `Novo Contrato ${numero} - ${cliente}`;
    case 'contrato_assinado': return `Contrato ${numero} assinado - ${cliente}`;
    case 'contrato_renovado': return `Contrato ${numero} renovado - ${cliente}`;
    case 'devolucao_registrada': return `Devolucao registrada - Contrato ${numero}`;
    case 'role_change': return `Alteracao de funcao - ${contrato?.nome || cliente}`;
    default: return `TransObra - Notificacao ${numero}`;
  }
}

function emailWrapper(content) {
  const footer = `<tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 30px;text-align:center;">
<p style="font-size:11px;color:#6B7280;margin:0 0 6px 0;">TransObra - Locacao de Equipamentos</p>
<p style="font-size:10px;color:#9CA3AF;margin:0 0 4px 0;">Endereco: Manaus, AM - Brasil | Tel: (92) 3300-0000</p>
<p style="font-size:10px;color:#9CA3AF;margin:0;">Este e um email transacional enviado pelo sistema TransObra CRM.</p>
</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background:#111827;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:0;overflow:hidden;border-collapse:collapse;">${content}${footer}</table>
</td></tr></table></body></html>`;
}

function brandHeader(title, subtitle, badgeText, headerBg, badgeBg) {
  const logoImg = `<img src="cid:logo" style="height:34px;width:auto;display:block;" alt="TransObra" />`;
  return `<tr><td style="background:${headerBg};padding:0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:18px 30px 14px;">
${logoImg}
<div style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:6px;letter-spacing:2px;text-transform:uppercase;">${subtitle}</div>
</td>
<td align="right" valign="middle" style="padding:24px 30px 20px;">
<div style="background:${badgeBg};color:${headerBg === '#EAB308' ? '#111827' : '#fff'};font-size:10px;font-weight:800;padding:6px 16px;border-radius:0;text-transform:uppercase;letter-spacing:1.5px;">${badgeText}</div>
</td></tr>
<tr><td colspan="2" style="height:4px;background:#EAB308;"></td></tr>
</table>
</td></tr>`;
}

function sectionBlock(title, headerColor, borderColor, rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${borderColor};margin-bottom:20px;">
<tr><td style="padding:12px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-left:none;">
<div style="font-size:11px;font-weight:800;color:${headerColor};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${borderColor};">${title}</div>
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr></table>`;
}

function row(label, value, opts = {}) {
  const { bold, color, w } = opts;
  return `<tr><td style="padding:5px 0;color:#6b7280;width:${w || '130px'};vertical-align:top;font-size:12px;"><strong>${label}</strong></td><td style="padding:5px 0;color:${color || '#111827'};font-size:13px;${bold ? 'font-weight:700;' : ''}">${value}</td></tr>`;
}

function buildContratoCriadoHtml(contrato) {
  const c = contrato || {};
  const equips = Array.isArray(c.equipamentos) ? c.equipamentos.join(', ') : '-';

  const r = [
    row('Numero', `<span style="font-size:16px;font-weight:900;color:#EAB308;">${fmt(c.numero)}</span>`),
    row('Cliente', fmt(c.cliente), { bold: true }),
    row('CPF/CNPJ', fmt(c.cnpj || c.cpf_cnpj)),
    c.rg ? row('RG', fmt(c.rg)) : '',
    c.atendente ? row('Atendente', fmt(c.atendente)) : '',
    row('Tipo', `<span style="display:inline-block;background:#EAB308;color:#111827;font-size:10px;font-weight:800;padding:3px 10px;text-transform:uppercase;letter-spacing:0.5px;">ENTREGA</span>`),
    row('Equipamentos', esc(equips)),
    c.inicio ? row('Periodo', `${fmt(c.inicio)} a ${fmt(c.fim)}`) : '',
    c.valorMensal ? row('Valor Mensal', `R$ ${fmtMoney(c.valorMensal)}/mes`) : '',
    c.valorTotal ? row('Valor Total', `R$ ${fmtMoney(c.valorTotal)}`, { bold: true, color: '#16a34a' }) : '',
    c.localEntrega ? row('Local Entrega', fmt(c.localEntrega)) : '',
    c.endereco ? row('Endereco', `${fmt(c.endereco)}${c.numero_endereco ? `, ${esc(c.numero_endereco)}` : ''}${c.bairro ? ` - ${esc(c.bairro)}` : ''}`) : '',
  ].filter(Boolean).join('');

  return emailWrapper(`
${brandHeader('Novo Contrato', 'SISTEMA DE GESTAO DE LOCACAO', 'ENTREGA', '#111827', '#EAB308')}
<tr><td style="padding:28px 30px 12px;">
<div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px;">Novo Contrato Cadastrado</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:24px;">Um novo contrato foi registrado no sistema.</div>
${sectionBlock('Dados do Contrato', '#111827', '#EAB308', r)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:14px 20px;background:#111827;text-align:center;">
<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;">TRANSOBRA CRM &mdash; SISTEMA DE GESTAO DE LOCACAO</div>
</td></tr></table>
</td></tr>`);
}

function buildContratoAssinadoHtml(contrato, comprovante, signatario) {
  const c = contrato || {};
  const comp = comprovante || {};
  const s = signatario || {};
  const equips = Array.isArray(c.equipamentos) ? c.equipamentos.join(', ') : '-';

  const rContrato = [
    row('Numero', `<span style="font-size:16px;font-weight:900;color:#EAB308;">${fmt(c.numero)}</span>`),
    row('Cliente', fmt(c.cliente), { bold: true }),
    c.cnpj ? row('CPF/CNPJ', fmt(c.cnpj)) : '',
    c.rg ? row('RG', fmt(c.rg)) : '',
    c.atendente ? row('Atendente', fmt(c.atendente)) : '',
    row('Equipamentos', esc(equips)),
    c.inicio ? row('Periodo', `${fmt(c.inicio)} a ${fmt(c.fim)}`) : '',
    c.valorMensal ? row('Valor Mensal', `R$ ${fmtMoney(c.valorMensal)}/mes`) : '',
    c.valorTotal ? row('Valor Total', `R$ ${fmtMoney(c.valorTotal)}`, { bold: true, color: '#16a34a' }) : '',
    c.localEntrega ? row('Local Entrega', fmt(c.localEntrega)) : '',
    c.endereco ? row('Endereco', `${fmt(c.endereco)}${c.numero_endereco ? `, ${esc(c.numero_endereco)}` : ''}${c.bairro ? ` - ${esc(c.bairro)}` : ''}`) : '',
    c.cidade ? row('Cidade/UF', `${fmt(c.cidade)}/${fmt(c.estado)}`) : '',
    c.cep ? row('CEP', fmt(c.cep)) : '',
    c.telefone ? row('Telefone', fmt(c.telefone)) : '',
  ].filter(Boolean).join('');

  const rEntrega = [
    row('Locatario', fmt(comp.locatario), { bold: true }),
    comp.cpf ? row('CPF', fmt(comp.cpf)) : '',
    comp.rg ? row('RG', fmt(comp.rg)) : '',
    comp.endereco ? row('Endereco', fmt(comp.endereco)) : '',
    comp.cidade ? row('Cidade', fmt(comp.cidade)) : '',
    row('Total', `R$ ${fmtMoney(comp.total)}`, { bold: true, color: '#16a34a' }),
  ].filter(Boolean).join('');

  let assinaturaHtml = '';
  if (s.nome) {
    const sigImgTag = s.assinaturaImagem ? `<img src="${esc(s.assinaturaImagem)}" style="max-width:280px;height:auto;border:2px solid #22c55e;background:#fff;padding:8px;" alt="Assinatura" />` : '';
    assinaturaHtml = sectionBlock('Assinatura Digital do Recebedor', '#166534', '#22c55e', [
      row('Nome', fmt(s.nome), { bold: true }),
      row('CPF', fmt(s.cpf)),
      row('Data/Hora', s.data ? fmtDateBR(s.data) : '-'),
      sigImgTag ? `<tr><td colspan="2" style="padding-top:10px;"><div style="font-size:11px;color:#166534;font-weight:700;margin-bottom:6px;">ASSINATURA:</div>${sigImgTag}</td></tr>` : '',
    ].filter(Boolean).join(''));
  }

  return emailWrapper(`
${brandHeader('Comprovante de Entrega', 'COMPROVANTE DE ENTREGA ASSINADO DIGITALMENTE', 'ENTREGA', '#EAB308', '#111827')}
<tr><td style="padding:28px 30px 12px;">
<div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px;">Comprovante de Entrega Assinado</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:24px;">O comprovante foi assinado digitalmente pelo recebedor. Valido como prova de recebimento.</div>
${c.id ? sectionBlock('Dados do Contrato', '#111827', '#EAB308', rContrato) : ''}
${comp.id ? sectionBlock('Dados da Entrega', '#1e40af', '#2563eb', rEntrega) : ''}
${assinaturaHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:14px 20px;background:#111827;text-align:center;">
<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;">TRANSOBRA CRM &mdash; SISTEMA DE GESTAO DE LOCACAO</div>
</td></tr></table>
</td></tr>`);
}

function buildContratoRenovadoHtml(contrato) {
  const c = contrato || {};
  const equips = Array.isArray(c.equipamentos) ? c.equipamentos.join(', ') : '-';

  const r = [
    row('Numero', `<span style="font-size:16px;font-weight:900;color:#EAB308;">${fmt(c.numero)}</span>`),
    row('Cliente', fmt(c.cliente), { bold: true }),
    c.cnpj ? row('CPF/CNPJ', fmt(c.cnpj)) : '',
    row('Equipamentos', esc(equips)),
    c.inicio ? row('Novo Periodo', `${fmt(c.inicio)} a ${fmt(c.fim)}`) : '',
    c.valorMensal ? row('Valor Mensal', `R$ ${fmtMoney(c.valorMensal)}/mes`) : '',
    c.valorTotal ? row('Valor Total', `R$ ${fmtMoney(c.valorTotal)}`, { bold: true, color: '#16a34a' }) : '',
  ].filter(Boolean).join('');

  return emailWrapper(`
${brandHeader('Contrato Renovado', 'SISTEMA DE GESTAO DE LOCACAO', 'RENOVACAO', '#111827', '#3b82f6')}
<tr><td style="padding:28px 30px 12px;">
<div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px;">Contrato Renovado</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:24px;">O contrato foi renovado com sucesso.</div>
${sectionBlock('Dados da Renovacao', '#111827', '#3b82f6', r)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:14px 20px;background:#111827;text-align:center;">
<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;">TRANSOBRA CRM &mdash; SISTEMA DE GESTAO DE LOCACAO</div>
</td></tr></table>
</td></tr>`);
}

function buildDevolucaoHtml(contrato, comprovante) {
  const c = contrato || {};
  const comp = comprovante || {};

  const r = [
    row('Numero', `<span style="font-size:16px;font-weight:900;color:#EAB308;">${fmt(c.numero || comp.contrato)}</span>`),
    row('Cliente', fmt(c.cliente || comp.locatario), { bold: true }),
  ].filter(Boolean).join('');

  return emailWrapper(`
${brandHeader('Devolucao Registrada', 'SISTEMA DE GESTAO DE LOCACAO', 'DEVOLUCAO', '#111827', '#f97316')}
<tr><td style="padding:28px 30px 12px;">
<div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px;">Devolucao de Equipamento</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:24px;">Uma devolucao de equipamento foi registrada no sistema.</div>
${sectionBlock('Dados da Devolucao', '#111827', '#f97316', r)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:14px 20px;background:#111827;text-align:center;">
<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;">TRANSOBRA CRM &mdash; SISTEMA DE GESTAO DE LOCACAO</div>
</td></tr></table>
</td></tr>`);
}

function buildRoleChangeHtml(usuario) {
  const nome = escapeHtml(usuario?.nome || '-');
  const email = escapeHtml(usuario?.email || '-');
  const novaFuncao = escapeHtml(usuario?.novaFuncao || '-');

  const r = [
    row('Usuario', nome, { bold: true }),
    row('E-mail', email),
    row('Nova Funcao', novaFuncao),
  ].filter(Boolean).join('');

  return emailWrapper(`
${brandHeader('Alteracao de Funcao', 'SISTEMA DE GESTAO DE LOCACAO', 'ADMIN', '#111827', '#8b5cf6')}
<tr><td style="padding:28px 30px 12px;">
<div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px;">Alteracao de Funcao</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:24px;">A funcao de um usuario foi alterada no sistema.</div>
${sectionBlock('Dados da Alteracao', '#111827', '#8b5cf6', r)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr><td style="padding:14px 20px;background:#111827;text-align:center;">
<div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;">TRANSOBRA CRM &mdash; SISTEMA DE GESTAO DE LOCACAO</div>
</td></tr></table>
</td></tr>`);
}

function buildPlainText(tipo, contrato, comprovante, signatario, usuario) {
  const num = contrato?.numero || contrato?.id || comprovante?.contrato || '-';
  const cliente = contrato?.cliente || comprovante?.locatario || '-';
  const footer = '\n\n====================================\nTransObra - Gestao de Locacao de Equipamentos\nRua Exemplo, 123 - Centro - Salvador/BA - CEP 40000-000\nTelefone: (71) 99999-0000\nE-mail: contato@transobra.com.br\nCNPJ: 00.000.000/0001-00\n====================================\n\nEste e um e-mail automatico do sistema TransObra.\nSe nao deseja mais receber, entre em contato conosco.';
  switch (tipo) {
    case 'contrato_criado':
      return `NOVO CONTRATO CADASTRADO - TransObra\n\nUm novo contrato foi cadastrado no sistema.\n\nContrato: ${num}\nCliente: ${cliente}\nEquipamentos: ${Array.isArray(contrato?.equipamentos) ? contrato.equipamentos.join(', ') : '-'}\nPeriodo: ${contrato?.inicio || '-'} a ${contrato?.fim || '-'}\nValor Mensal: R$ ${Number(contrato?.valorMensal || 0).toLocaleString('pt-BR')}/mes\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'contrato_assinado':
      return `CONTRATO ASSINADO - TransObra\n\nO contrato foi assinado digitalmente com sucesso.\n\nContrato: ${num}\nCliente: ${cliente}\nAssinado por: ${signatario?.nome || '-'}\nData da Assinatura: ${signatario?.data ? new Date(signatario.data).toLocaleDateString('pt-BR') : '-'}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'contrato_renovado':
      return `CONTRATO RENOVADO - TransObra\n\nO contrato foi renovado com sucesso.\n\nContrato: ${num}\nCliente: ${cliente}\nNova Validade: ${contrato?.fim || '-'}\nValor Mensal: R$ ${Number(contrato?.valorMensal || 0).toLocaleString('pt-BR')}/mes\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'devolucao_registrada':
      return `DEVOLUCAO REGISTRADA - TransObra\n\nUma devolucao de equipamento foi registrada no sistema.\n\nContrato: ${num}\nCliente: ${cliente}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'role_change':
      return `ALTERACAO DE FUNCAO - TransObra\n\nA funcao de um usuario foi alterada no sistema.\n\nUsuario: ${usuario?.nome || '-'}\nE-mail: ${usuario?.email || '-'}\nNova Funcao: ${usuario?.novaFuncao || '-'}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    default:
      return `NOTIFICACAO - TransObra\n\nContrato: ${num}\nCliente: ${cliente}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
  }
}

async function sendEmailViaGoogleScript(env, data) {
  const { tipo, destinatario, contrato, comprovante, signatario, usuario } = data;

  let htmlBody = '';
  switch (tipo) {
    case 'contrato_criado': htmlBody = buildContratoCriadoHtml(contrato); break;
    case 'contrato_assinado': htmlBody = buildContratoAssinadoHtml(contrato, comprovante, signatario); break;
    case 'contrato_renovado': htmlBody = buildContratoRenovadoHtml(contrato); break;
    case 'devolucao_registrada': htmlBody = buildDevolucaoHtml(contrato, comprovante); break;
    case 'role_change': htmlBody = buildRoleChangeHtml(usuario); break;
    default: htmlBody = buildContratoCriadoHtml(contrato);
  }

  const plainBody = buildPlainText(tipo, contrato, comprovante, signatario, usuario);
  const assunto = buildAssunto(tipo, contrato, comprovante);

  const scriptUrl = env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return { success: false, error: 'GOOGLE_SCRIPT_URL not configured' };
  }

  const inlineImages = {};
  if (LOGO_BASE64) {
    inlineImages.logo = LOGO_BASE64;
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: destinatario,
        subject: assunto,
        body: plainBody,
        htmlBody: htmlBody,
        apiKey: env.GOOGLE_SCRIPT_API_KEY || '',
        inlineImages,
      }),
    });

    const result = await res.json();
    if (res.ok && result.success) {
      return { success: true, _subject: assunto, _html: htmlBody };
    }
    return { success: false, error: result.error || `Apps Script returned ${res.status}`, _subject: assunto, _html: htmlBody };
  } catch (e) {
    return { success: false, error: e.message, _subject: assunto, _html: htmlBody };
  }
}

async function sendEmailViaResend(env, subject, html, destinatario) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY not configured' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'TransObra <onboarding@resend.dev>',
        to: [destinatario],
        subject,
        html,
        reply_to: 'transobras.no.replay@gmail.com',
        headers: { 'X-Entity-Ref-ID': `transobra-${Date.now()}` },
      }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      return { success: true, provider: 'resend' };
    }
    return { success: false, error: data.message || data.error || `Resend returned ${res.status}` };
  } catch (err) {
    return { success: false, error: `Resend request failed: ${err.message}` };
  }
}

async function sendEmailViaMaileroo(env, subject, html, destinatario) {
  const apiKey = env.MAILEROO_API_KEY;
  if (!apiKey) return { success: false, error: 'MAILEROO_API_KEY not configured' };

  const senderEmail = env.MAILEROO_FROM || 'notificacoes@transobra.app';
  try {
    const res = await fetch('https://smtp.maileroo.com/api/v2/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        from: { address: senderEmail, display_name: 'TransObra' },
        to: [{ address: destinatario }],
        subject,
        html,
        plain: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        tags: { sistema: 'transobra' },
      }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, provider: 'maileroo' };
    }
    return { success: false, error: data.message || 'Maileroo returned error' };
  } catch (err) {
    return { success: false, error: `Maileroo request failed: ${err.message}` };
  }
}

// Email fallback order: Google Apps Script → Maileroo → Resend
async function sendEmailWithFallback(env, data) {
  const { tipo, destinatario, contrato, comprovante, signatario, usuario } = data;

  let htmlBody = '';
  switch (tipo) {
    case 'contrato_criado': htmlBody = buildContratoCriadoHtml(contrato); break;
    case 'contrato_assinado': htmlBody = buildContratoAssinadoHtml(contrato, comprovante, signatario); break;
    case 'contrato_renovado': htmlBody = buildContratoRenovadoHtml(contrato); break;
    case 'devolucao_registrada': htmlBody = buildDevolucaoHtml(contrato, comprovante); break;
    case 'role_change': htmlBody = buildRoleChangeHtml(usuario); break;
    default: htmlBody = buildContratoCriadoHtml(contrato);
  }
  const plainBody = buildPlainText(tipo, contrato, comprovante, signatario, usuario);
  const assunto = buildAssunto(tipo, contrato, comprovante);

  let result = await sendEmailViaGoogleScript(env, data);
  if (result.success) return { ...result, provider: 'google_apps_script' };

  let fallbackResult = await sendEmailViaMaileroo(env, assunto, htmlBody, destinatario);
  if (fallbackResult.success) return fallbackResult;

  fallbackResult = await sendEmailViaResend(env, assunto, htmlBody, destinatario);
  if (fallbackResult.success) return fallbackResult;

  return { success: false, error: `All providers failed. Last: ${result.error}` };
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const authHeader = request.headers.get('Authorization');

    if (path.startsWith('/api/')) {
      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: new Date().toISOString() }, 200, corsHeaders);
      }

      if (path === '/api/config' && method === 'GET') {
        return json({
          emailRecipient: env.EMAIL_RECIPIENT || 'gestores@transobra.com.br',
          emailFrom: env.EMAIL_FROM || 'TransObra <onboarding@resend.dev>',
          resendConfigured: !!env.RESEND_API_KEY,
        }, 200, corsHeaders);
      }

      if (path === '/api/dashboard' && method === 'GET') {
        try {
          const [os, eq, ct] = await Promise.all([
            supabaseRequest(env, 'GET', '/ordens_servico?select=*&limit=500'),
            supabaseRequest(env, 'GET', '/equipamentos?select=*&limit=200'),
            supabaseRequest(env, 'GET', '/contratos?select=*&limit=200'),
          ]);

          const osData = Array.isArray(os.data) ? os.data : [];
          const eqData = Array.isArray(eq.data) ? eq.data : [];
          const ctData = Array.isArray(ct.data) ? ct.data : [];

          const ctWithVencimento = ctData.map(c => ({
            ...c,
            vencimentoDias: computeVencimentoDias(c.fim),
          }));

          return json({
            metricas: {
              totalOS: osData.length,
              osAbertas: osData.filter(o => o.status === 'pendente' || o.status === 'em_andamento').length,
              osConcluidas: osData.filter(o => o.status === 'concluido').length,
              equipamentosLocados: eqData.filter(e => e.status === 'locado').length,
              equipamentosDisponiveis: eqData.filter(e => e.status === 'disponivel').length,
              equipamentosManutencao: eqData.filter(e => e.status === 'manutencao').length,
              contratosAtivos: ctWithVencimento.filter(c => c.status === 'ativo').length,
              contratosVencendo: ctWithVencimento.filter(c => c.vencimentoDias != null && c.vencimentoDias > 0 && c.vencimentoDias <= 30).length,
              contratosVencidos: ctWithVencimento.filter(c => c.vencimentoDias != null && c.vencimentoDias <= 0).length,
              receitaMensal: ctWithVencimento.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.valor_mensal || 0), 0),
            },
            recentOS: osData.slice(0, 5),
            alertasContratos: ctWithVencimento.filter(c =>
              (c.vencimentoDias != null && c.vencimentoDias <= 30) || !c.assinado
            ),
          }, 200, corsHeaders);
        } catch (err) {
          return json({ error: 'Failed to fetch dashboard' }, 500, corsHeaders);
        }
      }

      if (path.startsWith('/api/ordens')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'GET' && id && id !== 'ordens' && isValidId(id)) {
          const result = await supabaseRequest(env, 'GET', `/ordens_servico?id=eq.${id}&select=*`);
          return json(result.data?.[0] || { error: 'Not found' }, result.status, corsHeaders);
        }
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/ordens_servico', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/ordens_servico?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/ordens_servico?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/ordens_servico?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/equipamentos')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/equipamentos', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/equipamentos?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/equipamentos?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/equipamentos?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/contratos')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/contratos', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/contratos?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/contratos?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/contratos?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/comprovantes')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/comprovantes_entrega', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/comprovantes_entrega?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/comprovantes_entrega?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/comprovantes_entrega?select=*&order=created_at.desc&limit=200');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/notas')) {
        const segments = path.split('/');
        const id = segments[segments.length - 1];
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'POST', '/notas', parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'PUT' && id && isValidId(id)) {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const result = await supabaseRequest(env, 'PATCH', `/notas?id=eq.${id}`, parsed.data, authHeader);
          return json(result.data, result.status, corsHeaders);
        }
        if (method === 'DELETE' && id && isValidId(id)) {
          const result = await supabaseRequest(env, 'DELETE', `/notas?id=eq.${id}`, null, authHeader);
          return json({ success: true }, result.status, corsHeaders);
        }
        const result = await supabaseRequest(env, 'GET', '/notas?select=*&order=updated_at.desc&limit=100');
        return json(result.data, result.status, corsHeaders);
      }

      if (path.startsWith('/api/assinaturas') && method === 'POST') {
        const parsed = await parseBody(request);
        if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
        const result = await supabaseRequest(env, 'POST', '/assinaturas', parsed.data, authHeader);
        return json(result.data, result.status, corsHeaders);
      }

      if (path === '/api/email/send' && method === 'POST') {
        const parsed = await parseBody(request);
        if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
        const { tipo, contrato_id, comprovante_id, destinatario: reqDest, contrato, comprovante, signatario } = parsed.data;
        const destinatario = reqDest || env.EMAIL_RECIPIENT || 'gestores@transobra.com.br';
        const emailTipo = tipo || 'contrato_assinado';

        let emailStatus = 'pendente';
        let erroMsg = null;

        try {
          const result = await sendEmailWithFallback(env, {
            tipo: emailTipo,
            destinatario,
            contrato,
            comprovante,
            signatario,
          });
          emailStatus = result.success ? 'enviado' : 'erro';
          erroMsg = result.error || null;
        } catch (e) {
          erroMsg = e.message;
          emailStatus = 'erro';
        }

        const assunto = buildAssunto(emailTipo, contrato, comprovante);

        try {
          await supabaseRequest(env, 'POST', '/email_logs', {
            contrato_id: contrato_id || null,
            comprovante_id: comprovante_id || null,
            destinatario,
            assunto,
            corpo: JSON.stringify({ tipo: emailTipo, contrato, comprovante, signatario }),
            status: emailStatus,
            erro_msg: erroMsg,
          });
        } catch { /* email logging is best-effort */ }

        return json({ success: emailStatus === 'enviado', status: emailStatus }, 200, corsHeaders);
      }

      if (path.startsWith('/api/edge/')) {
        const rawName = path.replace('/api/edge/', '');
        const funcName = sanitizeEdgeFuncName(rawName);
        if (!funcName) return json({ error: 'Invalid function name' }, 400, corsHeaders);
        let body = null;
        if (method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          body = parsed.data;
        }
        try {
          const edgeUrl = `${env.SUPABASE_URL}/functions/v1/${funcName}`;
          const edgeRes = await fetch(edgeUrl, {
            method,
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await edgeRes.text();
          let edgeData;
          try { edgeData = JSON.parse(text); } catch { edgeData = { raw: text }; }
          return json(edgeData, edgeRes.status, corsHeaders);
        } catch {
          return json({ error: 'Edge function call failed' }, 502, corsHeaders);
        }
      }

      return json({ error: 'API route not found' }, 404, corsHeaders);
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
      const indexRequest = new Request(new URL('/', request.url), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return json({ error: 'Not found' }, 404, corsHeaders);
  },
};
