import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 5);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    let lastY = null;
    let lastX = null;
    let pageText = '';

    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);

      if (lastY !== null) {
        const yDiff = Math.abs(y - lastY);
        const xDiff = x - lastX;

        if (yDiff > 5) {
          pageText += '\n';
        } else if (xDiff < -100 || (xDiff > 50 && Math.abs(xDiff) < 200)) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
      }

      pageText += item.str;
      lastY = y;
      lastX = x + (item.width || 0);
    }

    fullText += pageText + '\n\n';
  }

  return fullText;
}
