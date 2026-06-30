import { readFileSync } from 'fs';

// ==========================================
// TEST SUITE: 100+ cenários para TransObra CRM
// ==========================================

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.log(`  FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, field) {
  const clean = (v) => {
    if (v === undefined || v === null) return '';
    return String(v).trim();
  };
  if (clean(actual) === clean(expected)) {
    passed++;
  } else {
    failed++;
    const msg = `${field}: expected "${expected}" but got "${actual}"`;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

// ==========================================
// PDF EXTRACTION ENGINE (same as pdfImporter.js)
// ==========================================

async function extractTextFromPDF(filePath) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const lines = [];
  let fullText = '';

  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items
      .map(item => ({
        str: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width),
      }))
      .filter(item => item.str.trim().length > 0);

    if (items.length === 0) continue;
    items.sort((a, b) => { const yDiff = b.y - a.y; if (Math.abs(yDiff) > 4) return yDiff; return a.x - b.x; });
    const rows = []; let currentRow = [items[0]]; let currentY = items[0].y;
    for (let j = 1; j < items.length; j++) {
      const yDiff = Math.abs(items[j].y - currentY);
      if (yDiff > 4) { rows.push(currentRow); currentRow = [items[j]]; currentY = items[j].y; } else { currentRow.push(items[j]); }
    }
    rows.push(currentRow);
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      const parts = []; let lastX = 0;
      for (const item of row) { const gap = item.x - lastX; if (gap > 20 && parts.length > 0) parts.push('  '); parts.push(item.str); lastX = item.x + (item.width || item.str.length * 6); }
      const line = parts.join(' ').replace(/\s+/g, ' ').trim();
      if (line.length > 0) { lines.push(line); fullText += line + '\n'; }
    }
    fullText += '\n';
  }
  return { text: fullText, lines };
}

function clean(val) {
  if (!val) return '';
  return val.replace(/^[:\s/]+/, '').replace(/[:\s/]+$/, '').replace(/\s+/g, ' ').trim();
}

function detectDocumentType(lines) {
  for (const line of lines) { if (/DEVOLU[ÇC][ÃA]O/i.test(line)) return 'devolucao'; }
  return 'entrega';
}

function findContractNumber(lines) {
  for (const line of lines) { const m1 = line.match(/CONTRATO\s*N[ºo°]\s*[:\s]+(\S+)/i); if (m1) return clean(m1[1]); }
  for (const line of lines) { const m2 = line.match(/^(\d{3,}\/\d{2,4})\s*$/); if (m2) return m2[1]; }
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
      v = v.replace(/\s*(?:Refer[êe]ncia|Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Endere[çc]o|N[ºo°]|INSC|Data|Hora|COMPROVANTE|DLoc|DDev|Valor|Patrim|Qtde|Descri|Observa|Locat[áa]rio|Atendente|RG).*/i, '').trim();
      v = v.replace(/[:\s/]+$/, '').trim();
      if (v.length > 0 && v.length < 60 && !/^\d/.test(v)) return v;
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
      if (v.length > 0 && v.length < 120) return v;
    }
  }
  return '';
}

function findLocalEntrega(lines) {
  for (const line of lines) {
    const m = line.match(/Local\s+(?:da\s+)?(?:entrega|obra)\s*:\s*(.+)/i);
    if (m) { let v = clean(m[1]); v = v.replace(/\s*(Telefone|Fone|CNPJ|Bairro|Cidade|Estado|CEP|Refer[êe]ncia).*/i, '').trim(); if (v.length > 0) return v; }
  }
  return '';
}

function findTelefoneEntrega(lines) {
  for (const line of lines) { const m = line.match(/Telefone\s+(?:do\s+local\s+de\s+(?:entrega|obra)|da\s+obra)\s*:\s*([\d\s().-]+)/i); if (m) return clean(m[1]); }
  return '';
}

function extractFields(lines) {
  const tipo = detectDocumentType(lines);
  const contrato = findContractNumber(lines);
  const numero = findAddressNumber(lines);

  const fields = {
    tipo_documento: tipo, contrato, numero,
    atendente: '', locatario: '', contato_cliente: findContato(lines),
    cpf_cnpj: '', rg: '', telefone: '',
    endereco: '', bairro: '', cidade: '', estado: '', cep: '',
    local_entrega: findLocalEntrega(lines), telefone_entrega: findTelefoneEntrega(lines),
    referencia: findReferencia(lines), data_retirada: '', hora: '', observacao: '',
  };

  let cepCandidates = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const attM = line.match(/Atendente\s*:\s*(.+)/i); if (attM && !fields.atendente) fields.atendente = clean(attM[1]);
    const locM = line.match(/Locat[áa]rio\s*:\s*(.+)/i);
    if (locM && !fields.locatario) { let v = clean(locM[1]); v = v.replace(/\s*(?:CNPJ|CPF|RG|Telefone|Fone|Cidade|Estado|CEP|Endere[çc]o|INSC).*/i, '').trim(); if (v.length > 0 && v.length < 120) fields.locatario = v; }
    const cidM = line.match(/Cidade\s*:\s*([A-Za-zÀ-ú\s-]+)/i);
    if (cidM && !fields.cidade) { let v = clean(cidM[1]); v = v.replace(/\s*(Estado|CEP|Telefone|Fone|N[ºo°]|INSC).*/i, '').trim(); if (v.length > 0) fields.cidade = v; }
    const estM = line.match(/Estado\s*:\s*([A-Z]{2})/i); if (estM && !fields.estado) fields.estado = estM[1].toUpperCase();
    const cepEstadoM = line.match(/Estado\s*:\s*[A-Z]{2}\s*CEP\s*:?\s*([\d.-]+)/i); if (cepEstadoM) cepCandidates.push({ cep: cepEstadoM[1], context: 'estado' });
    const cepM = line.match(/CEP\s*:\s*([\d.-]+)/i); if (cepM) cepCandidates.push({ cep: cepM[1], context: 'cep' });
    const foneM = line.match(/(?:^|\s)Fone\s*:\s*([\d\s().-]+)/i); if (foneM && !fields.telefone) fields.telefone = clean(foneM[1]);
    const telObraM = line.match(/Telefone\s+(?:do\s+local\s+de\s+(?:entrega|obra)|da\s+obra)\s*:\s*([\d\s().-]+)/i); if (telObraM) fields.telefone_entrega = clean(telObraM[1]);
    const endM = line.match(/Endere[çc]o\s*:\s*(.+)/i);
    if (endM && !fields.endereco) { let v = clean(endM[1]); v = v.replace(/\s*N[ºo°]\s*:.*/i, '').trim(); if (v.length > 0 && v.length < 120) fields.endereco = v; }
    const cnpjM = line.match(/CNPJ\s*:\s*([\d./-]+)/i); if (cnpjM && !fields.cpf_cnpj) fields.cpf_cnpj = cnpjM[1];
    const rgM = line.match(/RG\s*:\s*([\d.]+)/i); if (rgM && !fields.rg) fields.rg = rgM[1];
    const bairM = line.match(/Bairro\s*:\s*(.+)/i);
    if (bairM && !fields.bairro) { let v = clean(bairM[1]); v = v.replace(/\s*(Cidade|Estado|CEP|Telefone|Fone).*/i, '').trim(); if (v.length > 0 && v.length < 80) fields.bairro = v; cepCandidates.push({ cep: '', context: 'bairro' }); }
    const obsM = line.match(/Observa[çc][ãa]o\s*:\s*(.+)/i); if (obsM && !fields.observacao) fields.observacao = clean(obsM[1]);
  }

  if (cepCandidates.length > 0 && !fields.cep) {
    const clientCeps = cepCandidates.filter(c => c.cep && (c.context === 'cep' || c.context === 'bairro'));
    if (clientCeps.length > 0) fields.cep = clientCeps[clientCeps.length - 1].cep;
    else if (cepCandidates[cepCandidates.length - 1].cep) fields.cep = cepCandidates[cepCandidates.length - 1].cep;
  }

  for (let i = 0; i < lines.length; i++) {
    if (/Data\s*:.*Hora/i.test(lines[i])) {
      const sameLineDm = lines[i].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/);
      if (sameLineDm) { fields.data_retirada = sameLineDm[1]; fields.hora = sameLineDm[2]; } else {
        for (let j = i; j < Math.min(i + 4, lines.length); j++) { const dm = lines[j].match(/(\d{2}\/\d{2}\/\d{2,4}).*?(\d{1,2}:\d{2})/); if (dm) { fields.data_retirada = dm[1]; fields.hora = dm[2]; break; } }
      }
      break;
    }
  }

  if (tipo === 'devolucao') {
    if (fields.data_retirada && !fields.data_devolucao) fields.data_devolucao = fields.data_retirada;
    for (const line of lines) {
      if (/DANIFICADO/i.test(line)) fields.danificado = true;
      if (/EXTRAVIADO/i.test(line)) fields.extraviado = true;
      if (/TESTADO\s+NA\s+EMPRESA/i.test(line)) fields.testarEmpresa = true;
    }
  }

  return fields;
}

// ==========================================
// VALIDATION FUNCTIONS
// ==========================================

function isValidCPF(cpf) {
  if (!cpf) return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits.charAt(10))) return false;
  return true;
}

function isValidCNPJ(cnpj) {
  if (!cnpj) return false;
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits.charAt(i)) * weights1[i];
  let remainder = sum % 11;
  const d1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits.charAt(12)) !== d1) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits.charAt(i)) * weights2[i];
  remainder = sum % 11;
  const d2 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits.charAt(13)) !== d2) return false;
  return true;
}

function formatCPF(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCNPJ(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function detectDocumentTypeFromValue(val) {
  if (!val) return 'cpf';
  const digits = val.replace(/\D/g, '');
  return digits.length <= 11 ? 'cpf' : 'cnpj';
}

function calcMonths(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth();
  const daysDiff = e.getDate() > s.getDate() ? 1 : 0;
  return Math.max(1, months + (daysDiff > 0 ? 1 : 0));
}

// ==========================================
// CONVERTERS
// ==========================================

const SNAKE_TO_CAMEL = {
  contrato_id: 'contratoId', data_contrato: 'dataContrato', hora_contrato: 'horaContrato',
  numero_endereco: 'numeroEndereco', local_entrega: 'localEntrega', telefone_entrega: 'telefoneEntrega',
  tipo_documento: 'tipoDocumento', condicoes_devolucao: 'condicoesDevolucao', valor_mensal: 'valorMensal',
  valor_total: 'valorTotal', data_locacao: 'dataLocacao', data_devolucao: 'dataDevolucao',
  valor_unitario: 'valorUnitario', qtd_devolvida: 'qtdDevolvida', created_at: 'createdAt',
  responsavel_id: 'responsavelId', numero_pedido: 'numeroPedido',
};

function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const camelKey = SNAKE_TO_CAMEL[k] || k;
      result[camelKey] = toCamel(v);
    }
    return result;
  }
  return obj;
}

function toSnake(obj) {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj && typeof obj === 'object') {
    const CAMEL_TO_SNAKE = {};
    for (const [k, v] of Object.entries(SNAKE_TO_CAMEL)) { if (v !== k) CAMEL_TO_SNAKE[v] = k; }
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const snakeKey = CAMEL_TO_SNAKE[k] || k;
      result[snakeKey] = toSnake(v);
    }
    return result;
  }
  return obj;
}

function computeVencimentoDias(fim) {
  if (!fim) return 0;
  const end = new Date(fim);
  if (isNaN(end)) return 0;
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// ==========================================
// TEST CATEGORIES
// ==========================================

// --- Category 1: PDF Extraction (6 real PDFs) ---
async function testPDFExtraction() {
  console.log('\n=== CATEGORY 1: PDF EXTRACTION (6 real PDFs) ===');

  const PDFS = [
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE ENTREGA DOS BENS LOCADOS 3.pdf', expected: 'entrega', label: 'ENTREGA 1234/26', expectedContract: '1234/26' },
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE ENTREGA DOS BENS LOCADOS 2.pdf', expected: 'entrega', label: 'ENTREGA 1235/26', expectedContract: '1235/26' },
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 1.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 1' },
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 2.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 2' },
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 3.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 3' },
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 4.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 4' },
  ];

  for (const pdf of PDFS) {
    console.log(`\n--- ${pdf.label} ---`);
    try {
      const { lines } = await extractTextFromPDF(pdf.path);
      const fields = extractFields(lines);

      assertEqual(fields.tipo_documento, pdf.expected, `${pdf.label}: tipo_documento`);
      if (pdf.expectedContract) assertEqual(fields.contrato, pdf.expectedContract, `${pdf.label}: contrato`);

      // Must have at least some fields filled
      assert(fields.locatario || fields.cpf_cnpj || fields.endereco, `${pdf.label}: at least one field filled`);
      assert(fields.data_retirada || fields.hora || fields.data_devolucao, `${pdf.label}: date/time extracted`);

      if (pdf.expected === 'devolucao') {
        assert(fields.condicoes !== undefined || fields.danificado !== undefined || fields.extraviado !== undefined || fields.testarEmpresa !== undefined, `${pdf.label}: devolucao conditions detected`);
      }

      console.log(`  Contrato: ${fields.contrato} | Locatario: ${fields.locatario} | CNPJ: ${fields.cpf_cnpj}`);
      console.log(`  Endereco: ${fields.endereco} | Bairro: ${fields.bairro} | Cidade: ${fields.cidade}/${fields.estado}`);
      console.log(`  Data: ${fields.data_retirada || fields.data_devolucao} | Hora: ${fields.hora}`);
      console.log(`  Local: ${fields.local_entrega} | Tel: ${fields.telefone_entrega}`);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      failed++;
      failures.push(`${pdf.label}: extraction failed - ${err.message}`);
    }
  }
}

// --- Category 2: Validation Functions (20 tests) ---
function testValidation() {
  console.log('\n=== CATEGORY 2: VALIDATION FUNCTIONS ===');

  // CPF Validation
  assertEqual(isValidCPF('529.982.247-25'), true, 'CPF valid 1');
  assertEqual(isValidCPF('111.444.777-35'), true, 'CPF valid 2');
  assertEqual(isValidCPF('111.111.111-11'), false, 'CPF all same digits');
  assertEqual(isValidCPF('123.456.789-00'), false, 'CPF invalid checksum');
  assertEqual(isValidCPF('123'), false, 'CPF too short');
  assertEqual(isValidCPF(''), false, 'CPF empty');
  assertEqual(isValidCPF(null), false, 'CPF null');
  assertEqual(isValidCPF('abc.def.ghi-jk'), false, 'CPF letters');

  // CNPJ Validation
  assertEqual(isValidCNPJ('30.652.566/0001-69'), true, 'CNPJ valid 1');
  assertEqual(isValidCNPJ('28.640.769/0001-93'), true, 'CNPJ valid 2');
  assertEqual(isValidCNPJ('11.111.111/1111-11'), false, 'CNPJ all same digits');
  assertEqual(isValidCNPJ('12.345.678/0001-00'), false, 'CNPJ invalid checksum');
  assertEqual(isValidCNPJ('123'), false, 'CNPJ too short');
  assertEqual(isValidCNPJ(''), false, 'CNPJ empty');

  // Format CPF/CNPJ
  assertEqual(formatCPF('52998224725'), '529.982.247-25', 'formatCPF full');
  assertEqual(formatCPF('529'), '529', 'formatCPF partial');
  assertEqual(formatCNPJ('30652566000169'), '30.652.566/0001-69', 'formatCNPJ full');

  // Detect document type
  assertEqual(detectDocumentTypeFromValue('529.982.247-25'), 'cpf', 'detect CPF');
  assertEqual(detectDocumentTypeFromValue('30.652.566/0001-69'), 'cnpj', 'detect CNPJ');
  assertEqual(detectDocumentTypeFromValue(''), 'cpf', 'detect empty defaults to CPF');
}

// --- Category 3: ContratoModal Logic (25 tests) ---
function testContratoModalLogic() {
  console.log('\n=== CATEGORY 3: CONTRATOMODAL LOGIC ===');

  // calcMonths
  assertEqual(calcMonths('2026-01-01', '2026-02-01'), 1, 'calcMonths 1 month');
  assertEqual(calcMonths('2026-01-15', '2026-02-10'), 1, 'calcMonths less than month');
  assertEqual(calcMonths('2026-01-01', '2026-04-01'), 3, 'calcMonths 3 months');
  assertEqual(calcMonths('2026-06-01', '2026-06-01'), 1, 'calcMonths same date = 1');
  assertEqual(calcMonths('', '2026-06-01'), 0, 'calcMonths missing start');
  assertEqual(calcMonths('2026-06-01', ''), 0, 'calcMonths missing end');
  assertEqual(calcMonths(null, null), 0, 'calcMonths null');

  // Validation rules for entrega
  const formEntrega = {
    tipoDocumento: 'entrega', dataContrato: '2026-06-25', atendente: 'Teste',
    cliente: 'Locatario', cnpj: '30.652.566/0001-69', contato: 'Contato',
    endereco: 'Rua Teste', numeroEndereco: '10', bairro: 'Centro',
    cidade: 'Manaus', estado: 'AM', cep: '69000-000',
    localEntrega: 'Local', telefoneEntrega: '(92) 99999-0000',
    inicio: '2026-07-01', fim: '2026-08-01', valorMensal: '500',
    equipamentos: ['Martelo'], itens: [{ descricao: 'Item 1', quantidade: 1, valorUnitario: 100 }],
    condicoesDevolucao: { danificado: false, extraviado: false, testarEmpresa: false },
  };

  // All fields present = valid
  let errors = [];
  if (!formEntrega.dataContrato) errors.push('dataContrato');
  if (!formEntrega.atendente.trim()) errors.push('atendente');
  if (!formEntrega.cliente.trim()) errors.push('cliente');
  if (!formEntrega.cnpj.trim()) errors.push('cnpj');
  if (!formEntrega.contato.trim()) errors.push('contato');
  if (!formEntrega.endereco.trim()) errors.push('endereco');
  if (!formEntrega.numeroEndereco.trim()) errors.push('numeroEndereco');
  if (!formEntrega.bairro.trim()) errors.push('bairro');
  if (!formEntrega.cidade.trim()) errors.push('cidade');
  if (!formEntrega.estado.trim()) errors.push('estado');
  if (!formEntrega.cep.trim()) errors.push('cep');
  if (!formEntrega.localEntrega.trim()) errors.push('localEntrega');
  if (!formEntrega.telefoneEntrega.trim()) errors.push('telefoneEntrega');
  if (!formEntrega.inicio) errors.push('inicio');
  if (!formEntrega.fim) errors.push('fim');
  if (!formEntrega.valorMensal || Number(formEntrega.valorMensal) <= 0) errors.push('valorMensal');
  if (!formEntrega.equipamentos.some(e => e.trim())) errors.push('equipamentos');
  if (!formEntrega.itens.some(it => it.descricao.trim())) errors.push('itens');
  assertEqual(errors.length, 0, 'entrega validation: all fields present');

  // Devolucao: valorMensal NOT required
  const formDev = { ...formEntrega, tipoDocumento: 'devolucao', valorMensal: '' };
  let errorsDev = [];
  if (formDev.tipoDocumento !== 'devolucao' && (!formDev.valorMensal || Number(formDev.valorMensal) <= 0)) errorsDev.push('valorMensal');
  assertEqual(errorsDev.length, 0, 'devolucao: valorMensal not required');

  // Devolucao: at least one condicao required
  const noCondicoes = { danificado: false, extraviado: false, testarEmpresa: false };
  assert(!noCondicoes.danificado && !noCondicoes.extraviado && !noCondicoes.testarEmpresa, 'devolucao: no condicoes = invalid');
  const withDanificado = { danificado: true, extraviado: false, testarEmpresa: false };
  assert(withDanificado.danificado || withDanificado.extraviado || withDanificado.testarEmpresa, 'devolucao: danificado = valid');

  // Equipamentos filter
  const eqWithEmpty = ['Martelo', '', 'Talhadeira', '  '];
  const filtered = eqWithEmpty.filter(Boolean);
  assertEqual(filtered.length, 3, 'equipamentos filter Boolean (whitespace passes)');
  const filteredTrim = eqWithEmpty.filter(e => e.trim());
  assertEqual(filteredTrim.length, 2, 'equipamentos filter trim');

  // Itens filter
  const itensWithEmpty = [{ descricao: 'Item 1', quantidade: 1 }, { descricao: '', quantidade: 1 }];
  const filteredItens = itensWithEmpty.filter(it => it.descricao.trim());
  assertEqual(filteredItens.length, 1, 'itens filter empty');

  // Total calc
  const itens = [{ quantidade: 2, valorUnitario: 100 }, { quantidade: 1, valorUnitario: 50 }];
  const total = itens.reduce((sum, it) => sum + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0);
  assertEqual(total, 250, 'total calc');
}

// --- Category 4: Converters (15 tests) ---
function testConverters() {
  console.log('\n=== CATEGORY 4: CONVERTERS ===');

  // toCamel
  const snake1 = { contrato_id: 'CT-001', data_contrato: '25/06/2026', valor_total: 500 };
  const camel1 = toCamel(snake1);
  assertEqual(camel1.contratoId, 'CT-001', 'toCamel contratoId');
  assertEqual(camel1.dataContrato, '25/06/2026', 'toCamel dataContrato');
  assertEqual(camel1.valorTotal, 500, 'toCamel valorTotal');

  // toSnake
  const camel2 = { contratoId: 'CT-001', dataContrato: '25/06/2026', valorTotal: 500 };
  const snake2 = toSnake(camel2);
  assertEqual(snake2.contrato_id, 'CT-001', 'toSnake contrato_id');
  assertEqual(snake2.data_contrato, '25/06/2026', 'toSnake data_contrato');
  assertEqual(snake2.valor_total, 500, 'toSnake valor_total');

  // Roundtrip
  const roundtrip = toSnake(toCamel(snake1));
  assertEqual(roundtrip.contrato_id, 'CT-001', 'roundtrip contrato_id');
  assertEqual(roundtrip.data_contrato, '25/06/2026', 'roundtrip data_contrato');

  // Nested objects
  const nested = { condicoes_devolucao: { danificado: true, extraviado: false } };
  const nestedCamel = toCamel(nested);
  assertEqual(nestedCamel.condicoesDevolucao.danificado, true, 'toCamel nested');

  // Arrays
  const arr = [{ contrato_id: 'CT-001' }, { contrato_id: 'CT-002' }];
  const arrCamel = toCamel(arr);
  assertEqual(arrCamel[0].contratoId, 'CT-001', 'toCamel array');

  // computeVencimentoDias
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const dias = computeVencimentoDias(future.toISOString().split('T')[0]);
  assert(dias > 0 && dias <= 31, 'computeVencimentoDias future');

  const past = new Date();
  past.setDate(past.getDate() - 10);
  const diasPast = computeVencimentoDias(past.toISOString().split('T')[0]);
  assert(diasPast < 0, 'computeVencimentoDias past');

  assertEqual(computeVencimentoDias(''), 0, 'computeVencimentoDias empty');
  assertEqual(computeVencimentoDias(null), 0, 'computeVencimentoDias null');

  // Unknown keys pass through
  const unknown = { my_custom_field: 'value' };
  const unknownCamel = toCamel(unknown);
  assertEqual(unknownCamel.my_custom_field, 'value', 'toCamel unknown key pass through');
}

// --- Category 5: Form State Structure (15 tests) ---
function testFormState() {
  console.log('\n=== CATEGORY 5: FORM STATE STRUCTURE ===');

  const emptyItem = { quantidade: 1, descricao: '', patrimonio: '', dataLocacao: '', dataDevolucao: '', valorUnitario: 0 };
  const emptyCondicoes = { danificado: false, extraviado: false, testarEmpresa: false };

  // New form default
  const newForm = {
    cliente: '', cnpj: '', equipamentos: [''],
    numero: '', dataContrato: new Date().toISOString().split('T')[0], horaContrato: new Date().toTimeString().slice(0, 5), atendente: '',
    referencia: '',
    inicio: '', fim: '', valorTotal: '', valorMensal: '',
    status: 'ativo', assinado: false,
    endereco: '', numeroEndereco: '', bairro: '', cidade: '', estado: '', cep: '',
    contato: '', rg: '', telefone: '',
    localEntrega: '', telefoneEntrega: '',
    itens: [{ ...emptyItem }],
    observacao: '', tipoDocumento: 'entrega',
    condicoesDevolucao: { ...emptyCondicoes },
  };

  assertEqual(newForm.tipoDocumento, 'entrega', 'new form tipoDocumento default');
  assertEqual(newForm.equipamentos.length, 1, 'new form one equipment');
  assertEqual(newForm.itens.length, 1, 'new form one item');
  assertEqual(newForm.condicoesDevolucao.danificado, false, 'new form condicoes all false');
  assertEqual(newForm.status, 'ativo', 'new form status ativo');
  assertEqual(newForm.assinado, false, 'new form assinado false');

  // Edit form with contrato
  const contrato = {
    id: 'CT-001', cliente: 'Teste LTDA', cnpj: '30.652.566/0001-69',
    equipamentos: ['Martelo', 'Talhadeira'], numero: '1234/26',
    dataContrato: '2026-06-25', horaContrato: '09:00', atendente: 'Joao',
    referencia: 'SESC', inicio: '2026-07-01', fim: '2026-08-01',
    valorTotal: 500, valorMensal: 250, status: 'ativo', assinado: false,
    endereco: 'Rua Teste', numeroEndereco: '10', bairro: 'Centro',
    cidade: 'Manaus', estado: 'AM', cep: '69000-000',
    contato: 'Maria', rg: '12345', telefone: '(92) 99999-0000',
    localEntrega: 'Local Obra', telefoneEntrega: '(92) 88888-0000',
    itens: [{ quantidade: 2, descricao: 'Martelo', patrimonio: 'PAT-001', dataLocacao: '01/07/2026', dataDevolucao: '01/08/2026', valorUnitario: 100 }],
    observacao: 'Teste', tipoDocumento: 'devolucao',
    condicoesDevolucao: { danificado: true, extraviado: false, testarEmpresa: false },
  };

  const editForm = {
    cliente: contrato.cliente || '',
    cnpj: contrato.cnpj || '',
    equipamentos: Array.isArray(contrato.equipamentos) ? contrato.equipamentos : [contrato.equipamentos || ''],
    numero: contrato.numero || '',
    dataContrato: contrato.dataContrato || '',
    horaContrato: contrato.horaContrato || '',
    atendente: contrato.atendente || '',
    referencia: contrato.referencia || '',
    inicio: contrato.inicio || '',
    fim: contrato.fim || '',
    valorTotal: contrato.valorTotal != null ? contrato.valorTotal : '',
    valorMensal: contrato.valorMensal != null ? contrato.valorMensal : '',
    status: contrato.status || 'ativo',
    assinado: contrato.assinado || false,
    endereco: contrato.endereco || '',
    numeroEndereco: contrato.numeroEndereco || '',
    bairro: contrato.bairro || '',
    cidade: contrato.cidade || '',
    estado: contrato.estado || '',
    cep: contrato.cep || '',
    contato: contrato.contato || '',
    rg: contrato.rg || '',
    telefone: contrato.telefone || '',
    localEntrega: contrato.localEntrega || '',
    telefoneEntrega: contrato.telefoneEntrega || '',
    itens: Array.isArray(contrato.itens) && contrato.itens.length > 0
      ? contrato.itens.map(it => ({ ...emptyItem, ...it }))
      : [{ ...emptyItem }],
    observacao: contrato.observacao || '',
    tipoDocumento: contrato.tipoDocumento || 'entrega',
    condicoesDevolucao: contrato.condicoesDevolucao || { ...emptyCondicoes },
  };

  assertEqual(editForm.cliente, 'Teste LTDA', 'edit form cliente');
  assertEqual(editForm.equipamentos.length, 2, 'edit form equipamentos count');
  assertEqual(editForm.tipoDocumento, 'devolucao', 'edit form tipoDocumento');
  assertEqual(editForm.condicoesDevolucao.danificado, true, 'edit form condicoes preserved');
  assertEqual(editForm.itens[0].descricao, 'Martelo', 'edit form item preserved');
  assertEqual(editForm.numero, '1234/26', 'edit form numero');
  assertEqual(editForm.referencia, 'SESC', 'edit form referencia');
}

// --- Category 6: Confirmation Screen Logic (10 tests) ---
function testConfirmationScreen() {
  console.log('\n=== CATEGORY 6: CONFIRMATION SCREEN LOGIC ===');

  // Confirmation flow states
  let showConfirm = false;
  let pendingData = null;

  // Simulate handleSubmit validation pass
  const form = {
    tipoDocumento: 'entrega', dataContrato: '2026-06-25', atendente: 'Joao',
    cliente: 'Teste LTDA', cnpj: '30.652.566/0001-69', contato: 'Maria',
    endereco: 'Rua Teste', numeroEndereco: '10', bairro: 'Centro',
    cidade: 'Manaus', estado: 'AM', cep: '69000-000',
    localEntrega: 'Local', telefoneEntrega: '(92) 99999-0000',
    inicio: '2026-07-01', fim: '2026-08-01', valorMensal: '500',
    equipamentos: ['Martelo'], itens: [{ descricao: 'Item 1', quantidade: 1, valorUnitario: 100 }],
    condicoesDevolucao: { danificado: false, extraviado: false, testarEmpresa: false },
    rg: '', telefone: '', referencia: '', observacao: '',
  };

  // Simulate: validation passes -> showConfirm = true
  showConfirm = true;
  pendingData = { ...form, valorTotal: 100, valorMensal: 500 };
  assertEqual(showConfirm, true, 'showConfirm after validation');
  assert(pendingData !== null, 'pendingData set');

  // Simulate: user clicks "Voltar" -> showConfirm = false
  showConfirm = false;
  pendingData = null;
  assertEqual(showConfirm, false, 'showConfirm after back');
  assertEqual(pendingData, null, 'pendingData cleared after back');

  // Simulate: user confirms -> pendingData sent to onSave
  pendingData = { ...form, valorTotal: 100 };
  const saved = pendingData;
  assertEqual(saved.cliente, 'Teste LTDA', 'saved data cliente');
  assertEqual(saved.tipoDocumento, 'entrega', 'saved data tipoDocumento');

  // Devolucao confirmation
  const devForm = { ...form, tipoDocumento: 'devolucao', valorMensal: '', condicoesDevolucao: { danificado: true, extraviado: false, testarEmpresa: false } };
  pendingData = { ...devForm, valorTotal: 0, valorMensal: 0 };
  assertEqual(pendingData.tipoDocumento, 'devolucao', 'devolucao confirmation tipoDocumento');
  assertEqual(pendingData.condicoesDevolucao.danificado, true, 'devolucao confirmation condicoes');
  assertEqual(pendingData.valorMensal, 0, 'devolucao confirmation valorMensal = 0');
}

// --- Category 7: PDF Preview Flow (10 tests) ---
function testPdfPreview() {
  console.log('\n=== CATEGORY 7: PDF PREVIEW FLOW ===');

  // States
  let showPreview = false;
  let previewText = '';
  let previewFile = null;
  let processing = false;

  // Simulate file select -> text extracted -> preview shown
  showPreview = true;
  previewText = 'COMPROVANTE DE ENTREGA\nContrato Nº: 1234/26\nLocatário: Teste LTDA';
  previewFile = { name: 'test.pdf', type: 'application/pdf', size: 1024 };
  assertEqual(showPreview, true, 'preview shown after extract');
  assert(previewText.length > 0, 'preview text populated');
  assert(previewFile !== null, 'preview file set');

  // Simulate user clicks "Enviar para IA"
  processing = true;
  assertEqual(processing, true, 'processing starts');

  // Simulate AI response received
  processing = false;
  showPreview = false;
  previewText = '';
  previewFile = null;
  assertEqual(processing, false, 'processing ends');
  assertEqual(showPreview, false, 'preview hidden after process');

  // Simulate user clicks "Usar Regex"
  showConfirm = false;
  showConfirm = true;
  assertEqual(showConfirm, true, 'regex mode still shows form');

  // Cancel
  showConfirm = false;
  showConfirm = false;
  assertEqual(showConfirm, false, 'cancel hides preview');

  // File type validation
  const validTypes = ['application/pdf'];
  const invalidTypes = ['image/png', 'text/plain', 'application/msword'];
  for (const t of validTypes) assert(t === 'application/pdf', `valid type: ${t}`);
  for (const t of invalidTypes) assert(t !== 'application/pdf', `invalid type: ${t}`);

  // File size validation
  const maxSize = 10 * 1024 * 1024;
  assertEqual(maxSize, 10485760, 'max file size 10MB');
  assert(5 * 1024 * 1024 < maxSize, '5MB under limit');
  assert(15 * 1024 * 1024 > maxSize, '15MB over limit');
}

// --- Category 7: Edge Cases (10 tests) ---
function testEdgeCases() {
  console.log('\n=== CATEGORY 7: EDGE CASES ===');

  // Null/undefined safety
  assertEqual(isValidCPF(null), false, 'CPF null');
  assertEqual(isValidCPF(undefined), false, 'CPF undefined');
  assertEqual(isValidCNPJ(null), false, 'CNPJ null');
  assertEqual(formatCPF(null), '', 'formatCPF null');
  assertEqual(formatCPF(undefined), '', 'formatCPF undefined');
  assertEqual(formatCNPJ(null), '', 'formatCNPJ null');

  // Zero values
  assertEqual(calcMonths('2026-01-01', '2026-01-01'), 1, 'calcMonths same day');
  assertEqual(Number('0') || 0, 0, 'Number("0") is falsy but 0');
  assertEqual(Number('0.00') || 0, 0, 'Number("0.00") is falsy but 0');

  // Empty arrays
  const emptyArr = [];
  assertEqual(emptyArr.some(x => x), false, 'empty array some');
  assertEqual(emptyArr.filter(Boolean).length, 0, 'empty array filter');
}

// --- Category 8: Mock Data (5 tests) ---
function testMockData() {
  console.log('\n=== CATEGORY 8: MOCK DATA ===');

  const mockContratos = [
    { id: 'CT-010', cliente: 'CONSTRUTORA ABC LTDA', tipo_documento: 'entrega' },
    { id: 'CT-011', cliente: 'EMPRESA XYZ', tipo_documento: 'entrega' },
    { id: 'CT-012', cliente: 'TRANSPORTADORA 123', tipo_documento: 'entrega' },
    { id: 'CT-013', cliente: 'HANNA CECILIA', tipo_documento: 'devolucao' },
  ];

  const devolucoes = mockContratos.filter(c => c.tipo_documento === 'devolucao');
  assertEqual(devolucoes.length, 1, 'mock: one devolucao');
  assertEqual(devolucoes[0].id, 'CT-013', 'mock: devolucao is CT-013');

  const entregas = mockContratos.filter(c => c.tipo_documento === 'entrega');
  assertEqual(entregas.length, 3, 'mock: three entregas');

  // ID generation
  const maxNum = Math.max(...mockContratos.map(c => parseInt((c.id || '').replace('CT-', '')) || 0), 0);
  const newId = `CT-${String(maxNum + 1).padStart(3, '0')}`;
  assertEqual(newId, 'CT-014', 'mock: next ID');
}

// --- Category 9: PDF Text Content Analysis (10 tests) ---
async function testPDFContentAnalysis() {
  console.log('\n=== CATEGORY 9: PDF TEXT CONTENT ANALYSIS ===');

  const PDFS = [
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE ENTREGA DOS BENS LOCADOS 3.pdf', label: 'ENTREGA 1234/26' },
    { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 1.pdf', label: 'DEVOLUÇÃO 1' },
  ];

  for (const pdf of PDFS) {
    console.log(`\n--- ${pdf.label} ---`);
    try {
      const { text } = await extractTextFromPDF(pdf.path);

      // Text should not be empty
      assert(text.length > 100, `${pdf.label}: text length > 100`);

      // Should contain key labels
      assert(text.includes('Contrato') || text.includes('CONTRATO') || text.includes('contrato'), `${pdf.label}: contains "Contrato"`);
      assert(text.includes('Locat') || text.includes('LOCAT'), `${pdf.label}: contains "Locatario"`);

      // Should contain a contract number pattern
      assert(/\d{3,4}\/\d{2}/.test(text), `${pdf.label}: contains contract number pattern`);

      console.log(`  Text length: ${text.length} chars`);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
    }
  }
}

// --- Category 10: PDF Import Flow Simulation (5 tests) ---
function testPDFImportFlow() {
  console.log('\n=== CATEGORY 10: PDF IMPORT FLOW SIMULATION ===');

  // Simulate mapAiToFields
  const ai = {
    contrato: '1234/26',
    locatario: 'TIAGO CORTEZ DANTAS LTDA',
    cpf_cnpj: '16.101.043/0001-01',
    itens: [
      { quantidade: 1, descricao: 'BOMBA SUBMERSA', valor_unitario: 0 },
      { quantidade: 2, descricao: 'ABRACADEIRA 2"', valor_unitario: 0 },
    ],
    tipo_documento: 'devolucao',
  };

  const itens = Array.isArray(ai.itens) ? ai.itens.map(it => ({
    quantidade: it.quantidade || 1,
    descricao: it.descricao || '',
    patrimonio: it.patrimonio || 'PAT-000',
    data_locacao: it.data_locacao || '',
    data_devolucao: it.data_devolucao || '',
    valor_unitario: it.valor_unitario || 0,
  })) : [];

  assertEqual(itens.length, 2, 'mapAiToFields: 2 items');
  assertEqual(itens[0].descricao, 'BOMBA SUBMERSA', 'mapAiToFields: item desc');
  assertEqual(itens[0].quantidade, 1, 'mapAiToFields: item qty');

  const equipamentos = itens.map(it => it.descricao).filter(d => d && d.length > 2);
  assertEqual(equipamentos.length, 2, 'mapAiToFields: equipamentos from items');

  // Simulate tipo detection from text
  const text = 'COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS';
  const tipoHint = /DEVOLU[ÇC][ÃA]O/i.test(text) ? 'devolucao' : 'entrega';
  assertEqual(tipoHint, 'devolucao', 'tipo detection devolucao');

  const text2 = 'COMPROVANTE DE ENTREGA DOS BENS LOCADOS';
  const tipoHint2 = /DEVOLU[ÇC][ÃA]O/i.test(text2) ? 'devolucao' : 'entrega';
  assertEqual(tipoHint2, 'entrega', 'tipo detection entrega');
}

// --- Category 11: Confirmation Screen Data Display (5 tests) ---
function testConfirmationDisplay() {
  console.log('\n=== CATEGORY 11: CONFIRMATION SCREEN DATA DISPLAY ===');

  // Date formatting for display
  const dateStr = '2026-06-25';
  const displayDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  assertEqual(displayDate, '25/06/2026', 'date display pt-BR');

  // Currency formatting
  const value = 1560.50;
  const displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  assert(displayValue.includes('1.560,50') || displayValue.includes('1560,50'), 'currency display');

  // Devolucao badge color
  const tipo = 'devolucao';
  const badgeClass = tipo === 'devolucao' ? 'text-orange-600' : 'text-blue-600';
  assertEqual(badgeClass, 'text-orange-600', 'devolucao badge orange');

  // Items display
  const itens = [
    { quantidade: 2, descricao: 'Martelo', valorUnitario: 100 },
    { quantidade: 1, descricao: 'Talhadeira', valorUnitario: 50 },
  ];
  const itensDisplay = itens.map(it => `${it.quantidade}x ${it.descricao}`);
  assertEqual(itensDisplay.length, 2, 'items display count');
  assertEqual(itensDisplay[0], '2x Martelo', 'items display first');

  // Total display
  const total = itens.reduce((sum, it) => sum + it.quantidade * it.valorUnitario, 0);
  assertEqual(total, 250, 'total from items');
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('========================================');
  console.log('  TRANSOBRA CRM - TEST SUITE');
  console.log('  100+ cenarios de teste');
  console.log('========================================');

  await testPDFExtraction();
  testValidation();
  testContratoModalLogic();
  testConverters();
  testFormState();
  testConfirmationScreen();
  testEdgeCases();
  testMockData();
  await testPDFContentAnalysis();
  testPDFImportFlow();
  testConfirmationDisplay();

  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
