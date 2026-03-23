import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type { SessionEntry } from "../../types/session";
import { getPdfBlob } from "../storage/pdfBlobStore";
import { computeExcerptPageRanges } from "./footerSymbol";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function excerptFilename(symbol: string): string {
  const safe = symbol.trim().replace(/\//g, "_");
  return `${safe}-F.pdf`;
}

/**
 * Loads the book PDF from IndexedDB, finds excerpt page range via footer symbols,
 * builds a subset PDF with pdf-lib, and triggers a download.
 */
export async function downloadSessionExcerptPdf(params: {
  bookId: string;
  tocPageEnd: number;
  entries: SessionEntry[];
  entryId: string;
}): Promise<void> {
  const { bookId, tocPageEnd, entries, entryId } = params;

  const buffer = await getPdfBlob(bookId);
  if (!buffer || buffer.byteLength === 0) {
    throw new Error(
      "PDF du livre introuvable. Veuillez recharger le fichier PDF.",
    );
  }

  const entry = entries.find((e) => e.id === entryId);
  if (!entry) {
    throw new Error("Entrée introuvable.");
  }

  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const doc = await loadingTask.promise;

  const ranges = await computeExcerptPageRanges(doc, tocPageEnd, entries);
  const range = ranges.get(entryId);
  if (!range) {
    throw new Error("Impossible de déterminer la plage de pages pour cet extrait.");
  }

  const srcPdf = await PDFDocument.load(buffer);
  const outPdf = await PDFDocument.create();
  const zeroBased = [];
  for (let p = range.start; p <= range.end; p++) {
    zeroBased.push(p - 1);
  }
  const copied = await outPdf.copyPages(srcPdf, zeroBased);
  copied.forEach((page) => outPdf.addPage(page));

  const bytes = await outPdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  triggerDownload(blob, excerptFilename(entry.symbol));
}
