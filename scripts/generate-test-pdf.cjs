const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateTestPDF() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]);
  const margin = 50;
  let y = 800;

  function drawLabel(label, value) {
    page.drawText(label, { x: margin, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value || '-', { x: margin + 100, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 16;
  }

  function drawSection(title) {
    y -= 8;
    page.drawText(title, { x: margin, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.5) });
    y -= 2;
    page.drawLine({
      start: { x: margin, y: y + 2 },
      end: { x: 545, y: y + 2 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 14;
  }

  page.drawText('CONTRATO DE LOCAO DE EQUIPAMENTOS', {
    x: margin, y, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;
  page.drawText('TransObra - Locacao de Maquinas e Equipamentos', {
    x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 25;

  drawSection('DADOS DO CONTRATO');
  drawLabel('Contrato No:', 'CT-TEST-001');
  drawLabel('Data:', '22/06/2026');
  drawLabel('Hora:', '10:30');
  drawLabel('Atendente:', 'Carlos Alberto de Souza');

  drawSection('DADOS DO LOCATARIO');
  drawLabel('Locatario:', 'Empresa Construcoes ABC Ltda');
  drawLabel('CPF/CNPJ:', '12.345.678/0001-90');
  drawLabel('RG:', '12.345.678-9');
  drawLabel('Telefone:', '(11) 99876-5432');
  drawLabel('Email:', 'contato@construcoesabc.com.br');
  drawLabel('Contato:', 'Joao da Silva');

  drawSection('ENDERECO');
  drawLabel('Endereco:', 'Rua das Obras, 1234');
  drawLabel('Numero:', '1234');
  drawLabel('Bairro:', 'Centro Industrial');
  drawLabel('Cidade:', 'Sao Paulo');
  drawLabel('UF:', 'SP');
  drawLabel('CEP:', '01234-567');

  drawSection('LOCAL DE ENTREGA');
  drawLabel('Local Entrega:', 'Obra - Av. Principal, 5678');
  drawLabel('Telefone Entrega:', '(11) 3345-6789');

  drawSection('EQUIPAMENTOS');
  drawLabel('Equipamento 1:', 'Escavadeira Komatsu PC200');
  drawLabel('Equipamento 2:', 'Retroescavadeira CAT 416');

  drawSection('ITENS LOCADOS');
  y -= 5;

  const headers = ['Descricao', 'Qtde', 'Valor Unit.', 'Valor Total'];
  const headerX = [margin, 320, 370, 460];
  headers.forEach((h, i) => {
    page.drawText(h, { x: headerX[i], y, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  });
  y -= 12;

  page.drawLine({
    start: { x: margin, y: y + 3 },
    end: { x: 545, y: y + 3 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 5;

  const items = [
    { desc: 'Escavadeira Komatsu PC200 - Locacao Mensal', qty: 1, valor: 15000 },
    { desc: 'Retroescavadeira CAT 416 - Locacao Mensal', qty: 1, valor: 8500 },
    { desc: 'Operador Escavadeira', qty: 1, valor: 4500 },
    { desc: 'Implemento - Garra Traçadora', qty: 1, valor: 1200 },
  ];

  let totalGeral = 0;
  for (const item of items) {
    const itemTotal = item.qty * item.valor;
    totalGeral += itemTotal;
    page.drawText(item.desc, { x: margin, y, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(String(item.qty), { x: 325, y, size: 8, font });
    page.drawText(`R$ ${item.valor.toLocaleString('pt-BR')}`, { x: 370, y, size: 8, font });
    page.drawText(`R$ ${itemTotal.toLocaleString('pt-BR')}`, { x: 460, y, size: 8, font });
    y -= 14;
  }

  y -= 5;
  page.drawLine({
    start: { x: margin, y: y + 3 },
    end: { x: 545, y: y + 3 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 5;

  page.drawText(`TOTAL GERAL: R$ ${totalGeral.toLocaleString('pt-BR')}`, {
    x: margin, y, size: 10, font: fontBold, color: rgb(0.1, 0.5, 0.1),
  });
  y -= 25;

  drawSection('PERIODO');
  drawLabel('Data Retirada:', '01/04/2026');
  drawLabel('Data Devolucao:', '01/10/2026');
  drawLabel('Valor Mensal:', `R$ ${totalGeral.toLocaleString('pt-BR')}`);

  y -= 15;
  drawSection('OBSERVACOES');
  page.drawText('Equipamentos devem ser devolvidos nas mesmas condicoes de entrega.', {
    x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= 12;
  page.drawText('Manutencao preventiva por conta da locadora.', {
    x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  const desktopPath = path.join(require('os').homedir(), 'Desktop', 'Pedido_Locacao_Test.pdf');
  fs.writeFileSync(desktopPath, pdfBytes);
  console.log(`PDF gerado: ${desktopPath}`);
}

generateTestPDF().catch(console.error);
