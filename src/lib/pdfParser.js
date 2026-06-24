let pdfjsLib = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

export async function extractTextFromPDF(file) {
  const lib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 5);

  for (let i = 1; i <= maxPages; i++) {
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

    const rows = [];
    let currentRow = [items[0]];
    let currentY = items[0].y;

    for (let j = 1; j < items.length; j++) {
      const yDiff = Math.abs(items[j].y - currentY);
      if (yDiff > 4) {
        rows.push(currentRow);
        currentRow = [items[j]];
        currentY = items[j].y;
      } else {
        currentRow.push(items[j]);
      }
    }
    rows.push(currentRow);

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);

      const parts = [];
      let lastX = 0;
      for (const item of row) {
        const gap = item.x - lastX;
        if (gap > 20 && parts.length > 0) {
          parts.push('  ');
        }
        parts.push(item.str);
        lastX = item.x + (item.width || item.str.length * 6);
      }

      const line = parts.join(' ').replace(/\s+/g, ' ').trim();
      if (line.length > 0) {
        fullText += line + '\n';
      }
    }

    fullText += '\n';
  }

  return fullText;
}
