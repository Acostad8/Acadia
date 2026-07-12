import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfText(
  data: Uint8Array,
  maxPages = 3
): Promise<string> {
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const pages = Math.min(doc.numPages, maxPages);
  const parts: string[] = [];
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ("str" in item && item.str.trim()) parts.push(item.str);
    }
  }
  return parts.join(" ");
}
