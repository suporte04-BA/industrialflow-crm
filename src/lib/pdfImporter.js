import { extractTextFromPDF } from './pdfParser';

const FIELD_PATTERNS = {
  contrato: /(?:contrato\s*n[ºo°.]?\s*)([\d.\-/\w]+)/i,
  data: /(\d{2}[/-]\d{2}[/-]\d{4})/,
  hora: /(\d{1,2}:\d{2})/,
  atendente: /(?:atendente|atend\.?\s*[:;]?\s*)(.+?)(?:\n|$)/i,
  locatario: /(?:locat[aá]rio|cliente|nome\s*[:;]?\s*)(.+?)(?:\n|$)/i,
  cpf: /(?:cpf\s*[:;]?\s*)(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
  rg: /(?:rg\s*[:;]?\s*)([\d.\-xX]{7,15})/i,
  fone: /(?:tel(?:efone)?|fone|celular)\s*[:;]?\s*(\(?[\d\s]{2}\)?\s*\d{4,5}-?\d{4})/i,
  contato: /(?:contato)\s*[:;]?\s*(.+?)(?:\n|$)/i,
  endereco: /(?:endere[cç]o|rua|av\.|avenida)\s*[:;]?\s*(.+?)(?:\n|$)/i,
  numero: /(?:n[uú]mero|nº|n\.)\s*[:;]?\s*(\d+)/i,
  bairro: /(?:bairro)\s*[:;]?\s*(.+?)(?:\n|$)/i,
  cidade: /(?:cidade)\s*[:;]?\s*(.+?)(?:\n|$)/i,
  estado: /(?:estado|uf)\s*[:;]?\s*([a-zA-Z]{2})/i,
  cep: /(?:cep\s*[:;]?\s*)(\d{5}-?\d{3})/i,
  localEntrega: /(?:local\s*(?:de\s*)?entrega)\s*[:;]?\s*(.+?)(?:\n|$)/i,
  telefoneEntrega: /(?:tel(?:efone)?\s*(?:de\s*)?entrega)\s*[:;]?\s*(.+?)(?:\n|$)/i,
  observacao: /(?:observa[cç][aã]o|obs\.?)\s*[:;]?\s*(.+?)(?:\n|$)/i,
};

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match?.[1]?.trim() || '';
}

export function extractFields(text) {
  const fields = {};
  for (const [key, pattern] of Object.entries(FIELD_PATTERNS)) {
    fields[key] = matchFirst(text, pattern);
  }
  return fields;
}

export async function importarPDF(file) {
  const text = await extractTextFromPDF(file);
  const fields = extractFields(text);
  return fields;
}
