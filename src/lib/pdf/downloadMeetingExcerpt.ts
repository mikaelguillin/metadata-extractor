import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type { MeetingEntry } from "../../types/meeting";
import { getPdfBlob } from "../storage/pdfBlobStore";
import {
  findExcerptPageRangeForSymbol,
  normalizeFooterSymbolForMatch,
} from "./footerSymbol";

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
export async function downloadMeetingExcerptPdf(params: {
  bookId: string;
  tocPageEnd: number;
  entries: MeetingEntry[];
  entryId: string;
}): Promise<void> {
  const { bookId, tocPageEnd, entries, entryId } = params;

  const buffer = await getPdfBlob(bookId);
  if (!buffer || buffer.byteLength === 0) {
    throw new Error(
      "Book PDF not found. Please upload the PDF file again.",
    );
  }

  const entry = entries.find((e) => e.id === entryId);
  if (!entry) {
    throw new Error("Entry not found.");
  }

  // pdf.js may transfer/detach `data` to a worker; keep the original buffer for pdf-lib.
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  const doc = await loadingTask.promise;

  const knownMeetingSymbols = new Set(
    entries.map((e) => normalizeFooterSymbolForMatch(e.symbol)),
  );
  const range = await findExcerptPageRangeForSymbol(
    doc,
    tocPageEnd,
    entry.symbol,
    knownMeetingSymbols,
  );
  if (!range) {
    throw new Error(
      `Symbol “${entry.symbol.trim()}” not found in the footer after the table of contents.`,
    );
  }

  const srcPdf = await PDFDocument.load(buffer);
  const outPdf = await PDFDocument.create();
  const zeroBased = [];
  for (let p = range.start; p <= range.end; p++) {
    zeroBased.push(p - 1);
  }
  const copied = await outPdf.copyPages(srcPdf, zeroBased);
  copied.forEach((page) => outPdf.addPage(page));

  outPdf.setTitle(entry.meetingTitle);
  outPdf.setAuthor("Nations Unies");
  outPdf.setSubject(entry.description);
  outPdf.setProducer("Nations Unies");
  outPdf.setCustomMetadata("Language", "French");
  outPdf.setCustomMetadata("Symbol", entry.symbol);

  const bytes = await outPdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  triggerDownload(blob, excerptFilename(entry.symbol));
}
