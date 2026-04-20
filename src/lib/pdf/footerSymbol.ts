import type { PDFDocumentProxy } from "pdfjs-dist";
import type { FlatTextItem } from "../../types/meeting";
import {
  SAME_LINE_TOL,
  compareReadingOrder,
  needsSpaceBetween,
} from "../meetings/lineHeuristics";
import { extractRawTextItemsForPage } from "./extractTextItems";

/**
 * Trims and removes all whitespace inside the string so footer text (PDF runs + inserted
 * spaces) matches stored meeting symbols regardless of spacing.
 */
export function normalizeFooterSymbolForMatch(s: string): string {
  return s.trim().replace(/\s+/g, "");
}

/** Left boundary: pt from the left; region extends to `pageWidth`. PDF user space. */
const FOOTER_X_FROM_LEFT_PT = 460;
// const FOOTER_X_FROM_LEFT_PT = 400;
/** Top boundary of the region is `pageHeight -` this (pt down from the page top). */
// const FOOTER_Y_FROM_TOP_PT = 720;
// const FOOTER_Y_FROM_TOP_PT = 730;
const FOOTER_Y_FROM_TOP_PT = 740;

type Rect = { x0: number; x1: number; y0: number; y1: number };
type FooterLineCandidate = { y: number; items: FlatTextItem[] };

/** Relative bottom band height used to discover footer text robustly across page sizes. */
const FOOTER_BOTTOM_BAND_RATIO = 0.14;
/** Relative start of the right anchor area where meeting symbols are expected. */
const FOOTER_RIGHT_ANCHOR_RATIO = 0.66;

function itemBounds(i: { x: number; y: number; width: number; height: number }): Rect {
  const x0 = Math.min(i.x, i.x + i.width);
  const x1 = Math.max(i.x, i.x + i.width);
  const y0 = Math.min(i.y, i.y + i.height);
  const y1 = Math.max(i.y, i.y + i.height);
  return { x0, x1, y0, y1 };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
}

/**
 * Bottom-right band: x ∈ [FOOTER_X_FROM_LEFT_PT, pageWidth], y ∈ [0, pageHeight − FOOTER_Y_FROM_TOP_PT].
 * PDF user space (origin bottom-left, y up): bottom y = 0, top of band 730 pt below page top.
 */
function footerSymbolRegion(pageWidth: number, pageHeight: number): Rect {
  const x0 = FOOTER_X_FROM_LEFT_PT;
  const x1 = pageWidth;
  const y0 = 0;
  const y1 = Math.max(0, pageHeight - FOOTER_Y_FROM_TOP_PT);
  return {
    x0: Math.min(x0, x1),
    x1: Math.max(x0, x1),
    y0: Math.min(y0, y1),
    y1: Math.max(y0, y1),
  };
}

function buildLineInRegion(items: FlatTextItem[], region: Rect): string {
  const picked = items.filter((it) => rectsOverlap(itemBounds(it), region));
  if (picked.length === 0) return "";
  const sorted = [...picked].sort(compareReadingOrder);
  let out = "";
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && needsSpaceBetween(sorted[i - 1], sorted[i])) out += " ";
    out += sorted[i].str;
  }
  return out.trim();
}

function buildLineText(items: FlatTextItem[]): string {
  if (items.length === 0) return "";
  const sorted = [...items].sort(compareReadingOrder);
  let out = "";
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && needsSpaceBetween(sorted[i - 1], sorted[i])) out += " ";
    out += sorted[i].str;
  }
  return out.trim();
}

function toFooterLines(items: FlatTextItem[], pageHeight: number): FooterLineCandidate[] {
  const bottomMaxY = pageHeight * FOOTER_BOTTOM_BAND_RATIO;
  const bottomItems = items
    .filter((it) => {
      const b = itemBounds(it);
      return b.y0 <= bottomMaxY;
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: FooterLineCandidate[] = [];
  for (const it of bottomItems) {
    const existing = lines.find((line) => Math.abs(line.y - it.y) <= SAME_LINE_TOL);
    if (existing) {
      existing.items.push(it);
      const n = existing.items.length;
      existing.y = (existing.y * (n - 1) + it.y) / n;
      continue;
    }
    lines.push({ y: it.y, items: [it] });
  }
  return lines;
}

function pickBestFooterLine(
  lines: FooterLineCandidate[],
  pageWidth: number,
  pageHeight: number,
): FooterLineCandidate | null {
  if (lines.length === 0) return null;
  const bottomMaxY = pageHeight * FOOTER_BOTTOM_BAND_RATIO;
  let best: FooterLineCandidate | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const line of lines) {
    const bounds = line.items.map(itemBounds);
    const maxX = Math.max(...bounds.map((b) => b.x1));
    const rightness = maxX / Math.max(1, pageWidth);
    const bottomness = 1 - Math.min(1, line.y / Math.max(1, bottomMaxY));
    const text = buildLineText(line.items);
    const nonSpaceLen = text.replace(/\s+/g, "").length;
    const density = Math.min(1, nonSpaceLen / 8);
    const score = rightness * 2 + bottomness + density * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }
  return best;
}

function readFooterLineAnchored(items: FlatTextItem[], pageWidth: number, pageHeight: number): string {
  const lines = toFooterLines(items, pageHeight);
  const bestLine = pickBestFooterLine(lines, pageWidth, pageHeight);
  if (!bestLine) return "";

  const rightAnchored = bestLine.items.filter((it) => {
    const b = itemBounds(it);
    const centerX = (b.x0 + b.x1) / 2;
    return centerX >= pageWidth * FOOTER_RIGHT_ANCHOR_RATIO || b.x1 >= pageWidth * 0.82;
  });

  const anchoredText = buildLineText(rightAnchored);
  if (anchoredText !== "") return anchoredText;
  return buildLineText(bestLine.items);
}

export async function readFooterLine(
  doc: PDFDocumentProxy,
  pageNum: number,
): Promise<string> {
  const { width, height, items } = await extractRawTextItemsForPage(doc, pageNum);
  const anchored = readFooterLineAnchored(items, width, height);
  if (anchored !== "") return anchored;
  // Fallback for unusual layouts where footer extraction misses the line.
  const region = footerSymbolRegion(width, height);
  return buildLineInRegion(items, region);
}

export type ExcerptPageRange = { start: number; end: number };

/**
 * Finds the page range for one meeting: first footer match for `symbol` after the ToC,
 * through the last page before a different known meeting symbol appears in the footer.
 *
 * Intermediate pages may have empty footers or non-symbol text; only footers that match
 * another entry in `knownMeetingSymbols` (other than `symbol`) after
 * {@link normalizeFooterSymbolForMatch} end the range.
 *
 * This does not depend on table row order. ToC order can differ from body order without
 * mixing up excerpts.
 */
export async function findExcerptPageRangeForSymbol(
  doc: PDFDocumentProxy,
  tocPageEnd: number,
  symbol: string,
  knownMeetingSymbols: Set<string>,
): Promise<ExcerptPageRange | null> {
  const sym = normalizeFooterSymbolForMatch(symbol);
  const numPages = doc.numPages;
  let start: number | null = null;

  for (let p = tocPageEnd + 1; p <= numPages; p++) {
    const line = await readFooterLine(doc, p);
    if (normalizeFooterSymbolForMatch(line) === sym) {
      start = p;
      break;
    }
  }

  if (start === null) return null;

  let end = start;
  for (let p = start + 1; p <= numPages; p++) {
    const lineNorm = normalizeFooterSymbolForMatch(await readFooterLine(doc, p));
    if (
      lineNorm !== "" &&
      knownMeetingSymbols.has(lineNorm) &&
      lineNorm !== sym
    ) {
      break;
    }
    end = p;
  }

  return { start, end };
}
