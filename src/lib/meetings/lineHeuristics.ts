import type { FlatTextItem } from "../../types/meeting";

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
  // French “table of contents” heading in source PDFs (must match document text).
  if (/^Table des matières$/i.test(trimmed)) return true;
  if (/^Pages?$/i.test(trimmed)) return true;
  return false;
}

export function isMeetingLine(text: string): boolean {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  return /^\d+$/.test(compact.substring(0, 2));
}

/** Leading meeting ordinal from a TOC line (French UN-style wording), e.g. "278ÈME SÉANCE" → "278". */
export function extractMeetingNumber(text: string): string {
  const m = text.trim().match(/^(\d+)/);
  return m?.[1] ?? "";
}

/**
 * Increments the leading digit run (e.g. "346" → "347", "009" → "010").
 * Preserves any non-digit suffix. If there is no leading digit run, appends "-1".
 */
export function incrementMeetingNumber(current: string): string {
  const t = current.trim();
  const m = t.match(/^(\d+)(.*)$/);
  if (!m) return t === "" ? "1" : `${t}-1`;
  const digits = m[1];
  const rest = m[2] ?? "";
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return `${t}-1`;
  const next = n + 1;
  const minWidth = Math.max(digits.length, String(next).length);
  return String(next).padStart(minWidth, "0") + rest;
}

/**
 * Decrements the leading digit run (e.g. "347" → "346", "010" → "009").
 * Preserves any non-digit suffix. If the value is already ≤ 0, returns `"0"` plus suffix.
 */
export function decrementMeetingNumber(current: string): string {
  const t = current.trim();
  const m = t.match(/^(\d+)(.*)$/);
  if (!m) return t === "" ? "0" : `${t}-0`;
  const digits = m[1];
  const rest = m[2] ?? "";
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return `${t}-0`;
  if (n <= 0) return `0${rest}`;
  const next = n - 1;
  const minWidth = Math.max(digits.length, String(next).length);
  return String(next).padStart(minWidth, "0") + rest;
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

/** Strip trailing time-of-day from French-format dates (e.g. ", à 11 h. 30" or " à 11 h. 30"). */
export function stripFrenchTimeFromDate(text: string): string {
  return text
    .replace(/,\s*à\s+.+$/iu, "")
    .replace(/\s+à\s+\d{1,2}\s*h\.?\s*\d{0,2}\s*$/iu, "")
    .trim();
}
