import type { BookLanguage } from "../../types/book";
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

export function isNoiseLine(text: string, language: BookLanguage): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (language === "en") {
    if (/^Table of contents$/i.test(trimmed)) return true;
  } else {
    if (/^Table des matières$/i.test(trimmed)) return true;
  }
  if (/^Pages?$/i.test(trimmed)) return true;
  return false;
}

/** French: leading digits (two-digit run at line start after compacting). English: “286th meeting” (word “meeting” is case-insensitive). */
export function isMeetingLine(text: string, language: BookLanguage): boolean {
  const trimmed = text.trim();
  if (language === "en") {
    return /^\d+(?:st|nd|rd|th)\s+meeting\b/i.test(trimmed);
  }
  const compact = text.replace(/\s+/g, "").toLowerCase();
  return /^\d+$/.test(compact.substring(0, 2));
}

/** Leading meeting index: French from line start digits; English from before ordinal suffix. */
export function extractMeetingNumber(text: string, language: BookLanguage): string {
  const trimmed = text.trim();
  if (language === "en") {
    const m = trimmed.match(/^(\d+)(?:st|nd|rd|th)\b/i);
    return m?.[1] ?? "";
  }
  const m = trimmed.match(/^(\d+)/);
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

const ENGLISH_MONTHS =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i;

const FRENCH_MONTHS =
  /janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre/i;

/** True if the line looks like a ToC date line (French month names or English month names + year). */
export function isTocDateLine(text: string, language: BookLanguage): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const monthsRegex = language === "en" ? ENGLISH_MONTHS : FRENCH_MONTHS;
  const hasMonth = monthsRegex.test(trimmed);
  const hasYear = /\d{4}/.test(trimmed);

  return hasMonth && hasYear;
}

/** Remove trailing time-of-day from a ToC date line (French “à … h.” or English “at … a.m.”). */
export function stripTocDateTimeSuffix(
  text: string,
  language: BookLanguage,
): string {
  if (language === "en") {
    return text
      .replace(/,\s*at\s+.+$/iu, "")
      .replace(/\s+at\s+.+$/iu, "")
      .trim();
  }
  return text
    .replace(/,\s*à\s+.+$/iu, "")
    .replace(/\s+à\s+\d{1,2}\s*h\.?\s*\d{0,2}\s*$/iu, "")
    .trim();
}
