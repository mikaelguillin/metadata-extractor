import type { MeetingEntry } from "./meeting";

/** Book document language; fixed at creation. Drives default title template and excerpt PDF metadata. */
export type BookLanguage = "en" | "fr";

export type Book = {
  id: string;
  name: string;
  /** Set when the book is created; existing data without this field is treated as French. */
  language: BookLanguage;
  /** Prepended to each entry’s meeting number to form `MeetingEntry.symbol`. */
  symbolPrefix: string;
  /**
   * Template for each entry’s `meetingTitle`. Placeholders: `{meetingNumber}`, `{meetingDate}`.
   */
  meetingTitlePattern: string;
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
  entries: MeetingEntry[];
};
