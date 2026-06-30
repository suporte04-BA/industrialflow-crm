// ============================================
// Field Extraction Engine
// Regex-based extraction of structured fields
// ============================================

import { FIELD_PATTERNS, DOCUMENT_TYPE_PATTERN, DEVOLUCAO_CONDITIONS } from './constants.js';

/**
 * Clean extracted value
 * @param {string} val
 * @returns {string}
 */
export function clean(val) {
  if (!val) return '';
  return val.replace(/^[:\s/]+/, '').replace(/[:\s/]+$/, '').replace(/\s+/g, ' ').trim();
}

/**
 * Detect document type from lines
 * @param {string[]} lines
 * @returns {'entrega'|'devolucao'}
 */
export function detectDocumentType(lines) {
  for (const line of lines) {
    if (DOCUMENT_TYPE_PATTERN.test(line)) return 'devolucao';
  }
  return 'entrega';
}

/**
 * Find first match for a field across all lines
 * @param {string[]} lines
 * @param {RegExp[]} patterns
 * @param {Object} [options]
 * @returns {string}
 */
function findFirstMatch(lines, patterns, options = {}) {
  const { cleanFn = clean, maxLength = 120, stripAfter = null } = options;
  for (const line of lines) {
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m && m[1]) {
        let v = cleanFn(m[1]);
        if (stripAfter) {
          v = v.replace(stripAfter, '').trim();
        }
        if (v.length > 0 && v.length < maxLength) return v;
      }
    }
  }
  return '';
}

/**
 * Find contract number
 * @param {string[]} lines
 * @returns {string}
 */
export function findContractNumber(lines) {
  for (const line of lines) {
    for (const pattern of FIELD_PATTERNS.contrato) {
      const m = line.match(pattern);
      if (m && m[1]) {
        const v = clean(m[1]);
        if (v.length > 0) return v;
      }
    }
  }
  return '';
}

/**
 * Find address number (excluding contract number)
 * @param {string[]} lines
 * @returns {string}
 */
export function findAddressNumber(lines) {
  const contractNum = findContractNumber(lines);
  const contractPrefix = contractNum ? contractNum.replace(/\/\d{2,4}$/, '') : '';

  for (const line of lines) {
    const m = line.match(FIELD_PATTERNS.numeroEndereco[0]);
    if (m && m[1]) {
      const n = m[1];
      if (contractPrefix && n === contractPrefix) continue;
      if (contractNum && n === contractNum) continue;
      if (contractNum && n === contractNum.split('/')[0]) continue;
      return n;
    }
  }
  return '';
}

/**
 * Extract contato with fallback to next line
 * @param {string[]} lines
 * @returns {string}
 */
export function findContato(lines) {
  const fieldStrip = /\s*(?:Refer[êe]ncia|Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Endere[çc]o|N[ºo°]|INSC|Data|Hora|COMPROVANTE|DLoc|DDev|Valor|Patrim|Qtde|Descri|Observa|Locat[áa]rio|Atendente|RG).*/i;
  const nextLineSkip = /^(Refer|Telefone|CNPJ|Bairro|Cidade|Estado|CEP|Endere|N[ºo°]|Data|Hora|Observa|Locat|Atend|Fone|RG|COMPROVANTE)/i;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FIELD_PATTERNS.contato[0]);
    if (m && m[1]) {
      let v = clean(m[1]);
      v = v.replace(fieldStrip, '').trim();
      v = v.replace(/[:\s/]+$/, '').trim();
      if (v.length > 0 && v.length < 60 && !/^\d/.test(v)) return v;

      // Fallback: try next line
      if (i + 1 < lines.length) {
        const next = clean(lines[i + 1]);
        if (next.length > 0 && next.length < 60 && !/^\d/.test(next) && !nextLineSkip.test(next)) {
          return next;
        }
      }
    }
  }
  return '';
}

/**
 * Find reference
 * @param {string[]} lines
 * @returns {string}
 */
export function findReferencia(lines) {
  const fieldStrip = /\s*(Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Endere[çc]o|N[ºo°]|INSC|Data|Hora|Observa|Contato|Atendente|Locat[áa]rio).*/i;

  for (const line of lines) {
    const m = line.match(FIELD_PATTERNS.referencia[0]);
    if (m && m[1]) {
      let v = clean(m[1]);
      v = v.replace(fieldStrip, '').trim();
      v = v.replace(/[:\s/]+$/, '').trim();
      if (v.length > 0 && v.length < 120) return v;
    }
  }

  // Fallback: "Referência" at end of line
  for (const line of lines) {
    const m = line.match(/(.+)\s+Refer[êe]ncia\s*[:=]?\s*(.*)/i);
    if (m) {
      const after = clean(m[2]);
      if (after.length > 0 && after.length < 120) return after;
    }
  }
  return '';
}

/**
 * Find local de entrega
 * @param {string[]} lines
 * @returns {string}
 */
export function findLocalEntrega(lines) {
  const stripPattern = /\s*(Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Refer[êe]ncia).*/i;

  for (const line of lines) {
    const m = line.match(FIELD_PATTERNS.localEntrega[0]);
    if (m && m[1]) {
      let v = clean(m[1]);
      v = v.replace(stripPattern, '').trim();
      if (v.length > 0) return v;
    }
  }
  return '';
}

/**
 * Find telefone de entrega
 * @param {string[]} lines
 * @returns {string}
 */
export function findTelefoneEntrega(lines) {
  // Pattern 1: "Telefone do local de entrega"
  for (const line of lines) {
    const m = line.match(FIELD_PATTERNS.telefoneEntrega[0]);
    if (m && m[1]) return clean(m[1]);
  }

  // Pattern 2: "Fone:" after "Local da obra"
  let foundLocal = false;
  for (const line of lines) {
    if (/Local\s+(?:da\s+)?(?:entrega|obra)/i.test(line)) foundLocal = true;
    if (foundLocal) {
      const m = line.match(/Fone\s*:\s*([\d\s().-]+)/i);
      if (m && m[1]) return clean(m[1]);
    }
  }

  // Pattern 3: "Fone do local"
  for (const line of lines) {
    const m = line.match(FIELD_PATTERNS.telefoneEntrega[1]);
    if (m && m[1]) return clean(m[1]);
  }

  return '';
}

/**
 * Find CEP from candidates with priority logic
 * @param {string[]} lines
 * @returns {{ cep: string, candidates: Array }}
 */
export function findCEP(lines) {
  const candidates = [];

  for (const line of lines) {
    const cepEstadoM = line.match(/Estado\s*:\s*[A-Z]{2}\s*CEP\s*:?\s*([\d.-]+)/i);
    if (cepEstadoM) candidates.push({ cep: cepEstadoM[1], context: 'estado' });

    const cepM = line.match(FIELD_PATTERNS.cep[0]);
    if (cepM && cepM[1]) candidates.push({ cep: cepM[1], context: 'cep' });

    if (/Bairro\s*:/i.test(line)) candidates.push({ cep: '', context: 'bairro' });
  }

  if (candidates.length === 0) return { cep: '', candidates };

  // Prefer last CEP near bairro context
  const clientCeps = candidates.filter(c => c.cep && (c.context === 'cep' || c.context === 'bairro'));
  if (clientCeps.length > 0) {
    return { cep: clientCeps[clientCeps.length - 1].cep, candidates };
  }
  if (candidates[candidates.length - 1].cep) {
    return { cep: candidates[candidates.length - 1].cep, candidates };
  }
  return { cep: '', candidates };
}

/**
 * Find date and time
 * @param {string[]} lines
 * @param {string} [searchPattern]
 * @returns {{ data: string, hora: string }}
 */
export function findDateTime(lines, searchPattern = null) {
  const pattern = searchPattern || /Data\s*:.*Hora/i;

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      // Try same line first
      const sameLineMatch = lines[i].match(FIELD_PATTERNS.dataHora[0]);
      if (sameLineMatch) {
        return { data: sameLineMatch[1], hora: sameLineMatch[2] };
      }

      // Search nearby lines
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        const dm = lines[j].match(FIELD_PATTERNS.dataHora[0]);
        if (dm) return { data: dm[1], hora: dm[2] };
      }
      break;
    }
  }
  return { data: '', hora: '' };
}

/**
 * Detect devolucao conditions from lines
 * @param {string[]} lines
 * @returns {{ danificado: boolean, extraviado: boolean, testarEmpresa: boolean }}
 */
export function findDevolucaoConditions(lines) {
  const conditions = { danificado: false, extraviado: false, testarEmpresa: false };

  for (const line of lines) {
    if (DEVOLUCAO_CONDITIONS.danificado.test(line)) conditions.danificado = true;
    if (DEVOLUCAO_CONDITIONS.extraviado.test(line)) conditions.extraviado = true;
    if (DEVOLUCAO_CONDITIONS.testarEmpresa.test(line)) conditions.testarEmpresa = true;
  }

  return conditions;
}

/**
 * Extract all fields from lines
 * @param {string[]} lines
 * @returns {Object}
 */
export function extractAllFields(lines) {
  const tipo = detectDocumentType(lines);
  const contrato = findContractNumber(lines);
  const numero = findAddressNumber(lines);
  const { cep } = findCEP(lines);

  const stripEndereco = /\s*N[ºo°]\s*:.*/i;
  const stripCidade = /\s*(Estado|CEP|Telefone|Fone|N[ºo°]|INSC).*/i;
  const stripBairro = /\s*(Cidade|Estado|CEP|Telefone|Fone).*/i;
  const stripLocatario = /\s*(?:CNPJ|CPF|RG|Telefone|Fone|Cidade|Estado|CEP|Endere[çc]o|INSC).*/i;

  const fields = {
    tipo_documento: tipo,
    contrato,
    numero,
    atendente: findFirstMatch(lines, FIELD_PATTERNS.atendente),
    locatario: findFirstMatch(lines, FIELD_PATTERNS.locatario, { stripAfter: stripLocatario }),
    contato_cliente: findContato(lines),
    cpf_cnpj: findFirstMatch(lines, FIELD_PATTERNS.cpfCnpj),
    rg: findFirstMatch(lines, FIELD_PATTERNS.rg, { maxLength: 30 }),
    telefone: findFirstMatch(lines, FIELD_PATTERNS.telefone),
    endereco: findFirstMatch(lines, FIELD_PATTERNS.endereco, { stripAfter: stripEndereco }),
    bairro: '',
    cidade: findFirstMatch(lines, FIELD_PATTERNS.cidade, { stripAfter: stripCidade }),
    estado: findFirstMatch(lines, FIELD_PATTERNS.estado, { maxLength: 5 }),
    cep,
    local_entrega: findLocalEntrega(lines),
    telefone_entrega: findTelefoneEntrega(lines),
    referencia: findReferencia(lines),
    data_retirada: '',
    data_devolucao: '',
    hora: '',
    observacao: findFirstMatch(lines, FIELD_PATTERNS.observacao),
  };

  // Bairro with next-line continuation
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FIELD_PATTERNS.bairro[0]);
    if (m && m[1] && !fields.bairro) {
      let v = clean(m[1]);
      v = v.replace(stripBairro, '').trim();

      // Check if next line continues the bairro name
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const skipNext = /^(Cidade|Estado|CEP|Telefone|Fone|Endere|Data|Hora|Contato|Refer|Locat|Atend|Bairro|N[ºo°]|COMPROVANTE|EQUILOC|TRANS)/i;
        if (nextLine.trim().length > 0 && !skipNext.test(nextLine)) {
          const nextClean = clean(nextLine);
          if (nextClean.length > 0 && nextClean.length < 40) {
            v = v + ' ' + nextClean;
          }
        }
      }

      if (v.length > 0 && v.length < 80) fields.bairro = v;
    }
  }

  // Date/time
  if (tipo === 'devolucao') {
    // Devolucao: search for "COMPROVANTE DE DEVOLUÇÃO" first
    const devDateTime = findDateTime(lines, /COMPROVANTE\s+DE\s+DEVOLU[ÇC][ÃA]O/i);
    if (devDateTime.data) {
      fields.data_devolucao = devDateTime.data;
      fields.hora = devDateTime.hora;
    } else {
      const fallback = findDateTime(lines);
      fields.data_devolucao = fallback.data;
      fields.hora = fallback.hora;
    }

    // Devolucao conditions
    const conditions = findDevolucaoConditions(lines);
    fields.condicoes = conditions;
    fields.danificado = conditions.danificado;
    fields.extraviado = conditions.extraviado;
    fields.testarEmpresa = conditions.testarEmpresa;
  } else {
    const dt = findDateTime(lines);
    fields.data_retirada = dt.data;
    fields.hora = dt.hora;
  }

  return fields;
}
