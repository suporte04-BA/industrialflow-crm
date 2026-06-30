import { readFileSync } from 'fs';

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

const PDFS = [
  { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE ENTREGA DOS BENS LOCADOS 3.pdf', expected: 'entrega', label: 'ENTREGA 1234/26' },
  { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE ENTREGA DOS BENS LOCADOS 2.pdf', expected: 'entrega', label: 'ENTREGA 1236/26' },
  { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 1.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 1' },
  { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 2.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 2' },
  { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 3.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 3' },
  { path: 'C:\\Users\\usuario\\Downloads\\COMPROVANTE DE DEVOLUÇÃO DOS BENS LOCADOS 4.pdf', expected: 'devolucao', label: 'DEVOLUÇÃO 4' },
];

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
      if (i + 1 < lines.length) {
        const next = clean(lines[i + 1]);
        if (next.length > 0 && next.length < 60 && !/^\d/.test(next) && !/^(Refer|Telefone|CNPJ|Bairro|Cidade|Estado|CEP|Endere|N[ºo°]|Data|Hora|Observa|Locat|Atend|Fone|RG|COMPROVANTE)/i.test(next)) {
          return next;
        }
      }
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
      v = v.replace(/[:\s/]+$/, '').trim();
      if (v.length > 0 && v.length < 120) return v;
    }
  }
  for (const line of lines) {
    const m = line.match(/(.+)\s+Refer[êe]ncia\s*[:=]?\s*(.*)/i);
    if (m) { const after = clean(m[2]); if (after.length > 0 && after.length < 120) return after; }
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
  let foundLocal = false;
  for (const line of lines) { if (/Local\s+(?:da\s+)?(?:entrega|obra)/i.test(line)) foundLocal = true; if (foundLocal) { const m = line.match(/Fone\s*:\s*([\d\s().-]+)/i); if (m) return clean(m[1]); } }
  for (const line of lines) { const m = line.match(/Fone\s+(?:do\s+local|da\s+obra)\s*:\s*([\d\s().-]+)/i); if (m) return clean(m[1]); }
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
    if (cidM && !fields.cidade) {
      let v = clean(cidM[1]);
      v = v.replace(/\s*(Estado|CEP|Telefone|Fone|N[ºo°]|INSC).*/i, '').trim();
      if (v.length > 0) fields.cidade = v;
    }
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
    if (bairM && !fields.bairro) {
      let v = clean(bairM[1]); v = v.replace(/\s*(Cidade|Estado|CEP|Telefone|Fone).*/i, '').trim();
      if (i + 1 < lines.length) { const nextLine = lines[i + 1]; if (nextLine.trim().length > 0 && !/^(Cidade|Estado|CEP|Telefone|Fone|Endere|Data|Hora|Contato|Refer|Locat|Atend|Bairro|N[ºo°]|COMPROVANTE|EQUILOC|TRANS)/i.test(nextLine)) { const nc = clean(nextLine); if (nc.length > 0 && nc.length < 40) v = v + ' ' + nc; } }
      if (v.length > 0 && v.length < 80) fields.bairro = v;
      cepCandidates.push({ cep: '', context: 'bairro' });
    }
    const obsM = line.match(/Observa[çc][ãa]o\s*:\s*(.+)/i); if (obsM && !fields.observacao) fields.observacao = clean(obsM[1]);
  }

  if (cepCandidates.length > 0 && !fields.cep) {
    const clientCeps = cepCandidates.filter(c => c.cep && (c.context === 'cep' || c.context === 'bairro'));
    if (clientCeps.length > 0) {
      fields.cep = clientCeps[clientCeps.length - 1].cep;
    } else if (cepCandidates[cepCandidates.length - 1].cep) {
      fields.cep = cepCandidates[cepCandidates.length - 1].cep;
    }
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

  return fields;
}

async function main() {
  for (const pdf of PDFS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${pdf.label}`);
    console.log(`${'='.repeat(60)}`);
    try {
      const { lines } = await extractTextFromPDF(pdf.path);
      console.log(`Lines extracted: ${lines.length}`);
      console.log(`--- RAW LINES (first 30) ---`);
      lines.slice(0, 30).forEach((l, i) => console.log(`  [${i}] ${l}`));
      console.log(`--- END RAW LINES ---\n`);

      const fields = extractFields(lines);
      console.log(`Tipo: ${fields.tipo_documento} (esperado: ${pdf.expected})`);
      console.log(`Contrato: ${fields.contrato}`);
      console.log(`Nº Endereço: ${fields.numero}`);
      console.log(`Atendente: ${fields.atendente}`);
      console.log(`Locatário: ${fields.locatario}`);
      console.log(`CNPJ: ${fields.cpf_cnpj}`);
      console.log(`RG: ${fields.rg}`);
      console.log(`Telefone: ${fields.telefone}`);
      console.log(`Contato: ${fields.contato_cliente}`);
      console.log(`Endereço: ${fields.endereco}`);
      console.log(`Bairro: ${fields.bairro}`);
      console.log(`Cidade: ${fields.cidade}`);
      console.log(`Estado: ${fields.estado}`);
      console.log(`CEP: ${fields.cep}`);
      console.log(`Local Entrega: ${fields.local_entrega}`);
      console.log(`Telefone Entrega: ${fields.telefone_entrega}`);
      console.log(`Referência: ${fields.referencia}`);
      console.log(`Data Retirada: ${fields.data_retirada}`);
      console.log(`Hora: ${fields.hora}`);
      console.log(`Observação: ${fields.observacao}`);
    } catch (err) {
      console.error(`ERRO: ${err.message}`);
    }
  }
}

main().catch(console.error);
