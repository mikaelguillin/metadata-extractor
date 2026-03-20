import type { SessionEntry } from "./session";

export type Book = {
  id: string;
  name: string;
  /** Last uploaded PDF file name; cleared when book has no extraction. */
  pdfFileName: string | null;
  entries: SessionEntry[];
};
