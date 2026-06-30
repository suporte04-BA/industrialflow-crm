// ============================================
// PDF Import - Backward Compatibility Layer
// Delegates to pdfExtractor module
// ============================================

import { parseComprovantePDF, extractTextFromPDF } from './pdfExtractor/index.js';

/**
 * Parse comprovante PDF (backward compatible)
 * @param {File} file
 * @returns {Promise<{ rawText: string, parsed: Object }>}
 */
export async function parseComprovantePDFLegacy(file) {
  const result = await parseComprovantePDF(file);
  return { rawText: result.rawText, parsed: result.parsed };
}

/**
 * Import PDF and return parsed fields (backward compatible)
 * @param {File} file
 * @returns {Promise<Object>}
 */
export async function importarPDF(file) {
  const { parsed } = await parseComprovantePDF(file);
  return parsed;
}

export { extractTextFromPDF };
