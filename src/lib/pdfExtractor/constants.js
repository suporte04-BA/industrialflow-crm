// ============================================
// PDF Extraction Constants & Patterns
// ============================================

export const FIELD_PATTERNS = {
  contrato: [
    /CONTRATO\s*N[ºo°]\s*[:\s]+(\S+)/i,
    /^(\d{3,}\s*\/\s*\d{2,4})\s*$/,
  ],
  endereco: [
    /Endere[çc]o\s*:\s*(.+)/i,
  ],
  numeroEndereco: [
    /N[ºo°]\s*:\s*(\d{1,5})/i,
  ],
  bairro: [
    /Bairro\s*:\s*(.+)/i,
  ],
  cidade: [
    /Cidade\s*:\s*([A-Za-zÀ-ú\s-]+)/i,
  ],
  estado: [
    /Estado\s*:\s*([A-Z]{2})/i,
  ],
  cep: [
    /CEP\s*:?\s*([\d]{5}[\s.-]?[\d]{3})/i,
    /CEP\s+([\d]{5}[\s.-]?[\d]{3})/i,
  ],
  locatario: [
    /Locat[áa]rio\s*:\s*(.+)/i,
  ],
  cpfCnpj: [
    /CNPJ\s*:\s*([\d./-]+)/i,
    /CPF\s*:\s*([\d.-]+)/i,
  ],
  rg: [
    /RG\s*:\s*([\d.]+)/i,
  ],
  contato: [
    /Contato\s*:\s*(.+)/i,
  ],
  atendente: [
    /Atendente\s*:\s*(.+)/i,
  ],
  telefone: [
    /(?:^|\s)Fone\s*:\s*([\d\s().-]+)/i,
    /Telefone\s*:\s*([\d\s().-]+)\s*(?:(?:Fone|CNPJ|Bairro|Cidade|Estado|CEP|Endere|N[ºo°]|Data|Hora).*)?$/i,
  ],
  telefoneEntrega: [
    /Telefone\s+(?:do\s+local\s+de\s+(?:entrega|obra)|da\s+obra)\s*:\s*([\d\s().-]+)/i,
    /Fone\s+(?:do\s+local|da\s+obra)\s*:\s*([\d\s().-]+)/i,
  ],
  localEntrega: [
    /Local\s+(?:da\s+)?(?:entrega|obra)\s*:\s*(.+)/i,
  ],
  referencia: [
    /Refer[êe]ncia\s*[:=]\s*(.+)/i,
  ],
  observacao: [
    /Observa[çc][ãa]o\s*:\s*(.+)/i,
  ],
  dataHora: [
    /(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/,
  ],
};

export const JUNK_PATTERNS = new RegExp(
  'TOTAL|SUBTOTAL|DECLAR|CONTRATO|Atendente|Locat[áa]rio|Cidade\\s*:|Estado\\s*:|CEP\\s*:|Fone\\s*:|Endere[çc]o\\s*:|CNPJ\\s*:|Bairro\\s*:|Telefone\\s*:|' +
  'Contato\\s*:|Data\\s*:|Hora|Refer[êe]ncia|EQUILOC|TRANS\\s*OBRA|TARUMA|COMPROVANTE|Observa[çc]|Patrim|NOME|RG\\s*:|' +
  'LOCADORA|CIENTE|ASSINATURA|RESPONSÁVEL|CPF\\s+DO|VALOR\\s+TOTAL|ORÇAMENTO|ORCAMENTO|' +
  'Locadora\\s+entrega|MANAUS,?\\s+\\d|_{5,}|-{5,}',
  'i'
);

export const ITEM_JUNK_PATTERNS = new RegExp(
  'CONTRATO|Atendente|Locat[áa]rio|Cidade\\s*:|Estado\\s*:|CEP\\s*:|Fone\\s*:|Endere[çc]o\\s*:|CNPJ\\s*:|Bairro\\s*:|Telefone\\s*:|' +
  'Contato\\s*:|Data\\s*:|Hora|Refer[êe]ncia|MANAUS|LOCADORA|CIENTE|DANIFICADO|EXTRAVIADO|TESTADO|' +
  'COMPROVANTE|EQUILOC|TRANS\\s*OBRA|TARUMA|DECLAR|Observa[çc]|Patrim|NOME|RG\\s*:',
  'i'
);

export const DEVOLUCAO_CONDITIONS = {
  danificado: /DANIFICADO/i,
  extraviado: /EXTRAVIADO/i,
  testarEmpresa: /TESTADO\s+NA\s+EMPRESA/i,
};

export const DOCUMENT_TYPE_PATTERN = /DEVOLU[ÇC][ÃA]O/i;

export const SKIP_LINE_PATTERNS = [
  /^Qtde\s+Descri/i,
  /^DLoc\s+DDev/i,
  /^\s*$/,
  /^_{5,}/,
  /^-{5,}/,
  /MANAUS,?\s+\d/i,
  /ORÇAMENTO|ORCAMENTO/i,
  /Locadora\s+entrega/i,
  /^\d{2}\/\d{2}\/\d{4}/,
  /CONTRATO\s*N/i,
  /\(\s*\)\s*\d+\s*[-–]/,
  /QUANTIDADE\s+FALTANTE/i,
];
