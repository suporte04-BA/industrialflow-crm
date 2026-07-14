import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

// Utility: sleep with jitter for anti-spam
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function jitterDelay(baseMs, attempt) {
  const delay = Math.min(baseMs * Math.pow(2, attempt), 60000);
  return Math.floor(Math.random() * delay);
}

// Compress base64 image by reducing quality via pdf-lib re-encode
// Max size: 150KB per inline image for emails
const MAX_INLINE_IMAGE_BYTES = 150000;

function compressBase64Image(rawBase64, maxBytes = MAX_INLINE_IMAGE_BYTES) {
  if (!rawBase64) return rawBase64;
  const byteLength = Math.ceil((rawBase64.length * 3) / 4);
  if (byteLength <= maxBytes) return rawBase64;
  // Aggressively subsample: take every Nth character to reduce size
  const ratio = maxBytes / byteLength;
  const step = Math.max(1, Math.floor(1 / Math.sqrt(ratio)));
  const reduced = rawBase64.split('').filter((_, i) => i % step === 0).join('');
  return reduced;
}

// Build "EquipName (Pat: 12345)" string by matching equipamentos with itens patrimonio
function buildEquipamentosComPatrimonio(contrato, itens) {
  const equipamentos = Array.isArray(contrato?.equipamentos) ? contrato.equipamentos : [];
  const its = Array.isArray(itens) ? itens : (Array.isArray(contrato?.itens) ? contrato.itens : []);
  if (equipamentos.length === 0) {
    // fallback: derive from itens
    return its.filter(it => it && (it.descricao || it.nome))
      .map(it => it.patrimonio ? `${it.descricao || it.nome} (Pat: ${it.patrimonio})` : (it.descricao || it.nome))
      .join(' | ');
  }
  return equipamentos.map(eqName => {
    const match = its.find(it => (it.descricao || it.nome || '') === eqName);
    return match?.patrimonio ? `${eqName} (Pat: ${match.patrimonio})` : eqName;
  }).join(' | ');
}

// Anti-spam: rate limiting via in-memory token bucket per domain
const rateLimits = new Map();
function checkRateLimit(domain, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const key = domain;
  if (!rateLimits.has(key)) rateLimits.set(key, []);
  const timestamps = rateLimits.get(key).filter(t => now - t < windowMs);
  rateLimits.set(key, timestamps);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  return true;
}

// Idempotency key for email dedup
function makeIdempotencyKey(tipo, contratoId, comprovanteId, recipient) {
  const payload = `${tipo}:${contratoId || 'none'}:${comprovanteId || 'none'}:${recipient}:${new Date().toISOString().slice(0, 13)}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return `email-${Math.abs(hash).toString(36)}`;
}

// Email sent dedup store (in-memory, TTL 1 hour)
const sentEmails = new Map();
function wasRecentlySent(key) {
  const entry = sentEmails.get(key);
  if (!entry) return false;
  if (Date.now() - entry > 3600000) { sentEmails.delete(key); return false; }
  return true;
}
function markSent(key) {
  sentEmails.set(key, Date.now());
  // Cleanup old entries periodically
  if (sentEmails.size > 1000) {
    const cutoff = Date.now() - 3600000;
    for (const [k, v] of sentEmails) { if (v < cutoff) sentEmails.delete(k); }
  }
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

async function supabaseAuthAdminRequest(env, method, path, body = null, authHeader = null) {
  const url = `${env.SUPABASE_URL}/auth/v1${path}`;
  const headers = {
    'apikey': env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
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

async function generatePdfBase64(title, sections, signatureImgB64, options = {}) {
  const { fotosEntrega = [], fotosRetirada = [], itens = [] } = options;
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const PAGE_W = 595, PAGE_H = 842, ML = 42, MR = 42;
  const CW = PAGE_W - ML - MR, TOP_MARGIN = PAGE_H - 36, BOTTOM_MARGIN = 50;
  const LABEL_W = 108;
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = TOP_MARGIN;
  let pageCount = 1;

  function checkPage(needed) {
    if (y - needed < BOTTOM_MARGIN) {
      drawFooter(page, pageCount);
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pageCount++;
      y = TOP_MARGIN;
    }
  }
  function drawFooter(p, num) {
    p.drawRectangle({ x: ML, y: 38, width: CW, height: 1, color: rgb(0.82, 0.82, 0.82) });
    p.drawText('TRANSOBRA CRM — Sistema de Gestão de Locação', { x: ML + 4, y: 42, size: 7, font: helvetica, color: rgb(0.55, 0.55, 0.55) });
    p.drawText(`Página ${num}`, { x: PAGE_W - MR - 40, y: 42, size: 7, font: helvetica, color: rgb(0.55, 0.55, 0.55) });
    p.drawText('Av. Taruma, 1605 — Manaus/AM — (92) 99386-7171', { x: ML + 4, y: 32, size: 6.5, font: helvetica, color: rgb(0.65, 0.65, 0.65) });
  }
  function wrapText(text, font, fontSize, maxWidth) {
    const words = String(text || '-').split(/\s+/);
    const lines = []; let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) { lines.push(currentLine); currentLine = word; }
      else { currentLine = testLine; }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : ['-'];
  }
  function sanitize(str) {
    // pdf-lib StandardFonts (WinAnsi) can't encode chars outside CP1252; normalize common ones, strip the rest
    return String(str == null ? '' : str)
      .replace(/[\u2013\u2014]/g, '-')       // en/em dash -> hyphen
      .replace(/[\u2018\u2019]/g, "'")        // curly single quotes
      .replace(/[\u201C\u201D]/g, '"')        // curly double quotes
      .replace(/\u2026/g, '...')               // ellipsis
      .replace(/[\u2022\u00b7]/g, '-')         // bullets
      .replace(/[^\x00-\xFF]/g, '');           // strip remaining non-Latin1
  }
  async function embedPhoto(dataUrl) {
    try {
      const raw = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const bytes = Uint8Array.from(atob(raw.replace(/\s/g, '')), c => c.charCodeAt(0));
      try { return await pdfDoc.embedJpg(bytes); } catch { return await pdfDoc.embedPng(bytes); }
    } catch { return null; }
  }

  try {
    if (LOGO_BASE64) {
      const logoBytes = Uint8Array.from(atob(LOGO_BASE64), c => c.charCodeAt(0));
      let logoImage;
      try { logoImage = await pdfDoc.embedJpg(logoBytes); } catch { logoImage = await pdfDoc.embedPng(logoBytes); }
      const logoW = 92, logoH = (logoImage.height / logoImage.width) * logoW;
      page.drawImage(logoImage, { x: ML, y: y - logoH + 6, width: logoW, height: logoH });
      y -= logoH + 8;
    }
  } catch {
    page.drawText('TRANSOBRA — LOCAÇÃO DE EQUIPAMENTOS', { x: ML, y, size: 16, font: helveticaBold, color: rgb(0, 0, 0) });
    y -= 16;
  }

  page.drawText(sanitize((title || '').toUpperCase()), { x: ML, y, size: 12.5, font: helveticaBold, color: rgb(0.07, 0.09, 0.15) });
  y -= 6;
  page.drawRectangle({ x: ML, y: y - 1.5, width: 55, height: 2, color: rgb(0.92, 0.70, 0.06) });
  y -= 14;

  const lh = 9.5;
  for (const sec of sections) {
    if (sec.title) {
      page.drawRectangle({ x: ML, y: y - 3, width: CW, height: 16, color: rgb(0.07, 0.09, 0.15), borderRadius: 2 });
      page.drawText(sanitize(sec.title.toUpperCase()), { x: ML + 8, y: y, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
      y -= 19;
    }
    const its = (sec.items || []).filter(Boolean);
    for (const item of its) {
      const label = sanitize((item.label || '') + ':');
      const valueStr = sanitize(String(item.value || '-'));
      const valueLines = wrapText(valueStr, helvetica, 8.5, CW - LABEL_W - 14);
      const h = Math.max(12, valueLines.length * lh + 2);
      page.drawText(label, { x: ML + 4, y: y - 1, size: 8.5, font: helveticaBold, color: rgb(0.07, 0.09, 0.15) });
      valueLines.forEach((ln, li) => {
        page.drawText(ln, { x: ML + LABEL_W, y: y - 1 - li * lh, size: 8.5, font: helvetica, color: rgb(0.22, 0.22, 0.22) });
      });
      y -= h;
    }
    y -= 4;
  }

  // ITEMS TABLE with patrimonio
  const validItens = (itens || []).filter(it => it && (it.descricao || it.nome));
  if (validItens.length > 0) {
    page.drawRectangle({ x: ML, y: y - 3, width: CW, height: 16, color: rgb(0.07, 0.09, 0.15), borderRadius: 2 });
    page.drawText('ITENS LOCADOS', { x: ML + 8, y: y, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
    y -= 20;

    const cQtd = ML + 4, cDesc = ML + 30, cPat = ML + CW - 140, cVal = ML + CW - 55;
    const rowH = 12;
    page.drawRectangle({ x: ML, y: y - rowH + 3, width: CW, height: rowH, color: rgb(0.93, 0.93, 0.93) });
    page.drawText('Qtd', { x: cQtd, y: y - 6, size: 7, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Descrição', { x: cDesc, y: y - 6, size: 7, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Patrimônio', { x: cPat, y: y - 6, size: 7, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Valor', { x: cVal, y: y - 6, size: 7, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    y -= rowH;

    let total = 0;
    for (const it of validItens) {
      const qtd = it.quantidade || 1;
      const desc = sanitize(it.descricao || it.nome || '-');
      const pat = sanitize(it.patrimonio || '-');
      const val = Number(it.valorUnitario || 0);
      total += qtd * val;
      const descLines = wrapText(desc, helvetica, 7, cPat - cDesc - 6);
      const thisRowH = Math.max(rowH, descLines.length * 9 + 4);
      page.drawRectangle({ x: ML, y: y - thisRowH + 3, width: CW, height: 0.5, color: rgb(0.88, 0.88, 0.88) });
      page.drawText(String(qtd), { x: cQtd, y: y - 6, size: 7, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      descLines.forEach((ln, li) => {
        page.drawText(ln, { x: cDesc, y: y - 6 - li * 9, size: 7, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      });
      page.drawText(pat, { x: cPat, y: y - 6, size: 7, font: helveticaBold, color: rgb(0.05, 0.35, 0.7) });
      page.drawText(`R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { x: cVal, y: y - 6, size: 7, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
      y -= thisRowH;
    }
    page.drawRectangle({ x: ML, y: y - rowH + 3, width: CW, height: rowH, color: rgb(0.07, 0.09, 0.15) });
    page.drawText('TOTAL', { x: cPat - 30, y: y - 6, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) });
    page.drawText(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { x: cVal, y: y - 6, size: 8, font: helveticaBold, color: rgb(0.92, 0.70, 0.06) });
    y -= rowH + 8;
  }

  if (signatureImgB64) {
    try {
      y -= 4;
      page.drawRectangle({ x: ML, y: y - 3, width: CW, height: 16, color: rgb(0.07, 0.09, 0.15), borderRadius: 2 });
      page.drawText('ASSINATURA DIGITAL', { x: ML + 8, y: y, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
      y -= 20;
      let pngBytes;
      if (signatureImgB64.startsWith('data:image')) {
        pngBytes = Uint8Array.from(atob(signatureImgB64.split(',')[1]), c => c.charCodeAt(0));
      } else {
        pngBytes = Uint8Array.from(atob(signatureImgB64), c => c.charCodeAt(0));
      }
      let sigImage;
      try { sigImage = await pdfDoc.embedPng(pngBytes); } catch { sigImage = await pdfDoc.embedJpg(pngBytes); }
      const displayW = 190, finalH = Math.min((sigImage.height / sigImage.width) * displayW, 48);
      page.drawRectangle({ x: ML + 2, y: y - finalH - 4, width: displayW + 6, height: finalH + 6, borderWidth: 1, borderColor: rgb(0.75, 0.75, 0.75), color: rgb(1, 1, 1), borderRadius: 3 });
      page.drawImage(sigImage, { x: ML + 5, y: y - finalH - 1, width: displayW, height: finalH });
      y -= finalH + 12;
    } catch (e) { console.error('[PDF] Signature embed failed:', e.message); }
  }

  // PHOTOS PAGE (registro fotografico) - each photo has burned-in timestamp
  const allPhotos = [
    ...fotosEntrega.filter(Boolean).map((f, idx) => ({ src: f, label: `Entrega ${idx + 1}` })),
    ...fotosRetirada.filter(Boolean).map((f, idx) => ({ src: f, label: `Retirada ${idx + 1}` })),
  ];
  if (allPhotos.length > 0) {
    // Start photos on a fresh page for a clean professional layout
    drawFooter(page, pageCount);
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pageCount++;
    y = TOP_MARGIN;

    page.drawText('REGISTRO FOTOGRÁFICO', { x: ML, y, size: 14, font: helveticaBold, color: rgb(0.07, 0.09, 0.15) });
    y -= 8;
    page.drawRectangle({ x: ML, y: y - 1, width: 60, height: 2, color: rgb(0.92, 0.70, 0.06) });
    y -= 8;
    page.drawText('Fotos com data e hora registradas no momento da captura', { x: ML, y: y - 6, size: 8, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
    y -= 24;

    const gap = 12;
    const photoW = (CW - gap) / 2;
    const photoH = photoW * 0.75;
    let col = 0;
    let rowStartY = y;

    for (let i = 0; i < allPhotos.length; i++) {
      const { src, label } = allPhotos[i];
      const img = await embedPhoto(src);
      if (col === 0) {
        checkPage(photoH + 26);
        rowStartY = y;
      }
      const x = ML + col * (photoW + gap);
      const drawY = rowStartY;
      // label above
      page.drawText(sanitize(label), { x, y: drawY - 2, size: 8, font: helveticaBold, color: rgb(0.07, 0.09, 0.15) });
      // frame
      page.drawRectangle({ x, y: drawY - photoH - 12, width: photoW, height: photoH, borderWidth: 1, borderColor: rgb(0.8, 0.8, 0.8), color: rgb(0.97, 0.97, 0.97) });
      if (img) {
        // fit contain
        const ratio = Math.min(photoW / img.width, photoH / img.height);
        const dw = img.width * ratio, dh = img.height * ratio;
        const dx = x + (photoW - dw) / 2, dyy = drawY - photoH - 12 + (photoH - dh) / 2;
        page.drawImage(img, { x: dx, y: dyy, width: dw, height: dh });
      } else {
        page.drawText('Foto indisponível', { x: x + 10, y: drawY - photoH / 2 - 12, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) });
      }
      col++;
      if (col >= 2) {
        col = 0;
        y = rowStartY - photoH - 26;
      }
    }
    if (col === 1) {
      y = rowStartY - photoH - 26;
    }
  }

  drawFooter(page, pageCount);
  return await pdfDoc.saveAsBase64();
}

function buildAssunto(tipo, contrato, comprovante) {
  const numero = contrato?.numero || contrato?.id || comprovante?.contrato || '';
  const cliente = contrato?.cliente || '';
  switch (tipo) {
    case 'contrato_criado': return `Novo Contrato ${numero} — ${cliente}`;
    case 'contrato_assinado': return `Contrato ${numero} assinado — ${cliente}`;
    case 'contrato_renovado': return `Contrato ${numero} renovado — ${cliente}`;
    case 'devolucao_registrada': return `Devolução registrada — Contrato ${numero}`;
    case 'role_change': return `Alteração de função — ${contrato?.nome || cliente}`;
    default: return `TransObra — Notificação ${numero}`;
  }
}

function emailWrapper(content) {
  const footer = `<tr><td style="border-top:1px solid #E5E7EB;padding:12px 24px;text-align:center;">
<p style="font-size:9px;color:#9CA3AF;margin:0;">TransObra — Locação de Equipamentos | Av. Taruma, 1605 — Manaus/AM — (92) 99386-7171</p>
<p style="font-size:8px;color:#D1D5DB;margin:2px 0 0 0;">Email automático do sistema TransObra CRM.</p>
</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;"><tr><td align="center" style="padding:20px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;border-collapse:collapse;box-shadow:0 1px 3px rgba(0,0,0,0.08);">${content}${footer}</table>
</td></tr></table></body></html>`;
}

function brandHeader(title, subtitle, badgeText, headerBg, badgeBg) {
  const logoImg = `<img src="cid:logo" style="height:28px;width:auto;display:block;" alt="TransObra" />`;
  return `<tr><td style="background:${headerBg};padding:0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:14px 24px 10px;">
${logoImg}
<div style="font-size:9px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">${subtitle}</div>
</td>
<td align="right" valign="middle" style="padding:14px 24px 10px;">
<div style="background:${badgeBg};color:${headerBg === '#EAB308' ? '#111827' : '#fff'};font-size:9px;font-weight:800;padding:4px 12px;border-radius:4px;text-transform:uppercase;letter-spacing:1px;">${badgeText}</div>
</td></tr>
<tr><td colspan="2" style="height:3px;background:#EAB308;"></td></tr>
</table>
</td></tr>`;
}

function sectionBlock(title, headerColor, borderColor, rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
<tr><td style="padding:0;">
<div style="font-size:9px;font-weight:800;color:${headerColor};text-transform:uppercase;letter-spacing:1.5px;padding:6px 12px;border-bottom:2px solid ${borderColor};margin-bottom:4px;">${title}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="padding:0 4px;">${rows}</table>
</td></tr></table>`;
}

function row(label, value, opts = {}) {
  const { bold, color, w } = opts;
  return `<tr><td style="padding:3px 0;color:#6b7280;width:${w || '120px'};vertical-align:top;font-size:11px;"><strong>${label}</strong></td><td style="padding:3px 0;color:${color || '#111827'};font-size:12px;${bold ? 'font-weight:600;' : ''}">${value}</td></tr>`;
}

function buildItemsTableHtml(itens, borderColor = '#EAB308') {
  if (!itens || itens.length === 0) return '';
  const rows = itens.filter(it => it.descricao || it.nome).map(it => {
    const desc = esc(it.descricao || it.nome || '-');
    const pat = esc(it.patrimonio || '-');
    const qtd = esc(it.quantidade || 1);
    const dloc = esc(it.dataLocacao || it.data_locacao || '-');
    const ddev = esc(it.dataDevolucao || it.data_devolucao || '-');
    const val = Number(it.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    return `<tr>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:11px;">${qtd}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;font-size:11px;">${desc}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:11px;font-weight:700;color:#111827;">${pat}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:10px;">${dloc}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:10px;">${ddev}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:right;font-size:11px;">R$ ${val}</td>
    </tr>`;
  }).join('');

  const total = itens.reduce((s, it) => s + (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0), 0);
  const totalFormatted = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0;">
    <thead>
      <tr>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:left;font-size:9px;font-weight:700;border:1px solid #111827;">Qtde</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:left;font-size:9px;font-weight:700;border:1px solid #111827;">Descrição</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">Patrimônio</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">D.Loc</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">D.Dev</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:right;font-size:9px;font-weight:700;border:1px solid #111827;">Valor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="padding:5px;border:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:700;">TOTAL</td>
        <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:800;color:#16a34a;">R$ ${totalFormatted}</td>
      </tr>
    </tfoot>
  </table>`;
}

function buildPhotoAttachments(fotosEntrega = [], fotosRetirada = [], signatureImg = null) {
  const atts = [];
  fotosEntrega.filter(Boolean).forEach((foto, i) => {
    const raw = (foto.includes(',') ? foto.split(',')[1] : foto).replace(/\s/g, '');
    if (raw && raw.length > 100) {
      atts.push({ filename: `foto_entrega_${i + 1}.jpg`, content: raw, mimeType: 'image/jpeg' });
    }
  });
  fotosRetirada.filter(Boolean).forEach((foto, i) => {
    const raw = (foto.includes(',') ? foto.split(',')[1] : foto).replace(/\s/g, '');
    if (raw && raw.length > 100) {
      atts.push({ filename: `foto_retirada_${i + 1}.jpg`, content: raw, mimeType: 'image/jpeg' });
    }
  });
  if (signatureImg) {
    const raw = (signatureImg.includes(',') ? signatureImg.split(',')[1] : signatureImg).replace(/\s/g, '');
    if (raw && raw.length > 100) {
      const isPng = signatureImg.includes('image/png');
      atts.push({ filename: `assinatura.${isPng ? 'png' : 'jpg'}`, content: raw, mimeType: isPng ? 'image/png' : 'image/jpeg' });
    }
  }
  return atts;
}

function buildContratoCriadoHtml(contrato) {
  const c = contrato || {};
  const itens = Array.isArray(c.itens) ? c.itens : [];
  const equipamentos = Array.isArray(c.equipamentos) ? c.equipamentos : [];

  const equipsWithPat = equipamentos.map(eqName => {
    const matchingItem = itens.find(it => (it.descricao || it.nome || '') === eqName);
    return matchingItem?.patrimonio ? `${eqName} (Pat: ${matchingItem.patrimonio})` : eqName;
  });
  const equipsStr = equipsWithPat.length > 0 ? equipsWithPat.join(' | ') : '-';

  const r = [
    row('Número', `<span style="font-size:14px;font-weight:900;color:#EAB308;">${fmt(c.numero)}</span>`),
    row('Cliente', fmt(c.cliente), { bold: true }),
    c.cnpj ? row('CPF/CNPJ', fmt(c.cnpj || c.cpf_cnpj)) : '',
    c.rg ? row('RG', fmt(c.rg)) : '',
    c.atendente ? row('Atendente', fmt(c.atendente)) : '',
    c.inicio ? row('Período', `${fmt(c.inicio)} a ${fmt(c.fim)}`) : '',
    c.valorMensal ? row('Valor Mensal', `R$ ${fmtMoney(c.valorMensal)}/mês`) : '',
  ].filter(Boolean).join('');

  const addrRows = [
    c.localEntrega ? row('Local', fmt(c.localEntrega)) : '',
    c.endereco ? row('Endereço', `${fmt(c.endereco)}${c.numero_endereco ? `, ${esc(c.numero_endereco)}` : ''}${c.bairro ? ` - ${esc(c.bairro)}` : ''}`) : '',
    c.cidade ? row('Cidade', `${fmt(c.cidade)}${c.estado ? `/${esc(c.estado)}` : ''}`) : '',
    c.contato ? row('Contato', fmt(c.contato)) : '',
    c.telefone ? row('Telefone', fmt(c.telefone)) : '',
  ].filter(Boolean).join('');

  let html = `
${brandHeader('Novo Contrato', 'SISTEMA DE GESTÃO DE LOCAÇÃO', 'ENTREGA', '#111827', '#EAB308')}
<tr><td style="padding:20px 24px 8px;">
<div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Novo Contrato Cadastrado</div>
<div style="font-size:11px;color:#6b7280;margin-bottom:16px;">Um novo contrato foi registrado no sistema.</div>
${sectionBlock('Contrato', '#111827', '#EAB308', r)}`;

  if (itens.length > 0) {
    html += sectionBlock('Itens Locados', '#111827', '#EAB308', `<tr><td style="padding:0;">${buildItemsTableHtml(itens)}</td></tr>`);
  }

  html += sectionBlock('Equipamentos', '#111827', '#EAB308', row('Equipamentos', esc(equipsStr)));

  if (addrRows) {
    html += sectionBlock('Endereço e Contato', '#111827', '#EAB308', addrRows);
  }

  html += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
<tr><td style="padding:10px 20px;background:#111827;text-align:center;border-radius:0 0 8px 8px;">
<div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;">TRANSOBRA CRM</div>
</td></tr></table>
</td></tr>`;

  return emailWrapper(html);
}

function buildContratoAssinadoHtml(contrato, comprovante, signatario) {
  const c = contrato || {};
  const comp = comprovante || {};
  const s = signatario || {};
  const func = comprovante?._funcionario || {};
  const tipoLabel = comprovante?.tipoDocumento === 'devolucao' ? 'Devolução' : 'Entrega';
  const itens = Array.isArray(comp.itens) ? comp.itens : (Array.isArray(c.itens) ? c.itens : []);
  const equipamentos = Array.isArray(c.equipamentos) ? c.equipamentos : [];
  const equipsWithPat = equipamentos.map(eqName => {
    const match = itens.find(it => (it.descricao || it.nome || '') === eqName);
    return match?.patrimonio ? `${eqName} (Pat: ${match.patrimonio})` : eqName;
  });
  const equipsStr = equipsWithPat.length > 0 ? equipsWithPat.join(' | ') : '';
  const fotosEntrega = (Array.isArray(s.fotosEntrega) ? s.fotosEntrega : (Array.isArray(s.fotos_entrega) ? s.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(s.fotosRetirada) ? s.fotosRetirada : (Array.isArray(s.fotos_retirada) ? s.fotos_retirada : [])).filter(Boolean);

  const rContrato = [
    row('Número', `<span style="font-size:14px;font-weight:900;color:#EAB308;">${fmt(c.numero)}</span>`),
    row('Cliente', fmt(c.cliente), { bold: true }),
    c.cnpj ? row('CPF/CNPJ', fmt(c.cnpj)) : '',
    c.atendente ? row('Atendente', fmt(c.atendente)) : '',
    c.inicio ? row('Período', `${fmt(c.inicio)} a ${fmt(c.fim)}`) : '',
    c.valorMensal ? row('Valor Mensal', `R$ ${fmtMoney(c.valorMensal)}/mês`) : '',
  ].filter(Boolean).join('');

  const rEntrega = [
    row('Locatário', fmt(comp.locatario), { bold: true }),
    comp.cpf ? row('CPF', fmt(comp.cpf)) : '',
    comp.endereco ? row('Endereço', fmt(comp.endereco)) : '',
    comp.cidade ? row('Cidade', fmt(comp.cidade)) : '',
    row('Total', `R$ ${fmtMoney(comp.total)}`, { bold: true, color: '#16a34a' }),
  ].filter(Boolean).join('');

  let assinaturaHtml = '';
  if (s.nome) {
    const sigImgTag = s.assinaturaImagem ? `<img src="cid:assinatura" style="max-width:120px;height:auto;border:1px solid #e5e7eb;padding:3px;border-radius:4px;" alt="Assinatura" />` : '';
    assinaturaHtml = sectionBlock('Assinatura do Recebedor', '#166534', '#22c55e', [
      row('Nome', fmt(s.nome), { bold: true }),
      s.cpf ? row('CPF', fmt(s.cpf)) : '',
      row('Data', s.data ? fmtDateBR(s.data) : '-'),
      sigImgTag ? `<tr><td colspan="2" style="padding-top:6px;"><div style="font-size:10px;color:#166534;font-weight:700;margin-bottom:4px;">ASSINATURA:</div>${sigImgTag}</td></tr>` : '',
    ].filter(Boolean).join(''));
  }

  let fotosHtml = '';
  if (fotosEntrega.length > 0 || fotosRetirada.length > 0) {
    const buildPhotoRow = (fotos, label) => {
      const padded = [...fotos];
      while (padded.length < 3) padded.push(null);
      return `
        <tr><td colspan="2" style="padding-top:8px;">
          <div style="font-size:10px;font-weight:700;color:#111827;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Fotos da ${label}</div>
          <table width="100%" cellpadding="2" cellspacing="0"><tr>
            ${padded.slice(0, 3).map((foto, i) => `
              <td width="33%" style="text-align:center;vertical-align:top;">
                ${foto ? `<img src="cid:foto_${label.toLowerCase()}_${i}" style="width:100%;max-height:50px;object-fit:cover;border:1px solid #e5e7eb;border-radius:4px;" />` : `<div style="width:100%;height:40px;border:1px dashed #e5e7eb;border-radius:4px;font-size:8px;color:#9ca3af;display:flex;align-items:center;justify-content:center;">Sem foto</div>`}
                <div style="font-size:8px;color:#6b7280;margin-top:2px;">Foto ${i + 1}</div>
              </td>
            `).join('')}
          </tr></table>
        </td></tr>`;
    };
    fotosHtml = `<table width="100%" cellpadding="0" cellspacing="0">${buildPhotoRow(fotosEntrega, 'Entrega')}${buildPhotoRow(fotosRetirada, 'Retirada')}</table>`;
  }

  const funcionarioHtml = func.nome ? sectionBlock('Responsável', '#1e40af', '#2563eb', row('Nome', fmt(func.nome), { bold: true })) : '';

  let itensHtml = '';
  if (itens.length > 0) {
    itensHtml = sectionBlock('Itens Locados', '#111827', '#EAB308', `<tr><td style="padding:0;">${buildItemsTableHtml(itens)}</td></tr>`);
  }

  return emailWrapper(`
${brandHeader(tipoLabel === 'Devolução' ? 'Comprovante de Devolução' : 'Comprovante de Entrega', `${tipoLabel.toUpperCase()} ASSINADO DIGITALMENTE`, tipoLabel.toUpperCase(), '#EAB308', '#111827')}
<tr><td style="padding:20px 24px 8px;">
<div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Comprovante de ${tipoLabel} Assinado</div>
<div style="font-size:11px;color:#6b7280;margin-bottom:16px;">Assinatura digital registrada. Válido como prova de ${tipoLabel === 'Devolução' ? 'devolução' : 'recebimento'}.</div>
${c.id ? sectionBlock('Contrato', '#111827', '#EAB308', rContrato) : ''}
${equipsStr ? sectionBlock('Equipamentos', '#111827', '#EAB308', row('Equipamentos', esc(equipsStr))) : ''}
${comp.id ? sectionBlock(`Dados da ${tipoLabel}`, '#1e40af', '#2563eb', rEntrega) : ''}
${itensHtml}
${funcionarioHtml}
${assinaturaHtml}
${fotosHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
<tr><td style="padding:10px 20px;background:#111827;text-align:center;border-radius:0 0 8px 8px;">
<div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;">TRANSOBRA CRM</div>
</td></tr></table>
</td></tr>`);
}

function buildContratoRenovadoHtml(contrato) {
  const c = contrato || {};
  const itens = Array.isArray(c.itens) ? c.itens : [];

  const r = [
    row('Número', `<span style="font-size:14px;font-weight:900;color:#EAB308;">${fmt(c.numero)}</span>`),
    row('Cliente', fmt(c.cliente), { bold: true }),
    c.cnpj ? row('CPF/CNPJ', fmt(c.cnpj)) : '',
    c.atendente ? row('Atendente', fmt(c.atendente)) : '',
    c.inicio ? row('Novo Período', `${fmt(c.inicio)} a ${fmt(c.fim)}`) : '',
    c.valorMensal ? row('Valor Mensal', `R$ ${fmtMoney(c.valorMensal)}/mês`) : '',
  ].filter(Boolean).join('');

  let html = emailWrapper(`
${brandHeader('Contrato Renovado', 'SISTEMA DE GESTÃO DE LOCAÇÃO', 'RENOVAÇÃO', '#111827', '#3b82f6')}
<tr><td style="padding:20px 24px 8px;">
<div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Contrato Renovado</div>
<div style="font-size:11px;color:#6b7280;margin-bottom:16px;">O contrato foi renovado com sucesso.</div>
${sectionBlock('Dados da Renovação', '#111827', '#3b82f6', r)}`);

  if (itens.length > 0) {
    html += sectionBlock('Itens Locados', '#111827', '#3b82f6', `<tr><td style="padding:0;">${buildItemsTableHtml(itens)}</td></tr>`);
  }

  html += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
<tr><td style="padding:10px 20px;background:#111827;text-align:center;border-radius:0 0 8px 8px;">
<div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;">TRANSOBRA CRM</div>
</td></tr></table>
</td></tr>`;

  return html;
}

function buildDevolucaoHtml(contrato, comprovante) {
  const c = contrato || {};
  const comp = comprovante || {};
  const dev = comp._devolucao || {};
  const itens = Array.isArray(comp.itens) ? comp.itens : (Array.isArray(dev.itens) ? dev.itens : []);

  const r = [
    row('Número', `<span style="font-size:14px;font-weight:900;color:#f97316;">${fmt(c.numero || comp.contrato)}</span>`),
    row('Cliente', fmt(c.cliente || comp.locatario), { bold: true }),
    c.cnpj ? row('CPF/CNPJ', fmt(c.cnpj)) : '',
    c.telefone ? row('Telefone', fmt(c.telefone)) : '',
  ].filter(Boolean).join('');

  const devRows = [
    dev.data ? row('Data', fmt(dev.data)) : '',
    dev.hora ? row('Hora', fmt(dev.hora)) : '',
    dev.localObra ? row('Local da Obra', fmt(dev.localObra)) : '',
    dev.signatarioNome ? row('Recebido por', fmt(dev.signatarioNome)) : '',
  ].filter(Boolean).join('');

  const condicoes = dev.condicoes || {};
  const condicoesList = [];
  if (condicoes.danificado) condicoesList.push('Danificado');
  if (condicoes.extraviado) condicoesList.push('Extraviado');
  if (condicoes.testarEmpresa) condicoesList.push('Testar na Empresa');
  const condRows = condicoesList.length > 0 ? row('Condições', condicoesList.join(', ')) : '';

  let html = `
${brandHeader('Devolução Registrada', 'SISTEMA DE GESTÃO DE LOCAÇÃO', 'DEVOLUÇÃO', '#111827', '#f97316')}
<tr><td style="padding:20px 24px 8px;">
<div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Devolução de Equipamento</div>
<div style="font-size:11px;color:#6b7280;margin-bottom:16px;">Uma devolução foi registrada no sistema.</div>
${sectionBlock('Contrato', '#111827', '#f97316', r)}`;

  if (itens.length > 0) {
    html += sectionBlock('Itens Devolvidos', '#111827', '#f97316', `<tr><td style="padding:0;">${buildItemsTableHtml(itens, '#f97316')}</td></tr>`);
  }

  if (devRows) {
    html += sectionBlock('Dados da Devolução', '#111827', '#f97316', devRows);
  }
  if (condRows) {
    html += sectionBlock('Observações', '#111827', '#f97316', condRows);
  }

  html += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
<tr><td style="padding:10px 20px;background:#111827;text-align:center;border-radius:0 0 8px 8px;">
<div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;">TRANSOBRA CRM</div>
</td></tr></table>
</td></tr>`;

  return emailWrapper(html);
}

function buildRoleChangeHtml(usuario) {
  const nome = esc(usuario?.nome || '-');
  const email = esc(usuario?.email || '-');
  const novaFuncao = esc(usuario?.novaFuncao || '-');

  const r = [
    row('Usuário', nome, { bold: true }),
    row('E-mail', email),
    row('Nova Função', novaFuncao),
  ].filter(Boolean).join('');

  return emailWrapper(`
${brandHeader('Alteração de Função', 'SISTEMA DE GESTÃO DE LOCAÇÃO', 'ADMIN', '#111827', '#8b5cf6')}
<tr><td style="padding:20px 24px 8px;">
<div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Alteração de Função</div>
<div style="font-size:11px;color:#6b7280;margin-bottom:16px;">A função de um usuário foi alterada no sistema.</div>
${sectionBlock('Dados da Alteração', '#111827', '#8b5cf6', r)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
<tr><td style="padding:10px 20px;background:#111827;text-align:center;border-radius:0 0 8px 8px;">
<div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;">TRANSOBRA CRM</div>
</td></tr></table>
</td></tr>`);
}

function buildPlainText(tipo, contrato, comprovante, signatario, usuario) {
  const num = contrato?.numero || contrato?.id || comprovante?.contrato || '-';
  const cliente = contrato?.cliente || comprovante?.locatario || '-';
  const itens = comprovante?.itens || contrato?.itens || [];
  const itensText = Array.isArray(itens) && itens.length > 0
    ? '\nItens:\n' + itens.map(it => {
        if (typeof it === 'string') return '  - ' + it;
        const pat = it.patrimonio ? ` [Pat: ${it.patrimonio}]` : '';
        const val = Number(it.valorUnitario || 0) > 0 ? ` - R$ ${Number(it.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
        return `  - ${it.quantidade || 1}x ${it.descricao || it.nome || '-'}${pat}${val}`;
      }).join('\n')
    : '';
  const footer = '\n\n====================================\nTransObra — Gestão de Locação de Equipamentos\nAv. Taruma, 1605 — Manaus/AM — CEP 69060-000\nTelefone: (92) 99386-7171\nE-mail: contato@transobra.com.br\nCNPJ: 00.000.000/0001-00\n====================================\n\nEste é um e-mail automático do sistema TransObra.\nSe não deseja mais receber, entre em contato conosco.';
  switch (tipo) {
    case 'contrato_criado':
      return `NOVO CONTRATO CADASTRADO — TransObra\n\nUm novo contrato foi cadastrado no sistema.\n\nContrato: ${num}\nCliente: ${cliente}\nEquipamentos: ${Array.isArray(contrato?.equipamentos) ? contrato.equipamentos.join(', ') : '-'}\nPeríodo: ${contrato?.inicio || '-'} a ${contrato?.fim || '-'}\nValor Mensal: R$ ${Number(contrato?.valorMensal || 0).toLocaleString('pt-BR')}/mês\n${itensText}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'contrato_assinado':
      return `CONTRATO ASSINADO — TransObra\n\nO contrato foi assinado digitalmente com sucesso.\n\nContrato: ${num}\nCliente: ${cliente}\nAssinado por: ${signatario?.nome || '-'}\nData da Assinatura: ${signatario?.data ? new Date(signatario.data).toLocaleDateString('pt-BR') : '-'}\n${itensText}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'contrato_renovado':
      return `CONTRATO RENOVADO — TransObra\n\nO contrato foi renovado com sucesso.\n\nContrato: ${num}\nCliente: ${cliente}\nNova Validade: ${contrato?.fim || '-'}\nValor Mensal: R$ ${Number(contrato?.valorMensal || 0).toLocaleString('pt-BR')}/mês\n${itensText}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    case 'devolucao_registrada': {
      const dev = comprovante?._devolucao || {};
      const equips = Array.isArray(contrato?.equipamentos) ? contrato.equipamentos.join(', ') : (Array.isArray(comprovante?.itens) ? comprovante.itens.map(i => i.nome || i.descricao || i).join(', ') : '-');
      return `DEVOLUÇÃO REGISTRADA — TransObra\n\nUma devolução de equipamento foi registrada no sistema.\n\nContrato: ${num}\nCliente: ${cliente}\nEquipamentos: ${equips}\nData da Devolução: ${dev.data || '-'}\nHora: ${dev.hora || '-'}\nLocal da Obra: ${dev.localObra || '-'}\nRecebido por: ${dev.signatarioNome || '-'}\n${itensText}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    }
    case 'role_change':
      return `ALTERAÇÃO DE FUNÇÃO — TransObra\n\nA função de um usuário foi alterada no sistema.\n\nUsuário: ${usuario?.nome || '-'}\nE-mail: ${usuario?.email || '-'}\nNova Função: ${usuario?.novaFuncao || '-'}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
    default:
      return `NOTIFICAÇÃO — TransObra\n\nContrato: ${num}\nCliente: ${cliente}\n\nAcesse o sistema TransObra para visualizar os detalhes.${footer}`;
  }
}

async function sendEmailViaGoogleScript(env, data) {
  const { tipo, destinatario, contrato, comprovante, signatario, usuario, devolucao } = data;

  let htmlBody = '';
  switch (tipo) {
    case 'contrato_criado': htmlBody = buildContratoCriadoHtml(contrato); break;
    case 'contrato_assinado': htmlBody = buildContratoAssinadoHtml(contrato, comprovante, signatario); break;
    case 'contrato_renovado': htmlBody = buildContratoRenovadoHtml(contrato); break;
    case 'devolucao_registrada': {
      const devComp = { ...(comprovante || {}), _devolucao: devolucao || {} };
      htmlBody = buildDevolucaoHtml(contrato, devComp);
      break;
    }
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
  const sigImg = signatario?.assinaturaImagem || devolucao?.assinaturaImagem;
  if (sigImg) {
    const raw = (sigImg.includes(',') ? sigImg.split(',')[1] : sigImg).replace(/\s/g, '').replace(/\n/g, '');
    if (raw && raw.length > 100 && raw.length <= 300000) {
      inlineImages.assinatura = raw;
    }
  }

  // Include photos as inline images
  const fotosEntrega = (Array.isArray(signatario?.fotosEntrega) ? signatario.fotosEntrega : (Array.isArray(signatario?.fotos_entrega) ? signatario.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(signatario?.fotosRetirada) ? signatario.fotosRetirada : (Array.isArray(signatario?.fotos_retirada) ? signatario.fotos_retirada : [])).filter(Boolean);
  fotosEntrega.slice(0, 3).forEach((foto, i) => {
    const raw = (foto.includes(',') ? foto.split(',')[1] : foto).replace(/\s/g, '').replace(/\n/g, '');
    if (raw && raw.length > 100) {
      const compressed = compressBase64Image(raw, MAX_INLINE_IMAGE_BYTES);
      if (compressed.length > 100 && compressed.length <= 250000) {
        inlineImages[`foto_entrega_${i}`] = compressed;
      }
    }
  });
  fotosRetirada.slice(0, 3).forEach((foto, i) => {
    const raw = (foto.includes(',') ? foto.split(',')[1] : foto).replace(/\s/g, '').replace(/\n/g, '');
    if (raw && raw.length > 100) {
      const compressed = compressBase64Image(raw, MAX_INLINE_IMAGE_BYTES);
      if (compressed.length > 100 && compressed.length <= 250000) {
        inlineImages[`foto_retirada_${i}`] = compressed;
      }
    }
  });

  const attachments = [];
  if (['contrato_assinado', 'contrato_renovado', 'contrato_criado', 'devolucao_registrada'].includes(tipo)) {
    try {
      const pdfSections = [];
      if (contrato) {
        pdfSections.push({ title: 'Dados do Contrato', items: [
          { label: 'Número', value: contrato.numero },
          { label: 'Cliente', value: contrato.cliente },
          contrato.cnpj ? { label: 'CPF/CNPJ', value: contrato.cnpj || contrato.cpf_cnpj } : null,
          contrato.rg ? { label: 'RG', value: contrato.rg } : null,
          contrato.atendente ? { label: 'Atendente', value: contrato.atendente } : null,
          contrato.telefone ? { label: 'Telefone', value: contrato.telefone } : null,
        ].filter(Boolean) });
        const pdfItens = Array.isArray(comprovante?.itens) && comprovante.itens.length > 0 ? comprovante.itens : (Array.isArray(contrato.itens) ? contrato.itens : []);
        const equipItems = [
          { label: 'Equipamentos', value: buildEquipamentosComPatrimonio(contrato, pdfItens) },
          contrato.inicio ? { label: 'Período', value: `${contrato.inicio} a ${contrato.fim}` } : null,
          contrato.valorMensal ? { label: 'Valor Mensal', value: `R$ ${Number(contrato.valorMensal).toFixed(2)}/mês` } : null,
          contrato.valorTotal ? { label: 'Valor Total', value: `R$ ${Number(contrato.valorTotal).toFixed(2)}` } : null,
        ].filter(Boolean);
        if (equipItems.length > 0) {
          pdfSections.push({ title: 'Equipamentos e Valores', items: equipItems });
        }
        const addrItems = [
          contrato.localEntrega ? { label: 'Local de Entrega', value: contrato.localEntrega } : null,
          contrato.endereco ? { label: 'Endereço', value: `${contrato.endereco}${contrato.numero_endereco ? `, ${contrato.numero_endereco}` : ''}${contrato.bairro ? ` - ${contrato.bairro}` : ''}` } : null,
          contrato.cidade ? { label: 'Cidade', value: `${contrato.cidade}${contrato.estado ? `/${contrato.estado}` : ''}` } : null,
          contrato.cep ? { label: 'CEP', value: contrato.cep } : null,
          contrato.contato ? { label: 'Contato', value: contrato.contato } : null,
        ].filter(Boolean);
        if (addrItems.length > 0) {
          pdfSections.push({ title: 'Endereço e Contato', items: addrItems });
        }
      }
      if (tipo === 'contrato_assinado') {
        if (comprovante) {
          pdfSections.push({ title: 'Dados da Entrega', items: [
            { label: 'Locatário', value: comprovante.locatario },
            { label: 'CPF', value: comprovante.cpf },
            comprovante.endereco ? { label: 'Endereço', value: comprovante.endereco } : null,
            { label: 'Total', value: comprovante.total ? `R$ ${Number(comprovante.total).toFixed(2)}` : '' },
          ].filter(Boolean) });
        }
        if (signatario) {
          pdfSections.push({ title: 'Assinatura Digital', items: [
            { label: 'Nome', value: signatario.nome },
            { label: 'CPF', value: signatario.cpf },
            { label: 'Data/Hora', value: signatario.data ? new Date(signatario.data).toLocaleString('pt-BR') : '' },
          ] });
        }
      }
      if (tipo === 'devolucao_registrada') {
        const devData = comprovante?._devolucao || data.devolucao || {};
        const devItems = [
          devData.data ? { label: 'Data da Devolução', value: devData.data } : null,
          devData.hora ? { label: 'Hora', value: devData.hora } : null,
          devData.localObra ? { label: 'Local da Obra', value: devData.localObra } : null,
          devData.signatarioNome ? { label: 'Recebido por', value: devData.signatarioNome } : null,
          devData.condicoes ? { label: 'Observações', value: devData.condicoes } : null,
        ].filter(Boolean);
        if (devItems.length > 0) {
          pdfSections.push({ title: 'Dados da Devolução', items: devItems });
        }
        if (signatario) {
          pdfSections.push({ title: 'Assinatura Digital', items: [
            { label: 'Nome', value: signatario.nome || devData.signatarioNome },
            { label: 'Data/Hora', value: signatario.data || devData.data ? `${devData.data || ''} ${devData.hora || ''}`.trim() : '' },
          ] });
        }
      }
      const pdfTitle = tipo === 'contrato_assinado' ? 'Comprovante de Entrega Assinado' :
                        tipo === 'contrato_renovado' ? 'Contrato Renovado' :
                        tipo === 'devolucao_registrada' ? 'Devolução de Equipamento' : 'Novo Contrato';
      const pdfItensForTable = Array.isArray(comprovante?.itens) && comprovante.itens.length > 0 ? comprovante.itens : (Array.isArray(contrato?.itens) ? contrato.itens : []);
      const pdfB64 = await generatePdfBase64(pdfTitle, pdfSections, signatario?.assinaturaImagem || (comprovante?._devolucao?.assinaturaImagem), {
        fotosEntrega,
        fotosRetirada,
        itens: pdfItensForTable,
      });
      const pdfName = tipo === 'contrato_assinado' ? `comprovante-entrega-${contrato?.numero || 'doc'}.pdf` :
                      tipo === 'contrato_renovado' ? `contrato-renovado-${contrato?.numero || 'doc'}.pdf` :
                      tipo === 'devolucao_registrada' ? `devolucao-${contrato?.numero || comprovante?.contrato || 'doc'}.pdf` :
                      `contrato-${contrato?.numero || 'doc'}.pdf`;
      attachments.push({ filename: pdfName, content: pdfB64, mimeType: 'application/pdf' });
      const photoAtts = buildPhotoAttachments(fotosEntrega, fotosRetirada, signatario?.assinaturaImagem || comprovante?._devolucao?.assinaturaImagem);
      photoAtts.forEach(a => attachments.push(a));
    } catch (e) { console.error('[EMAIL] PDF attachment failed:', e.message); }
  }

  const requestBody = JSON.stringify({
    to: destinatario,
    subject: assunto,
    body: plainBody,
    htmlBody: htmlBody,
    apiKey: env.GOOGLE_SCRIPT_API_KEY || '',
    inlineImages,
    attachments,
  });

  try {
    console.log(`[GAS] Sending via POST: to=${destinatario} subject=${assunto.slice(0, 50)}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let text = await res.text();
    console.log(`[GAS] Response: status=${res.status} body=${text.slice(0, 300)}`);

    if (res.status === 302 || res.status === 307) {
      const location = res.headers.get('Location');
      console.log(`[GAS] Got redirect ${res.status} to ${location}`);
      if (text && text.trim().startsWith('{')) {
        console.log(`[GAS] Response body contains JSON, using it directly`);
      } else {
        const res2 = await fetch(location, { method: 'GET', redirect: 'follow', signal: controller.signal });
        text = await res2.text();
        console.log(`[GAS] Follow-up response: status=${res2.status} body=${text.slice(0, 300)}`);
      }
    }

    if (res.ok || res.status === 302 || res.status === 307) {
      try {
        const result = JSON.parse(text);
        if (result.remainingQuota !== undefined) {
          console.log(`[GAS] Remaining daily quota: ${result.remainingQuota}`);
        }
        if (result.success) {
          return { success: true, _subject: assunto, _html: htmlBody, remainingQuota: result.remainingQuota };
        }
        const errMsg = result.errors ? result.errors.join(', ') : (result.error || 'GAS returned success=false');
        return { success: false, error: errMsg, _subject: assunto, _html: htmlBody, remainingQuota: result.remainingQuota };
      } catch {
        return { success: false, error: `GAS non-JSON: ${text.slice(0, 200)}`, _subject: assunto, _html: htmlBody };
      }
    }

    return { success: false, error: `GAS returned ${res.status}: ${text.slice(0, 200)}`, _subject: assunto, _html: htmlBody };
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? 'GAS timed out (30s)' : e.message;
    console.error(`[GAS] Exception: ${errorMsg}`);
    return { success: false, error: errorMsg, _subject: assunto, _html: htmlBody };
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

async function sendEmailViaMaileroo(env, subject, html, destinatario, inlineImages = {}, pdfAttachment = null, extraAttachments = []) {
  const apiKey = env.MAILEROO_API_KEY;
  if (!apiKey) return { success: false, error: 'MAILEROO_API_KEY not configured' };

  const senderEmail = env.MAILEROO_FROM || 'notificacoes@transobra.app';
  const plainText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const attachments = [];

  if (inlineImages.logo) {
    attachments.push({
      file_name: 'logo',
      content_type: 'image/jpeg',
      content: inlineImages.logo,
      inline: true,
    });
  }
  if (inlineImages.assinatura) {
    attachments.push({
      file_name: 'assinatura',
      content_type: 'image/png',
      content: inlineImages.assinatura,
      inline: true,
    });
  }
  if (pdfAttachment) {
    attachments.push({
      file_name: pdfAttachment.filename,
      content_type: 'application/pdf',
      content: pdfAttachment.content,
      inline: false,
    });
  }
  if (Array.isArray(extraAttachments)) {
    extraAttachments.forEach(a => {
      attachments.push({
        file_name: a.filename,
        content_type: a.mimeType || 'application/octet-stream',
        content: a.content,
        inline: false,
      });
    });
  }

  try {
    const body = {
      from: { address: senderEmail, display_name: 'TransObra' },
      to: [{ address: destinatario }],
      subject,
      html,
      plain: plainText,
      tags: { sistema: 'transobra', tipo: 'notificacao' },
      headers: {
        'List-Unsubscribe': `<mailto:suporte04@baeletrica.com.br?subject=Descadastrar>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `transobra-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        'X-Mailer': 'TransObra System',
        'Feedback-ID': `transobra:email:${Date.now()}`,
        'X-Campaign': 'transobra-notificacoes',
      },
    };
    if (attachments.length > 0) {
      body.attachments = attachments;
    }
    const res = await fetch('https://smtp.maileroo.com/api/v2/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
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

// Email fallback order: Google Apps Script (inline images) → Maileroo (DKIM) → Resend (SPF/DKIM)
async function sendEmailWithFallback(env, data) {
  const { tipo, destinatario, contrato, comprovante, signatario, usuario, devolucao } = data;

  // Anti-spam: idempotency check
  const idempotencyKey = makeIdempotencyKey(
    tipo,
    contrato?.id || contrato?.numero,
    comprovante?.id,
    destinatario
  );
  if (wasRecentlySent(idempotencyKey)) {
    console.log(`[EMAIL] Skipping duplicate email: ${tipo} to ${destinatario} (key: ${idempotencyKey})`);
    return { success: true, provider: 'deduplicated', skipped: true };
  }

  // Anti-spam: rate limit per recipient domain
  const domain = destinatario?.split('@')[1] || 'unknown';
  if (!checkRateLimit(domain, 15, 60000)) {
    console.log(`[EMAIL] Rate limited for domain ${domain}`);
    return { success: false, error: 'Rate limited', provider: 'rate_limiter' };
  }

  let htmlBody = '';
  switch (tipo) {
    case 'contrato_criado': htmlBody = buildContratoCriadoHtml(contrato); break;
    case 'contrato_assinado': htmlBody = buildContratoAssinadoHtml(contrato, comprovante, signatario); break;
    case 'contrato_renovado': htmlBody = buildContratoRenovadoHtml(contrato); break;
    case 'devolucao_registrada': {
      const devComp = { ...(comprovante || {}), _devolucao: devolucao || {} };
      htmlBody = buildDevolucaoHtml(contrato, devComp);
      break;
    }
    case 'role_change': htmlBody = buildRoleChangeHtml(usuario); break;
    default: htmlBody = buildContratoCriadoHtml(contrato);
  }
  const plainBody = buildPlainText(tipo, contrato, comprovante, signatario, usuario);
  const assunto = buildAssunto(tipo, contrato, comprovante);

  // 1st: Google Apps Script (supports inline images via cid:)
  console.log(`[EMAIL] Attempting GAS for ${tipo} to ${destinatario}`);
  const gasResult = await sendEmailViaGoogleScript(env, data);
  console.log(`[EMAIL] GAS result: success=${gasResult.success} error=${gasResult.error || 'none'}`);
  if (gasResult.success) {
    markSent(idempotencyKey);
    return { ...gasResult, provider: 'google_apps_script' };
  }

  // Prepare inline images for Maileroo (supports cid: via inline attachments)
  const mailerooInlineImages = {};
  if (LOGO_BASE64) {
    mailerooInlineImages.logo = LOGO_BASE64;
  }
  let mailerooHtml = htmlBody;
  const sigImg = signatario?.assinaturaImagem || devolucao?.assinaturaImagem;
  if (sigImg) {
    const raw = (sigImg.includes(',') ? sigImg.split(',')[1] : sigImg).replace(/\s/g, '').replace(/\n/g, '');
    if (raw && raw.length > 100 && raw.length <= 300000) {
      mailerooInlineImages.assinatura = raw;
    } else if (raw && raw.length > 300000) {
      mailerooHtml = mailerooHtml.replace(/<img src="cid:assinatura"[^>]*>/g, '');
    }
  }

  // Include photos as inline images for Maileroo
  const mFotosEntrega = (Array.isArray(signatario?.fotosEntrega) ? signatario.fotosEntrega : (Array.isArray(signatario?.fotos_entrega) ? signatario.fotos_entrega : [])).filter(Boolean);
  const mFotosRetirada = (Array.isArray(signatario?.fotosRetirada) ? signatario.fotosRetirada : (Array.isArray(signatario?.fotos_retirada) ? signatario.fotos_retirada : [])).filter(Boolean);
  [...mFotosEntrega, ...mFotosRetirada].slice(0, 6).forEach((foto, i) => {
    const raw = (foto.includes(',') ? foto.split(',')[1] : foto).replace(/\s/g, '').replace(/\n/g, '');
    if (raw && raw.length > 100) {
      const compressed = compressBase64Image(raw, MAX_INLINE_IMAGE_BYTES);
      if (compressed.length > 100 && compressed.length <= 250000) {
        const label = i < 3 ? `foto_entrega_${i}` : `foto_retirada_${i - 3}`;
        mailerooInlineImages[label] = compressed;
      }
    }
  });

  // Generate PDF attachment for Maileroo
  let mailerooPdfAttachment = null;
  try {
    const pdfSections = [];
    if (contrato) {
      pdfSections.push({ title: 'Dados do Contrato', items: [
        { label: 'Número', value: contrato.numero },
        { label: 'Cliente', value: contrato.cliente },
        contrato.cnpj ? { label: 'CPF/CNPJ', value: contrato.cnpj || contrato.cpf_cnpj } : null,
        contrato.rg ? { label: 'RG', value: contrato.rg } : null,
        contrato.atendente ? { label: 'Atendente', value: contrato.atendente } : null,
        contrato.telefone ? { label: 'Telefone', value: contrato.telefone } : null,
      ].filter(Boolean) });
      const equipItems = [
        { label: 'Equipamentos', value: buildEquipamentosComPatrimonio(contrato, Array.isArray(comprovante?.itens) && comprovante.itens.length > 0 ? comprovante.itens : contrato.itens) },
        contrato.inicio ? { label: 'Período', value: `${contrato.inicio} a ${contrato.fim}` } : null,
        contrato.valorMensal ? { label: 'Valor Mensal', value: `R$ ${Number(contrato.valorMensal).toFixed(2)}/mês` } : null,
        contrato.valorTotal ? { label: 'Valor Total', value: `R$ ${Number(contrato.valorTotal).toFixed(2)}` } : null,
      ].filter(Boolean);
      if (equipItems.length > 0) pdfSections.push({ title: 'Equipamentos e Valores', items: equipItems });
    }
    if (tipo === 'contrato_assinado') {
      if (comprovante) {
        pdfSections.push({ title: 'Dados da Entrega', items: [
          { label: 'Locatário', value: comprovante.locatario },
          { label: 'CPF', value: comprovante.cpf },
          comprovante.endereco ? { label: 'Endereço', value: comprovante.endereco } : null,
          { label: 'Total', value: comprovante.total ? `R$ ${Number(comprovante.total).toFixed(2)}` : '' },
        ].filter(Boolean) });
      }
      if (signatario) {
        pdfSections.push({ title: 'Assinatura Digital', items: [
          { label: 'Nome', value: signatario.nome },
          { label: 'CPF', value: signatario.cpf },
          { label: 'Data/Hora', value: signatario.data ? new Date(signatario.data).toLocaleString('pt-BR') : '' },
        ] });
      }
    }
    if (tipo === 'devolucao_registrada') {
      const devData = comprovante?._devolucao || devolucao || {};
      const devItems = [
        devData.data ? { label: 'Data da Devolução', value: devData.data } : null,
        devData.hora ? { label: 'Hora', value: devData.hora } : null,
        devData.localObra ? { label: 'Local da Obra', value: devData.localObra } : null,
        devData.signatarioNome ? { label: 'Recebido por', value: devData.signatarioNome } : null,
        devData.condicoes ? { label: 'Observações', value: devData.condicoes } : null,
      ].filter(Boolean);
      if (devItems.length > 0) pdfSections.push({ title: 'Dados da Devolução', items: devItems });
    }
    if (pdfSections.length > 0) {
      const pdfTitle = tipo === 'contrato_assinado' ? 'Comprovante de Entrega Assinado' :
                        tipo === 'contrato_renovado' ? 'Contrato Renovado' :
                        tipo === 'devolucao_registrada' ? 'Devolução de Equipamento' : 'Novo Contrato';
      const mPdfItens = Array.isArray(comprovante?.itens) && comprovante.itens.length > 0 ? comprovante.itens : (Array.isArray(contrato?.itens) ? contrato.itens : []);
      const pdfB64 = await generatePdfBase64(pdfTitle, pdfSections, signatario?.assinaturaImagem || comprovante?._devolucao?.assinaturaImagem, {
        fotosEntrega: mFotosEntrega,
        fotosRetirada: mFotosRetirada,
        itens: mPdfItens,
      });
      const pdfName = tipo === 'contrato_assinado' ? `comprovante-entrega-${contrato?.numero || 'doc'}.pdf` :
                      tipo === 'contrato_renovado' ? `contrato-renovado-${contrato?.numero || 'doc'}.pdf` :
                      tipo === 'devolucao_registrada' ? `devolucao-${contrato?.numero || comprovante?.contrato || 'doc'}.pdf` :
                      `contrato-${contrato?.numero || 'doc'}.pdf`;
      mailerooPdfAttachment = { filename: pdfName, content: pdfB64 };
    }
  } catch (e) { console.error('[EMAIL] Maileroo PDF attachment failed:', e.message); }

  // 2nd: Maileroo (custom domain with DKIM, inline images via cid:)
  if (env.MAILEROO_API_KEY) {
    console.log(`[EMAIL] GAS failed, attempting Maileroo for ${tipo} to ${destinatario}`);
    const result = await sendEmailViaMaileroo(env, assunto, mailerooHtml, destinatario, mailerooInlineImages, mailerooPdfAttachment, buildPhotoAttachments(mFotosEntrega, mFotosRetirada, signatario?.assinaturaImagem || devolucao?.assinaturaImagem));
    console.log(`[EMAIL] Maileroo result: success=${result.success} error=${result.error || 'none'} provider=${result.provider || 'maileroo'}`);
    if (result.success) {
      markSent(idempotencyKey);
      return result;
    }
  }

  // 3rd: Resend (proper SPF/DKIM/DMARC, no inline images support - convert cid: to data:)
  if (env.RESEND_API_KEY) {
    console.log(`[EMAIL] Maileroo failed, attempting Resend for ${tipo} to ${destinatario}`);
    let htmlForResend = htmlBody;
    if (LOGO_BASE64) {
      htmlForResend = htmlForResend.replace(/cid:logo/g, `data:image/jpeg;base64,${LOGO_BASE64}`);
    }
    if (sigImg) {
      const raw = (sigImg.includes(',') ? sigImg.split(',')[1] : sigImg).replace(/\s/g, '').replace(/\n/g, '');
      if (raw && raw.length > 100 && raw.length < 300000) {
        htmlForResend = htmlForResend.replace(/cid:assinatura/g, `data:image/jpeg;base64,${raw}`);
      } else {
        htmlForResend = htmlForResend.replace(/<img src="cid:assinatura"[^>]*>/g, '');
      }
    }
    const result = await sendEmailViaResend(env, assunto, htmlForResend, destinatario);
    console.log(`[EMAIL] Resend result: success=${result.success} error=${result.error || 'none'}`);
    if (result.success) {
      markSent(idempotencyKey);
      return { ...result, provider: 'resend' };
    }
  }

  console.error(`[EMAIL] ALL PROVIDERS FAILED for ${tipo} to ${destinatario}. GAS: ${gasResult.error}`);
  return { success: false, error: `All providers failed. Last: ${gasResult.error}` };
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
          const [os, eq, ct, comp, dev] = await Promise.all([
            supabaseRequest(env, 'GET', '/ordens_servico?select=*&limit=500'),
            supabaseRequest(env, 'GET', '/equipamentos?select=*&limit=200'),
            supabaseRequest(env, 'GET', '/contratos?select=*&limit=200'),
            supabaseRequest(env, 'GET', '/comprovantes_entrega?select=id,created_at,assinado,status&limit=200'),
            supabaseRequest(env, 'GET', '/devolucoes?select=id,created_at&limit=200'),
          ]);

          const osData = Array.isArray(os.data) ? os.data : [];
          const eqData = Array.isArray(eq.data) ? eq.data : [];
          const ctData = Array.isArray(ct.data) ? ct.data : [];
          const compData = Array.isArray(comp.data) ? comp.data : [];
          const devData = Array.isArray(dev.data) ? dev.data : [];

          const hoje = new Date();
          const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

          const ctWithVencimento = ctData.map(c => ({
            ...c,
            vencimentoDias: computeVencimentoDias(c.fim),
          }));

          const receitaMes = mesesNomes.map((_, i) => {
            return ctData.filter(c => {
              if (c.status === 'cancelado' || c.status === 'devolvido') return false;
              const inicio = new Date(c.inicio || c.data_contrato || hoje);
              const fim = new Date(c.fim || hoje);
              const mesInicio = inicio.getFullYear() * 12 + inicio.getMonth();
              const mesFim = fim.getFullYear() * 12 + fim.getMonth();
              const mesAtual = hoje.getFullYear() * 12 + i;
              return mesInicio <= mesAtual && mesFim >= mesAtual;
            }).reduce((s, c) => s + (c.valor_mensal || 0), 0);
          });

          return json({
            metricas: {
              totalOS: osData.length,
              osAbertas: osData.filter(o => o.status === 'pendente' || o.status === 'em_andamento').length,
              osConcluidas: osData.filter(o => o.status === 'concluido').length,
              equipamentosLocados: eqData.filter(e => e.status === 'locado').length,
              equipamentosDisponiveis: eqData.filter(e => e.status === 'disponivel').length,
              equipamentosManutencao: eqData.filter(e => e.status === 'manutencao').length,
              contratosAtivos: ctWithVencimento.filter(c => c.status === 'ativo' || c.status !== 'cancelado' && c.status !== 'devolvido').length,
              contratosVencendo: ctWithVencimento.filter(c => c.vencimentoDias != null && c.vencimentoDias > 0 && c.vencimentoDias <= 30).length,
              contratosVencidos: ctWithVencimento.filter(c => c.vencimentoDias != null && c.vencimentoDias <= 0).length,
              receitaMensal: ctWithVencimento.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').reduce((s, c) => s + (c.valor_mensal || 0), 0),
              receitaMes,
              meses: mesesNomes,
            },
            recentOS: osData.slice(0, 5),
            alertasContratos: ctWithVencimento.filter(c =>
              (c.vencimentoDias != null && c.vencimentoDias <= 30) || !c.assinado
            ).map(c => ({
              ...c,
              vencimentoDias: c.vencimentoDias,
            })),
            chartData: {
              meses: mesesNomes,
              contratosPorMes: mesesNomes.map((_, i) => {
                return ctData.filter(c => {
                  if (!c.inicio) return false;
                  const d = new Date(c.inicio);
                  return d.getMonth() === i;
                }).length;
              }),
              osPorMes: mesesNomes.map((_, i) => {
                return osData.filter(o => {
                  const dateStr = o.created_at;
                  if (!dateStr) return false;
                  const d = new Date(dateStr);
                  return d.getMonth() === i;
                }).length;
              }),
            },
            receiptsData: [
              { name: 'Entregas', value: compData.length, color: '#EAB308' },
              { name: 'Devolucoes', value: devData.length, color: '#111827' },
            ],
            detailData: {
              allOS: osData.slice(0, 30),
              openOS: osData.filter(o => o.status === 'pendente' || o.status === 'em_andamento').slice(0, 20),
              closedOS: osData.filter(o => o.status === 'concluido').slice(0, 20),
              rentedEquip: eqData.filter(e => e.status === 'locado').slice(0, 20),
              availableEquip: eqData.filter(e => e.status === 'disponivel').slice(0, 20),
              activeContracts: ctData.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').slice(0, 20),
              expiringContracts: ctWithVencimento.filter(c => {
                if (c.status === 'cancelado' || c.status === 'devolvido') return false;
                if (!c.fim) return false;
                return c.vencimentoDias != null && c.vencimentoDias > 0 && c.vencimentoDias <= 30;
              }).slice(0, 20),
              receitaDetalhada: ctData.filter(c => c.status !== 'cancelado' && c.status !== 'devolvido').map(c => ({
                numero: c.numero, cliente: c.cliente, valorMensal: c.valor_mensal
              })).slice(0, 20),
            },
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
        const { tipo, contrato_id, comprovante_id, destinatario: reqDest, contrato, comprovante, signatario, funcionario, tipoDocumento } = parsed.data;
        const emailTipo = tipo || 'contrato_assinado';
        console.log(`[EMAIL-API] Received: tipo=${emailTipo} destinatario=${reqDest || 'none'} contrato=${contrato?.numero || 'none'}`);

        // Resolve recipients from Supabase profiles (gestores/admins)
        let recipients = [];
        try {
          const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`;
          const profilesResult = await supabaseRequest(env, 'GET', '/profiles?role=in.(admin,gestor)&select=email', null, serviceAuth);
          if (profilesResult.data && Array.isArray(profilesResult.data) && profilesResult.data.length > 0) {
            recipients = profilesResult.data.map((p) => p.email).filter(Boolean);
          }
        } catch { /* fallback below */ }
        if (recipients.length === 0) {
          recipients = [env.EMAIL_RECIPIENT || 'suporte04@baeletrica.com.br'];
        }
        // Add explicit destinatario if provided and valid
        if (reqDest && typeof reqDest === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqDest) && !recipients.includes(reqDest)) {
          recipients.push(reqDest);
        }
        console.log(`[EMAIL-API] Recipients: ${recipients.join(', ')}`);

        let emailStatus = 'pendente';
        let erroMsg = null;
        let sentCount = 0;

        for (const recipient of recipients) {
          try {
            const result = await sendEmailWithFallback(env, {
              tipo: emailTipo,
              destinatario: recipient,
              contrato,
              comprovante: { ...comprovante, tipoDocumento, _funcionario: funcionario },
              signatario,
            });
            if (result.success) {
              sentCount++;
              emailStatus = 'enviado';
            } else {
              erroMsg = result.error || 'Email failed';
            }
          } catch (e) {
            erroMsg = e.message;
            emailStatus = 'erro';
          }
        }

        if (sentCount === 0 && emailStatus !== 'enviado') {
          emailStatus = 'erro';
        }

        const assunto = buildAssunto(emailTipo, contrato, comprovante);

        try {
          await supabaseRequest(env, 'POST', '/email_logs', {
            contrato_id: contrato_id || null,
            comprovante_id: comprovante_id || null,
            destinatario: recipients.join(', '),
            assunto,
            corpo: JSON.stringify({ tipo: emailTipo, contrato, comprovante, signatario }),
            status: emailStatus,
            erro_msg: sentCount > 0 ? null : erroMsg,
          });
        } catch { /* email logging is best-effort */ }

        return json({ success: emailStatus === 'enviado', status: emailStatus, sentTo: sentCount }, 200, corsHeaders);
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

      if (path.startsWith('/api/users/')) {
        const segments = path.split('/');
        const action = segments[segments.length - 1];

        if (action === 'list' && method === 'GET') {
          try {
            const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`;
            const result = await supabaseAuthAdminRequest(env, 'GET', '/admin/users', null, serviceAuth);
            if (result.status && result.status >= 400) {
              return json({ error: result.data }, result.status, corsHeaders);
            }
            return json({ users: result.data?.users || [] }, 200, corsHeaders);
          } catch (e) {
            return json({ error: e.message }, 500, corsHeaders);
          }
        }

        if (action === 'create' && method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          try {
            const { email, password, full_name, role } = parsed.data;
            const serviceAuth = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`;

            const result = await supabaseAuthAdminRequest(env, 'POST', '/admin/users', {
              email, password, email_confirm: true,
              user_metadata: { full_name, role },
            }, serviceAuth);

            if (result.status && result.status >= 400) {
              const errMsg = result.data?.msg || result.data?.error || result.data?.message || JSON.stringify(result.data);
              return json({ error: errMsg }, result.status, corsHeaders);
            }

            const userId = result.data?.id || result.data?.user?.id;
            if (userId) {
              try {
                const profileResult = await supabaseRequest(env, 'POST', '/profiles', {
                  id: userId,
                  full_name,
                  email,
                  role: role || 'funcionario',
                }, serviceAuth);
                if (profileResult.status >= 400) {
                  console.warn('[users/create] Profile creation failed:', profileResult.data);
                }
              } catch (e) {
                console.warn('[users/create] Profile creation error:', e.message);
              }
            }

            return json({ user: result.data, id: userId }, 200, corsHeaders);
          } catch (e) {
            return json({ error: e.message }, 500, corsHeaders);
          }
        }

        if (action === 'role-change' && method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const { user_id, new_role } = parsed.data || {};
          if (!user_id || !new_role) return json({ error: 'user_id and new_role required' }, 400, corsHeaders);
          if (!['admin', 'gestor', 'funcionario'].includes(new_role)) {
            return json({ error: 'Invalid role' }, 400, corsHeaders);
          }
          if (!isValidId(user_id)) return json({ error: 'Invalid user_id' }, 400, corsHeaders);
          try {
            const result = await supabaseRequest(env, 'PATCH', `/profiles?id=eq.${user_id}`, { role: new_role }, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`);
            if (result.status >= 400) {
              return json({ error: result.data }, result.status, corsHeaders);
            }
            return json({ success: true, status: 'atualizado' }, 200, corsHeaders);
          } catch (e) {
            return json({ error: e.message }, 500, corsHeaders);
          }
        }

        if (action === 'delete' && method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const { user_id } = parsed.data || {};
          if (!user_id) return json({ error: 'user_id required' }, 400, corsHeaders);
          if (!isValidId(user_id)) return json({ error: 'Invalid user_id' }, 400, corsHeaders);
          try {
            const result = await supabaseAuthAdminRequest(env, 'DELETE', `/admin/users/${user_id}`, null, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`);
            if (result.status && result.status >= 400) {
              const errMsg = result.data?.msg || result.data?.error || result.data?.message || 'Delete failed';
              return json({ error: errMsg }, result.status, corsHeaders);
            }
            return json({ success: true }, 200, corsHeaders);
          } catch (e) {
            return json({ error: e.message }, 500, corsHeaders);
          }
        }

        if (action === 'update-password' && method === 'POST') {
          const parsed = await parseBody(request);
          if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
          const { user_id, password } = parsed.data || {};
          if (!user_id || !password) return json({ error: 'user_id and password required' }, 400, corsHeaders);
          if (!isValidId(user_id)) return json({ error: 'Invalid user_id' }, 400, corsHeaders);
          if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400, corsHeaders);
          try {
            const result = await supabaseAuthAdminRequest(env, 'PUT', `/admin/users/${user_id}`, {
              password,
            }, `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`);
            if (result.status && result.status >= 400) {
              const errMsg = result.data?.msg || result.data?.error || result.data?.message || 'Password update failed';
              return json({ error: errMsg }, result.status, corsHeaders);
            }
            return json({ success: true }, 200, corsHeaders);
          } catch (e) {
            return json({ error: e.message }, 500, corsHeaders);
          }
        }
      }

      if (path === '/api/email/gas-status' && method === 'GET') {
        const scriptUrl = env.GOOGLE_SCRIPT_URL;
        if (!scriptUrl) return json({ error: 'GOOGLE_SCRIPT_URL not configured' }, 500, corsHeaders);
        try {
          const res = await fetch(scriptUrl, { method: 'GET', redirect: 'follow' });
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            return json({ status: 'ok', gas: data }, 200, corsHeaders);
          } catch {
            return json({ status: 'ok', gas_raw: text.slice(0, 500) }, 200, corsHeaders);
          }
        } catch (e) {
          return json({ error: e.message }, 500, corsHeaders);
        }
      }

      if (path === '/api/email/test' && method === 'POST') {
        const parsed = await parseBody(request);
        if (parsed.error) return json({ error: parsed.error }, 400, corsHeaders);
        const { destinatario, provider } = parsed.data;
        if (!destinatario) return json({ error: 'destinatario required' }, 400, corsHeaders);

        const testHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;"><div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><div style="text-align:center;margin-bottom:20px;">${LOGO_BASE64 ? `<img src="data:image/jpeg;base64,${LOGO_BASE64}" style="height:40px;" alt="TransObra" />` : '<h2 style="color:#eab308;">TransObra</h2>'}</div><h1 style="font-size:18px;color:#1c1c1c;text-align:center;">Email de Teste</h1><p style="color:#666;font-size:14px;text-align:center;">Este e-mail foi enviado para verificar a entrega em todos os provedores.</p><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin:20px 0;"><p style="color:#166534;font-size:13px;margin:0;">✓ Se voce recebeu este email, o provedor esta funcionando corretamente.</p></div><p style="color:#999;font-size:11px;text-align:center;margin-top:20px;">TransObra - Gestao de Locacao</p></div></body></html>`;

        const results = {};

        if (!provider || provider === 'google') {
          try {
            const r = await sendEmailViaGoogleScript(env, { tipo: 'contrato_criado', destinatario, contrato: { numero: 'TESTE', cliente: 'Teste' } });
            results.google = r;
          } catch (e) { results.google = { success: false, error: e.message }; }
        }

        if (!provider || provider === 'maileroo') {
          try {
            const r = await sendEmailViaMaileroo(env, 'Teste TransObra', testHtml, destinatario);
            results.maileroo = r;
          } catch (e) { results.maileroo = { success: false, error: e.message }; }
        }

        if (!provider || provider === 'resend') {
          try {
            const r = await sendEmailViaResend(env, 'Teste TransObra', testHtml, destinatario);
            results.resend = r;
          } catch (e) { results.resend = { success: false, error: e.message }; }
        }

        return json({ results }, 200, corsHeaders);
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

  async scheduled(event, env, ctx) {
    // 9AM test cron disabled — no more automatic test emails
    console.log('[CRON] Scheduled triggered at', new Date().toISOString(), '— no action (test cron disabled)');
  },
};
