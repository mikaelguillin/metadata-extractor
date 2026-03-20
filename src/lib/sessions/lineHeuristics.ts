import type { FlatTextItem } from "../../types/session";

/** PDF user space: y increases upward, so larger y = higher on the page (read first). */
export const SAME_LINE_TOL = 2.5;

export function compareReadingOrder(a: FlatTextItem, b: FlatTextItem): number {
  const sameLine = Math.abs(a.y - b.y) < SAME_LINE_TOL;
  if (sameLine) return a.x - b.x;
  return b.y - a.y;
}

export function needsSpaceBetween(
  prev: FlatTextItem,
  next: FlatTextItem,
): boolean {
  const prevEnd = prev.x + prev.width;
  const gap = next.x - prevEnd;
  if (gap <= 0) return false;
  const threshold = Math.max(0.8, prev.height * 0.12);
  if (gap < threshold) return false;
  const ps = prev.str;
  const ns = next.str;
  if (/\s$/.test(ps) || /^\s/.test(ns)) return false;
  return true;
}

export function isNoiseLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (/^Table des matières$/i.test(trimmed)) return true;
  if (/^Pages?$/i.test(trimmed)) return true;
  return false;
}

export function isSessionLine(text: string): boolean {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  return /^\d+$/.test(compact.substring(0, 2));
}

/** Leading session ordinal from a TOC line, e.g. "278ÈME SÉANCE" → "278". */
export function extractSessionNumber(text: string): string {
  const m = text.trim().match(/^(\d+)/);
  return m?.[1] ?? "";
}

/** Strip TOC-style leaders from the end of a line (4+ dots then any trailing tail). */
export function stripTrailingTocLeaders(text: string): string {
  return text.replace(/(\.\s | \.){4,}.*$/, "").trimEnd();
}

export function isFrenchDate(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const monthsRegex =
    /janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre/i;

  const hasMonth = monthsRegex.test(trimmed);
  const hasYear = /\d{4}/.test(trimmed);

  return hasMonth && hasYear;
}

/** Drop clock time after the date, e.g. ", à 11 h. 30" or " à 11 h. 30". */
export function stripFrenchTimeFromDate(text: string): string {
  return text
    .replace(/,\s*à\s+.+$/iu, "")
    .replace(/\s+à\s+\d{1,2}\s*h\.?\s*\d{0,2}\s*$/iu, "")
    .trim();
}
