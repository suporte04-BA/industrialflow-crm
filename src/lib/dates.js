/**
 * Date utilities for TransObra CRM
 * All dates in DD/MM/AAAA format (Brazilian standard)
 */

/**
 * Parse any date value to a Date object
 * Accepts: 'YYYY-MM-DD', 'DD/MM/AAAA', 'MM/DD/YYYY', Date object, timestamp
 */
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const str = String(value).trim();
  if (!str || str === '-' || str === 'undefined' || str === 'null') return null;

  // ISO datetime: YYYY-MM-DDTHH:MM:SSZ or similar
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const dt = new Date(str);
    return !isNaN(dt.getTime()) ? dt : null;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return !isNaN(dt.getTime()) ? dt : null;
  }

  // DD/MM/YYYY or DD/MM/AAAA
  const m = str.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) {
    const [, d, mon, y] = m.map(Number);
    const dt = new Date(y, mon - 1, d);
    return !isNaN(dt.getTime()) ? dt : null;
  }

  return null;
}

/**
 * Format date to DD/MM/AAAA
 * @param {string|Date|number} date
 * @returns {string} formatted date or '-'
 */
export function formatDateBR(date) {
  const d = parseDate(date);
  if (!d) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Validate DD/MM/AAAA format
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDateBR(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [, d, mon, y] = m.map(Number);
  if (d < 1 || d > 31) return false;
  if (mon < 1 || mon > 12) return false;
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(y, mon - 1, d);
  return dt.getDate() === d && dt.getMonth() === mon - 1 && dt.getFullYear() === y;
}

/**
 * Convert YYYY-MM-DD to DD/MM/AAAA
 */
export function toBR(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '-';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Convert DD/MM/AAAA to YYYY-MM-DD
 */
export function toISO(brDate) {
  if (!brDate || typeof brDate !== 'string') return null;
  const parts = brDate.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Format date to "DD de mês de AAAA" (ex: 15 de abril de 2026)
 */
export function formatDateLong(date) {
  const d = parseDate(date);
  if (!d) return '-';
  const months = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Days remaining until a date (negative = past)
 */
export function daysUntil(date) {
  const d = parseDate(date);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}
