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
  return val.replace(/^[:\s]+/, '').replace(/[:\s]+$/, '').replace(/\s+/g, ' ').trim();
}

function findAfterLabel(lines, patterns, opts = {}) {
  const { multiple = false, maxLength = 200 } = opts;
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      const m = lines[i].match(p);
      if (!m) continue;

      let val = (m[1] || m[2] || '').trim();
      val = cleanValue(val);

      if (val.length > 1 && val.length <= maxLength) {
        if (!multiple) return val;
        results.push(val);
        break;
      }

      for (let offset = 1; offset <= 2; offset++) {
        if (i + offset < lines.length) {
          const nextLine = cleanValue(lines[i + offset]);
          if (nextLine.length > 1 && nextLine.length <= maxLength && !lines[i + offset].match(p)) {
            if (!multiple) return nextLine;
            results.push(nextLine);
            break;
          }
        }
      }
    }
  }

  return multiple ? results : '';
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
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    rg: '',
    cpf_cnpj: '',
    email: '',
    atendente: '',
    hora: '',
    observacao: '',
    local_entrega: '',
    telefone_entrega: '',
    itens: [],
    valores: { subtotal: 0, desconto: 0, frete: 0, total: 0 },
  };

  fields.numero_pedido = findAfterLabel(lines, [
    /(?:Pedido|PEDIDO|pedido|N[ºo°]|ORCAMENTO|ORÇAMENTO|Orcamento)\s*[:.]?\s*([A-Z0-9\-/]+)/i,
  ]);

  fields.contrato = findAfterLabel(lines, [
    /(?:Contrato|CONTRATO)\s*(?:N[ºo°]|N\.?\s*[ºo°]?|No\.?|N\.º?)\s*[:.]?\s*([A-Z0-9\-/]+)/i,
    /(?:Contrato|CONTRATO)\s*[:.]\s*([A-Z0-9\-/]+)/i,
    /(?:Contrato|CONTRATO)\s+([A-Z0-9\-/]+)/i,
  ]);

  fields.data_retirada = findAfterLabel(lines, [
    /(?:Retirada|Saída|Saida|Data\s+da\s+Retirada|data\s+de\s+retirada|D\.?\s*LOC|Data\s+Locação|Data\s+Locacao)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Data\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ]);

  fields.data_devolucao = findAfterLabel(lines, [
    /(?:Devolução|Devolucao|Entrada|Data\s+da\s+Devolucao|D\.?\s*DEV)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ]);

  fields.hora = findAfterLabel(lines, [
    /(?:Hora|Horário|Horario)\s*[:.]?\s*(\d{1,2}[:\s]\d{2})/i,
    /(\d{1,2}:\d{2})/,
  ]);

  fields.atendente = findAfterLabel(lines, [
    /(?:Atendente|Vendedor|Responsável|Responsavel|Vendedora)\s*[:.]\s*(.+)/i,
  ]);

  fields.contato = findAfterLabel(lines, [
    /(?:Locatário|LOCATÁRIO|Locatario|Cliente|CLIENTE)\s*[:.]\s*(.+)/i,
  ]);

  fields.contato_cliente = findAfterLabel(lines, [
    /(?:Contato|CONTATO)\s*[:.]\s*(.+)/i,
  ]);

  fields.cpf_cnpj = findAfterLabel(lines, [
    /(?:CPF|CNPJ)\s*[:.]?\s*([\d./-]+)/i,
  ]);

  fields.rg = findAfterLabel(lines, [
    /(?:RG|Identidade)\s*[:.]?\s*([\d.\-X]+)/i,
  ]);

  fields.telefone = findAfterLabel(lines, [
    /(?:Telefone|TEL|Tel|Fone|Celular|Cel)\s*[:.]?\s*([\d\s()-]+)/i,
  ]);

  fields.endereco = findAfterLabel(lines, [
    /(?:Endereço|Endereco|ENDEREÇO)\s*[:.]\s*(.+)/i,
    /(?:Rua|Avenida|Av\.|Alameda|Travessa)\s+[:.]?\s*(.+)/i,
  ]);

  // CORREÇÃO: Busca número do endereço excluindo o que já é contrato
  const possibleNumero = findAfterLabel(lines, [
    /(?:N[úu]mero|N[ºo°]|Num\.?)\s*[:.]?\s*(\d+)/i,
    /,\s*(\d+)\s*(?:-\s*Bairro|Bairro)/i,
  ]);
  fields.numero = (possibleNumero && possibleNumero !== fields.contrato) ? possibleNumero : '';

  fields.bairro = findAfterLabel(lines, [
    /(?:Bairro|BAIRRO)\s*[:.]?\s*(.+)/i,
  ]);

  fields.cidade = findAfterLabel(lines, [
    /(?:Cidade|CIDADE|Município|Municipio)\s*[:.]?\s*([A-Za-zÀ-ú\s-]+)/i,
  ]);

  fields.estado = findAfterLabel(lines, [
    /(?:Estado|UF)\s*[:.]?\s*([A-Z]{2})/i,
  ]);

  fields.cep = findAfterLabel(lines, [
    /(?:CEP|cep)\s*[:.]?\s*([\d.-]+)/i,
  ]);

  fields.email = findAfterLabel(lines, [
    /(?:E-mail|Email)\s*[:.]\s*([^\s]+@[^\s]+)/i,
  ]);

  fields.local_entrega = findAfterLabel(lines, [
    /(?:Local\s+de\s+Entrega|LOCAL\s+DE\s+ENTREGA|Local\s+Entrega)\s*[:.]\s*(.+)/i,
  ]);

  fields.telefone_entrega = findAfterLabel(lines, [
    /(?:Telefone\s+do\s+Local|Tel\.?\s*Entrega|Fone\s+Entrega)\s*[:.]?\s*([\d\s()-]+)/i,
    /(?:Telefone|Tel)\s*[:.]?\s*([\d\s()-]+)/i,
  ]);

  fields.observacao = findAfterLabel(lines, [
    /(?:Observação|Observacao|Observações|Obs\.?)\s*[:.]\s*(.+)/i,
  ]);

  fields.itens = extractItems(lines);
  fields.valores = extractValues(lines);

  return fields;
}

function extractItems(lines) {
  const items = [];
  const valuePattern = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/;
  const datePattern = /(\d{2}[/-]\d{2}[/-]\d{2,4})/;

  // 1. Tenta achar o início da tabela
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/(?:DESCRIÇÃO|Descricao|ITEM|Item|Qtde|Quantidade|Descri|Bem|Equipamento|BENFEITORIAS?)/i.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }

  // 2. Se não achou cabeçalho, procura primeira linha com data e valor
  if (startIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (valuePattern.test(lines[i]) && datePattern.test(lines[i])) {
        startIdx = i;
        break;
      }
    }
  }
  if (startIdx === -1) startIdx = 0;

  // 3. Define o fim (Total ou Observações)
  let endIdx = lines.length;
  for (let i = startIdx; i < lines.length; i++) {
    if (/(?:TOTAL|Total\s+Geral|SUBTOTAL|Valor\s+Total)/i.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    if (/(?:OBSERVAÇÃO|Observação|Observacoes)/i.test(line)) break;

    const valueMatch = line.match(valuePattern);
    if (!valueMatch) continue;

    const val = parseValue(valueMatch[1]);
    if (val <= 0) continue;

    const dates = line.match(new RegExp(datePattern, 'g')) || [];
    const qtyMatch = line.match(/^(\d{1,3})\s/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    const patrimMatch = line.match(/(?:Patrim\.?|PATRIM\.?)\s*(\d+)/i);
    const patrimonio = patrimMatch ? patrimMatch[1] : '';

    // Limpeza da descrição: remove tudo que é conhecido (data, valor, qtde)
    let desc = line
      .replace(/^(\d{1,3})\s+/, '')
      .replace(new RegExp(valuePattern, 'g'), '')
      .replace(new RegExp(datePattern, 'g'), '')
      .replace(/Patrim\.?\s*\d+/gi, '')
      .replace(/R?\$?\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (desc.length >= 1) {
      items.push({
        descricao: desc,
        quantidade: qty,
        patrimonio,
        data_locacao: dates[0] || '',
        data_devolucao: dates[1] || dates[0] || '',
        valor_unitario: val,
        valor_total: val * qty,
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

    if (/(?:Total|TOTAL|Valor\s+Total|Total\s+Geral)/i.test(line)) {
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
