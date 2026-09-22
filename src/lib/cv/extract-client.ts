import type { CvProfile } from "./profile";
import { parseCvText } from "./profile";

type TextPiece = { str: string; width: number; transform: number[] };

export function pdfItemsToLines(items: TextPiece[]): string[] {
  const rows: {
    y: number;
    pieces: { x: number; width: number; text: string }[];
  }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2);
    if (!row) {
      row = { y, pieces: [] };
      rows.push(row);
    }
    row.pieces.push({ x, width: item.width, text: item.str.trim() });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      const pieces = row.pieces.sort((a, b) => a.x - b.x);
      let result = "";
      let right = -Infinity;
      for (const piece of pieces) {
        const gap = piece.x - right;
        if (result) result += gap > 12 ? "  " : " ";
        result += piece.text;
        right = Math.max(right, piece.x + piece.width);
      }
      return result.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

export async function extractCvInBrowser(
  file: File,
  onProgress: (status: string, completed: number, total: number) => void,
): Promise<CvProfile> {
  if (file.size > 8 * 1024 * 1024)
    throw new Error("Choose a PDF or text CV smaller than 8 MB.");
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isText =
    file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
  if (!isPdf && !isText) throw new Error("Choose a PDF or plain-text CV.");
  if (isText) {
    onProgress("Reading text in this browser", 1, 2);
    const rawText = await file.text();
    if (!rawText.trim()) throw new Error("This file has no readable text.");
    onProgress("Organizing CV sections", 2, 2);
    return parseCvText(rawText, {
      fileName: file.name,
      pages: 1,
      importedAt: new Date().toISOString(),
    });
  }
  onProgress("Opening PDF in this browser", 0, 1);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, useSystemFonts: true });
  try {
    const document = await task.promise;
    if (document.numPages > 20)
      throw new Error("Choose a CV with 20 pages or fewer.");
    const lines: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      onProgress(
        `Reading page ${pageNumber} of ${document.numPages}`,
        pageNumber - 1,
        document.numPages,
      );
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pieces = content.items.filter(
        (item): item is typeof item & TextPiece => "str" in item,
      ) as TextPiece[];
      lines.push(...pdfItemsToLines(pieces));
      page.cleanup();
      onProgress(
        `Organized page ${pageNumber} of ${document.numPages}`,
        pageNumber,
        document.numPages,
      );
    }
    const rawText = lines.join("\n");
    if (rawText.replace(/\s/g, "").length < 80)
      throw new Error(
        "This PDF has little selectable text. Export a text-based PDF and try again.",
      );
    onProgress(
      "Structuring your experience and skills",
      document.numPages,
      document.numPages,
    );
    return parseCvText(rawText, {
      fileName: file.name,
      pages: document.numPages,
      importedAt: new Date().toISOString(),
    });
  } finally {
    await task.destroy();
  }
}
