let html2pdfModule = null;

async function getHtml2pdf() {
  if (!html2pdfModule) {
    html2pdfModule = await import('html2pdf.js');
  }
  return html2pdfModule.default;
}

const EMPRESA = {
  nome: 'EQUILOC LTDA - TRANS OBRA',
  endereco: 'AV TARUMA, 1605 - PRACA 14 DE JANEIRO',
  cep: '69020-000',
  cidade: 'MANAUS',
  estado: 'AM',
  telefone: '(92) 99386-7171',
  cnpj: '00.000.000/0001-00',
};

const BRAND = {
  preto: '#111827',
  amarelo: '#EAB308',
  amareloClaro: '#FEF3C7',
  cinzaFundo: '#F8F8F8',
  cinzaBorda: '#E5E7EB',
  cinzaTexto: '#6B7280',
  branco: '#FFFFFF',
  verde: '#16A34A',
  verdeEscuro: '#166534',
  azul: '#1E40AF',
  azulClaro: '#2563EB',
  laranja: '#F97316',
  vermelho: '#DC2626',
};

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dataPorExtenso(dateStr) {
  const meses = ['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  let d;
  if (!dateStr) d = new Date();
  else if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const [dia, mes, ano] = dateStr.split('/');
    d = new Date(Number(ano), Number(mes) - 1, Number(dia));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) d = new Date();
  return `${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`;
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function formatDateBR(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

// ============================================
// PROFESSIONAL LAYOUT HELPERS (email-style)
// ============================================

function pdfWrapper(content) {
  return `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;padding:0;max-width:760px;margin:0 auto;font-size:10px;color:#374151;background:#fff;">
    ${content}
  </div>`;
}

function brandHeader(title, subtitle, badgeText, headerBg, badgeBg) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
    <tr><td style="background:${headerBg};padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:14px 20px 10px;">
          <div style="font-size:18px;font-weight:900;color:#fff;letter-spacing:1px;">TRANSOBRA</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:3px;letter-spacing:2px;text-transform:uppercase;">${subtitle}</div>
        </td>
        <td align="right" valign="middle" style="padding:14px 20px 10px;">
          <div style="background:${badgeBg};color:${headerBg === '#EAB308' ? '#111827' : '#fff'};font-size:9px;font-weight:800;padding:4px 12px;border-radius:4px;text-transform:uppercase;letter-spacing:1px;">${badgeText}</div>
        </td></tr>
        <tr><td colspan="2" style="height:3px;background:#EAB308;"></td></tr>
      </table>
    </td></tr>
  </table>`;
}

function sectionBlock(title, headerColor, borderColor, rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr><td style="padding:0;">
      <div style="font-size:9px;font-weight:800;color:${headerColor};text-transform:uppercase;letter-spacing:1.5px;padding:6px 12px;border-bottom:2px solid ${borderColor};margin-bottom:4px;">${title}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:0 4px;">${rows}</table>
    </td></tr>
  </table>`;
}

function row(label, value, opts = {}) {
  const { bold, color, w } = opts;
  return `<tr><td style="padding:3px 0;color:#6b7280;width:${w || '120px'};vertical-align:top;font-size:11px;"><strong>${label}</strong></td><td style="padding:3px 0;color:${color || '#111827'};font-size:12px;${bold ? 'font-weight:600;' : ''}">${value}</td></tr>`;
}

function buildItemsTable(itens, borderColor = '#EAB308') {
  if (!itens || itens.length === 0) return '';
  const rowsHtml = itens.filter(it => it.descricao || it.nome).map(it => {
    const desc = esc(it.descricao || it.nome || '-');
    const pat = esc(it.patrimonio || '-');
    const qtd = esc(String(it.quantidade || 1));
    const dloc = esc(it.dataLocacao || '-');
    const ddev = esc(it.dataDevolucao || '-');
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
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:left;font-size:9px;font-weight:700;border:1px solid #111827;">Descricao</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">Patrimonio</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">D.Loc</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">D.Dev</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:right;font-size:9px;font-weight:700;border:1px solid #111827;">Valor</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="padding:5px;border:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:700;">TOTAL</td>
        <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:800;color:#16a34a;">R$ ${totalFormatted}</td>
      </tr>
    </tfoot>
  </table>`;
}

function buildItemsTableDevolucao(itens) {
  if (!itens || itens.length === 0) return '';
  const rowsHtml = itens.map(it => {
    const desc = esc(it.descricao || '-');
    const pat = esc(it.patrimonio || '-');
    const qtd = esc(String(it.quantidade || 1));
    const qtdDev = esc(String(it.qtdDevolvida || it.quantidade || 1));
    const faltante = it.qtdFaltante > 0 ? `<span style="color:#DC2626;font-weight:700;"> FALTANTE: ${it.qtdFaltante}</span>` : '';
    return `<tr>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:11px;">${qtd}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;font-size:11px;">${desc}${faltante}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:11px;font-weight:700;color:#111827;">${pat}</td>
      <td style="padding:4px 5px;border:1px solid #e5e7eb;text-align:center;font-size:11px;">${qtdDev}</td>
    </tr>`;
  }).join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0;">
    <thead>
      <tr>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:left;font-size:9px;font-weight:700;border:1px solid #111827;">Qtde</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:left;font-size:9px;font-weight:700;border:1px solid #111827;">Descricao</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">Patrimonio</th>
        <th style="padding:4px 5px;background:#111827;color:#fff;text-align:center;font-size:9px;font-weight:700;border:1px solid #111827;">Qtd Devolvida</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

function buildSignatureSection(signatarioNome, cpfSignatario, signatureImg, label = 'LOCATARIO') {
  const sigImgTag = signatureImg
    ? `<div style="text-align:center;margin-top:4px;"><img src="${signatureImg}" style="max-height:50px;max-width:160px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;background:#fff;" /></div>`
    : `<div style="border-top:1px solid #111827;height:35px;margin-top:8px;"></div>`;

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    <tr>
      <td width="45%" style="text-align:center;vertical-align:top;">
        <div style="border-top:1px solid #111827;height:35px;"></div>
        <div style="font-size:8px;color:#6b7280;margin-top:3px;letter-spacing:1px;font-weight:600;">LOCADORA</div>
      </td>
      <td width="10%"></td>
      <td width="45%" style="text-align:center;vertical-align:top;">
        ${sigImgTag}
        <div style="font-size:8px;color:#6b7280;margin-top:3px;letter-spacing:1px;font-weight:600;">${label}: ${esc(signatarioNome || '___________________')}</div>
        ${cpfSignatario ? `<div style="font-size:8px;color:#6b7280;margin-top:1px;">CPF/CNPJ: ${esc(cpfSignatario)}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

function buildPhotoSection(fotosEntrega, fotosRetirada, tsEntrega, tsRetirada, contrato, data) {
  if ((!fotosEntrega || fotosEntrega.length === 0) && (!fotosRetirada || fotosRetirada.length === 0)) return '';

  const buildPhotoRow = (fotos, label, color, ts) => {
    if (!fotos || fotos.length === 0) return '';
    const padded = [...fotos];
    while (padded.length < 3) padded.push(null);
    return `
      <tr><td colspan="2" style="padding-top:8px;">
        <div style="font-size:10px;font-weight:700;color:#111827;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Fotos da ${label}</div>
        <table width="100%" cellpadding="2" cellspacing="0"><tr>
          ${padded.slice(0, 3).map((foto, i) => `
            <td width="33%" style="text-align:center;vertical-align:top;">
              ${foto ? `<div style="position:relative;display:inline-block;width:100%;"><img src="${foto}" style="width:100%;max-height:120px;object-fit:cover;border:1px solid #e5e7eb;border-radius:4px;" />${ts && ts[i] ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:7px;padding:2px 4px;text-align:center;font-family:monospace;border-radius:0 0 4px 4px;">${esc(ts[i])}</div>` : ''}</div>` : `<div style="width:100%;height:100px;border:1px dashed #e5e7eb;border-radius:4px;font-size:8px;color:#9ca3af;display:flex;align-items:center;justify-content:center;">Sem foto</div>`}
              <div style="font-size:8px;color:#6b7280;margin-top:2px;">Foto ${i + 1}</div>
            </td>
          `).join('')}
        </tr></table>
      </td></tr>`;
  };

  return `
    <div style="page-break-before:always;padding-top:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr><td style="background:#111827;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 20px;">
              <div style="font-size:14px;font-weight:900;color:#fff;letter-spacing:0.5px;">REGISTRO FOTOGRAFICO</div>
              <div style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:1px;">Contrato: ${esc(contrato || '')} | Data: ${esc(data || new Date().toLocaleDateString('pt-BR'))}</div>
            </td></tr>
            <tr><td style="height:3px;background:#EAB308;"></td></tr>
          </table>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${buildPhotoRow(fotosEntrega, 'Entrega', '#2563eb', tsEntrega)}
        ${buildPhotoRow(fotosRetirada, 'Retirada', '#f97316', tsRetirada)}
      </table>
    </div>`;
}

function pdfFooter(tipo) {
  const now = new Date();
  const dataGeracao = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #E5E7EB;">
    <tr><td style="padding:10px 0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:8px;color:#9CA3AF;">TRANSOBRA CRM</td>
        <td style="font-size:8px;color:#9CA3AF;text-align:right;">${esc(tipo)} | Gerado em ${dataGeracao}</td>
      </tr></table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
    <tr><td style="padding:8px 0;background:#111827;text-align:center;border-radius:6px;">
      <div style="font-size:8px;color:rgba(255,255,255,0.4);letter-spacing:1px;">TRANSOBRA — LOCACAO DE EQUIPAMENTOS | ${EMPRESA.endereco} | TEL: ${EMPRESA.telefone}</div>
    </td></tr>
  </table>`;
}

function checkbox(checked) {
  return checked
    ? '<span style="display:inline-block;width:12px;height:12px;border:1px solid #374151;text-align:center;line-height:11px;font-size:10px;font-weight:bold;color:#111827;">X</span>'
    : '<span style="display:inline-block;width:12px;height:12px;border:1px solid #D1D5DB;">&nbsp;</span>';
}

// ============================================
// PDF: Comprovante de Entrega (Professional)
// ============================================
export async function generateEntregaPDF(comprovante) {
  const c = comprovante;
  const itens = Array.isArray(c.itens) ? c.itens : [];
  const total = c.total != null ? c.total : itens.reduce((s, it) => s + (it.quantidade || 1) * (it.valorUnitario || 0), 0);
  const fotosEntrega = (Array.isArray(c.fotosEntrega) ? c.fotosEntrega : (Array.isArray(c.fotos_entrega) ? c.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(c.fotosRetirada) ? c.fotosRetirada : (Array.isArray(c.fotos_retirada) ? c.fotos_retirada : [])).filter(Boolean);
  const tsEntrega = (Array.isArray(c.fotosEntregaTimestamps) ? c.fotosEntregaTimestamps : (Array.isArray(c.fotos_entrega_timestamps) ? c.fotos_entrega_timestamps : []));
  const tsRetirada = (Array.isArray(c.fotosRetiradaTimestamps) ? c.fotosRetiradaTimestamps : (Array.isArray(c.fotos_retirada_timestamps) ? c.fotos_retirada_timestamps : []));

  const rContrato = [
    row('Numero', `<span style="font-size:14px;font-weight:900;color:#EAB308;">${esc(c.numero || c.contrato || '-')}</span>`),
    row('Cliente', esc(c.locatario || '-'), { bold: true }),
    c.cpf ? row('CPF/CNPJ', esc(c.cpf)) : '',
    c.telefoneEntrega ? row('Telefone', esc(c.telefoneEntrega)) : '',
    c.cidade ? row('Cidade', `${esc(c.cidade)}${c.estado ? `/${esc(c.estado)}` : ''}`) : '',
    c.endereco ? row('Endereco', `${esc(c.endereco)}${c.numero ? `, ${esc(c.numero)}` : ''}${c.bairro ? ` - ${esc(c.bairro)}` : ''}`) : '',
  ].filter(Boolean).join('');

  const rEntrega = [
    c.localEntrega ? row('Local da Entrega', esc(c.localEntrega)) : '',
    c.contato ? row('Contato', esc(c.contato)) : '',
    c.referencia ? row('Referencia', esc(c.referencia)) : '',
    row('Total', `R$ ${formatMoney(total)}`, { bold: true, color: '#16a34a' }),
  ].filter(Boolean).join('');

  let itensHtml = '';
  if (itens.length > 0) {
    itensHtml = sectionBlock('Itens Locados', '#111827', '#EAB308', `<tr><td style="padding:0;">${buildItemsTable(itens)}</td></tr>`);
  }

  const signatarioNome = c.signatarioNome || c.nomeSignatario;
  const signatureImg = c.signatureImg || c.assinaturaImagem || c.assinaturaImg;

  let assinaturaHtml = '';
  if (signatarioNome) {
    assinaturaHtml = sectionBlock('Assinatura do Recebedor', '#166534', '#22c55e', [
      row('Nome', esc(signatarioNome), { bold: true }),
      c.cpfSignatario ? row('CPF', esc(c.cpfSignatario)) : '',
      row('Data/Hora', c.dataAssinatura ? formatDateBR(c.dataAssinatura) : dataPorExtenso(c.data)),
      signatureImg ? `<tr><td colspan="2" style="padding-top:6px;"><div style="font-size:9px;color:#166534;font-weight:700;margin-bottom:4px;">ASSINATURA:</div><img src="${signatureImg}" style="max-height:50px;max-width:160px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;background:#fff;" /></td></tr>` : '',
    ].filter(Boolean).join(''));
  }

  let observacaoHtml = '';
  if (c.observacao) {
    observacaoHtml = `<div style="margin:8px 0;padding:8px 12px;border-left:3px solid #EAB308;background:#FEF3C7;border-radius:0 4px 4px 0;">
      <div style="font-size:9px;font-weight:700;color:#111827;margin-bottom:2px;">OBSERVACAO</div>
      <div style="font-size:10px;color:#374151;">${esc(c.observacao)}</div>
    </div>`;
  }

  const html = pdfWrapper(`
    ${brandHeader('Comprovante de Entrega', 'SISTEMA DE GESTAO DE LOCACAO', 'ENTREGA', '#111827', '#EAB308')}
    <div style="padding:16px 20px 8px;">
      <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Comprovante de Entrega</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:14px;">Documento comprovatorio de recebimento de equipamentos.</div>

      ${sectionBlock('Dados do Contrato', '#111827', '#EAB308', rContrato)}

      ${c.telefoneEntrega || c.endereco ? sectionBlock('Dados da Entrega', '#1e40af', '#2563eb', rEntrega) : ''}

      <p style="text-align:justify;margin:6px 0;font-size:10px;color:#374151;line-height:1.4;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
      </p>

      ${itensHtml}

      ${observacaoHtml}

      ${assinaturaHtml}

      ${buildPhotoSection(fotosEntrega, fotosRetirada, tsEntrega, tsRetirada, c.numero || c.contrato, c.data)}

      ${pdfFooter('COMPROVANTE DE ENTREGA')}
    </div>
  `);

  await (await getHtml2pdf())()
    .set({
      margin: [6, 6, 10, 6],
      filename: `comprovante-entrega-${c.numero || c.contrato || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

// ============================================
// PDF: Comprovante de Devolucao (Professional)
// ============================================
export async function generateDevolucaoPDF(devolucao) {
  const d = devolucao;
  const itens = Array.isArray(d.itens) ? d.itens : [];
  const condicoes = d.condicoes || {};
  const fotosEntrega = (Array.isArray(d.fotosEntrega) ? d.fotosEntrega : (Array.isArray(d.fotos_entrega) ? d.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(d.fotosRetirada) ? d.fotosRetirada : (Array.isArray(d.fotos_retirada) ? d.fotos_retirada : [])).filter(Boolean);
  const tsEntrega = (Array.isArray(d.fotosEntregaTimestamps) ? d.fotosEntregaTimestamps : (Array.isArray(d.fotos_entrega_timestamps) ? d.fotos_entrega_timestamps : []));
  const tsRetirada = (Array.isArray(d.fotosRetiradaTimestamps) ? d.fotosRetiradaTimestamps : (Array.isArray(d.fotos_retirada_timestamps) ? d.fotos_retirada_timestamps : []));

  const rContrato = [
    row('Numero', `<span style="font-size:14px;font-weight:900;color:#f97316;">${esc(d.numero || d.contratoId || '-')}</span>`),
    row('Cliente', esc(d.locatario || '-'), { bold: true }),
    d.cpf ? row('CPF/CNPJ', esc(d.cpf)) : '',
    d.telefone ? row('Telefone', esc(d.telefone)) : '',
    d.cidade ? row('Cidade', `${esc(d.cidade)}${d.estado ? `/${esc(d.estado)}` : ''}`) : '',
    d.endereco ? row('Endereco', `${esc(d.endereco)}${d.numero ? `, ${esc(d.numero)}` : ''}${d.bairro ? ` - ${esc(d.bairro)}` : ''}`) : '',
  ].filter(Boolean).join('');

  const rDevolucao = [
    d.data ? row('Data', esc(d.data)) : '',
    d.hora ? row('Hora', esc(d.hora)) : '',
    d.localObra ? row('Local da Obra', esc(d.localObra)) : '',
    d.signatarioNome ? row('Recebido por', esc(d.signatarioNome), { bold: true }) : '',
    d.referencia ? row('Referencia', esc(d.referencia)) : '',
  ].filter(Boolean).join('');

  const condicoesList = [];
  if (condicoes.danificado) condicoesList.push('Danificado/Sujo');
  if (condicoes.extraviado) condicoesList.push('Extraviado');
  if (condicoes.testarEmpresa) condicoesList.push('Testar na Empresa');

  let itensHtml = '';
  if (itens.length > 0) {
    itensHtml = sectionBlock('Itens Devolvidos', '#111827', '#f97316', `<tr><td style="padding:0;">${buildItemsTableDevolucao(itens)}</td></tr>`);
  }

  let condicoesHtml = '';
  if (condicoesList.length > 0) {
    condicoesHtml = sectionBlock('Condicoes da Devolucao', '#111827', '#f97316', `<tr><td style="padding:4px 0;font-size:11px;color:#374151;">${condicoesList.join(' | ')}</td></tr>`);
  }

  let assinaturaHtml = '';
  if (d.signatarioNome) {
    assinaturaHtml = sectionBlock('Assinatura do Recebedor', '#166534', '#22c55e', [
      row('Nome', esc(d.signatarioNome), { bold: true }),
      d.signatureImg || d.assinaturaImagem ? `<tr><td colspan="2" style="padding-top:6px;"><div style="font-size:9px;color:#166534;font-weight:700;margin-bottom:4px;">ASSINATURA:</div><img src="${d.signatureImg || d.assinaturaImagem}" style="max-height:50px;max-width:160px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;background:#fff;" /></td></tr>` : '',
    ].filter(Boolean).join(''));
  }

  const html = pdfWrapper(`
    ${brandHeader('Comprovante de Devolucao', 'SISTEMA DE GESTAO DE LOCACAO', 'DEVOLUCAO', '#111827', '#f97316')}
    <div style="padding:16px 20px 8px;">
      <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Devolucao de Equipamento</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:14px;">Documento comprovatorio de devolucao de equipamentos locados.</div>

      ${sectionBlock('Dados do Contrato', '#111827', '#f97316', rContrato)}

      ${rDevolucao ? sectionBlock('Dados da Devolucao', '#111827', '#f97316', rDevolucao) : ''}

      <p style="text-align:justify;margin:6px 0;font-size:10px;color:#374151;line-height:1.4;">
        DECLARO(AMOS) para os fins e efeito de direito que devolvo(os) o(s) equipamento(s) abaixo discriminado(s):
      </p>

      ${itensHtml}

      ${condicoesHtml}

      ${assinaturaHtml}

      ${buildPhotoSection(fotosEntrega, fotosRetirada, tsEntrega, tsRetirada, d.numero || d.contratoId, d.data)}

      ${pdfFooter('COMPROVANTE DE DEVOLUCAO')}
    </div>
  `);

  await (await getHtml2pdf())()
    .set({
      margin: [6, 6, 10, 6],
      filename: `comprovante-devolucao-${d.numero || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

// ============================================
// PDF: Contrato (Professional)
// ============================================
export async function generateContratoPDF(contrato) {
  const itens = Array.isArray(contrato.itens) ? contrato.itens : [];
  const equipamentos = Array.isArray(contrato.equipamentos) ? contrato.equipamentos : [];
  const equipsWithPat = equipamentos.map(eqName => {
    const match = itens.find(it => (it.descricao || it.nome || '') === eqName);
    return match?.patrimonio ? `${eqName} (Pat: ${match.patrimonio})` : eqName;
  });
  const fotosEntrega = (Array.isArray(contrato.fotosEntrega) ? contrato.fotosEntrega : (Array.isArray(contrato.fotos_entrega) ? contrato.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(contrato.fotosRetirada) ? contrato.fotosRetirada : (Array.isArray(contrato.fotos_retirada) ? contrato.fotos_retirada : [])).filter(Boolean);
  const signatureImg = contrato.signatureImg || contrato.assinaturaImagem || contrato.assinaturaImg || '';
  const signatarioNome = contrato.signatarioNome || contrato.nomeSignatario || contrato.contato || '';
  const dataAssinatura = contrato.dataAssinatura || '';
  const hasPhotos = fotosEntrega.length > 0 || fotosRetirada.length > 0 || signatureImg;

  const rContrato = [
    row('Numero', `<span style="font-size:14px;font-weight:900;color:#EAB308;">${esc(contrato.numero || contrato.id)}</span>`),
    row('Cliente', esc(contrato.cliente || '-'), { bold: true }),
    contrato.cnpj ? row('CPF/CNPJ', esc(contrato.cnpj)) : '',
    contrato.rg ? row('RG', esc(contrato.rg)) : '',
    contrato.atendente ? row('Atendente', esc(contrato.atendente)) : '',
    contrato.telefone ? row('Telefone', esc(contrato.telefone)) : '',
    contrato.inicio ? row('Periodo', `${esc(contrato.inicio)} a ${esc(contrato.fim || '-')}`) : '',
    contrato.valorMensal ? row('Valor Mensal', `R$ ${formatMoney(contrato.valorMensal)}/mes`) : '',
    contrato.valorTotal ? row('Valor Total', `R$ ${formatMoney(contrato.valorTotal)}`) : '',
  ].filter(Boolean).join('');

  const rEntrega = [
    contrato.cidade ? row('Cidade', `${esc(contrato.cidade)}${contrato.estado ? `/${esc(contrato.estado)}` : ''}`) : '',
    contrato.endereco ? row('Endereco', `${esc(contrato.endereco)}${contrato.numeroEndereco ? `, ${esc(contrato.numeroEndereco)}` : ''}${contrato.bairro ? ` - ${esc(contrato.bairro)}` : ''}`) : '',
    contrato.localEntrega ? row('Local da Entrega', esc(contrato.localEntrega)) : '',
    contrato.telefoneEntrega ? row('Telefone Entrega', esc(contrato.telefoneEntrega)) : '',
    contrato.contato ? row('Contato', esc(contrato.contato)) : '',
    contrato.referencia ? row('Referencia', esc(contrato.referencia)) : '',
  ].filter(Boolean).join('');

  let itensHtml = '';
  if (itens.length > 0) {
    itensHtml = sectionBlock('Itens Locados', '#111827', '#EAB308', `<tr><td style="padding:0;">${buildItemsTable(itens)}</td></tr>`);
  }

  let equipHtml = '';
  if (equipsWithPat.length > 0) {
    equipHtml = sectionBlock('Equipamentos', '#111827', '#EAB308', `<tr><td style="padding:4px 0;font-size:11px;color:#374151;">${esc(equipsWithPat.join(' | '))}</td></tr>`);
  }

  let observacaoHtml = '';
  if (contrato.observacao) {
    observacaoHtml = `<div style="margin:8px 0;padding:8px 12px;border-left:3px solid #EAB308;background:#FEF3C7;border-radius:0 4px 4px 0;">
      <div style="font-size:9px;font-weight:700;color:#111827;margin-bottom:2px;">OBSERVACAO</div>
      <div style="font-size:10px;color:#374151;">${esc(contrato.observacao)}</div>
    </div>`;
  }

  let assinaturaHtml = '';
  if (signatarioNome || signatureImg) {
    assinaturaHtml = sectionBlock('Assinatura do Locatario', '#166534', '#22c55e', [
      signatarioNome ? row('Nome', esc(signatarioNome), { bold: true }) : '',
      dataAssinatura ? row('Data', esc(dataAssinatura)) : '',
      signatureImg ? `<tr><td colspan="2" style="padding-top:6px;"><div style="font-size:9px;color:#166534;font-weight:700;margin-bottom:4px;">ASSINATURA:</div><img src="${signatureImg}" style="max-height:50px;max-width:160px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;background:#fff;" /></td></tr>` : '',
    ].filter(Boolean).join(''));
  }

  const html = pdfWrapper(`
    ${brandHeader('Comprovante de Entrega dos Bens Locados', 'SISTEMA DE GESTAO DE LOCACAO', 'CONTRATO', '#111827', '#EAB308')}
    <div style="padding:16px 20px 8px;">
      <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">Comprovante de Entrega dos Bens Locados</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:14px;">Documento comprovatorio de recebimento de equipamentos locados.</div>

      ${sectionBlock('Dados do Contrato', '#111827', '#EAB308', rContrato)}

      ${rEntrega ? sectionBlock('Dados da Entrega', '#1e40af', '#2563eb', rEntrega) : ''}

      ${equipHtml}

      <p style="text-align:justify;margin:6px 0;font-size:10px;color:#374151;line-height:1.4;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
      </p>

      ${itensHtml}

      ${observacaoHtml}

      ${assinaturaHtml}

      ${buildPhotoSection(fotosEntrega, fotosRetirada, contrato.fotosEntregaTimestamps, contrato.fotosRetiradaTimestamps, contrato.numero || contrato.id, contrato.dataContrato)}

      ${pdfFooter('COMPROVANTE DE ENTREGA')}
    </div>
  `);

  await (await getHtml2pdf())()
    .set({
      margin: [6, 6, 10, 6],
      filename: `contrato-${contrato.numero || contrato.id || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

// ============================================
// PDF: Fallback Email (Professional)
// ============================================
export async function generateFallbackEmailPDF(emailData) {
  const tipo = emailData.tipo || 'notificacao';
  const contrato = emailData.contrato || {};
  const comprovante = emailData.comprovante || {};
  const signatario = emailData.signatario || {};
  const devolucao = emailData.devolucao || {};

  const tipoLabel = {
    contrato_criado: 'CONTRATO CRIADO',
    contrato_assinado: 'CONTRATO ASSINADO',
    contrato_renovado: 'CONTRATO RENOVADO',
    devolucao_registrada: 'DEVOLUCAO REGISTRADA',
  }[tipo] || 'NOTIFICACAO';

  const tipoColor = {
    contrato_criado: '#EAB308',
    contrato_assinado: '#16a34a',
    contrato_renovado: '#3b82f6',
    devolucao_registrada: '#f97316',
  }[tipo] || '#EAB308';

  const itens = comprovante.itens || devolucao.itens || contrato.itens || [];
  const itensTableHtml = Array.isArray(itens) && itens.length > 0
    ? buildItemsTable(itens.filter(it => typeof it === 'object'), tipoColor)
    : '';

  let rContrato = '';
  if (contrato.numero || contrato.id) {
    rContrato = sectionBlock('Dados do Contrato', '#111827', tipoColor, [
      row('Numero', `<span style="font-size:14px;font-weight:900;color:${tipoColor};">${esc(contrato.numero || contrato.id)}</span>`),
      row('Cliente', esc(contrato.cliente || comprovante.locatario || devolucao.locatario || '-'), { bold: true }),
      contrato.cnpj ? row('CPF/CNPJ', esc(contrato.cnpj || comprovante.cpf)) : '',
      contrato.atendente ? row('Atendente', esc(contrato.atendente)) : '',
      contrato.inicio ? row('Periodo', `${esc(contrato.inicio)} a ${esc(contrato.fim || '-')}`) : '',
      contrato.valorMensal ? row('Valor Mensal', `R$ ${formatMoney(contrato.valorMensal)}/mes`) : '',
    ].filter(Boolean).join(''));
  }

  let rEntrega = '';
  if (comprovante.locatario || devolucao.locatario) {
    rEntrega = sectionBlock(`Dados da ${tipo === 'contrato_assinado' ? 'Entrega' : 'Devolucao'}`, '#111827', tipoColor, [
      row('Locatario', esc(comprovante.locatario || devolucao.locatario || '-'), { bold: true }),
      comprovante.cpf ? row('CPF', esc(comprovante.cpf)) : '',
      comprovante.cidade ? row('Cidade', esc(comprovante.cidade)) : '',
      comprovante.total ? row('Total', `R$ ${formatMoney(comprovante.total)}`, { bold: true, color: '#16a34a' }) : '',
    ].filter(Boolean).join(''));
  }

  let rSignatario = '';
  if (signatario.nome) {
    rSignatario = sectionBlock('Assinatura Digital', '#166534', '#22c55e', [
      row('Nome', esc(signatario.nome), { bold: true }),
      signatario.cpf ? row('CPF', esc(signatario.cpf)) : '',
      signatario.data ? row('Data', formatDateBR(signatario.data)) : '',
      signatario.assinaturaImagem ? `<tr><td colspan="2" style="padding-top:6px;"><div style="font-size:9px;color:#166534;font-weight:700;margin-bottom:4px;">ASSINATURA:</div><img src="${signatario.assinaturaImagem}" style="max-height:50px;max-width:160px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;background:#fff;" /></td></tr>` : '',
    ].filter(Boolean).join(''));
  }

  const html = pdfWrapper(`
    ${brandHeader(tipoLabel, 'SISTEMA DE GESTAO DE LOCACAO', tipoLabel.split(' ')[0], '#111827', tipoColor)}
    <div style="padding:16px 20px 8px;">
      <div style="font-size:16px;font-weight:800;color:#111827;margin-bottom:2px;">${esc(tipoLabel)}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:14px;">Notificacao automatica do sistema TransObra.</div>

      ${rContrato}
      ${rEntrega}

      ${itensTableHtml ? sectionBlock('Itens', '#111827', tipoColor, `<tr><td style="padding:0;">${itensTableHtml}</td></tr>`) : ''}

      ${rSignatario}

      <div style="text-align:center;margin:12px 0;padding:8px;border:1px dashed ${tipoColor};border-radius:6px;">
        <div style="font-size:8px;color:#9CA3AF;letter-spacing:1px;">DOCUMENTO GERADO AUTOMATICAMENTE PELO SISTEMA</div>
      </div>

      ${pdfFooter(tipoLabel)}
    </div>
  `);

  const filename = `notificacao-${tipo}-${contrato.numero || comprovante.id || devolucao.numero || 'doc'}.pdf`;

  await (await getHtml2pdf())()
    .set({
      margin: [6, 6, 10, 6],
      filename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}
