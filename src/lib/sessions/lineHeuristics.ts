import type { FlatTextItem } from "../../types/session";

/** PDF user space: y increases upward, so larger y = higher on the page (read first). */
export const SAME_LINE_TOL = 2.5;

export function compareReadingOrder(a: FlatTextItem, b: FlatTextItem): number {
  const sameLine = Math.abs(a.y - b.y) < SAME_LINE_TOL;
  if (sameLine) return a.x - b.x;
  return b.y - a.y;
}

export function needsSpaceBetween(prev: FlatTextItem, next: FlatTextItem): boolean {
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

export function isFrenchDate(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const monthsRegex =
    /janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre/i;

  const hasMonth = monthsRegex.test(trimmed);
  const hasYear = /\d{4}/.test(trimmed);

  return hasMonth && hasYear;
}
