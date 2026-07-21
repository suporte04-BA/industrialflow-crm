import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_BASE64 } from './logo-base64.js';

// ============================================
// WhatsApp Integration via Evolution API
// ============================================

const WHATSAPP_DELAY_MS = 3000;
const WHATSAPP_TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;

// ============================================
// PHONE NUMBER PARSING
// ============================================

export function parsePhoneNumbers(telefoneEntrega) {
  if (!telefoneEntrega || typeof telefoneEntrega !== 'string') return [];
  // Extract complete phone patterns like (92) 99270-3185, 92992703185, +5592992703185
  const phoneRegex = /\+?\d{0,2}\(?\d{2}\)?\s*\d{4,5}-?\d{4}/g;
  const matches = telefoneEntrega.match(phoneRegex) || [];
  return matches
    .map(p => {
      const digits = p.replace(/\D/g, '');
      if (digits.startsWith('55') && digits.length >= 12) return digits;
      if (digits.length >= 10) return '55' + digits;
      return null;
    })
    .filter(Boolean);
}

// ============================================
// MESSAGE BUILDER
// ============================================

export function formatWhatsAppMessage(tipo, contrato, comprovante, signatario) {
  const nome = contrato?.cliente || comprovante?.locatario || 'Cliente';
  const numero = contrato?.numero || '';
  const equipamentos = Array.isArray(contrato?.equipamentos)
    ? contrato.equipamentos.join(', ')
    : '';

  switch (tipo) {
    case 'contrato_assinado': {
      const tipoDoc = comprovante?.tipoDocumento === 'devolucao' ? 'devolução' : 'entrega';
      return `Olá ${nome}! Segue seu comprovante de ${tipoDoc} assinado.\n\n` +
        `📄 Contrato: ${numero}\n` +
        `📦 Equipamentos: ${equipamentos || 'N/I'}\n` +
        `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n` +
        `TransObra — Gestão de Locação de Equipamentos\n` +
        `(92) 99386-7171`;
    }
    case 'contrato_criado':
      return `Olá ${nome}! Seu contrato foi cadastrado com sucesso.\n\n` +
        `📄 Contrato: ${numero}\n` +
        `📦 Equipamentos: ${equipamentos || 'N/I'}\n\n` +
        `TransObra — Gestão de Locação de Equipamentos`;
    case 'contrato_renovado':
      return `Olá ${nome}! Seu contrato foi renovado.\n\n` +
        `📄 Contrato: ${numero}\n` +
        `📅 Novo período: ${contrato?.inicio || ''} a ${contrato?.fim || ''}\n\n` +
        `TransObra — Gestão de Locação de Equipamentos`;
    case 'devolucao_registrada':
      return `Olá ${nome}! A devolução do equipamento foi registrada.\n\n` +
        `📄 Contrato: ${numero}\n\n` +
        `TransObra — Gestão de Locação de Equipamentos`;
    default:
      return `Olá ${nome}! Você tem uma notificação do sistema TransObra.\n\n` +
        `📄 Contrato: ${numero}\n\n` +
        `TransObra — Gestão de Locação de Equipamentos`;
  }
}

// ============================================
// EVOLUTION API: SEND TEXT
// ============================================

export async function sendTextViaEvolution(env, phone, message) {
  const apiUrl = env.EVOLUTION_API_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const instance = env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT_MS);

    const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
        options: { delay: 1200, presence: 'composing' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json();

    if (res.ok && data.key) {
      return { success: true, msgId: data.key.id, data };
    }

    return { success: false, error: data?.message || data?.error || `HTTP ${res.status}`, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================
// EVOLUTION API: SEND DOCUMENT (PDF)
// ============================================

export async function sendDocumentViaEvolution(env, phone, pdfBase64, fileName, caption) {
  const apiUrl = env.EVOLUTION_API_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const instance = env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    return { success: false, error: 'Evolution API not configured' };
  }

  if (!pdfBase64) {
    return { success: false, error: 'No PDF provided' };
  }

  // Validate PDF magic bytes
  try {
    const cleanBase64 = pdfBase64.replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    const isValidPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    if (!isValidPdf) {
      return { success: false, error: 'Invalid PDF format' };
    }
  } catch {
    return { success: false, error: 'Failed to validate PDF' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT_MS);

    const cleanBase64 = pdfBase64.replace(/\s/g, '');

    const res = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        mediatype: 'document',
        mimetype: 'application/pdf',
        media: cleanBase64,
        fileName: fileName,
        caption: caption || '',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json();

    if (res.ok && data.key) {
      return { success: true, msgId: data.key.id, data };
    }

    return { success: false, error: data?.message || data?.error || `HTTP ${res.status}`, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================
// EVOLUTION API: CHECK CONNECTION STATUS
// ============================================

export async function checkConnectionStatus(env) {
  const apiUrl = env.EVOLUTION_API_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const instance = env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    return { connected: false, error: 'Evolution API not configured' };
  }

  try {
    const res = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
    });

    const data = await res.json();
    return {
      connected: data?.instance?.state === 'open',
      state: data?.instance?.state || 'unknown',
      instance,
    };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

// ============================================
// LOG TO SUPABASE
// ============================================

export async function logWhatsAppMessage(env, data) {
  try {
    const { supabaseRequest } = await import('./index.js');
    await supabaseRequest(env, 'POST', '/whatsapp_logs', {
      contrato_id: data.contrato_id || null,
      comprovante_id: data.comprovante_id || null,
      tipo: data.tipo,
      destinatario: data.destinatario,
      mensagem: data.mensagem,
      evolution_msg_id: data.evolution_msg_id || null,
      status: data.status || 'pendente',
      erro_msg: data.erro_msg || null,
      provider: 'evolution',
    });
  } catch {
    // Logging is best-effort
  }
}

// ============================================
// SLEEP UTILITY
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN: SEND WHATSAPP TO ALL PHONE NUMBERS
// ============================================

export async function sendWhatsAppWithFallback(env, data) {
  const { tipo, contrato_id, comprovante_id, contrato, comprovante, signatario } = data;

  if (env.WHATSAPP_ENABLED !== 'true') {
    return { success: false, skipped: true, reason: 'WhatsApp disabled' };
  }

  // Parse phone numbers from contrato.telefoneEntrega
  const phones = parsePhoneNumbers(contrato?.telefoneEntrega);

  if (phones.length === 0) {
    return { success: false, skipped: true, reason: 'No phone numbers found' };
  }

  // Build message
  const message = formatWhatsAppMessage(tipo, contrato, comprovante, signatario);

  // Generate PDF if needed (for contrato_assinado)
  let pdfBase64 = data.pdfBase64 || null;
  let pdfFileName = 'comprovante.pdf';

  if (!pdfBase64 && tipo === 'contrato_assinado') {
    try {
      pdfBase64 = await generateWhatsAppPdf(contrato, comprovante, signatario);
      pdfFileName = `comprovante-${contrato?.numero || 'doc'}.pdf`;
    } catch (e) {
      console.error('[WHATSAPP] PDF generation failed:', e.message);
    }
  }

  const results = [];
  let sentCount = 0;
  let errorCount = 0;

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];

    try {
      // Send with PDF attachment
      const sendResult = await sendDocumentViaEvolution(env, phone, pdfBase64, pdfFileName, message);

      if (sendResult.success) {
        sentCount++;
        results.push({ phone, success: true, msgId: sendResult.msgId });

        await logWhatsAppMessage(env, {
          contrato_id,
          comprovante_id,
          tipo,
          destinatario: phone,
          mensagem: message,
          evolution_msg_id: sendResult.msgId,
          status: 'enviado',
        });
      } else {
        errorCount++;
        results.push({ phone, success: false, error: sendResult.error });

        await logWhatsAppMessage(env, {
          contrato_id,
          comprovante_id,
          tipo,
          destinatario: phone,
          mensagem: message,
          status: 'erro',
          erro_msg: sendResult.error,
        });
      }
    } catch (e) {
      errorCount++;
      results.push({ phone, success: false, error: e.message });

      await logWhatsAppMessage(env, {
        contrato_id,
        comprovante_id,
        tipo,
        destinatario: phone,
        mensagem: message,
        status: 'erro',
        erro_msg: e.message,
      });
    }

    // Delay between messages (anti-ban)
    if (i < phones.length - 1) {
      await sleep(WHATSAPP_DELAY_MS);
    }
  }

  return {
    success: sentCount > 0,
    sent: sentCount,
    errors: errorCount,
    total: phones.length,
    results,
  };
}

// ============================================
// PDF GENERATION - Professional layout matching email PDF
// ============================================

const PDF_COLORS = {
  dark: rgb(0.07, 0.09, 0.15),
  gold: rgb(0.92, 0.70, 0.06),
  white: rgb(1, 1, 1),
  lightGray: rgb(0.95, 0.95, 0.95),
  midGray: rgb(0.88, 0.88, 0.88),
  textDark: rgb(0.13, 0.13, 0.13),
  textMedium: rgb(0.40, 0.40, 0.40),
  textLight: rgb(0.55, 0.55, 0.55),
  patBlue: rgb(0.05, 0.35, 0.7),
  headerBg: rgb(0.93, 0.93, 0.93),
  totalBg: rgb(0.07, 0.09, 0.15),
  totalGold: rgb(0.92, 0.70, 0.06),
};

function sanitizePdfStr(str) {
  return String(str == null ? '' : str)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xFF]/g, '');
}

function wrapPdfText(text, font, fontSize, maxWidth) {
  const words = sanitizePdfStr(text).split(/\s+/);
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : ['-'];
}

function formatMoneyPdf(val) {
  return Number(val || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function drawSectionHeader(page, y, text, ML, CW, fontBold) {
  page.drawRectangle({ x: ML, y: y - 2, width: CW, height: 15, color: PDF_COLORS.dark, borderRadius: 2 });
  page.drawText(sanitizePdfStr(text.toUpperCase()), { x: ML + 8, y: y + 1, size: 8, font: fontBold, color: PDF_COLORS.white });
  y -= 20;
  page.drawRectangle({ x: ML, y: y + 4, width: 60, height: 1.5, color: PDF_COLORS.gold });
  return y - 2;
}

function drawField(page, y, label, value, ML, LABEL_W, CW, font, fontBold) {
  const labelStr = sanitizePdfStr(label) + ':';
  const valueStr = sanitizePdfStr(String(value || '-'));
  const valueLines = wrapPdfText(valueStr, font, 8.5, CW - LABEL_W - 14);
  const h = Math.max(11, valueLines.length * 9.5 + 2);
  page.drawText(labelStr, { x: ML + 4, y: y - 1, size: 8.5, font: fontBold, color: PDF_COLORS.dark });
  valueLines.forEach((ln, li) => {
    page.drawText(ln, { x: ML + LABEL_W, y: y - 1 - li * 9.5, size: 8.5, font, color: PDF_COLORS.textDark });
  });
  return y - h;
}

async function generateWhatsAppPdf(contrato, comprovante, signatario) {
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
      drawPdfFooter(page, pageCount);
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pageCount++;
      y = TOP_MARGIN;
    }
  }

  function drawPdfFooter(p, num) {
    p.drawRectangle({ x: ML, y: 38, width: CW, height: 0.5, color: PDF_COLORS.midGray });
    p.drawText('TRANSOBRA CRM — Sistema de Gestao de Locacao', { x: ML + 4, y: 42, size: 7, font: helvetica, color: PDF_COLORS.textLight });
    p.drawText(`Pagina ${num}`, { x: PAGE_W - MR - 40, y: 42, size: 7, font: helvetica, color: PDF_COLORS.textLight });
    p.drawText('Av. Taruma, 1605 — Manaus/AM — (92) 99386-7171', { x: ML + 4, y: 32, size: 6.5, font: helvetica, color: rgb(0.65, 0.65, 0.65) });
  }

  const c = contrato || {};
  const comp = comprovante || {};
  const s = signatario || {};
  const itens = Array.isArray(comp.itens) ? comp.itens : [];
  const tipoLabel = comp.tipoDocumento === 'devolucao' ? 'Devolucao' : 'Entrega';

  // === BRAND HEADER ===
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
    page.drawText('TRANSOBRA — LOCACAO DE EQUIPAMENTOS', { x: ML, y, size: 16, font: helveticaBold, color: PDF_COLORS.dark });
    y -= 16;
  }

  // === TITLE + GOLD ACCENT ===
  page.drawText(sanitizePdfStr(`COMPROVANTE DE ${tipoLabel.toUpperCase()} ASSINADO`), { x: ML, y, size: 12.5, font: helveticaBold, color: PDF_COLORS.dark });
  y -= 6;
  page.drawRectangle({ x: ML, y: y - 1.5, width: 55, height: 2, color: PDF_COLORS.gold });
  y -= 14;
  page.drawText(sanitizePdfStr('Assinatura digital registrada. Valido como prova de recebimento.'), { x: ML, y, size: 7.5, font: helvetica, color: PDF_COLORS.textMedium });
  y -= 16;

  // === CONTRATO ===
  if (c.numero || c.cliente) {
    checkPage(80);
    y = drawSectionHeader(page, y, 'CONTRATO', ML, CW, helveticaBold);
    if (c.numero) y = drawField(page, y, 'Numero', c.numero, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (c.cliente) y = drawField(page, y, 'Cliente', c.cliente, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (c.cnpj) y = drawField(page, y, 'CPF/CNPJ', c.cnpj, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (c.atendente) y = drawField(page, y, 'Atendente', c.atendente, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (c.inicio) y = drawField(page, y, 'Periodo', `${c.inicio} a ${c.fim}`, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (c.valorMensal) y = drawField(page, y, 'Valor Mensal', `R$ ${formatMoneyPdf(c.valorMensal)}/mes`, ML, LABEL_W, CW, helvetica, helveticaBold);
    y -= 4;
  }

  // === EQUIPAMENTOS ===
  if (c.equipamentos) {
    const equips = Array.isArray(c.equipamentos) ? c.equipamentos.join(' | ') : c.equipamentos;
    if (equips) {
      checkPage(30);
      y = drawSectionHeader(page, y, 'EQUIPAMENTOS', ML, CW, helveticaBold);
      y = drawField(page, y, 'Equipamentos', equips, ML, LABEL_W, CW, helvetica, helveticaBold);
      y -= 4;
    }
  }

  // === DADOS DA ENTREGA ===
  if (comp.locatario) {
    checkPage(60);
    y = drawSectionHeader(page, y, `DADOS DA ${tipoLabel.toUpperCase()}`, ML, CW, helveticaBold);
    y = drawField(page, y, 'Locatario', comp.locatario, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (comp.cpf) y = drawField(page, y, 'CPF', comp.cpf, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (comp.endereco) y = drawField(page, y, 'Endereco', comp.endereco, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (comp.cidade) y = drawField(page, y, 'Cidade', comp.cidade, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (comp.total) y = drawField(page, y, 'Total', `R$ ${formatMoneyPdf(comp.total)}`, ML, LABEL_W, CW, helvetica, helveticaBold);
    y -= 4;
  }

  // === ITENS LOCADOS (professional table with borders) ===
  if (itens.length > 0) {
    checkPage(30 + itens.length * 14);
    y = drawSectionHeader(page, y, 'ITENS LOCADOS', ML, CW, helveticaBold);
    y -= 4;

    const cQtd = ML + 4, cDesc = ML + 30, cPat = ML + CW - 140, cVal = ML + CW - 55;
    const rowH = 12;

    // Table header row
    page.drawRectangle({ x: ML, y: y - rowH + 3, width: CW, height: rowH, color: PDF_COLORS.headerBg });
    page.drawText('Qtd', { x: cQtd, y: y - 6, size: 7, font: helveticaBold, color: PDF_COLORS.textDark });
    page.drawText('Descricao', { x: cDesc, y: y - 6, size: 7, font: helveticaBold, color: PDF_COLORS.textDark });
    page.drawText('Patrimonio', { x: cPat, y: y - 6, size: 7, font: helveticaBold, color: PDF_COLORS.textDark });
    page.drawText('Valor', { x: cVal, y: y - 6, size: 7, font: helveticaBold, color: PDF_COLORS.textDark });
    y -= rowH;

    // Table rows with alternating background
    let total = 0;
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      const qtd = it.quantidade || it.qtd || 1;
      const desc = sanitizePdfStr(it.descricao || it.nome || '-');
      const pat = sanitizePdfStr(it.patrimonio || '-');
      const val = Number(it.valor || it.valorUnitario || 0);
      total += Number(qtd) * val;
      const descLines = wrapPdfText(desc, helvetica, 7, cPat - cDesc - 6);
      const thisRowH = Math.max(rowH, descLines.length * 9 + 4);

      // Alternating row background
      if (i % 2 === 0) {
        page.drawRectangle({ x: ML, y: y - thisRowH + 3, width: CW, height: thisRowH, color: PDF_COLORS.lightGray });
      }

      // Row separator line
      page.drawRectangle({ x: ML, y: y - thisRowH + 3, width: CW, height: 0.5, color: PDF_COLORS.midGray });

      page.drawText(String(qtd), { x: cQtd, y: y - 6, size: 7, font: helvetica, color: PDF_COLORS.textDark });
      descLines.forEach((ln, li) => {
        page.drawText(ln, { x: cDesc, y: y - 6 - li * 9, size: 7, font: helvetica, color: PDF_COLORS.textDark });
      });
      page.drawText(pat, { x: cPat, y: y - 6, size: 7, font: helveticaBold, color: PDF_COLORS.patBlue });
      page.drawText(`R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { x: cVal, y: y - 6, size: 7, font: helvetica, color: PDF_COLORS.textDark });
      y -= thisRowH;
    }

    // Bottom border of last row
    page.drawRectangle({ x: ML, y: y + 2, width: CW, height: 0.5, color: PDF_COLORS.midGray });

    // Total row
    y -= 2;
    page.drawRectangle({ x: ML, y: y - rowH + 3, width: CW, height: rowH, color: PDF_COLORS.totalBg });
    page.drawText('TOTAL', { x: cPat - 30, y: y - 6, size: 7.5, font: helveticaBold, color: PDF_COLORS.white });
    page.drawText(`R$ ${formatMoneyPdf(comp.total)}`, { x: cVal, y: y - 6, size: 8, font: helveticaBold, color: PDF_COLORS.totalGold });
    y -= rowH + 8;
  }

  // === ASSINATURA DO RECEBEDOR ===
  if (s.nome) {
    checkPage(40);
    y = drawSectionHeader(page, y, 'ASSINATURA DO RECEBEDOR', ML, CW, helveticaBold);
    y = drawField(page, y, 'Nome', s.nome, ML, LABEL_W, CW, helvetica, helveticaBold);
    if (s.cpf) y = drawField(page, y, 'CPF', s.cpf, ML, LABEL_W, CW, helvetica, helveticaBold);
    y = drawField(page, y, 'Data', s.data ? new Date(s.data).toLocaleString('pt-BR') : '-', ML, LABEL_W, CW, helvetica, helveticaBold);

    if (s.assinaturaImagem) {
      try {
        y -= 4;
        checkPage(70);
        let pngBytes;
        const raw = s.assinaturaImagem;
        if (raw.startsWith('data:image')) {
          pngBytes = Uint8Array.from(atob(raw.split(',')[1]), c => c.charCodeAt(0));
        } else {
          pngBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
        }
        let sigImage;
        try { sigImage = await pdfDoc.embedPng(pngBytes); } catch { sigImage = await pdfDoc.embedJpg(pngBytes); }
        const displayW = 160, finalH = Math.min((sigImage.height / sigImage.width) * displayW, 40);
        page.drawText('ASSINATURA:', { x: ML + 4, y, size: 7.5, font: helveticaBold, color: PDF_COLORS.textDark });
        y -= 8;
        page.drawRectangle({ x: ML + 2, y: y - finalH - 3, width: displayW + 6, height: finalH + 5, borderWidth: 0.5, borderColor: PDF_COLORS.midGray, color: PDF_COLORS.white, borderRadius: 2 });
        page.drawImage(sigImage, { x: ML + 5, y: y - finalH, width: displayW, height: finalH });
        y -= finalH + 8;
      } catch (e) {
        console.error('[WHATSAPP PDF] Signature embed failed:', e.message);
      }
    }
  }

  // === FOOTER ===
  drawPdfFooter(page, pageCount);

  return await pdfDoc.saveAsBase64();
}
