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
  cinzaFundo: '#F9FAFB',
  cinzaBorda: '#D1D5DB',
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
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
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
    ? '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #374151;text-align:center;line-height:12px;font-size:11px;font-weight:bold;color:#111827;background:#FEF3C7;">X</span>'
    : '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #D1D5DB;background:#F9FAFB;">&nbsp;</span>';
}

function buildHeader() {
  return `
    <div style="background:${BRAND.preto};padding:14px 20px;margin:-10px -10px 0 -10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <img src="/logo.jpg" style="height:32px;width:auto;" alt="TransObra" />
          <div style="font-size:8px;color:#9CA3AF;letter-spacing:1px;margin-top:2px;">LOCACAO DE EQUIPAMENTOS</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:8px;color:#D1D5DB;">${esc(EMPRESA.nome)}</div>
          <div style="font-size:8px;color:#9CA3AF;">${esc(EMPRESA.endereco)}</div>
          <div style="font-size:8px;color:#9CA3AF;">${esc(EMPRESA.cidade)} - ${esc(EMPRESA.estado)} | CEP: ${esc(EMPRESA.cep)}</div>
          <div style="font-size:8px;color:${BRAND.amarelo};">TEL: ${esc(EMPRESA.telefone)}</div>
        </div>
      </div>
      <div style="height:3px;background:linear-gradient(90deg,${BRAND.amarelo},#F59E0B,${BRAND.amarelo});margin-top:10px;border-radius:2px;"></div>
    </div>`;
}

function buildFooter(tipo) {
  const now = new Date();
  const dataGeracao = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `
    <div style="margin-top:25px;padding-top:8px;border-top:1px solid ${BRAND.cinzaBorda};">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:7px;color:${BRAND.cinzaTexto};">
        <span style="letter-spacing:0.5px;">TRANSOBRA CRM - Gestao de Locacao de Equipamentos</span>
        <span>${esc(tipo)} | Gerado em ${dataGeracao}</span>
      </div>
      <div style="text-align:center;margin-top:4px;font-size:7px;color:${BRAND.cinzaTexto};">
        ${esc(EMPRESA.endereco)} - ${esc(EMPRESA.cidade)} - ${esc(EMPRESA.estado)} | ${esc(EMPRESA.telefone)}
      </div>
    </div>`;
}

function buildSectionTitle(titulo, cor = BRAND.amarelo) {
  return `
    <div style="margin:12px 0 8px 0;padding:6px 10px;background:${BRAND.cinzaFundo};border-left:3px solid ${cor};">
      <span style="font-size:11px;font-weight:bold;color:${BRAND.preto};letter-spacing:0.5px;">${esc(titulo)}</span>
    </div>`;
}

function buildLocatarioBlock(d) {
  const isCnpj = (d.cnpjLocatario || d.cpf || '').replace(/\D/g, '').length > 11;
  const docLabel = isCnpj ? 'CNPJ' : 'CPF';
  const docValue = d.cnpjLocatario || d.cpf || '';
  return `
    <div style="font-size:10px;margin:6px 0;line-height:1.7;color:#374151;">
      <div style="display:flex;gap:20px;flex-wrap:wrap;">
        <span><strong style="color:${BRAND.preto};">Estado:</strong> ${esc(d.estado || EMPRESA.estado)}</span>
        <span><strong style="color:${BRAND.preto};">CEP:</strong> ${esc(d.cep || EMPRESA.cep)}</span>
        <span><strong style="color:${BRAND.preto};">Telefone:</strong> ${esc(d.telefone || '')}</span>
      </div>
      <div style="margin-top:3px;"><strong style="color:${BRAND.preto};">Endereco:</strong> ${esc(d.endereco || '')}${d.numero ? `, ${esc(d.numero)}` : ''}</div>
      ${d.bairro ? `<div><strong style="color:${BRAND.preto};">Bairro:</strong> ${esc(d.bairro)}</div>` : ''}
      <div><strong style="color:${BRAND.preto};">Contato:</strong> ${esc(d.contato || '')}</div>
      <div><strong style="color:${BRAND.preto};">${docLabel}:</strong> ${esc(docValue)}</div>
      ${d.inscricaoEstadual ? `<div><strong style="color:${BRAND.preto};">INSC. EST.:</strong> ${esc(d.inscricaoEstadual)}</div>` : ''}
      ${d.rg ? `<div><strong style="color:${BRAND.preto};">RG:</strong> ${esc(d.rg)}</div>` : ''}
    </div>`;
}

function buildItemsTableEntrega(itens) {
  if (!itens || itens.length === 0) return '';
  const rows = itens.map((it) => `
    <tr>
      <td style="padding:5px 6px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:10px;">${esc(it.quantidade || 1)}</td>
      <td style="padding:5px 6px;border:1px solid ${BRAND.cinzaBorda};font-size:10px;">${esc(it.descricao || '-')}</td>
      <td style="padding:5px 6px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:10px;">${esc(it.patrimonio || '-')}</td>
      <td style="padding:5px 6px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:10px;">${esc(it.dataLocacao || '-')}</td>
      <td style="padding:5px 6px;border:1px solid ${BRAND.cinzaBorda};text-align:center;font-size:10px;">${esc(it.dataDevolucao || '-')}</td>
      <td style="padding:5px 6px;border:1px solid ${BRAND.cinzaBorda};text-align:right;font-size:10px;">R$ ${formatMoney(it.valorUnitario)}</td>
    </tr>`).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:8px 0;">
      <thead>
        <tr style="background:${BRAND.preto};">
          <th style="padding:5px 6px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:9px;font-weight:bold;">Qtde</th>
          <th style="padding:5px 6px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:9px;font-weight:bold;">Descricao</th>
          <th style="padding:5px 6px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:9px;font-weight:bold;">Patrimonio</th>
          <th style="padding:5px 6px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:9px;font-weight:bold;">DLoc</th>
          <th style="padding:5px 6px;border:1px solid ${BRAND.preto};text-align:left;color:${BRAND.branco};font-size:9px;font-weight:bold;">D.Dev</th>
          <th style="padding:5px 6px;border:1px solid ${BRAND.preto};text-align:right;color:${BRAND.branco};font-size:9px;font-weight:bold;">Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildSignatureBlock(signatarioNome, signatureImg = null) {
  const signatureHtml = signatureImg
    ? `<img src="${signatureImg}" style="max-height:65px;max-width:200px;display:block;margin:0 auto 4px auto;border:2px solid ${BRAND.preto};background:${BRAND.branco};padding:6px;border-radius:4px;" />`
    : `<div style="border-top:1.5px solid ${BRAND.preto};height:45px;"></div>`;

  return `
    <div style="margin-top:35px;display:flex;justify-content:space-between;gap:20px;">
      <div style="width:45%;text-align:center;">
        <div style="border-top:1.5px solid ${BRAND.preto};height:45px;"></div>
        <div style="font-size:9px;color:${BRAND.cinzaTexto};margin-top:4px;letter-spacing:0.5px;">LOCADORA</div>
      </div>
      <div style="width:45%;text-align:center;">
        ${signatureHtml}
        <div style="font-size:9px;color:${BRAND.cinzaTexto};margin-top:4px;letter-spacing:0.5px;">LOCATARIO: ${esc(signatarioNome || '___________________')}</div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:10px;color:#374151;">
      <div style="display:flex;gap:30px;">
        <span>RG: _________________________</span>
        <span>FONE: _________________________</span>
      </div>
    </div>`;
}

function getMetodoEntregaText(metodo) {
  if (metodo === 'cliente_retirada') return 'Cliente retira e devolve na locadora';
  if (metodo === 'locadora_entrega') return 'Locadora entrega e retira na obra';
  return '';
}

function buildInfoRow(label, valor, destaque = false) {
  return `
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:10px;${destaque ? 'font-weight:bold;' : ''}">
      <span style="color:${BRAND.cinzaTexto};">${esc(label)}</span>
      <span style="color:${BRAND.preto};${destaque ? 'font-size:12px;' : ''}">${esc(valor)}</span>
    </div>`;
}

export async function generateEntregaPDF(comprovante) {
  const c = comprovante;
  const itens = Array.isArray(c.itens) ? c.itens : [];
  const total = c.total != null ? c.total : itens.reduce((s, it) => s + (it.quantidade || 1) * (it.valorUnitario || 0), 0);
  const fotosEntrega = (Array.isArray(c.fotosEntrega) ? c.fotosEntrega : (Array.isArray(c.fotos_entrega) ? c.fotos_entrega : [])).filter(Boolean);
  const fotosRetirada = (Array.isArray(c.fotosRetirada) ? c.fotosRetirada : (Array.isArray(c.fotos_retirada) ? c.fotos_retirada : [])).filter(Boolean);

  const html = `
    <div style="font-family:Arial,sans-serif;padding:6px;max-width:760px;margin:0 auto;font-size:9px;color:#374151;">
      ${buildHeader()}

      <div style="padding:8px 0;">
        <div style="text-align:center;margin:4px 0 8px 0;">
          <span style="font-size:12px;font-weight:bold;color:${BRAND.preto};letter-spacing:1px;">COMPROVANTE DE ENTREGA</span>
        </div>

        <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:9px;">
          <span><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(c.numero || c.contrato || '')}</span>
          <span><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(c.atendente || '')}</span>
        </div>

        <div style="background:${BRAND.cinzaFundo};padding:6px 8px;border-radius:4px;margin:4px 0;">
          <div style="font-size:9px;line-height:1.5;">
            <strong style="color:${BRAND.preto};">Locatario:</strong> ${esc(c.locatario || '')} | <strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(c.cidade || '')}<br>
            <strong style="color:${BRAND.preto};">Local da entrega:</strong> ${esc(c.localEntrega || '')}
          </div>
        </div>

        <p style="text-align:justify;margin:6px 0;font-size:9px;color:#374151;line-height:1.4;">
          DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
        </p>

        ${buildLocatarioBlock(c)}

        ${c.telefoneEntrega ? `<div style="margin:4px 0;font-size:9px;"><strong style="color:${BRAND.preto};">Telefone do local:</strong> ${esc(c.telefoneEntrega)}</div>` : ''}

        ${buildItemsTableEntrega(itens)}

        <div style="text-align:right;font-weight:bold;margin:4px 0;font-size:10px;padding:4px 8px;background:${BRAND.amareloClaro};border-radius:4px;">
          <span style="color:${BRAND.preto};">TOTAL: R$ ${formatMoney(total)}</span>
        </div>

        <p style="font-size:9px;text-align:justify;margin:6px 0;color:#374151;line-height:1.4;">
          Declaro que recebi todos os equipamentos acima listados testados e aptos para uso.
        </p>

        <div style="text-align:right;margin-top:6px;font-size:9px;color:#374151;">
          ${esc(c.cidade || EMPRESA.cidade)}, ${dataPorExtenso(c.data)}
        </div>

        ${buildSignatureBlock(c.signatarioNome || c.nomeSignatario, c.signatureImg || c.assinaturaImagem || c.assinaturaImg)}

        ${c.observacao ? `
        <div style="margin-top:8px;font-size:9px;padding:4px 8px;background:${BRAND.amareloClaro};border-left:3px solid ${BRAND.amarelo};border-radius:0 4px 4px 0;">
          <strong style="color:${BRAND.preto};">Observacao:</strong> ${esc(c.observacao)}
        </div>` : ''}

        ${c.metodoEntrega ? `<p style="margin-top:6px;font-size:8px;font-style:italic;color:${BRAND.cinzaTexto};">${esc(getMetodoEntregaText(c.metodoEntrega))}</p>` : ''}
      </div>

      ${fotosEntrega.length > 0 || fotosRetirada.length > 0 ? `
      <div style="page-break-before:always;margin-top:0;">
        <div style="text-align:center;margin:8px 0 12px 0;padding:6px;background:${BRAND.preto};border-radius:6px;">
          <span style="font-size:12px;font-weight:bold;color:${BRAND.branco};letter-spacing:1px;">REGISTRO FOTOGRÁFICO</span>
        </div>
        ${fotosEntrega.length > 0 ? `
        <div style="margin:8px 0;">
          <div style="font-size:10px;font-weight:bold;color:${BRAND.preto};margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${BRAND.cinzaBorda};">FOTOS DA ENTREGA</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${fotosEntrega.map((foto, idx) => `
              <div style="flex:1;min-width:30%;max-width:32%;text-align:center;">
                <img src="${foto}" style="width:100%;height:auto;border:1px solid ${BRAND.cinzaBorda};border-radius:4px;" />
                <div style="font-size:7px;color:${BRAND.cinzaTexto};margin-top:2px;">Foto ${idx + 1} - Entrega</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        ${fotosRetirada.length > 0 ? `
        <div style="margin:8px 0;">
          <div style="font-size:10px;font-weight:bold;color:${BRAND.preto};margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${BRAND.cinzaBorda};">FOTOS DA RETIRADA</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${fotosRetirada.map((foto, idx) => `
              <div style="flex:1;min-width:30%;max-width:32%;text-align:center;">
                <img src="${foto}" style="width:100%;height:auto;border:1px solid ${BRAND.cinzaBorda};border-radius:4px;" />
                <div style="font-size:7px;color:${BRAND.cinzaTexto};margin-top:2px;">Foto ${idx + 1} - Retirada</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>` : ''}

      ${buildFooter('COMPROVANTE DE ENTREGA')}
    </div>`;

  await (await getHtml2pdf())()
    .set({
      margin: [10, 10, 15, 10],
      filename: `comprovante-entrega-${c.numero || c.contrato || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

export async function generateDevolucaoPDF(devolucao) {
  const d = devolucao;
  const itens = Array.isArray(d.itens) ? d.itens : [];
  const condicoes = d.condicoes || {};

  const itensHtml = itens.length > 0
    ? itens.map((it) => `
      <div style="margin:3px 0;font-size:10px;padding:3px 6px;background:${BRAND.cinzaFundo};border-radius:3px;">
        ${checkbox(it.qtdDevolvida > 0)}&nbsp;&nbsp;${it.quantidade || 1} - ${esc(it.descricao || '')} - ${esc(it.patrimonio || '')}
        ${it.qtdFaltante > 0 ? `<span style="color:${BRAND.vermelho};margin-left:8px;font-weight:bold;">FALTANTE: ${it.qtdFaltante}</span>` : ''}
      </div>`).join('')
    : `<p style="font-size:10px;color:${BRAND.cinzaTexto};">Nenhum item informado</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:10px;max-width:760px;margin:0 auto;font-size:10px;color:#374151;">
      ${buildHeader()}

      <div style="padding:12px 0;">
        <div style="text-align:center;margin:8px 0 12px 0;">
          <span style="font-size:13px;font-weight:bold;color:${BRAND.preto};letter-spacing:1px;">COMPROVANTE DE DEVOLUCAO</span>
        </div>

        <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:10px;">
          <span><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(d.numero || d.contratoId || '')}</span>
          <span><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(d.atendente || '')}</span>
        </div>

        <div style="background:${BRAND.cinzaFundo};padding:8px 10px;border-radius:4px;margin:8px 0;">
          <div style="font-size:10px;line-height:1.6;">
            <strong style="color:${BRAND.preto};">Locatario:</strong> ${esc(d.locatario || '')}<br>
            <strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(d.cidade || '')}<br>
            <strong style="color:${BRAND.preto};">Local da Obra:</strong> ${esc(d.localObra || d.localEntrega || '')}
          </div>
        </div>

        <p style="text-align:justify;margin:10px 0;font-size:10px;color:#374151;line-height:1.5;">
          DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) os equipamento(s) abaixo discriminado(s):
        </p>

        ${buildLocatarioBlock(d)}

        ${d.telefone ? `
        <div style="margin:6px 0;font-size:10px;">
          <strong style="color:${BRAND.preto};">Telefone da obra:</strong> ${esc(d.telefone)}
        </div>` : ''}

        <div style="border:1px solid ${BRAND.cinzaBorda};padding:10px;margin:10px 0;border-radius:6px;background:${BRAND.branco};">
          <div style="text-align:center;font-weight:bold;font-size:11px;margin-bottom:8px;color:${BRAND.preto};padding-bottom:6px;border-bottom:1px solid ${BRAND.cinzaBorda};">
            DADOS DA DEVOLUCAO
          </div>
          <div style="display:flex;gap:30px;font-size:10px;margin-bottom:6px;">
            <span><strong style="color:${BRAND.preto};">Data:</strong> ${esc(d.data || '')}</span>
            <span><strong style="color:${BRAND.preto};">Hora:</strong> ${esc(d.hora || '')}</span>
          </div>
          ${d.signatarioNome ? `<div style="font-size:10px;"><strong style="color:${BRAND.preto};">Recebido por:</strong> ${esc(d.signatarioNome)}</div>` : ''}
          ${d.referencia ? `<div style="font-size:10px;margin-top:4px;"><strong style="color:${BRAND.preto};">Referencia:</strong> ${esc(d.referencia)}</div>` : ''}
        </div>

        ${buildSectionTitle('ITENS DEVOLVIDOS')}
        <div style="margin:6px 0;">
          ${itensHtml}
        </div>

        <div style="text-align:right;margin-top:12px;font-size:10px;color:#374151;">
          ${esc(d.cidade || EMPRESA.cidade)}, ${dataPorExtenso(d.data)}
        </div>

        ${buildSignatureBlock(d.signatarioNome, d.signatureImg || d.assinaturaImagem || d.assinaturaImg)}

        ${buildSectionTitle('CONDICOES DE DEVOLUCAO', BRAND.amarelo)}
        <div style="border:1px solid ${BRAND.cinzaBorda};padding:10px;margin:8px 0;border-radius:6px;background:${BRAND.cinzaFundo};">
          <div style="font-size:9px;color:${BRAND.cinzaTexto};margin-bottom:6px;">SELECIONE AS CONDICOES APLICAVEIS:</div>
          <div style="display:flex;flex-wrap:wrap;gap:15px;font-size:10px;">
            <div>${checkbox(condicoes.danificado)}&nbsp;&nbsp;<strong>DANIFICADO/SUJO</strong></div>
            <div>${checkbox(condicoes.extraviado)}&nbsp;&nbsp;<strong>EXTRAVIADO/ROUBADO</strong></div>
            <div>${checkbox(condicoes.testarEmpresa)}&nbsp;&nbsp;<strong>SERA TESTADO NA EMPRESA</strong></div>
          </div>
        </div>

        ${d.metodoEntrega ? `
        <p style="margin-top:10px;font-size:9px;font-style:italic;color:${BRAND.cinzaTexto};">${esc(getMetodoEntregaText(d.metodoEntrega))}</p>` : ''}
      </div>

      ${buildFooter('COMPROVANTE DE DEVOLUCAO')}
    </div>`;

  await (await getHtml2pdf())()
    .set({
      margin: [10, 10, 15, 10],
      filename: `comprovante-devolucao-${d.numero || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

export async function generateContratoPDF(contrato) {
  const itens = Array.isArray(contrato.itens) ? contrato.itens : [];
  const equipamentos = Array.isArray(contrato.equipamentos) ? contrato.equipamentos : [];

  const html = `
    <div style="font-family:Arial,sans-serif;padding:10px;max-width:760px;margin:0 auto;font-size:10px;color:#374151;">
      ${buildHeader()}

      <div style="padding:12px 0;">
        <div style="text-align:center;margin:8px 0 12px 0;">
          <span style="font-size:13px;font-weight:bold;color:${BRAND.preto};letter-spacing:1px;">COMPROVANTE DE ENTREGA DOS BENS LOCADOS</span>
        </div>

        <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:10px;">
          <span><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(contrato.numero || contrato.id)}</span>
          <span><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(contrato.atendente || '')}</span>
        </div>

        <div style="background:${BRAND.cinzaFundo};padding:8px 10px;border-radius:4px;margin:8px 0;">
          <div style="font-size:10px;line-height:1.6;">
            <strong style="color:${BRAND.preto};">Locatario:</strong> ${esc(contrato.cliente || '')}<br>
            <strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(contrato.cidade || '')}<br>
            <strong style="color:${BRAND.preto};">Local da entrega:</strong> ${esc(contrato.localEntrega || '')}
          </div>
        </div>

        <p style="text-align:justify;margin:10px 0;font-size:10px;color:#374151;line-height:1.5;">
          DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
        </p>

        ${buildLocatarioBlock(contrato)}

        ${contrato.telefoneEntrega ? `
        <div style="margin:6px 0;font-size:10px;">
          <strong style="color:${BRAND.preto};">Telefone do local de entrega:</strong> ${esc(contrato.telefoneEntrega)}
        </div>` : ''}

        ${buildItemsTableEntrega(itens)}

        <div style="text-align:right;font-weight:bold;margin:8px 0;font-size:11px;padding:6px 10px;background:${BRAND.amareloClaro};border-radius:4px;">
          <span style="color:${BRAND.preto};">TOTAL: R$ ${formatMoney(contrato.valorTotal)}</span>
        </div>

        <div style="margin:8px 0;font-size:10px;padding:6px 10px;background:${BRAND.cinzaFundo};border-radius:4px;">
          <strong style="color:${BRAND.preto};">Equipamentos:</strong> ${esc(equipamentos.join(', ') || '-')}
        </div>

        ${contrato.observacao ? `
        <div style="margin:8px 0;font-size:10px;padding:6px 10px;background:${BRAND.amareloClaro};border-left:3px solid ${BRAND.amarelo};border-radius:0 4px 4px 0;">
          <strong style="color:${BRAND.preto};">Observacao:</strong> ${esc(contrato.observacao)}
        </div>` : ''}

        ${buildSectionTitle('DADOS DO CONTRATO')}
        <div style="background:${BRAND.branco};border:1px solid ${BRAND.cinzaBorda};border-radius:6px;padding:10px;margin:8px 0;">
          ${buildInfoRow('Inicio', contrato.inicio || '-')}
          ${buildInfoRow('Fim', contrato.fim || '-')}
          ${buildInfoRow('Valor Mensal', 'R$ ' + formatMoney(contrato.valorMensal) + '/mes')}
          ${buildInfoRow('Valor Total', 'R$ ' + formatMoney(contrato.valorTotal), true)}
        </div>

        <div style="text-align:center;margin:10px 0;">
          <span style="font-size:10px;color:${BRAND.cinzaTexto};">Status: ${contrato.status?.toUpperCase() || '-'}</span>
          ${contrato.assinado ? `<div style="font-size:10px;color:${BRAND.verde};font-weight:bold;margin-top:3px;">CONTRATO ASSINADO</div>` : ''}
        </div>

        <div style="text-align:right;margin-top:12px;font-size:10px;color:#374151;">
          ${esc(contrato.cidade || EMPRESA.cidade)}, ${dataPorExtenso(contrato.dataContrato)}
        </div>

        ${buildSignatureBlock(contrato.contato, contrato.signatureImg || contrato.assinaturaImagem || contrato.assinaturaImg)}

        ${contrato.metodoEntrega ? `
        <p style="margin-top:10px;font-size:9px;font-style:italic;color:${BRAND.cinzaTexto};">${esc(getMetodoEntregaText(contrato.metodoEntrega))}</p>` : ''}
      </div>

      ${buildFooter('COMPROVANTE DE ENTREGA')}
    </div>`;

  await (await getHtml2pdf())()
    .set({
      margin: [10, 10, 15, 10],
      filename: `contrato-${contrato.numero || contrato.id || 'doc'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}

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

  const corTipo = {
    contrato_criado: BRAND.amarelo,
    contrato_assinado: BRAND.verde,
    contrato_renovado: BRAND.verde,
    devolucao_registrada: BRAND.amarelo,
  }[tipo] || BRAND.amarelo;

  const itens = comprovante.itens || devolucao.itens || contrato.equipamentos || [];
  const itensHtml = Array.isArray(itens) && itens.length > 0
    ? itens.map((it) => `
      <div style="margin:2px 0;font-size:10px;padding:3px 6px;background:${BRAND.cinzaFundo};border-radius:3px;">
        ${typeof it === 'string' ? esc(it) : `${esc(it.quantidade || 1)}x ${esc(it.descricao || it.nome || '-')} ${it.patrimonio ? '- Pat: ' + esc(it.patrimonio) : ''}`}
      </div>`).join('')
    : '<p style="font-size:10px;color:' + BRAND.cinzaTexto + ';">Nenhum item informado</p>';

  const html = `
    <div style="font-family:Arial,sans-serif;padding:10px;max-width:760px;margin:0 auto;font-size:10px;color:#374151;">
      ${buildHeader()}

      <div style="padding:12px 0;">
        <div style="text-align:center;margin:8px 0 12px 0;padding:8px;background:${corTipo};border-radius:6px;">
          <span style="font-size:13px;font-weight:bold;color:${BRAND.branco};letter-spacing:1px;">${esc(tipoLabel)}</span>
        </div>

        ${contrato.id ? `
        <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:10px;">
          <span><strong style="color:${BRAND.preto};">CONTRATO:</strong> ${esc(contrato.numero || contrato.id)}</span>
          ${contrato.atendente ? `<span><strong style="color:${BRAND.preto};">ATENDENTE:</strong> ${esc(contrato.atendente)}</span>` : ''}
        </div>` : ''}

        ${(contrato.cliente || comprovante.locatario || devolucao.locatario) ? `
        <div style="background:${BRAND.cinzaFundo};padding:8px 10px;border-radius:4px;margin:8px 0;">
          <div style="font-size:10px;line-height:1.6;">
            ${contrato.cliente || comprovante.locatario || devolucao.locatario ? `<strong style="color:${BRAND.preto};">Cliente/Locatario:</strong> ${esc(contrato.cliente || comprovante.locatario || devolucao.locatario)}<br>` : ''}
            ${contrato.cidade || comprovante.cidade ? `<strong style="color:${BRAND.preto};">Cidade:</strong> ${esc(contrato.cidade || comprovante.cidade)}<br>` : ''}
            ${contrato.localEntrega || comprovante.localEntrega || devolucao.localObra ? `<strong style="color:${BRAND.preto};">Local:</strong> ${esc(contrato.localEntrega || comprovante.localEntrega || devolucao.localObra)}` : ''}
          </div>
        </div>` : ''}

        ${contrato.cnpj || comprovante.cpf ? `
        <div style="margin:6px 0;font-size:10px;">
          <strong style="color:${BRAND.preto};">${(contrato.cnpj || comprovante.cpf || '').replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'}:</strong> ${esc(contrato.cnpj || comprovante.cpf)}
        </div>` : ''}

        ${buildSectionTitle('ITENS', corTipo)}
        ${itensHtml}

        ${(contrato.valorTotal || comprovante.total) ? `
        <div style="text-align:right;font-weight:bold;margin:8px 0;font-size:11px;padding:6px 10px;background:${BRAND.amareloClaro};border-radius:4px;">
          <span style="color:${BRAND.preto};">TOTAL: R$ ${formatMoney(contrato.valorTotal || comprovante.total)}</span>
        </div>` : ''}

        ${contrato.inicio ? `
        <div style="margin:8px 0;padding:8px 10px;background:${BRAND.cinzaFundo};border-radius:4px;">
          <div style="font-size:10px;"><strong style="color:${BRAND.preto};">Periodo:</strong> ${esc(contrato.inicio)} a ${esc(contrato.fim || '-')}</div>
          <div style="font-size:10px;"><strong style="color:${BRAND.preto};">Valor Mensal:</strong> R$ ${formatMoney(contrato.valorMensal)}</div>
        </div>` : ''}

        ${devolucao.data ? `
        <div style="margin:8px 0;font-size:10px;">
          <strong style="color:${BRAND.preto};">Data da Devolucao:</strong> ${esc(devolucao.data)} ${esc(devolucao.hora || '')}
        </div>` : ''}

        ${devolucao.condicoes ? `
        ${buildSectionTitle('CONDICOES DE DEVOLUCAO')}
        <div style="display:flex;flex-wrap:wrap;gap:15px;font-size:10px;margin:6px 0;">
          <div>${checkbox(devolucao.condicoes.danificado)}&nbsp;&nbsp;DANIFICADO</div>
          <div>${checkbox(devolucao.condicoes.extraviado)}&nbsp;&nbsp;EXTRAVIADO</div>
          <div>${checkbox(devolucao.condicoes.testarEmpresa)}&nbsp;&nbsp;TESTAR NA EMPRESA</div>
        </div>` : ''}

        ${signatario.nome ? `
        <div style="margin:10px 0;padding:8px 10px;background:${BRAND.cinzaFundo};border-radius:4px;">
          <div style="font-size:10px;"><strong style="color:${BRAND.preto};">Signatario:</strong> ${esc(signatario.nome)}</div>
          ${signatario.cpf ? `<div style="font-size:10px;"><strong style="color:${BRAND.preto};">CPF:</strong> ${esc(signatario.cpf)}</div>` : ''}
        </div>` : ''}

        ${signatario.assinaturaImagem ? `
        <div style="margin:10px 0;text-align:center;">
          <div style="font-size:9px;color:${BRAND.cinzaTexto};margin-bottom:4px;">ASSINATURA DO LOCATARIO:</div>
          <img src="${signatario.assinaturaImagem}" style="max-height:50px;max-width:180px;border:1px solid ${BRAND.cinzaBorda};background:${BRAND.branco};padding:4px;border-radius:4px;" />
        </div>` : ''}

        <div style="text-align:center;margin:15px 0;padding:10px;background:${BRAND.amareloClaro};border-radius:6px;border:1px dashed ${BRAND.amarelo};">
          <div style="font-size:9px;color:${BRAND.cinzaTexto};">DOCUMENTO GERADO AUTOMATICAMENTE PELO SISTEMA</div>
          <div style="font-size:8px;color:${BRAND.cinzaTexto};margin-top:2px;">Este PDF foi gerado como alternativa ao email que nao pôde ser enviado.</div>
        </div>
      </div>

      ${buildFooter(tipoLabel)}
    </div>`;

  const filename = `notificacao-${tipo}-${contrato.numero || comprovante.id || devolucao.numero || 'doc'}.pdf`;

  await (await getHtml2pdf())()
    .set({
      margin: [10, 10, 15, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(html)
    .save();
}
