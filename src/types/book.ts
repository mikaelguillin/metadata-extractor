import type { SessionEntry } from "./session";

export type Book = {
  id: string;
  name: string;
  /** Prepended to each entry’s session number to form `SessionEntry.symbol`. */
  symbolPrefix: string;
  /** Last uploaded PDF file name; cleared when book has no extraction. */
  pdfFileName: string | null;
  /**
   * IndexedDB key for the stored full PDF (`pdfBlobStore` uses the book id).
   * Kept when clearing extracted rows so excerpts can still be downloaded.
   */
  pdfBlobKey: string | null;
  /** Inclusive PDF page indices (1-based) used for the last TOC extraction. */
  tocPageStart: number | null;
  tocPageEnd: number | null;
  entries: SessionEntry[];
};
