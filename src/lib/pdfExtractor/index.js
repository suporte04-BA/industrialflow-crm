// ============================================
// PDF Extraction API
// Professional-grade document parsing module
// ============================================

import { extractTextFromPDF, deduplicatePages } from './textExtractor.js';
import { extractAllFields } from './fieldExtractor.js';
import { extractEntregaItems, extractDevolucaoItems, extractEquipamentos, calcTotalFromItens } from './itemExtractor.js';
import { validateAndNormalize } from './validators.js';

/**
 * Parse a comprovante PDF and extract all fields
 * @param {File} file - PDF file
 * @returns {Promise<{ rawText: string, parsed: Object, validation: Object }>}
 */
export async function parseComprovantePDF(file) {
  // Step 1: Extract text from PDF
  const { text, lines } = await extractTextFromPDF(file);

  // Step 2: Deduplicate pages
  const dedupedLines = deduplicatePages(lines);

  // Step 3: Detect document type and extract fields
  const fields = extractAllFields(dedupedLines);

  // Step 4: Extract items based on document type
  const isDevolucao = fields.tipo_documento === 'devolucao';
  const items = isDevolucao
    ? extractDevolucaoItems(dedupedLines)
    : extractEntregaItems(dedupedLines);

  // Step 5: Build final parsed object
  const parsed = {
    // Identifiers
    numero_pedido: fields.contrato,
    contrato: fields.contrato,

    // Person data
    atendente: fields.atendente,
    locatario: fields.locatario,
    contato: fields.contato_cliente,
    contato_cliente: fields.contato_cliente,
    cpf_cnpj: fields.cpf_cnpj,
    rg: fields.rg,
    telefone: fields.telefone,

    // Address
    endereco: fields.endereco,
    numero: fields.numero,
    bairro: fields.bairro,
    cidade: fields.cidade,
    estado: fields.estado,
    cep: fields.cep,
    referencia: fields.referencia,

    // Delivery
    local_entrega: fields.local_entrega,
    telefone_entrega: fields.telefone_entrega,

    // Dates
    data_retirada: fields.data_retirada || fields.data_devolucao,
    data_devolucao: fields.data_devolucao || fields.data_retirada,
    hora: fields.hora,

    // Items and equipment
    itens: items,
    equipamentos: extractEquipamentos(items),
    valores: isDevolucao
      ? { subtotal: 0, desconto: 0, frete: 0, total: 0 }
      : calcTotalFromItens(items),

    // Document type
    tipo_documento: fields.tipo_documento,

    // Devolucao-specific
    condicoes: isDevolucao
      ? {
          danificado: fields.danificado || false,
          extraviado: fields.extraviado || false,
          testarEmpresa: fields.testarEmpresa || false,
        }
      : { danificado: false, extraviado: false, testarEmpresa: false },

    // Notes
    observacao: fields.observacao,
  };

  // Step 6: Validate and normalize
  const validation = validateAndNormalize(parsed);

  return {
    rawText: text,
    parsed: validation.normalized,
    validation,
  };
}

/**
 * Export for backward compatibility
 */
export { extractTextFromPDF } from './textExtractor.js';
