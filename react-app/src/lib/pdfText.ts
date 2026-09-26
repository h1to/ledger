/**
 * Browser-only helper: extract plain text from a PDF File using pdf.js. pdf.js is heavy, so
 * it is dynamically imported here and only pulled in when the user actually imports a file.
 * The PDF never leaves the device — parsing is entirely client-side.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Reconstruct visual lines: group text items by their y position, order top→bottom, left→right.
    const lines = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as any[]) {
      if (typeof item.str !== 'string') continue;
      const y = Math.round((item.transform?.[5] ?? 0) / 2) * 2; // quantize y to merge same-line items
      const x = item.transform?.[4] ?? 0;
      const arr = lines.get(y) || [];
      arr.push({ x, s: item.str });
      lines.set(y, arr);
    }
    const ys = Array.from(lines.keys()).sort((a, b) => b - a); // PDF y grows upward → top first
    const text = ys
      .map((y) => (lines.get(y) as { x: number; s: string }[]).sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 0)
      .join('\n');
    pages.push(text);
  }
  return pages.join('\n');
}
