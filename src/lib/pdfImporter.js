import { extractTextFromPDF } from './pdfParser';

export async function parseComprovantePDF(file) {
  const { text, lines } = await extractTextFromPDF(file);
  const tipo = detectDocumentType(lines);
  const parsed = tipo === 'devolucao' ? extractDevolucao(lines) : extractEntrega(lines);
  parsed.tipo_documento = tipo;
  return { rawText: text, parsed };
}

function detectDocumentType(lines) {
  for (const line of lines) {
    if (/DEVOLU[ÇC][ÃA]O/i.test(line)) return 'devolucao';
  }
  for (const line of lines) {
    if (/ENTREGA/i.test(line)) return 'entrega';
  }
  return 'entrega';
}

function clean(val) {
  if (!val) return '';
  return val.replace(/^[:\s/]+/, '').replace(/[:\s/]+$/, '').replace(/\s+/g, ' ').trim();
}

function findAfterLabel(lines, patterns, opts = {}) {
  const { afterLine = -1 } = opts;
  const start = afterLine >= 0 ? afterLine : 0;
  for (let i = start; i < lines.length; i++) {
    for (const p of patterns) {
      const m = lines[i].match(p);
      if (!m) continue;
      let val = clean(m[1] || m[2] || '');
      if (val.length > 0) return val;
      if (i + 1 < lines.length) {
        const next = clean(lines[i + 1]);
        if (next.length > 0 && !lines[i + 1].match(p)) return next;
      }
    }
  }
  return '';
}

function parseValue(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function extractEntrega(lines) {
  const fields = {
    numero_pedido: '', contrato: '', atendente: '', contato: '', contato_cliente: '',
    cpf_cnpj: '', rg: '', telefone: '', email: '',
    endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    local_entrega: '', telefone_entrega: '',
    data_retirada: '', data_devolucao: '', hora: '',
    observacao: '', referencia: '',
    itens: [], equipamentos: [], valores: { subtotal: 0, desconto: 0, frete: 0, total: 0 },
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\d{3,}\/\d{2}$/.test(line.trim()) && !fields.numero_pedido) {
      fields.numero_pedido = line.trim();
    }

    const contratoM = line.match(/CONTRATO\s*N[ºo°]/i);
    if (contratoM) {
      const afterLabel = line.substring(line.indexOf(contratoM[0]) + contratoM[0].length);
      const val = clean(afterLabel);
      if (val.length > 0) fields.contrato = val;
    }

    const attM = line.match(/Atendente\s*:\s*(.+)/i);
    if (attM) fields.atendente = clean(attM[1]);

    const locM = line.match(/Locat[áa]rio\s*:\s*(.+)/i);
    if (locM) fields.contato = clean(locM[1]);

    const cidM = line.match(/Cidade\s*:\s*([A-Za-zÀ-ú\s-]+)/i);
    if (cidM) fields.cidade = clean(cidM[1]);

    const localM = line.match(/Local\s+da\s+entrega\s*:\s*(.+)/i);
    if (localM) fields.local_entrega = clean(localM[1]);

    const estM = line.match(/Estado\s*:\s*([A-Z]{2})/i);
    if (estM) fields.estado = estM[1].toUpperCase();

    const cepM = line.match(/CEP\s*:\s*([\d.-]+)/i);
    if (cepM && !fields.cep) fields.cep = cepM[1];

    const foneM = line.match(/(?:Fone|Telefone)\s*:\s*([\d\s()-]+)/i);
    if (foneM && !fields.telefone) fields.telefone = clean(foneM[1]);

    const endM = line.match(/Endere[çc]o\s*:\s*(.+)/i);
    if (endM) fields.endereco = clean(endM[1]);

    const cnpjM = line.match(/CNPJ\s*:\s*([\d./-]+)/i);
    if (cnpjM) fields.cpf_cnpj = cnpjM[1];

    const numM = line.match(/N[ºo°]\s*:\s*(\d{1,5})/i);
    if (numM && !fields.numero) {
      const n = numM[1];
      if (n !== fields.numero_pedido.replace(/\/\d{2}$/, '')) fields.numero = n;
    }

    const bairM = line.match(/Bairro\s*:\s*(.+)/i);
    if (bairM) fields.bairro = clean(bairM[1]);

    const telLocM = line.match(/Telefone\s+do\s+local\s+de\s+entrega\s*:\s*([\d\s()-]+)/i);
    if (telLocM) fields.telefone_entrega = clean(telLocM[1]);

    const contM = line.match(/Contato\s*:\s*(.+)/i);
    if (contM) {
      const v = clean(contM[1]);
      if (v.length > 0) fields.contato_cliente = v;
    }

    const obsM = line.match(/Observa[çc][ãa]o\s*:\s*(.+)/i);
    if (obsM) fields.observacao = clean(obsM[1]);

    const refM = line.match(/Refer[êe]ncia\s*:\s*(.+)/i);
    if (refM) fields.referencia = clean(refM[1]);
  }

  const dateTimeLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/Data\s*:\s*Hora/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const dm = lines[j].match(/(\d{2}\/\d{2}\/\d{2,4})\s+(\d{1,2}:\d{2})/);
        if (dm) {
          fields.data_retirada = dm[1];
          fields.hora = dm[2];
          break;
        }
      }
    }
  }

  let inItems = false;
  let itemStartIdx = -1;
  let itemEndIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/Qtde\s+Descri[çc][ãa]o/i.test(lines[i]) || /DLoc\s+DDev/i.test(lines[i])) {
      if (!inItems) { inItems = true; itemStartIdx = i + 1; }
    }
    if (inItems && /(?:Declara[çc][ãa]o|OBSERVA[ÇC][ÃA]O|Observa[çc][ãa]o)/i.test(lines[i])) {
      itemEndIdx = i;
      break;
    }
  }

  if (itemStartIdx >= 0) {
    for (let i = itemStartIdx; i < itemEndIdx; i++) {
      const line = lines[i];
      if (/^\s*$/.test(line)) continue;
      if (/^Qtde|^DLoc|^Descri/i.test(line)) continue;

      const item = parseEntregaItemLine(line);
      if (item) fields.itens.push(item);
    }
  }

  if (fields.itens.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:TOTAL|SUBTOTAL|OBSERVA|Declara|CONTRATO|Atendente|Locat|Cidade|Local|Estado|CEP|Fone|Endere|CNPJ|N[ºo°]:|Bairro|Telefone|Contato|Data\s*:|Hora|Refer)/i.test(line)) continue;
      if (/^Qtde|^DLoc|^Descri/i.test(line)) continue;

      const item = parseEntregaItemLine(line);
      if (item) fields.itens.push(item);
    }
  }

  fields.equipamentos = extractEquipamentosFromItens(fields.itens);
  fields.valores = calcTotalFromItens(fields.itens);

  return fields;
}

function parseEntregaItemLine(line) {
  const dateP = /(\d{2}\/\d{2}\/\d{2,4})/g;
  const valP = /R\$\s*([\d.,]+)/;

  const valM = line.match(valP);
  const valor = valM ? parseValue(valM[1]) : 0;

  const dates = [];
  let dm;
  while ((dm = dateP.exec(line)) !== null) dates.push(dm[1]);

  const qtyM = line.match(/(?:^|\s)(\d{1,3})\s+/);
  const qty = qtyM ? parseInt(qtyM[1]) : 1;

  let patrimM = line.match(/\b(\d{6,10})\b/);
  if (!patrimM) patrimM = line.match(/(?:Patrim\.?|PATRIM\.?)\s*(\d+)/i);
  const patrimonio = patrimM ? patrimM[1] : '';

  let desc = line
    .replace(/R\$\s*[\d.,]+/g, '')
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '')
    .replace(/\b\d{6,10}\b/g, '')
    .replace(/(?:Patrim\.?|PATRIM\.?)\s*\d+/gi, '')
    .replace(/^(?:\s*\d{1,3}\s+)?/, '')
    .replace(/[|/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (desc.length < 2) return null;

  return {
    quantidade: qty,
    descricao: desc,
    patrimonio,
    data_locacao: dates[0] || '',
    data_devolucao: dates[1] || '',
    valor_unitario: valor,
    valor_total: valor * qty,
  };
}

function extractDevolucao(lines) {
  const fields = {
    numero_pedido: '', contrato: '', atendente: '', contato: '', contato_cliente: '',
    cpf_cnpj: '', rg: '', telefone: '', email: '',
    endereco: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
    local_entrega: '', telefone_entrega: '',
    data_retirada: '', data_devolucao: '', hora: '',
    observacao: '', referencia: '',
    condicoes: { danificado: false, extraviado: false, testarEmpresa: false },
    itens: [], equipamentos: [], valores: { subtotal: 0, desconto: 0, frete: 0, total: 0 },
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\d{3,}\/\d{2}$/.test(line.trim()) && !fields.numero_pedido) {
      fields.numero_pedido = line.trim();
    }

    const attM = line.match(/Atendente\s*:\s*(.+)/i);
    if (attM) fields.atendente = clean(attM[1]);

    const locM = line.match(/Locat[áa]rio\s*:\s*(.+)/i);
    if (locM) fields.contato = clean(locM[1]);

    const cidM = line.match(/Cidade\s*:\s*([A-Za-zÀ-ú\s-]+)/i);
    if (cidM) fields.cidade = clean(cidM[1]);

    const localM = line.match(/Local\s+da\s+Obra\s*:\s*(.+)/i);
    if (localM) fields.local_entrega = clean(localM[1]);

    const estM = line.match(/Estado\s*:\s*([A-Z]{2})/i);
    if (estM) fields.estado = estM[1].toUpperCase();

    const cepM = line.match(/CEP\s*:\s*([\d.-]+)/i);
    if (cepM && !fields.cep) fields.cep = cepM[1];

    const foneM = line.match(/(?:Fone|Telefone)\s*:\s*([\d\s()-]+)/i);
    if (foneM && !fields.telefone) fields.telefone = clean(foneM[1]);

    const endM = line.match(/Endere[çc]o\s*:\s*(.+)/i);
    if (endM) fields.endereco = clean(endM[1]);

    const cnpjM = line.match(/CNPJ\s*:\s*([\d./-]+)/i);
    if (cnpjM) fields.cpf_cnpj = cnpjM[1];

    const numM = line.match(/N[ºo°]\s*:\s*(\d{1,5})/i);
    if (numM && !fields.numero) {
      const n = numM[1];
      if (n !== fields.numero_pedido.replace(/\/\d{2}$/, '')) fields.numero = n;
    }

    const bairM = line.match(/Bairro\s*:\s*(.+)/i);
    if (bairM) fields.bairro = clean(bairM[1]);

    const telLocM = line.match(/Telefone\s+da\s+obra\s*:\s*([\d\s()-]+)/i);
    if (telLocM) fields.telefone_entrega = clean(telLocM[1]);

    const contM = line.match(/Contato\s*:\s*(.+)/i);
    if (contM) {
      const v = clean(contM[1]);
      if (v.length > 0) fields.contato_cliente = v;
    }

    const refM = line.match(/Refer[êe]ncia\s*:\s*(.+)/i);
    if (refM) fields.referencia = clean(refM[1]);

    if (/DANIFICADO/i.test(line)) fields.condicoes.danificado = true;
    if (/EXTRAVIADO/i.test(line)) fields.condicoes.extraviado = true;
    if (/TESTADO\s+NA\s+EMPRESA/i.test(line)) fields.condicoes.testarEmpresa = true;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Data\s*:\s*Hora/i.test(line) || /COMPROVANTE\s+DE\s+DEVOLU[ÇC][ÃA]O/i.test(line)) {
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        const dm = lines[j].match(/(\d{2}\/\d{2}\/\d{2,4})\s+(\d{1,2}:\d{2})/);
        if (dm) {
          fields.data_devolucao = dm[1];
          fields.hora = dm[2];
          break;
        }
      }
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\(\s*\)\s*\d+\s*[-–]/.test(line)) {
      const item = parseDevolucaoCheckboxItem(line);
      if (item) fields.itens.push(item);
    }
  }

  if (fields.itens.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:CONTRATO|Atendente|Locat|Cidade|Local|Estado|CEP|Fone|Endere|CNPJ|N[ºo°]:|Bairro|Telefone|Contato|Data\s*:|Hora|Refer|MANAUS|LOCADORA|CIENTE|DANIFICADO|EXTRAVIADO|TESTADO)/i.test(line)) continue;
      if (/\d{3,}\/\d{2}/.test(line)) continue;
      if (/EQUILOC|TRANS\s*OBRA|TARUMA/i.test(line)) continue;
      if (line.trim().length < 5) continue;

      const item = parseDevolucaoCheckboxItem(line);
      if (item) fields.itens.push(item);
    }
  }

  fields.equipamentos = fields.itens.map(it => it.descricao).filter(d => d.length > 2);
  fields.valores = { subtotal: 0, desconto: 0, frete: 0, total: 0 };

  return fields;
}

function parseDevolucaoCheckboxItem(line) {
  const cleaned = line.replace(/\(\s*\)\s*/, '').trim();

  const qtyM = cleaned.match(/^(\d{1,3})\s*[-–]\s*/);
  const qty = qtyM ? parseInt(qtyM[1]) : 1;

  const rest = qtyM ? cleaned.substring(qtyM[0].length) : cleaned;

  const faltanteM = rest.match(/QUANTIDADE\s+FALTANTE/i);

  let patrimonio = '';
  const patrimM = rest.match(/\b(\d{6,10})\b/);
  if (patrimM) patrimonio = patrimM[1];

  let desc = rest
    .replace(/QUANTIDADE\s+FALTANTE\s*:?_*/gi, '')
    .replace(/\b\d{6,10}\b/g, '')
    .replace(/\s*[-–]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (desc.length < 2) return null;

  return {
    quantidade: qty,
    descricao: desc,
    patrimonio,
    data_locacao: '',
    data_devolucao: '',
    valor_unitario: 0,
    valor_total: 0,
  };
}

function extractEquipamentosFromItens(itens) {
  const equipamentos = [];
  for (const item of itens) {
    const desc = item.descricao;
    if (desc && desc.length > 2 && !equipamentos.includes(desc)) {
      equipamentos.push(desc);
    }
  }
  return equipamentos;
}

function calcTotalFromItens(itens) {
  let total = 0;
  for (const item of itens) {
    total += (item.quantidade || 1) * (item.valor_unitario || 0);
  }
  return { subtotal: total, desconto: 0, frete: 0, total };
}

export async function importarPDF(file) {
  const { parsed } = await parseComprovantePDF(file);
  return parsed;
}
