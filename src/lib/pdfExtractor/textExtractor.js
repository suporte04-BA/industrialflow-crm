// ============================================
// PDF Text Extraction Layer
// Uses pdfjs-dist to extract structured text
// ============================================

let pdfjsLib = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    const version = pdfjsLib.version || '6.0.227';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

/**
 * Extract text lines from a PDF file
 * @param {File} file - PDF file object
 * @returns {{ text: string, lines: string[], pages: number }}
 */
export async function extractTextFromPDF(file) {
  const lib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const lines = [];
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

    // Sort by Y (top to bottom), then X (left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });

    // Group items into rows based on Y proximity
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

    // Build lines from rows
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);

      const parts = [];
      let lastX = 0;
      for (const item of row) {
        const gap = item.x - lastX;
        if (gap > 20 && parts.length > 0) {
          parts.push('  '); // Double space = column gap
        }
        parts.push(item.str);
        lastX = item.x + (item.width || item.str.length * 6);
      }

      const line = parts.join(' ').replace(/\s+/g, ' ').trim();
      if (line.length > 0) {
        lines.push(line);
        fullText += line + '\n';
      }
    }

    fullText += '\n';
  }

  return { text: fullText, lines, pages: maxPages };
}

/**
 * Deduplicate pages if the second half is >85% similar to the first
 * @param {string[]} lines
 * @returns {string[]}
 */
export function deduplicatePages(lines) {
  if (lines.length < 20) return lines;

  const mid = Math.floor(lines.length / 2);
  const firstHalf = lines.slice(0, mid).join('\n');
  const secondHalf = lines.slice(mid).join('\n');

  const similarity = computeWordSimilarity(firstHalf, secondHalf);
  if (similarity > 0.85) return lines.slice(0, mid);

  return lines;
}

function computeWordSimilarity(a, b) {
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  let matches = 0;
  for (const w of wordsB) {
    if (setA.has(w)) matches++;
  }
  return matches / wordsB.length;
}
