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
    ? '<span style="display:inline-block;width:12px;height:12px;border:1.5px solid #333;text-align:center;line-height:11px;font-size:11px;font-weight:bold;">X</span>'
    : '<span style="display:inline-block;width:12px;height:12px;border:1.5px solid #333;">&nbsp;</span>';
}

function buildHeader() {
  return `
    <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:10px;">
      <strong style="font-size:14px;">${esc(EMPRESA.nome)}</strong><br>
      <span style="font-size:10px;">${esc(EMPRESA.endereco)} - CEP: ${esc(EMPRESA.cep)} - ${esc(EMPRESA.cidade)} - ${esc(EMPRESA.estado)}</span><br>
      <span style="font-size:10px;">FONE: ${esc(EMPRESA.telefone)}</span>
    </div>`;
}

function buildLocatarioBlock(d) {
  const isCnpj = (d.cnpjLocatario || d.cpf || '').replace(/\D/g, '').length > 11;
  const docLabel = isCnpj ? 'CNPJ' : 'CPF';
  const docValue = d.cnpjLocatario || d.cpf || '';
  return `
    <div style="font-size:11px;margin:8px 0;line-height:1.6;">
      <span><strong>Estado:</strong> ${esc(d.estado || EMPRESA.estado)}&nbsp;&nbsp;&nbsp;<strong>CEP:</strong> ${esc(d.cep || EMPRESA.cep)}</span><br>
      <span><strong>Telefone:</strong> ${esc(d.telefone || '')}</span><br>
      <span><strong>Endereco:</strong> ${esc(d.endereco || '')}${d.numero ? `, ${esc(d.numero)}` : ''}</span><br>
      <span><strong>Contato:</strong> ${esc(d.contato || '')}</span><br>
      <span><strong>${docLabel}:</strong> ${esc(docValue)}</span><br>
      ${d.inscricaoEstadual ? `<span><strong>INSC. EST.:</strong> ${esc(d.inscricaoEstadual)}</span><br>` : ''}
      <span><strong>Bairro:</strong> ${esc(d.bairro || '')}</span>
      ${d.rg ? `<br><span><strong>RG:</strong> ${esc(d.rg)}</span>` : ''}
    </div>`;
}

function buildItemsTableEntrega(itens) {
  if (!itens || itens.length === 0) return '';
  const rows = itens.map((it) => `
    <tr>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;">${esc(it.quantidade || 1)}</td>
      <td style="padding:4px 6px;border:1px solid #000;">${esc(it.descricao || '-')}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;">${esc(it.patrimonio || '-')}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;">${esc(it.dataLocacao || '-')}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;">${esc(it.dataDevolucao || '-')}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:right;">R$ ${formatMoney(it.valorUnitario)}</td>
    </tr>`).join('');

  return `
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin:10px 0;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="padding:4px 6px;border:1px solid #000;text-align:left;">Qtde</th>
          <th style="padding:4px 6px;border:1px solid #000;text-align:left;">Descricao</th>
          <th style="padding:4px 6px;border:1px solid #000;text-align:left;">Patrimonio</th>
          <th style="padding:4px 6px;border:1px solid #000;text-align:left;">DLoc</th>
          <th style="padding:4px 6px;border:1px solid #000;text-align:left;">D.Dev</th>
          <th style="padding:4px 6px;border:1px solid #000;text-align:right;">Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildSignatureBlock(signatarioNome) {
  return `
    <div style="margin-top:40px;display:flex;justify-content:space-between;">
      <div style="width:45%;text-align:center;">
        <div style="border-top:1px solid #000;height:40px;"></div>
        <small style="font-size:10px;">LOCADORA</small>
      </div>
      <div style="width:45%;text-align:center;">
        <div style="border-top:1px solid #000;height:40px;"></div>
        <small style="font-size:10px;">LOCATARIO NOME: ${esc(signatarioNome || '___________________')}</small>
      </div>
    </div>
    <div style="margin-top:15px;font-size:11px;">
      RG: _________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FONE: _________________________
    </div>`;
}

function getMetodoEntregaText(metodo) {
  if (metodo === 'cliente_retirada') return 'Cliente retira e devolve na locadora';
  if (metodo === 'locadora_entrega') return 'Locadora entrega e retira na obra';
  return '';
}

export async function generateEntregaPDF(comprovante) {
  const c = comprovante;
  const itens = Array.isArray(c.itens) ? c.itens : [];
  const total = c.total != null ? c.total : itens.reduce((s, it) => s + (it.quantidade || 1) * (it.valorUnitario || 0), 0);

  const html = `
    <div style="font-family:Arial,sans-serif;padding:15px;max-width:760px;margin:0 auto;font-size:11px;">
      ${buildHeader()}

      <table style="width:100%;font-size:11px;margin:8px 0;">
        <tr>
          <td><strong>CONTRATO No:</strong> ${esc(c.numero || c.contrato || '')}</td>
          <td style="text-align:right;"><strong>Atendente:</strong> ${esc(c.atendente || '')}</td>
        </tr>
      </table>

      <div style="margin:8px 0;line-height:1.6;">
        <strong>Locatario:</strong> ${esc(c.locatario || '')}<br>
        <strong>Cidade:</strong> ${esc(c.cidade || '')}<br>
        <strong>Local da entrega:</strong> ${esc(c.localEntrega || '')}
      </div>

      <p style="text-align:justify;margin:12px 0;font-size:11px;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
      </p>

      ${buildLocatarioBlock(c)}

      ${c.telefoneEntrega ? `
      <div style="margin:8px 0;font-size:11px;">
        <strong>Telefone do local de entrega:</strong> ${esc(c.telefoneEntrega)}
      </div>` : ''}

      ${buildItemsTableEntrega(itens)}

      <div style="text-align:right;font-weight:bold;margin:10px 0;font-size:12px;">
        Total: R$ ${formatMoney(total)}
      </div>

      <p style="font-size:11px;text-align:justify;margin:12px 0;">
        Declaro que recebi todos os equipamentos acima listados testados e aptos para uso. Assinatura: ______________________
      </p>

      <div style="text-align:right;margin-top:15px;font-size:11px;">
        ${esc(c.cidade || EMPRESA.cidade)}, ${dataPorExtenso(c.data)}
      </div>

      ${buildSignatureBlock(c.signatarioNome || c.nomeSignatario)}

      ${c.observacao ? `
      <div style="margin-top:15px;font-size:11px;">
        <strong>Observacao:</strong> ${esc(c.observacao)}
      </div>` : ''}

      ${c.metodoEntrega ? `
      <p style="margin-top:12px;font-size:10px;font-style:italic;">${esc(getMetodoEntregaText(c.metodoEntrega))}</p>` : ''}
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
      <div style="margin:4px 0;font-size:11px;">
        ${checkbox(it.qtdDevolvida > 0)}&nbsp;&nbsp;${it.quantidade || 1} - ${esc(it.descricao || '')} - ${esc(it.patrimonio || '')}
        ${it.qtdFaltante > 0 ? `<span style="color:#c00;margin-left:10px;">- QUANTIDADE FALTANTE: ${it.qtdFaltante}</span>` : ''}
      </div>`).join('')
    : '<p style="font-size:11px;">Nenhum item informado</p>';

  const html = `
    <div style="font-family:Arial,sans-serif;padding:15px;max-width:760px;margin:0 auto;font-size:11px;">
      ${buildHeader()}

      <table style="width:100%;font-size:11px;margin:8px 0;">
        <tr>
          <td><strong>CONTRATO No:</strong> ${esc(d.numero || d.contratoId || '')}</td>
          <td style="text-align:right;"><strong>Atendente:</strong> ${esc(d.atendente || '')}</td>
        </tr>
      </table>

      <div style="margin:8px 0;line-height:1.6;">
        <strong>Locatario:</strong> ${esc(d.locatario || '')}<br>
        <strong>Cidade:</strong> ${esc(d.cidade || '')}<br>
        <strong>Local da Obra:</strong> ${esc(d.localObra || d.localEntrega || '')}
      </div>

      <p style="text-align:justify;margin:12px 0;font-size:11px;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) os equipamento(s) abaixo discriminado(s):
      </p>

      ${buildLocatarioBlock(d)}

      ${d.telefone ? `
      <div style="margin:8px 0;font-size:11px;">
        <strong>Telefone da obra:</strong> ${esc(d.telefone)}
      </div>` : ''}

      <div style="border:1px solid #000;padding:10px;margin:12px 0;">
        <div style="text-align:center;font-weight:bold;font-size:12px;margin-bottom:10px;">
          COMPROVANTE DE DEVOLUCAO DOS BENS LOCADOS - TEMP
        </div>
        <table style="width:100%;font-size:11px;margin:5px 0;">
          <tr>
            <td><strong>Data:</strong> ${esc(d.data || '')}</td>
            <td><strong>Hora:</strong> ${esc(d.hora || '')}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>${esc(d.signatarioNome || '')}</strong></td>
          </tr>
        </table>
        ${d.referencia ? `<div style="margin:5px 0;"><strong>Referencia:</strong> ${esc(d.referencia)}</div>` : ''}
      </div>

      <div style="margin:12px 0;">
        ${itensHtml}
      </div>

      <div style="text-align:right;margin-top:15px;font-size:11px;">
        ${esc(d.cidade || EMPRESA.cidade)}, ${dataPorExtenso(d.data)}
      </div>

      ${buildSignatureBlock(d.signatarioNome)}

      <div style="border:1px solid #000;padding:10px;margin:15px 0;font-size:11px;">
        <strong>CIENTE QUE O(S) EQUIPAMENTO(S) ACIMA DETERMINADO(S):</strong><br><br>
        ${checkbox(condicoes.danificado)}&nbsp;&nbsp;DANIFICADO/SUJO&nbsp;&nbsp;&nbsp;&nbsp;
        ${checkbox(condicoes.extraviado)}&nbsp;&nbsp;EXTRAVIADO/ROUBADO&nbsp;&nbsp;&nbsp;&nbsp;
        ${checkbox(condicoes.testarEmpresa)}&nbsp;&nbsp;SERÁ TESTADO NA EMPRESA POR FALTA DE CONDICOES DE TESTE NO LOCAL DE ENTREGA
      </div>

      ${d.metodoEntrega ? `
      <p style="margin-top:12px;font-size:10px;font-style:italic;">${esc(getMetodoEntregaText(d.metodoEntrega))}</p>` : ''}
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
    <div style="font-family:Arial,sans-serif;padding:15px;max-width:760px;margin:0 auto;font-size:11px;">
      ${buildHeader()}

      <div style="text-align:center;margin:10px 0;">
        <strong style="font-size:16px;">COMPROVANTE DE ENTREGA DOS BENS LOCADOS</strong>
      </div>

      <table style="width:100%;font-size:11px;margin:8px 0;">
        <tr>
          <td><strong>CONTRATO No:</strong> ${esc(contrato.numero || contrato.id)}</td>
          <td style="text-align:right;"><strong>Atendente:</strong> ${esc(contrato.atendente || '')}</td>
        </tr>
      </table>

      <div style="margin:8px 0;line-height:1.6;">
        <strong>Locatario:</strong> ${esc(contrato.cliente || '')}<br>
        <strong>Cidade:</strong> ${esc(contrato.cidade || '')}<br>
        <strong>Local da entrega:</strong> ${esc(contrato.localEntrega || '')}
      </div>

      <p style="text-align:justify;margin:12px 0;font-size:11px;">
        DECLARO(AMOS) para os fins e efeito de direito que recebi(emos) o(s) objeto(s) abaixo discriminado(s):
      </p>

      ${buildLocatarioBlock(contrato)}

      ${contrato.telefoneEntrega ? `
      <div style="margin:8px 0;font-size:11px;">
        <strong>Telefone do local de entrega:</strong> ${esc(contrato.telefoneEntrega)}
      </div>` : ''}

      ${buildItemsTableEntrega(itens)}

      <div style="text-align:right;font-weight:bold;margin:10px 0;font-size:12px;">
        Total: R$ ${formatMoney(contrato.valorTotal)}
      </div>

      <div style="margin:10px 0;font-size:11px;">
        <strong>Equipamentos:</strong> ${equipamentos.join(', ') || '-'}
      </div>

      ${contrato.observacao ? `
      <div style="margin:10px 0;font-size:11px;">
        <strong>Observacao:</strong> ${esc(contrato.observacao)}
      </div>` : ''}

      <div style="border-top:2px solid #FFC107;margin-top:15px;padding-top:10px;">
        <table style="width:100%;font-size:11px;">
          <tr><td><strong>Inicio:</strong></td><td>${esc(contrato.inicio || '-')}</td></tr>
          <tr><td><strong>Fim:</strong></td><td>${esc(contrato.fim || '-')}</td></tr>
          <tr><td><strong>Valor Mensal:</strong></td><td>R$ ${formatMoney(contrato.valorMensal)}/mes</td></tr>
          <tr><td><strong>Valor Total:</strong></td><td style="font-weight:bold;font-size:13px;">R$ ${formatMoney(contrato.valorTotal)}</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin:15px 0;">
        <p style="font-size:11px;color:#666;">Status: ${contrato.status?.toUpperCase() || '-'}</p>
        ${contrato.assinado ? '<p style="font-size:11px;color:#16a34a;font-weight:bold;">CONTRATO ASSINADO</p>' : ''}
      </div>

      <div style="text-align:right;margin-top:15px;font-size:11px;">
        ${esc(contrato.cidade || EMPRESA.cidade)}, ${dataPorExtenso(contrato.dataContrato)}
      </div>

      ${buildSignatureBlock(contrato.contato)}

      ${contrato.metodoEntrega ? `
      <p style="margin-top:12px;font-size:10px;font-style:italic;">${esc(getMetodoEntregaText(contrato.metodoEntrega))}</p>` : ''}
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
