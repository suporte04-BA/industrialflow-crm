import { extractTextFromPDF } from './pdfParser';

export async function parseComprovantePDF(file) {
  const { text, lines } = await extractTextFromPDF(file);
  const dedupedLines = deduplicatePages(lines);
  const tipo = detectDocumentType(dedupedLines);
  const parsed = tipo === 'devolucao' ? extractDevolucao(dedupedLines) : extractEntrega(dedupedLines);
  parsed.tipo_documento = tipo;
  return { rawText: text, parsed };
}

function deduplicatePages(lines) {
  if (lines.length < 20) return lines;
  const mid = Math.floor(lines.length / 2);
  const firstHalf = lines.slice(0, mid).join('\n');
  const secondHalf = lines.slice(mid).join('\n');
  const similarity = computeSimilarity(firstHalf, secondHalf);
  if (similarity > 0.85) return lines.slice(0, mid);
  return lines;
}

function computeSimilarity(a, b) {
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setA = new Set(wordsA);
  let matches = 0;
  for (const w of wordsB) { if (setA.has(w)) matches++; }
  return matches / wordsB.length;
}

function detectDocumentType(lines) {
  for (const line of lines) {
    if (/DEVOLU[ÇC][ÃA]O/i.test(line)) return 'devolucao';
  }
  return 'entrega';
}

function clean(val) {
  if (!val) return '';
  return val.replace(/^[:\s/]+/, '').replace(/[:\s/]+$/, '').replace(/\s+/g, ' ').trim();
}

function parseValue(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}



function findContractNumber(lines) {
  for (const line of lines) {
    const m1 = line.match(/CONTRATO\s*N[ºo°]\s*[:\s]+(\S+)/i);
    if (m1) return clean(m1[1]);
  }
  for (const line of lines) {
    const m2 = line.match(/^(\d{3,}\/\d{2,4})\s*$/);
    if (m2) return m2[1];
  }
  return '';
}

function findAddressNumber(lines) {
  const contractNum = findContractNumber(lines);
  const contractPrefix = contractNum ? contractNum.replace(/\/\d{2,4}$/, '') : '';
  for (const line of lines) {
    const m = line.match(/N[ºo°]\s*:\s*(\d{1,5})/i);
    if (m) {
      const n = m[1];
      if (contractPrefix && n === contractPrefix) continue;
      if (contractNum && n === contractNum) continue;
      if (contractNum && n === contractNum.split('/')[0]) continue;
      return n;
    }
  }
  return '';
}

function findContato(lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/Contato\s*:\s*(.+)/i);
    if (m) {
      let v = clean(m[1]);
      // Strip everything from any known field label onwards (not just the word)
      v = v.replace(/\s*(?:Refer[êe]ncia|Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Endere[çc]o|N[ºo°]|INSC|Data|Hora|COMPROVANTE|DLoc|DDev|Valor|Patrim|Qtde|Descri|Observa|Locat[áa]rio|Atendente|RG).*/i, '').trim();
      v = v.replace(/[:\s/]+$/, '').trim();
      if (v.length > 0 && v.length < 60 && !/^\d/.test(v)) return v;
      // If Contato line was polluted, try next line
      if (i + 1 < lines.length) {
        const next = clean(lines[i + 1]);
        if (next.length > 0 && next.length < 60 && !/^\d/.test(next) && !/^(Refer|Telefone|CNPJ|Bairro|Cidade|Estado|CEP|Endere|N[ºo°]|Data|Hora|Observa|Locat|Atend|Fone|RG|COMPROVANTE)/i.test(next)) {
          return next;
        }
      }
    }
  }
  return '';
}

function findReferencia(lines) {
  for (const line of lines) {
    const m = line.match(/Refer[êe]ncia\s*[:=]\s*(.+)/i);
    if (m) {
      let v = clean(m[1]);
      v = v.replace(/\s*(Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Endere[çc]o|N[ºo°]|INSC|Data|Hora|Observa|Contato|Atendente|Locat[áa]rio).*/i, '').trim();
      v = v.replace(/[:\s/]+$/, '').trim();
      if (v.length > 0 && v.length < 120) return v;
    }
  }
  // Also try: "Referência" at end of a line (pdfjs might join it with previous field)
  for (const line of lines) {
    const m = line.match(/(.+)\s+Refer[êe]ncia\s*[:=]?\s*(.*)/i);
    if (m) {
      const after = clean(m[2]);
      if (after.length > 0 && after.length < 120) return after;
    }
  }
  return '';
}

function findLocalEntrega(lines) {
  for (const line of lines) {
    const m = line.match(/Local\s+(?:da\s+)?(?:entrega|obra)\s*:\s*(.+)/i);
    if (m) {
      let v = clean(m[1]);
      v = v.replace(/\s*(Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Refer[êe]ncia).*/i, '').trim();
      if (v.length > 0) return v;
    }
  }
  return '';
}

function findTelefoneEntrega(lines) {
  // Pattern 1: "Telefone do local de entrega" or "Telefone da obra"
  for (const line of lines) {
    const m = line.match(/Telefone\s+(?:do\s+local\s+de\s+(?:entrega|obra)|da\s+obra)\s*:\s*([\d\s().-]+)/i);
    if (m) return clean(m[1]);
  }
  // Pattern 2: "Fone:" in the local de entrega context (after "Local da obra")
  let foundLocal = false;
  for (const line of lines) {
    if (/Local\s+(?:da\s+)?(?:entrega|obra)/i.test(line)) foundLocal = true;
    if (foundLocal) {
      const m = line.match(/Fone\s*:\s*([\d\s().-]+)/i);
      if (m) return clean(m[1]);
    }
  }
  // Pattern 3: "Fone do local" or "Fone da obra"
  for (const line of lines) {
    const m = line.match(/Fone\s+(?:do\s+local|da\s+obra)\s*:\s*([\d\s().-]+)/i);
    if (m) return clean(m[1]);
  }
  return '';
}

function extractEntrega(lines) {
  const contrato = findContractNumber(lines);
  const numeroEndereco = findAddressNumber(lines);

  const fields = {
    numero_pedido: contrato,
    contrato,
    atendente: '',
    locatario: '',
    contato: '',
    contato_cliente: findContato(lines),
    cpf_cnpj: '',
    rg: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: numeroEndereco,
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    local_entrega: findLocalEntrega(lines),
    telefone_entrega: findTelefoneEntrega(lines),
    data_retirada: '',
    data_devolucao: '',
    hora: '',
    observacao: '',
    referencia: findReferencia(lines),
    itens: [],
    equipamentos: [],
    valores: { subtotal: 0, desconto: 0, frete: 0, total: 0 },
  };

  let cepCandidates = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const attM = line.match(/Atendente\s*:\s*(.+)/i);
    if (attM && !fields.atendente) fields.atendente = clean(attM[1]);

    const locM = line.match(/Locat[áa]rio\s*:\s*(.+)/i);
    if (locM && !fields.locatario) {
      let v = clean(locM[1]);
      v = v.replace(/\s*(?:CNPJ|CPF|RG|Telefone|Fone|Cidade|Estado|CEP|Endere[çc]o|INSC).*/i, '').trim();
      if (v.length > 0 && v.length < 120) fields.locatario = v;
    }

    const cidM = line.match(/Cidade\s*:\s*([A-Za-zÀ-ú\s-]+)/i);
    if (cidM && !fields.cidade) {
      let v = clean(cidM[1]);
      v = v.replace(/\s*(Estado|CEP|Telefone|Fone|N[ºo°]|INSC).*/i, '').trim();
      if (v.length > 0) fields.cidade = v;
    }

    const estM = line.match(/Estado\s*:\s*([A-Z]{2})/i);
    if (estM && !fields.estado) fields.estado = estM[1].toUpperCase();

    // CEP: collect candidates, prefer the one near Bairro
    const cepEstadoM = line.match(/Estado\s*:\s*[A-Z]{2}\s*CEP\s*:?\s*([\d.-]+)/i);
    if (cepEstadoM) cepCandidates.push({ cep: cepEstadoM[1], context: 'estado' });

    const cepM = line.match(/CEP\s*:\s*([\d.-]+)/i);
    if (cepM) cepCandidates.push({ cep: cepM[1], context: 'cep' });

    const foneM = line.match(/(?:^|\s)Fone\s*:\s*([\d\s().-]+)/i);
    if (foneM && !fields.telefone) fields.telefone = clean(foneM[1]);

    const telObraM = line.match(/Telefone\s+(?:do\s+local\s+de\s+(?:entrega|obra)|da\s+obra)\s*:\s*([\d\s().-]+)/i);
    if (telObraM) fields.telefone_entrega = clean(telObraM[1]);

    const endM = line.match(/Endere[çc]o\s*:\s*(.+)/i);
    if (endM && !fields.endereco) {
      let v = clean(endM[1]);
      v = v.replace(/\s*N[ºo°]\s*:.*/i, '').trim();
      if (v.length > 0 && v.length < 120) fields.endereco = v;
    }

    const cnpjM = line.match(/CNPJ\s*:\s*([\d./-]+)/i);
    if (cnpjM && !fields.cpf_cnpj) fields.cpf_cnpj = cnpjM[1];

    const rgM = line.match(/RG\s*:\s*([\d.]+)/i);
    if (rgM && !fields.rg) fields.rg = rgM[1];

    const bairM = line.match(/Bairro\s*:\s*(.+)/i);
    if (bairM && !fields.bairro) {
      let v = clean(bairM[1]);
      v = v.replace(/\s*(Cidade|Estado|CEP|Telefone|Fone).*/i, '').trim();
      // Check if next line continues the bairro name
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.trim().length > 0 && !/^(Cidade|Estado|CEP|Telefone|Fone|Endere|Data|Hora|Contato|Refer|Locat|Atend|Bairro|N[ºo°]|COMPROVANTE|EQUILOC|TRANS)/i.test(nextLine)) {
          const nextClean = clean(nextLine);
          if (nextClean.length > 0 && nextClean.length < 40) {
            v = v + ' ' + nextClean;
          }
        }
      }
      if (v.length > 0 && v.length < 80) fields.bairro = v;
      // Mark context for CEP priority
      cepCandidates.push({ cep: '', context: 'bairro' });
    }

    const obsM = line.match(/Observa[çc][ãa]o\s*:\s*(.+)/i);
    if (obsM && !fields.observacao) fields.observacao = clean(obsM[1]);
  }

  // CEP priority: prefer the LAST CEP candidate that's near or after Bairro context
  if (cepCandidates.length > 0 && !fields.cep) {
    // Find the last CEP with a non-empty value that's not from 'estado' context
    const clientCeps = cepCandidates.filter(c => c.cep && (c.context === 'cep' || c.context === 'bairro'));
    if (clientCeps.length > 0) {
      fields.cep = clientCeps[clientCeps.length - 1].cep;
    } else if (cepCandidates[cepCandidates.length - 1].cep) {
      fields.cep = cepCandidates[cepCandidates.length - 1].cep;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (/Data\s*:.*Hora/i.test(lines[i])) {
      // Try to find date and time on the same line: "Data: DD/MM/YYYY Hora: HH:MM"
      const sameLineDm = lines[i].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
      if (sameLineDm) {
        fields.data_retirada = sameLineDm[1];
        fields.hora = sameLineDm[2];
      } else {
        for (let j = i; j < Math.min(i + 4, lines.length); j++) {
          const dm = lines[j].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
          if (dm) {
            fields.data_retirada = dm[1];
            fields.hora = dm[2];
            break;
          }
        }
      }
      break;
    }
  }

  const junkPatterns = /TOTAL|SUBTOTAL|DECLAR|CONTRATO|Atendente|Locat|Cidade|Local|Estado|CEP|Fone|Endere|CNPJ|Bairro|Telefone|Contato|Data\s*:|Hora|Refer|EQUILOC|TRANS\s*OBRA|TARUMA|COMPROVANTE|Observa|Patrim|NOME|RG\s*:|LOCADORA|CIENTE|ASSINATURA|RESPONSÁVEL|CPF\s+DO|VALOR\s+TOTAL/i;

  const seenItems = new Set();
  for (const line of lines) {
    if (/Qtde\s+Descri/i.test(line) || /^DLoc\s+DDev/i.test(line)) continue;
    if (/^\s*$/.test(line)) continue;
    if (junkPatterns.test(line)) continue;
    if (/^_{5,}/.test(line.trim())) continue;
    if (/^-{5,}/.test(line.trim())) continue;
    if (/MANAUS,?\s+\d/i.test(line)) continue;
    if (/ORÇAMENTO|ORCAMENTO/i.test(line)) continue;
    if (/Locadora\s+entrega/i.test(line)) continue;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(line.trim())) continue;
    if (/CONTRATO\s*N/i.test(line)) continue;

    const item = parseEntregaItemLine(line);
    if (item) {
      const key = item.descricao.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
      if (!seenItems.has(key)) {
        seenItems.add(key);
        fields.itens.push(item);
      }
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

  if (desc.length < 3) return null;

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
  const contrato = findContractNumber(lines);
  const numeroEndereco = findAddressNumber(lines);

  const fields = {
    numero_pedido: contrato,
    contrato,
    atendente: '',
    locatario: '',
    contato: '',
    contato_cliente: findContato(lines),
    cpf_cnpj: '',
    rg: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: numeroEndereco,
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    local_entrega: findLocalEntrega(lines),
    telefone_entrega: findTelefoneEntrega(lines),
    data_retirada: '',
    data_devolucao: '',
    hora: '',
    observacao: '',
    referencia: findReferencia(lines),
    condicoes: { danificado: false, extraviado: false, testarEmpresa: false },
    itens: [],
    equipamentos: [],
    valores: { subtotal: 0, desconto: 0, frete: 0, total: 0 },
  };

  let cepCandidates = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const attM = line.match(/Atendente\s*:\s*(.+)/i);
    if (attM && !fields.atendente) fields.atendente = clean(attM[1]);

    const locM = line.match(/Locat[áa]rio\s*:\s*(.+)/i);
    if (locM && !fields.locatario) {
      let v = clean(locM[1]);
      v = v.replace(/\s*(?:CNPJ|CPF|RG|Telefone|Fone|Cidade|Estado|CEP|Endere[çc]o|INSC).*/i, '').trim();
      if (v.length > 0 && v.length < 120) fields.locatario = v;
    }

    const cidM = line.match(/Cidade\s*:\s*([A-Za-zÀ-ú\s-]+)/i);
    if (cidM && !fields.cidade) {
      let v = clean(cidM[1]);
      v = v.replace(/\s*(Estado|CEP|Telefone|Fone|N[ºo°]|INSC).*/i, '').trim();
      if (v.length > 0) fields.cidade = v;
    }

    const estM = line.match(/Estado\s*:\s*([A-Z]{2})/i);
    if (estM && !fields.estado) fields.estado = estM[1].toUpperCase();

    const cepEstadoM = line.match(/Estado\s*:\s*[A-Z]{2}\s*CEP\s*:?\s*([\d.-]+)/i);
    if (cepEstadoM) cepCandidates.push({ cep: cepEstadoM[1], context: 'estado' });

    const cepM = line.match(/CEP\s*:\s*([\d.-]+)/i);
    if (cepM) cepCandidates.push({ cep: cepM[1], context: 'cep' });

    const foneM = line.match(/(?:^|\s)Fone\s*:\s*([\d\s().-]+)/i);
    if (foneM && !fields.telefone) fields.telefone = clean(foneM[1]);

    const telObraM = line.match(/Telefone\s+(?:do\s+local|da\s+obra)\s*:\s*([\d\s().-]+)/i);
    if (telObraM) fields.telefone_entrega = clean(telObraM[1]);

    const endM = line.match(/Endere[çc]o\s*:\s*(.+)/i);
    if (endM && !fields.endereco) {
      let v = clean(endM[1]);
      v = v.replace(/\s*N[ºo°]\s*:.*/i, '').trim();
      if (v.length > 0 && v.length < 120) fields.endereco = v;
    }

    const cnpjM = line.match(/CNPJ\s*:\s*([\d./-]+)/i);
    if (cnpjM && !fields.cpf_cnpj) fields.cpf_cnpj = cnpjM[1];

    const rgM = line.match(/RG\s*:\s*([\d.]+)/i);
    if (rgM && !fields.rg) fields.rg = rgM[1];

    const bairM = line.match(/Bairro\s*:\s*(.+)/i);
    if (bairM && !fields.bairro) {
      let v = clean(bairM[1]);
      v = v.replace(/\s*(Cidade|Estado|CEP|Telefone|Fone).*/i, '').trim();
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.trim().length > 0 && !/^(Cidade|Estado|CEP|Telefone|Fone|Endere|Data|Hora|Contato|Refer|Locat|Atend|Bairro|N[ºo°]|COMPROVANTE|EQUILOC|TRANS)/i.test(nextLine)) {
          const nextClean = clean(nextLine);
          if (nextClean.length > 0 && nextClean.length < 40) {
            v = v + ' ' + nextClean;
          }
        }
      }
      if (v.length > 0 && v.length < 80) fields.bairro = v;
      cepCandidates.push({ cep: '', context: 'bairro' });
    }

    const obsM = line.match(/Observa[çc][ãa]o\s*:\s*(.+)/i);
    if (obsM && !fields.observacao) fields.observacao = clean(obsM[1]);

    if (/DANIFICADO/i.test(line)) fields.condicoes.danificado = true;
    if (/EXTRAVIADO/i.test(line)) fields.condicoes.extraviado = true;
    if (/TESTADO\s+NA\s+EMPRESA/i.test(line)) fields.condicoes.testarEmpresa = true;
  }

  if (cepCandidates.length > 0 && !fields.cep) {
    const clientCeps = cepCandidates.filter(c => c.cep && (c.context === 'cep' || c.context === 'bairro'));
    if (clientCeps.length > 0) {
      fields.cep = clientCeps[clientCeps.length - 1].cep;
    } else if (cepCandidates[cepCandidates.length - 1].cep) {
      fields.cep = cepCandidates[cepCandidates.length - 1].cep;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/COMPROVANTE\s+DE\s+DEVOLU[ÇC][ÃA]O/i.test(line)) {
      // Try same line first: "Data: DD/MM/YYYY Hora: HH:MM"
      const sameLineDm = line.match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
      if (sameLineDm) {
        fields.data_devolucao = sameLineDm[1];
        fields.hora = sameLineDm[2];
      } else {
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const dm = lines[j].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
          if (dm) {
            fields.data_devolucao = dm[1];
            fields.hora = dm[2];
            break;
          }
        }
      }
      break;
    }
  }
  if (!fields.data_devolucao) {
    for (let i = 0; i < lines.length; i++) {
      if (/Data\s*:.*Hora/i.test(lines[i])) {
        const sameLineDm = lines[i].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
        if (sameLineDm) {
          fields.data_devolucao = sameLineDm[1];
          fields.hora = sameLineDm[2];
        } else {
          for (let j = i; j < Math.min(i + 5, lines.length); j++) {
            const dm = lines[j].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
            if (dm) {
              fields.data_devolucao = dm[1];
              fields.hora = dm[2];
              break;
            }
          }
        }
        break;
      }
    }
  }

  const seenItems = new Set();
  for (const line of lines) {
    if (/\(\s*\)\s*\d+\s*[-–]/.test(line)) {
      const item = parseDevolucaoCheckboxItem(line);
      if (item) {
        const key = item.descricao.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
        if (!seenItems.has(key)) {
          seenItems.add(key);
          fields.itens.push(item);
        }
      }
    }
  }

  if (fields.itens.length === 0) {
    const junkPatterns = /(?:CONTRATO|Atendente|Locat|Cidade|Local|Estado|CEP|Fone|Endere|CNPJ|Bairro|Telefone|Contato|Data\s*:|Hora|Refer|MANAUS|LOCADORA|CIENTE|DANIFICADO|EXTRAVIADO|TESTADO|COMPROVANTE|EQUILOC|TRANS\s*OBRA|TARUMA|DECLAR|Observa|Patrim|NOME|RG\s*:)/i;
    for (const line of lines) {
      if (junkPatterns.test(line)) continue;
      if (/\d{3,}\/\d{2}/.test(line)) continue;
      if (/^_{5,}/.test(line.trim())) continue;
      if (/^-{5,}/.test(line.trim())) continue;
      if (/MANAUS,?\s+\d/i.test(line)) continue;
      if (/ORÇAMENTO|ORCAMENTO/i.test(line)) continue;
      if (/ASSINATURA|RESPONSÁVEL|CPF\s+DO/i.test(line)) continue;
      if (line.trim().length < 5) continue;

      const item = parseDevolucaoCheckboxItem(line);
      if (item) {
        const key = item.descricao.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
        if (!seenItems.has(key)) {
          seenItems.add(key);
          fields.itens.push(item);
        }
      }
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

  let patrimonio = '';
  const patrimM = rest.match(/\b(\d{6,10})\b/);
  if (patrimM) patrimonio = patrimM[1];

  let desc = rest
    .replace(/QUANTIDADE\s+FALTANTE\s*:?_*/gi, '')
    .replace(/\b\d{6,10}\b/g, '')
    .replace(/\s*[-–]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (desc.length < 3) return null;

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
