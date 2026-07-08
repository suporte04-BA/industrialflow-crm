// ============================================
// Item Line Extraction Engine
// Parses item lines from delivery/return documents
// ============================================

import { JUNK_PATTERNS, SKIP_LINE_PATTERNS } from './constants.js';

/**
 * Parse a numeric value from Brazilian format (1.500,50 -> 1500.50)
 * @param {string} str
 * @returns {number}
 */
function parseValue(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Check if a line should be skipped
 * @param {string} line
 * @param {RegExp[]} [extraPatterns]
 * @returns {boolean}
 */
function shouldSkipLine(line, extraPatterns = []) {
  if (/^\s*$/.test(line)) return true;
  if (JUNK_PATTERNS.test(line)) return true;
  for (const pattern of [...SKIP_LINE_PATTERNS, ...extraPatterns]) {
    if (pattern.test(line)) return true;
  }
  return false;
}

/**
 * Parse an item line from entrega document
 * Format: [qty] DESCRIPTION [patrim] [dates] [R$ value]
 * @param {string} line
 * @returns {Object|null}
 */
export function parseEntregaItemLine(line) {
  const datePattern = /(\d{2}\/\d{2}\/\d{2,4})/g;
  const valuePattern = /R\$\s*([\d.,]+)/;

  // Extract value
  const valMatch = line.match(valuePattern);
  const valor = valMatch ? parseValue(valMatch[1]) : 0;

  // Extract dates
  const dates = [];
  let dm;
  while ((dm = datePattern.exec(line)) !== null) dates.push(dm[1]);

  // Extract quantity (first number at start of line)
  const qtyMatch = line.match(/(?:^|\s)(\d{1,3})\s+/);
  const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  // Extract patrimônio (6-10 digit number)
  let patrimMatch = line.match(/\b(\d{6,10})\b/);
  if (!patrimMatch) patrimMatch = line.match(/(?:Patrim\.?|PATRIM\.?)\s*(\d+)/i);
  const patrimonio = patrimMatch ? patrimMatch[1] : '';

  // Clean description: remove all extracted data
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

/**
 * Parse an item line from devolucao document
 * Format: ( ) qty - DESCRIPTION [patrim] [QUANTIDADE FALTANTE]
 * @param {string} line
 * @returns {Object|null}
 */
export function parseDevolucaoItemLine(line) {
  const cleaned = line.replace(/\(\s*\)\s*/, '').trim();

  const qtyMatch = cleaned.match(/^(\d{1,3})\s*[-–]\s*/);
  const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  const rest = qtyMatch ? cleaned.substring(qtyMatch[0].length) : cleaned;

  // Extract patrimônio
  let patrimonio = '';
  const patrimMatch = rest.match(/\b(\d{6,10})\b/);
  if (patrimMatch) patrimonio = patrimMatch[1];

  // Clean description
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

/**
 * Extract items from lines for entrega documents
 * @param {string[]} lines
 * @returns {Object[]}
 */
export function extractEntregaItems(lines) {
  const items = [];
  const seen = new Set();

  for (const line of lines) {
    if (shouldSkipLine(line)) continue;

    const item = parseEntregaItemLine(line);
    if (item) {
      const key = item.descricao.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Extract items from lines for devolucao documents
 * @param {string[]} lines
 * @returns {Object[]}
 */
export function extractDevolucaoItems(lines) {
  const items = [];
  const seen = new Set();

  // Primary: look for checkbox pattern "( ) qty -"
  for (const line of lines) {
    if (/\(\s*\)\s*\d+\s*[-–]/.test(line)) {
      const item = parseDevolucaoItemLine(line);
      if (item) {
        const key = item.descricao.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      }
    }
  }

  // Fallback: try general item parsing if no checkbox items found
  if (items.length === 0) {
    for (const line of lines) {
      if (shouldSkipLine(line, [/ASSINATURA|RESPONSÁVEL|CPF\s+DO/i])) continue;
      if (line.trim().length < 5) continue;

      const item = parseDevolucaoItemLine(line);
      if (item) {
        const key = item.descricao.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      }
    }
  }

  return items;
}

/**
 * Extract equipment names from items
 * @param {Object[]} items
 * @returns {string[]}
 */
export function extractEquipamentos(items) {
  const equipamentos = [];
  for (const item of items) {
    const desc = item.descricao;
    if (desc && desc.length > 2 && !equipamentos.includes(desc)) {
      equipamentos.push(desc);
    }
  }
  return equipamentos;
}

/**
 * Calculate total from items
 * @param {Object[]} items
 * @returns {{ subtotal: number, desconto: number, frete: number, total: number }}
 */
export function calcTotalFromItens(items) {
  let total = 0;
  for (const item of items) {
    total += (item.quantidade || 1) * (item.valor_unitario || 0);
  }
  return { subtotal: total, desconto: 0, frete: 0, total };
}
