import type { SessionEntry } from "./session";

export type Book = {
  id: string;
  name: string;
  /** Last uploaded PDF file name; cleared when book has no extraction. */
  pdfFileName: string | null;
  /** Inclusive PDF page indices (1-based) used for the last TOC extraction. */
  tocPageStart: number | null;
  tocPageEnd: number | null;
  entries: SessionEntry[];
};
