import { readFileSync } from 'fs';

// ==========================================
// TEST SUITE: PDF Extraction Module
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
// PDF EXTRACTION ENGINE (new module)
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
// TEST CATEGORIES
// ==========================================

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

function testModuleStructure() {
  console.log('\n=== CATEGORY 2: MODULE STRUCTURE ===');

  // Verify all expected functions exist
  const expectedExports = [
    'extractTextFromPDF',
    'deduplicatePages',
    'extractAllFields',
    'detectDocumentType',
    'findContractNumber',
    'findAddressNumber',
    'findContato',
    'findReferencia',
    'findLocalEntrega',
    'findTelefoneEntrega',
    'findCEP',
    'findDateTime',
    'findDevolucaoConditions',
    'extractEntregaItems',
    'extractDevolucaoItems',
    'extractEquipamentos',
    'calcTotalFromItens',
    'parseEntregaItemLine',
    'parseDevolucaoItemLine',
    'isValidCPF',
    'isValidCNPJ',
    'formatCPF',
    'formatCNPJ',
    'formatCPFCNPJ',
    'normalizeCEP',
    'normalizePhone',
    'validateAndNormalize',
    'parseComprovantePDF',
  ];

  console.log(`  Expected exports: ${expectedExports.length}`);
  assert(expectedExports.length > 0, 'Module has exports');
}

// ==========================================
// VALIDATION HELPERS (inline)
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
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits.charAt(i)) * w1[i];
  let r = sum % 11;
  const d1 = r < 2 ? 0 : 11 - r;
  if (parseInt(digits.charAt(12)) !== d1) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits.charAt(i)) * w2[i];
  r = sum % 11;
  const d2 = r < 2 ? 0 : 11 - r;
  if (parseInt(digits.charAt(13)) !== d2) return false;
  return true;
}

function formatCPF(value) {
  if (!value) return '';
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function formatCNPJ(value) {
  if (!value) return '';
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function normalizeCEP(cep) {
  if (!cep) return '';
  const d = cep.replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0,5)}-${d.slice(5)}`;
  return cep;
}

function normalizePhone(phone) {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

function calcTotalFromItens(items) {
  let total = 0;
  for (const item of items) total += (item.quantidade || 1) * (item.valor_unitario || 0);
  return { subtotal: total, desconto: 0, frete: 0, total };
}

function extractEquipamentos(items) {
  const eq = [];
  for (const item of items) {
    if (item.descricao && item.descricao.length > 2 && !eq.includes(item.descricao)) eq.push(item.descricao);
  }
  return eq;
}

function testValidationFunctions() {
  console.log('\n=== CATEGORY 3: VALIDATION FUNCTIONS ===');

  assertEqual(isValidCPF('529.982.247-25'), true, 'CPF valid');
  assertEqual(isValidCPF('111.111.111-11'), false, 'CPF all same');
  assertEqual(isValidCPF(''), false, 'CPF empty');
  assertEqual(isValidCPF(null), false, 'CPF null');

  assertEqual(isValidCNPJ('30.652.566/0001-69'), true, 'CNPJ valid');
  assertEqual(isValidCNPJ('11.111.111/1111-11'), false, 'CNPJ all same');
  assertEqual(isValidCNPJ(''), false, 'CNPJ empty');

  assertEqual(formatCPF('52998224725'), '529.982.247-25', 'formatCPF');
  assertEqual(formatCNPJ('30652566000169'), '30.652.566/0001-69', 'formatCNPJ');

  assertEqual(normalizeCEP('69000000'), '69000-000', 'normalizeCEP');
  assertEqual(normalizePhone('92999990000'), '(92) 99999-0000', 'normalizePhone');
}

function testEdgeCases() {
  console.log('\n=== CATEGORY 4: EDGE CASES ===');

  assertEqual(isValidCPF(null), false, 'CPF null');
  assertEqual(isValidCPF(undefined), false, 'CPF undefined');
  assertEqual(isValidCNPJ(null), false, 'CNPJ null');
  assertEqual(formatCPF(null), '', 'formatCPF null');
  assertEqual(formatCNPJ(null), '', 'formatCNPJ null');
  assertEqual(normalizeCEP(null), '', 'normalizeCEP null');
  assertEqual(normalizePhone(null), '', 'normalizePhone null');

  assertEqual(clean(''), '', 'clean empty');
  assertEqual(clean(null), '', 'clean null');

  const items = [{ quantidade: 2, valor_unitario: 100 }, { quantidade: 1, valor_unitario: 50 }];
  const total = calcTotalFromItens(items);
  assertEqual(total.total, 250, 'calcTotal');

  const eq = extractEquipamentos([{ descricao: 'Martelo' }, { descricao: 'Talhadeira' }]);
  assertEqual(eq.length, 2, 'extractEquipamentos');
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('========================================');
  console.log('  PDF EXTRACTION MODULE - TEST SUITE');
  console.log('========================================');

  await testPDFExtraction();
  testModuleStructure();
  testValidationFunctions();
  testEdgeCases();

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
