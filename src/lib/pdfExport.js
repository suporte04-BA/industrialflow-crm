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

function checkbox(checked) {
  return checked
    ? '<span style="display:inline-block;width:12px;height:12px;border:1px solid #374151;text-align:center;line-height:11px;font-size:10px;font-weight:bold;color:#111827;">X</span>'
    : '<span style="display:inline-block;width:12px;height:12px;border:1px solid #D1D5DB;">&nbsp;</span>';
}

function buildHeader() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="padding:0 0 6px 0;border-bottom:2px solid ${BRAND.amarelo};">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="text-align:left;vertical-align:bottom;">
              <div style="font-size:13px;font-weight:800;color:${BRAND.preto};letter-spacing:0.5px;">TRANSOBRA</div>
              <div style="font-size:6px;color:${BRAND.cinzaTexto};letter-spacing:1.5px;margin-top:1px;">LOCACAO DE EQUIPAMENTOS</div>
            </td>
            <td style="text-align:right;vertical-align:bottom;">
              <div style="font-size:6px;color:${BRAND.cinzaTexto};">${esc(EMPRESA.endereco)}</div>
              <div style="font-size:6px;color:${BRAND.cinzaTexto};">${esc(EMPRESA.cidade)} - ${esc(EMPRESA.estado)} | CEP: ${esc(EMPRESA.cep)}</div>
              <div style="font-size:6px;color:${BRAND.amarelo};font-weight:600;">TEL: ${esc(EMPRESA.telefone)}</div>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>`;
}

function buildFooter(tipo) {
  const now = new Date();
  const dataGeracao = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:1px solid ${BRAND.cinzaBorda};">
      <tr><td style="padding:6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:6px;color:${BRAND.cinzaTexto};">TRANSOBRA CRM</td>
          <td style="font-size:6px;color:${BRAND.cinzaTexto};text-align:right;">${esc(tipo)} | ${dataGeracao}</td>
        </tr></table>
      </td></tr>
    </table>`;
}

function buildSectionTitle(titulo) {
  return `
    <div style="margin:6px 0 3px 0;padding:2px 0;border-bottom:1px solid ${BRAND.cinzaBorda};">
      <span style="font-size:8px;font-weight:700;color:${BRAND.preto};letter-spacing:1px;text-transform:uppercase;">${esc(titulo)}</span>
    </div>`;
}

function buildInfoGrid(pairs) {
  return pairs.filter(Boolean).map(([label, value]) =>
    `<tr><td style="padding:1px 0;font-size:8px;color:${BRAND.cinzaTexto};width:100px;vertical-align:top;">${esc(label)}</td><td style="padding:1px 0;font-size:8px;color:${BRAND.preto};font-weight:500;">${esc(value)}</td></tr>`
  ).join('');
}

function buildLocatarioBlock(d) {
  const isCnpj = (d.cnpjLocatario || d.cpf || '').replace(/\D/g, '').length > 11;
  const docLabel = isCnpj ? 'CNPJ' : 'CPF';
  const docValue = d.cnpjLocatario || d.cpf || '';
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;">
      ${buildInfoGrid([
        ['Estado', d.estado || EMPRESA.estado],
        ['CEP', d.cep || EMPRESA.cep],
        ['Telefone', d.telefone || ''],
        ['Endereco', `${d.endereco || ''}${d.numero ? `, ${d.numero}` : ''}${d.bairro ? ` - ${d.bairro}` : ''}`],
        ['Bairro', d.bairro || ''],
        ['Contato', d.contato || ''],
        [docLabel, docValue],
        d.rg ? ['RG', d.rg] : null,
      ])}
    </table>`;
}

function buildContractInfoBlock(c) {
  return `
    <div style="border:1px solid ${BRAND.cinzaBorda};padding:4px;margin:4px 0;">
      <div style="text-align:center;font-weight:700;font-size:8px;margin-bottom:3px;color:${BRAND.preto};padding-bottom:2px;border-bottom:1px solid ${BRAND.cinzaBorda};">
        DADOS DO CONTRATO
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${buildInfoGrid([
          ['Inicio', c.inicio || '-'],
          ['Fim', c.fim || '-'],
          ['Valor Mensal', 'R$ ' + formatMoney(c.valorMensal) + '/mes'],
          ['Valor Total', 'R$ ' + formatMoney(c.valorTotal)],
          ['Status', (c.status || '-').toUpperCase()],
          c.assinado ? ['Assinatura', 'CONTRATO ASSINADO'] : null,
        ])}
      </table>
    </div>`;
}

function buildItemsTableEntrega(itens) {
  if (!itens || itens.length === 0) return '';
  const rows = itens.map((it) => `
    <tr>
      <td style="padding:2px 3px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:8px;">${esc(it.quantidade || 1)}</td>
      <td style="padding:2px 3px;border:1px solid ${BRAND.cinzaBorda};font-size:8px;">${esc(it.descricao || '-')}</td>
      <td style="padding:2px 3px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:8px;font-weight:700;">${esc(it.patrimonio || '-')}</td>
      <td style="padding:2px 3px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:8px;">${esc(it.dataLocacao || '-')}</td>
      <td style="padding:2px 3px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:8px;">${esc(it.dataDevolucao || '-')}</td>
      <td style="padding:2px 3px;border:1px solid ${BRAND.cinzaBorda};text-align:right;font-size:8px;">R$ ${formatMoney(it.valorUnitario)}</td>
    </tr>`).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:3px 0;">
      <thead>
        <tr>
          <th style="padding:2px 3px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:7px;font-weight:700;background:${BRAND.preto};">Qtde</th>
          <th style="padding:2px 3px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:7px;font-weight:700;background:${BRAND.preto};">Descricao</th>
          <th style="padding:2px 3px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:7px;font-weight:700;background:${BRAND.preto};">Patrimonio</th>
          <th style="padding:2px 3px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:7px;font-weight:700;background:${BRAND.preto};">DLoc</th>
          <th style="padding:2px 3px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:7px;font-weight:700;background:${BRAND.preto};">D.Dev</th>
          <th style="padding:2px 3px;border:1px solid ${BRAND.preto};text-align:right;color:${BRAND.branco};font-size:7px;font-weight:700;background:${BRAND.preto};">Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildSignatureBlock(signatarioNome, signatureImg) {
  const sigImgTag = signatureImg
    ? `<img src="${signatureImg}" style="max-height:40px;max-width:150px;display:block;margin:0 auto 2px auto;" />`
    : `<div style="border-top:1px solid ${BRAND.preto};height:30px;"></div>`;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      <tr>
        <td width="45%" style="text-align:center;vertical-align:top;">
          <div style="border-top:1px solid ${BRAND.preto};height:30px;"></div>
          <div style="font-size:6px;color:${BRAND.cinzaTexto};margin-top:2px;letter-spacing:0.5px;">LOCADORA</div>
        </td>
        <td width="10%"></td>
        <td width="45%" style="text-align:center;vertical-align:top;">
          ${sigImgTag}
          <div style="font-size:6px;color:${BRAND.cinzaTexto};margin-top:2px;letter-spacing:0.5px;">LOCATARIO: ${esc(signatarioNome || '___________________')}</div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      <tr>
        <td style="font-size:7px;color:#374151;">RG: _________________________</td>
        <td style="font-size:7px;color:#374151;">FONE: _________________________</td>
      </tr>
    </table>`;
}

function buildPhotoGrid(fotos, tipo, timestamps) {
  if (!fotos || fotos.length === 0) return '';
  const padded = [...fotos];
  while (padded.length < 3) padded.push(null);
  const ts = Array.isArray(timestamps) ? timestamps : [];
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;">
      <tr><td style="font-size:8px;font-weight:700;color:${BRAND.preto};padding:3px 0;border-bottom:1px solid ${BRAND.cinzaBorda};">${esc(tipo)}</td></tr>
    </table>
    <table width="100%" cellpadding="2" cellspacing="0">
      <tr>
        ${padded.slice(0, 3).map((foto, i) => `
          <td width="33%" style="text-align:center;vertical-align:top;">
            ${foto
              ? `<div style="position:relative;display:inline-block;width:100%;">
                  <img src="${foto}" style="width:100%;max-height:110px;object-fit:cover;border:1px solid ${BRAND.cinzaBorda};" />
                  ${ts[i] ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:5px;padding:1px 2px;text-align:center;font-family:monospace;">${esc(ts[i])}</div>` : ''}
                </div>`
              : `<div style="width:100%;height:90px;border:1px dashed ${BRAND.cinzaBorda};display:flex;align-items:center;justify-content:center;font-size:7px;color:${BRAND.cinzaTexto};">Sem foto</div>`
            }
            <div style="font-size:6px;color:${BRAND.cinzaTexto};margin-top:1px;">Foto ${i + 1}</div>
          </td>
        `).join('')}
      </tr>
    </table>`;
}

function getMetodoEntregaText(metodo) {
  if (metodo === 'cliente_retirada') return 'Cliente retira e devolve na locadora';
  if (metodo === 'locadora_entrega') return 'Locadora entrega e retira na obra';
  return '';
}

// ============================================
// PDF: Comprovante de Entrega
// ============================================
export async function generateEntregaPDF(comprovante) {
  const c = comprovante;
  const itens = Array.isArray(c.itens) ? c.itens : [];
  const total = c.total != null ? c.total : itens.reduce((s, it) => s + (it.quantidade || 1) * (it.valorUnitario || 0), 0);
  const fotosEntrega = (Array.isArray(c.fotosEntrega) ? c.fotosEntrega : (Array.isArray(c.fotos_entrega) ? c.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(c.fotosRetirada) ? c.fotosRetirada : (Array.isArray(c.fotos_retirada) ? c.fotos_retirada : [])).filter(Boolean);
  const tsEntrega = (Array.isArray(c.fotosEntregaTimestamps) ? c.fotosEntregaTimestamps : (Array.isArray(c.fotos_entrega_timestamps) ? c.fotos_entrega_timestamps : []));
  const tsRetirada = (Array.isArray(c.fotosRetiradaTimestamps) ? c.fotosRetiradaTimestamps : (Array.isArray(c.fotos_retirada_timestamps) ? c.fotos_retirada_timestamps : []));

  const html = `
    <div style="font-family:Arial,sans-serif;padding:0;max-width:760px;margin:0 auto;font-size:8px;color:#374151;">
      ${buildHeader()}

      <div style="text-align:center;margin:4px 0 8px 0;">
        <span style="font-size:11px;font-weight:700;color:${BRAND.preto};letter-spacing:1px;">COMPROVANTE DE ENTREGA</span>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;">
        <tr>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};"><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(c.numero || c.contrato || '')}</td>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};text-align:right;"><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(c.atendente || '')}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;line-height:1.4;padding:4px;">
          <strong style="color:${BRAND.preto};">Locatario:</strong> ${esc(c.locatario || '')} | <strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(c.cidade || '')}<br/>
          <strong style="color:${BRAND.preto};">Local da entrega:</strong> ${esc(c.localEntrega || '')}
        </td></tr>
      </table>

      <p style="text-align:justify;margin:4px 0;font-size:8px;color:#374151;line-height:1.2;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
      </p>

      ${buildLocatarioBlock(c)}

      ${c.telefoneEntrega ? `<div style="margin:2px 0;font-size:8px;"><strong style="color:${BRAND.preto};">Telefone do local:</strong> ${esc(c.telefoneEntrega)}</div>` : ''}

      ${c.referencia ? `<div style="margin:2px 0;font-size:8px;"><strong style="color:${BRAND.preto};">Referencia:</strong> ${esc(c.referencia)}</div>` : ''}

      ${buildItemsTableEntrega(itens)}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;">
        <tr><td style="text-align:right;font-weight:700;font-size:9px;padding:3px 6px;">
          TOTAL: R$ ${formatMoney(total)}
        </td></tr>
      </table>

      <p style="font-size:8px;text-align:justify;margin:3px 0;color:#374151;line-height:1.2;">
        Declaro que recebi todos os equipamentos acima listados testados e aptos para uso.
      </p>

      <div style="text-align:right;margin-top:3px;font-size:8px;color:#374151;">
        ${esc(c.cidade || EMPRESA.cidade)}, ${dataPorExtenso(c.data)}
      </div>

      ${buildSignatureBlock(c.signatarioNome || c.nomeSignatario, c.signatureImg || c.assinaturaImagem || c.assinaturaImg)}

      ${c.observacao ? `
      <div style="margin-top:4px;font-size:8px;padding:3px 6px;border-left:3px solid ${BRAND.amarelo};">
        <strong style="color:${BRAND.preto};">Observacao:</strong> ${esc(c.observacao)}
      </div>` : ''}

      ${c.metodoEntrega ? `<div style="margin-top:3px;font-size:7px;font-style:italic;color:${BRAND.cinzaTexto};">${esc(getMetodoEntregaText(c.metodoEntrega))}</div>` : ''}

      ${buildFooter('COMPROVANTE DE ENTREGA')}

      ${(fotosEntrega.length > 0 || fotosRetirada.length > 0) ? `
      <div style="page-break-before:always;padding-top:8px;">
        <div style="text-align:center;margin:4px 0 8px 0;">
          <span style="font-size:11px;font-weight:700;color:${BRAND.preto};letter-spacing:1px;">REGISTRO FOTOGRAFICO</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:7px;color:${BRAND.cinzaTexto};padding-bottom:3px;">
            Contrato: ${esc(c.numero || c.contrato || '')} | Data: ${esc(c.data || new Date().toLocaleDateString('pt-BR'))}
          </td></tr>
        </table>
        ${buildPhotoGrid(fotosEntrega, 'ENTREGA', tsEntrega)}
        ${buildPhotoGrid(fotosRetirada, 'RETIRADA', tsRetirada)}
        ${buildFooter('REGISTRO FOTOGRAFICO')}
      </div>` : ''}
    </div>`;

  await (await getHtml2pdf())()
    .set({
      margin: [8, 8, 12, 8],
      filename: `comprovante-entrega-${c.numero || c.contrato || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

// ============================================
// PDF: Comprovante de Devolucao
// ============================================
export async function generateDevolucaoPDF(devolucao) {
  const d = devolucao;
  const itens = Array.isArray(d.itens) ? d.itens : [];
  const condicoes = d.condicoes || {};

  const itensHtml = itens.length > 0
    ? itens.map((it) => `
      <div style="margin:1px 0;font-size:8px;padding:1px 3px;">
        ${checkbox(it.qtdDevolvida > 0)}&nbsp;&nbsp;${it.quantidade || 1} - ${esc(it.descricao || '')}
        ${it.patrimonio ? `<strong style="color:${BRAND.preto};"> [Pat: ${esc(it.patrimonio)}]</strong>` : ''}
        ${it.qtdFaltante > 0 ? `<span style="color:${BRAND.vermelho};margin-left:4px;font-weight:700;">FALTANTE: ${it.qtdFaltante}</span>` : ''}
      </div>`).join('')
    : `<p style="font-size:8px;color:${BRAND.cinzaTexto};">Nenhum item informado</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:0;max-width:760px;margin:0 auto;font-size:8px;color:#374151;">
      ${buildHeader()}

      <div style="text-align:center;margin:4px 0 8px 0;">
        <span style="font-size:11px;font-weight:700;color:${BRAND.preto};letter-spacing:1px;">COMPROVANTE DE DEVOLUCAO</span>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;">
        <tr>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};"><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(d.numero || d.contratoId || '')}</td>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};text-align:right;"><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(d.atendente || '')}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;line-height:1.4;padding:4px;">
          <strong style="color:${BRAND.preto};">Locatario:</strong> ${esc(d.locatario || '')}<br/>
          <strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(d.cidade || '')}<br/>
          <strong style="color:${BRAND.preto};">Local da Obra:</strong> ${esc(d.localObra || d.localEntrega || '')}
        </td></tr>
      </table>

      <p style="text-align:justify;margin:4px 0;font-size:8px;color:#374151;line-height:1.2;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) os equipamento(s) abaixo discriminado(s):
      </p>

      ${buildLocatarioBlock(d)}

      ${d.telefone ? `<div style="margin:2px 0;font-size:8px;"><strong style="color:${BRAND.preto};">Telefone da obra:</strong> ${esc(d.telefone)}</div>` : ''}

      <div style="border:1px solid ${BRAND.cinzaBorda};padding:4px;margin:4px 0;">
        <div style="text-align:center;font-weight:700;font-size:8px;margin-bottom:3px;color:${BRAND.preto};padding-bottom:2px;border-bottom:1px solid ${BRAND.cinzaBorda};">
          DADOS DA DEVOLUCAO
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${buildInfoGrid([
            ['Data', d.data || ''],
            ['Hora', d.hora || ''],
            ['Recebido por', d.signatarioNome || ''],
            ['Referencia', d.referencia || ''],
          ])}
        </table>
      </div>

      ${buildSectionTitle('ITENS DEVOLVIDOS')}
      <div style="margin:3px 0;">${itensHtml}</div>

      <div style="text-align:right;margin-top:6px;font-size:8px;color:#374151;">
        ${esc(d.cidade || EMPRESA.cidade)}, ${dataPorExtenso(d.data)}
      </div>

      ${buildSignatureBlock(d.signatarioNome, d.signatureImg || d.assinaturaImagem || d.assinaturaImg)}

      <div style="margin-top:6px;padding:4px;border:1px solid ${BRAND.cinzaBorda};">
        <div style="font-size:7px;color:${BRAND.cinzaTexto};margin-bottom:3px;">CONDICOES APLICAVEIS:</div>
        <div style="display:flex;gap:10px;font-size:8px;">
          <span>${checkbox(condicoes.danificado)}&nbsp;DANIFICADO/SUJO</span>
          <span>${checkbox(condicoes.extraviado)}&nbsp;EXTRAVIADO/ROUBADO</span>
          <span>${checkbox(condicoes.testarEmpresa)}&nbsp;SERÁ TESTADO NA EMPRESA</span>
        </div>
      </div>

      ${d.metodoEntrega ? `<div style="margin-top:4px;font-size:7px;font-style:italic;color:${BRAND.cinzaTexto};">${esc(getMetodoEntregaText(d.metodoEntrega))}</div>` : ''}

      ${buildFooter('COMPROVANTE DE DEVOLUCAO')}
    </div>`;

  await (await getHtml2pdf())()
    .set({
      margin: [8, 8, 12, 8],
      filename: `comprovante-devolucao-${d.numero || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

// ============================================
// PDF: Contrato
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

  const html = `
    <div style="font-family:Arial,sans-serif;padding:0;max-width:760px;margin:0 auto;font-size:8px;color:#374151;">
      ${buildHeader()}

      <div style="text-align:center;margin:4px 0 8px 0;">
        <span style="font-size:11px;font-weight:700;color:${BRAND.preto};letter-spacing:1px;">COMPROVANTE DE ENTREGA DOS BENS LOCADOS</span>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;">
        <tr>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};"><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(contrato.numero || contrato.id)}</td>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};text-align:right;"><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(contrato.atendente || '')}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;line-height:1.4;padding:4px;">
          <strong style="color:${BRAND.preto};">Locatario:</strong> ${esc(contrato.cliente || '')}<br/>
          <strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(contrato.cidade || '')}<br/>
          <strong style="color:${BRAND.preto};">Local da entrega:</strong> ${esc(contrato.localEntrega || '')}
        </td></tr>
      </table>

      <p style="text-align:justify;margin:4px 0;font-size:8px;color:#374151;line-height:1.2;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
      </p>

      ${buildLocatarioBlock(contrato)}

      ${contrato.telefoneEntrega ? `<div style="margin:2px 0;font-size:8px;"><strong style="color:${BRAND.preto};">Telefone do local de entrega:</strong> ${esc(contrato.telefoneEntrega)}</div>` : ''}

      ${contrato.referencia ? `<div style="margin:2px 0;font-size:8px;"><strong style="color:${BRAND.preto};">Referencia:</strong> ${esc(contrato.referencia)}</div>` : ''}

      ${buildItemsTableEntrega(itens)}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;">
        <tr><td style="text-align:right;font-weight:700;font-size:9px;padding:3px 6px;">
          TOTAL: R$ ${formatMoney(contrato.valorTotal)}
        </td></tr>
      </table>

      ${equipamentos.length > 0 ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;padding:4px;">
          <strong style="color:${BRAND.preto};">Equipamentos:</strong> ${esc(equipsWithPat.join(' | ') || '-')}
        </td></tr>
      </table>` : ''}

      ${contrato.observacao ? `
      <div style="margin:3px 0;font-size:8px;padding:3px 6px;border-left:3px solid ${BRAND.amarelo};">
        <strong style="color:${BRAND.preto};">Observacao:</strong> ${esc(contrato.observacao)}
      </div>` : ''}

      ${buildContractInfoBlock(contrato)}

      <div style="text-align:right;margin-top:4px;font-size:8px;color:#374151;">
        ${esc(contrato.cidade || EMPRESA.cidade)}, ${dataPorExtenso(contrato.dataContrato)}
      </div>

      ${buildSignatureBlock(contrato.contato, signatureImg)}

      ${contrato.metodoEntrega ? `<div style="margin-top:4px;font-size:7px;font-style:italic;color:${BRAND.cinzaTexto};">${esc(getMetodoEntregaText(contrato.metodoEntrega))}</div>` : ''}

      ${hasPhotos ? `
      <div style="page-break-before:always;margin-top:10px;">
        <div style="text-align:center;margin-bottom:6px;">
          <span style="font-size:9px;font-weight:700;color:${BRAND.preto};letter-spacing:0.5px;">REGISTRO FOTOGRAFICO</span>
          ${dataAssinatura ? `<div style="font-size:7px;color:${BRAND.cinzaTexto};margin-top:2px;">${esc(dataAssinatura)}</div>` : ''}
        </div>

        ${buildPhotoGrid(fotosEntrega, 'FOTOS DA ENTREGA', contrato.fotosEntregaTimestamps)}
        ${buildPhotoGrid(fotosRetirada, 'FOTOS DA RETIRADA', contrato.fotosRetiradaTimestamps)}

        ${signatarioNome ? `<div style="margin-top:6px;font-size:7px;color:${BRAND.cinzaTexto};"><strong style="color:${BRAND.preto};">Signatario:</strong> ${esc(signatarioNome)}${dataAssinatura ? ` | <strong style="color:${BRAND.preto};">Data:</strong> ${esc(dataAssinatura)}` : ''}</div>` : ''}
      </div>` : ''}

      ${buildFooter('COMPROVANTE DE ENTREGA')}
    </div>`;

  await (await getHtml2pdf())()
    .set({
      margin: [8, 8, 12, 8],
      filename: `contrato-${contrato.numero || contrato.id || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

// ============================================
// PDF: Fallback Email
// ============================================
export async function generateFallbackEmailPDF(emailData) {
  const tipo = emailData.tipo || 'notificacao';
  const contrato = emailData.contrato || {};
  const comprovante = emailData.comprovante || {};
  const signatario = emailData.signatario || {};
  const devolucao = emailData.devolucao || {};

  const tipoLabel = {
    contrato_criado: 'NOTIFICACAO - CONTRATO CRIADO',
    contrato_assinado: 'NOTIFICACAO - CONTRATO ASSINADO',
    contrato_renovado: 'NOTIFICACAO - CONTRATO RENOVADO',
    devolucao_registrada: 'NOTIFICACAO - DEVOLUCAO REGISTRADA',
  }[tipo] || 'NOTIFICACAO';

  const itens = comprovante.itens || devolucao.itens || contrato.itens || [];
  const itensTableHtml = Array.isArray(itens) && itens.length > 0
    ? buildItemsTableEntrega(itens.filter(it => typeof it === 'object'))
    : `<p style="font-size:9px;color:${BRAND.cinzaTexto};">Nenhum item informado</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:0;max-width:760px;margin:0 auto;font-size:8px;color:#374151;">
      ${buildHeader()}

      <div style="text-align:center;margin:4px 0 8px 0;padding:4px;border:2px solid ${BRAND.amarelo};">
        <span style="font-size:10px;font-weight:700;color:${BRAND.preto};letter-spacing:1px;">${esc(tipoLabel)}</span>
      </div>

      ${contrato.id ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;">
        <tr>
          <td style="font-size:8px;color:${BRAND.cinzaTexto};"><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(contrato.numero || contrato.id)}</td>
          ${contrato.atendente ? `<td style="font-size:8px;color:${BRAND.cinzaTexto};text-align:right;"><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(contrato.atendente)}</td>` : ''}
        </tr>
      </table>` : ''}

      ${(contrato.cliente || comprovante.locatario || devolucao.locatario) ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;line-height:1.4;padding:4px;">
          ${contrato.cliente || comprovante.locatario || devolucao.locatario ? `<strong style="color:${BRAND.preto};">Cliente/Locatario:</strong> ${esc(contrato.cliente || comprovante.locatario || devolucao.locatario)}<br/>` : ''}
          ${contrato.cidade || comprovante.cidade ? `<strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(contrato.cidade || comprovante.cidade)}<br/>` : ''}
          ${contrato.localEntrega || comprovante.localEntrega || devolucao.localObra ? `<strong style="color:${BRAND.preto};">Local:</strong> ${esc(contrato.localEntrega || comprovante.localEntrega || devolucao.localObra)}` : ''}
        </td></tr>
      </table>` : ''}

      ${contrato.cnpj || comprovante.cpf ? `
      <div style="margin:3px 0;font-size:8px;">
        <strong style="color:${BRAND.preto};">${(contrato.cnpj || comprovante.cpf || '').replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'}:</strong> ${esc(contrato.cnpj || comprovante.cpf)}
      </div>` : ''}

      ${buildSectionTitle('ITENS')}
      ${itensTableHtml}

      ${contrato.inicio ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;padding:4px;">
          <strong style="color:${BRAND.preto};">Periodo:</strong> ${esc(contrato.inicio)} a ${esc(contrato.fim || '-')}<br/>
          <strong style="color:${BRAND.preto};">Valor Mensal:</strong> R$ ${formatMoney(contrato.valorMensal)}
        </td></tr>
      </table>` : ''}

      ${devolucao.data ? `<div style="margin:3px 0;font-size:8px;"><strong style="color:${BRAND.preto};">Data da Devolucao:</strong> ${esc(devolucao.data)} ${esc(devolucao.hora || '')}</div>` : ''}

      ${devolucao.condicoes ? `
      <div style="margin:4px 0;padding:3px 6px;border:1px solid ${BRAND.cinzaBorda};">
        <div style="font-size:7px;color:${BRAND.cinzaTexto};margin-bottom:2px;">CONDICOES:</div>
        <span style="font-size:8px;">${checkbox(devolucao.condicoes.danificado)}&nbsp;DANIFICADO</span>&nbsp;&nbsp;
        <span style="font-size:8px;">${checkbox(devolucao.condicoes.extraviado)}&nbsp;EXTRAVIADO</span>&nbsp;&nbsp;
        <span style="font-size:8px;">${checkbox(devolucao.condicoes.testarEmpresa)}&nbsp;TESTAR NA EMPRESA</span>
      </div>` : ''}

      ${signatario.nome ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;padding:4px;border:1px solid ${BRAND.cinzaBorda};">
        <tr><td style="font-size:8px;">
          <strong style="color:${BRAND.preto};">Signatario:</strong> ${esc(signatario.nome)}
          ${signatario.cpf ? `<br/><strong style="color:${BRAND.preto};">CPF:</strong> ${esc(signatario.cpf)}` : ''}
        </td></tr>
      </table>` : ''}

      ${signatario.assinaturaImagem ? `
      <div style="text-align:center;margin:6px 0;">
        <div style="font-size:7px;color:${BRAND.cinzaTexto};margin-bottom:2px;">ASSINATURA DO LOCATARIO:</div>
        <img src="${signatario.assinaturaImagem}" style="max-height:35px;max-width:130px;" />
      </div>` : ''}

      <div style="text-align:center;margin:8px 0;padding:4px;border:1px dashed ${BRAND.amarelo};">
        <div style="font-size:7px;color:${BRAND.cinzaTexto};">DOCUMENTO GERADO AUTOMATICAMENTE PELO SISTEMA</div>
      </div>

      ${buildFooter(tipoLabel)}
    </div>`;

  const filename = `notificacao-${tipo}-${contrato.numero || comprovante.id || devolucao.numero || 'doc'}.pdf`;

  await (await getHtml2pdf())()
    .set({
      margin: [8, 8, 12, 8],
      filename,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}
