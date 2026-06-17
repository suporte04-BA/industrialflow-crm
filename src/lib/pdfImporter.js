import { extractTextFromPDF } from './pdfParser';

export async function parseComprovantePDF(file) {
  const text = await extractTextFromPDF(file);
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  return {
    rawText: text,
    parsed: extractFields(lines),
  };
}

function cleanValue(val) {
  if (!val) return '';
  return val
    .replace(/^[:\s]+/, '')
    .replace(/[:\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findAfterLabel(lines, patterns) {
  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      const m = lines[i].match(p);
      if (m) {
        let val = (m[1] || m[2] || '').trim();
        if (val.length > 1) return cleanValue(val);
        if (i + 1 < lines.length && !lines[i + 1].match(p)) {
          return cleanValue(lines[i + 1]);
        }
      }
    }
  }
  return '';
}

function extractFields(lines) {
  const fields = {
    numero_pedido: '',
    contrato: '',
    data_retirada: '',
    data_devolucao: '',
    contato: '',
    contato_cliente: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    cpf_cnpj: '',
    email: '',
    observacao: '',
    local_entrega: '',
    telefone_entrega: '',
    itens: [],
    valores: { subtotal: 0, desconto: 0, frete: 0, total: 0 },
  };

  fields.numero_pedido = findAfterLabel(lines, [
    /(?:Pedido|PEDIDO|pedido|N[ºo°]|ORÇAMENTO|Orcamento)[\s.:]*([A-Z0-9\-/]+)/i,
    /^(\d{3,}[-/]\d{3,})/,
  ]);

  fields.contrato = findAfterLabel(lines, [
    /(?:Contrato|CONTRATO)\s*(?:N[ºo°]|No\.?|N\.º?)\s*[:.]?\s*([A-Z0-9\-/]+)/i,
    /(?:Contrato|CONTRATO)\s*[:]\s*([A-Z0-9\-/]+)/i,
  ]);

  fields.data_retirada = findAfterLabel(lines, [
    /(?:Retirada|Saída|Data da Retirada|data de retirada|D\.LOC)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
  ]);
  fields.data_devolucao = findAfterLabel(lines, [
    /(?:Devolução|Entrada|Data da Devolucao|data de devolucao|D\.DEV)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
  ]);

  fields.contato = findAfterLabel(lines, [
    /(?:Locatário|LOCATÁRIO|Cliente|CLIENTE)\s*[:.]\s*(.+)/i,
  ]);
  fields.contato_cliente = findAfterLabel(lines, [
    /(?:Contato|CONTATO)\s*[:.]\s*(.+)/i,
  ]);

  fields.endereco = findAfterLabel(lines, [
    /(?:Endereço|Endereco|ENDEREÇO)\s*[:.]\s*(.+)/i,
  ]);
  fields.bairro = findAfterLabel(lines, [
    /(?:Bairro|BAIRRO)\s*[:.]\s*(.+)/i,
  ]);
  fields.cidade = findAfterLabel(lines, [
    /(?:Cidade|CIDADE|Município)\s*[:.]\s*([A-Za-zÀ-ú\s-]+)/i,
  ]);
  fields.estado = findAfterLabel(lines, [
    /(?:Estado|UF)\s*[:.]\s*([A-Z]{2})/i,
  ]);
  fields.cep = findAfterLabel(lines, [
    /(?:CEP|cep)\s*[:.]\s*([\d-]+)/i,
  ]);

  fields.telefone = findAfterLabel(lines, [
    /(?:Telefone|TEL|Tel|Fone|Celular)\s*[:.]\s*([\d\s()-]+)/i,
  ]);
  fields.cpf_cnpj = findAfterLabel(lines, [
    /(?:CPF|CNPJ)\s*[:.]\s*([\d./-]+)/i,
  ]);
  fields.email = findAfterLabel(lines, [
    /(?:E-mail|Email)\s*[:.]\s*([^\s]+@[^\s]+)/i,
  ]);

  fields.local_entrega = findAfterLabel(lines, [
    /(?:Local de Entrega|LOCAL DE ENTREGA)\s*[:.]\s*(.+)/i,
  ]);
  fields.telefone_entrega = findAfterLabel(lines, [
    /(?:Telefone do Local|Tel\.?\s*Entrega)\s*[:.]\s*([\d\s\-()]+)/i,
  ]);

  fields.observacao = findAfterLabel(lines, [
    /(?:Observação|Observacao|Observações|Obs)\s*[:.]\s*(.+)/i,
  ]);

  fields.itens = extractItems(lines);
  fields.valores = extractValues(lines);

  return fields;
}

function extractItems(lines) {
  const items = [];
  const valuePattern = /R\$\s*([\d.,]+)/;
  const datePattern = /(\d{2}[/-]\d{2}[/-]\d{4})/;

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/(?:DESCRIÇÃO|Descricao|ITEM|Qtde|Quantidade)/i.test(lines[i]) && /(?:VALOR|Valor|R\$)/i.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) startIdx = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    if (/(?:TOTAL|Total Geral|Subtotal|Frete|Desconto)/i.test(line) && valuePattern.test(line)) break;

    const valueMatch = line.match(valuePattern);
    if (!valueMatch) continue;

    const qtyMatch = line.match(/^(\d+)\s/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    const valorUnit = parseValue(valueMatch[1]);

    const dates = line.match(new RegExp(datePattern, 'g'));
    const dataLoc = dates && dates.length >= 1 ? dates[0] : '';
    const dataDev = dates && dates.length >= 2 ? dates[1] : '';

    const patrimMatch = line.match(/(?:Patrim\.?|PATRIM\.?)\s*(\d+)/i);
    const patrimonio = patrimMatch ? patrimMatch[1] : '';

    let desc = line
      .replace(/^(\d+)\s+/, '')
      .replace(/R\$\s*[\d.,]+/, '')
      .replace(/\d{2}[/-]\d{2}[/-]\d{4}/g, '')
      .replace(/Patrim\.?\s*\d+/gi, '')
      .replace(/\b\d{3,6}\b/g, '')
      .replace(/^\s*[-.,]+\s*/, '')
      .trim();

    if (desc.length > 2 && valorUnit > 0) {
      items.push({
        descricao: desc,
        quantidade: qty,
        patrimonio,
        data_locacao: dataLoc,
        data_devolucao: dataDev,
        valor_unitario: valorUnit,
        valor_total: valorUnit * qty,
      });
    }
  }

  return items;
}

function extractValues(lines) {
  const valores = { subtotal: 0, desconto: 0, frete: 0, total: 0 };
  const valuePattern = /R\$\s*([\d.,]+)/;

  for (const line of lines) {
    const match = line.match(valuePattern);
    if (!match) continue;
    const val = parseValue(match[1]);

    if (/(?:Total|TOTAL|Valor Total)/i.test(line)) {
      valores.total = val;
    } else if (/(?:Subtotal|SUBTOTAL|Sub-total)/i.test(line)) {
      valores.subtotal = val;
    } else if (/(?:Frete|FRETE)/i.test(line)) {
      valores.frete = val;
    } else if (/(?:Desconto|DESCONTO)/i.test(line)) {
      valores.desconto = val;
    }
  }

  return valores;
}

function parseValue(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

export async function importarPDF(file) {
  const { parsed } = await parseComprovantePDF(file);
  return parsed;
}
