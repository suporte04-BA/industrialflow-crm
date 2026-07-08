// ============================================
// Field Validation & Normalization
// ============================================

/**
 * Validate CPF (Brazilian individual taxpayer ID)
 * @param {string} cpf
 * @returns {boolean}
 */
export function isValidCPF(cpf) {
  if (!cpf) return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits.charAt(10))) return false;

  return true;
}

/**
 * Validate CNPJ (Brazilian company taxpayer ID)
 * @param {string} cnpj
 * @returns {boolean}
 */
export function isValidCNPJ(cnpj) {
  if (!cnpj) return false;
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const d1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits.charAt(12)) !== d1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const d2 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits.charAt(13)) !== d2) return false;

  return true;
}

/**
 * Detect document type from value
 * @param {string} value
 * @returns {'cpf'|'cnpj'}
 */
export function detectDocumentTypeFromValue(value) {
  if (!value) return 'cpf';
  const digits = value.replace(/\D/g, '');
  return digits.length <= 11 ? 'cpf' : 'cnpj';
}

/**
 * Format CPF: 52998224725 -> 529.982.247-25
 * @param {string} value
 * @returns {string}
 */
export function formatCPF(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Format CNPJ: 30652566000169 -> 30.652.566/0001-69
 * @param {string} value
 * @returns {string}
 */
export function formatCNPJ(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Format CPF or CNPJ based on digit count
 * @param {string} value
 * @returns {string}
 */
export function formatCPFCNPJ(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) return formatCPF(value);
  return formatCNPJ(value);
}

/**
 * Normalize a CEP value
 * @param {string} cep
 * @returns {string}
 */
export function normalizeCEP(cep) {
  if (!cep) return '';
  const digits = cep.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return cep;
}

/**
 * Normalize a phone value
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Validate and normalize all extracted fields
 * @param {Object} fields
 * @returns {{ valid: boolean, warnings: string[], normalized: Object }}
 */
export function validateAndNormalize(fields) {
  const warnings = [];
  const normalized = { ...fields };

  // CPF/CNPJ validation
  if (normalized.cpf_cnpj) {
    const type = detectDocumentTypeFromValue(normalized.cpf_cnpj);
    if (type === 'cpf' && !isValidCPF(normalized.cpf_cnpj)) {
      warnings.push('CPF invalido, verifique manualmente');
    } else if (type === 'cnpj' && !isValidCNPJ(normalized.cpf_cnpj)) {
      warnings.push('CNPJ invalido, verifique manualmente');
    }
    normalized.cpf_cnpj = formatCPFCNPJ(normalized.cpf_cnpj);
  }

  // CEP normalization
  if (normalized.cep) {
    normalized.cep = normalizeCEP(normalized.cep);
  }

  // Phone normalization
  if (normalized.telefone) {
    normalized.telefone = normalizePhone(normalized.telefone);
  }
  if (normalized.telefone_entrega) {
    normalized.telefone_entrega = normalizePhone(normalized.telefone_entrega);
  }

  // Required field check
  const required = ['contrato', 'locatario', 'endereco', 'cidade', 'estado'];
  for (const field of required) {
    if (!normalized[field] || normalized[field].length === 0) {
      warnings.push(`Campo obrigatorio nao encontrado: ${field}`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    normalized,
  };
}
