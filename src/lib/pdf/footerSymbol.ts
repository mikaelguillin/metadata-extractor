import type { PDFDocumentProxy } from "pdfjs-dist";
import type { FlatTextItem } from "../../types/meeting";
import { compareReadingOrder, needsSpaceBetween } from "../meetings/lineHeuristics";
import { extractRawTextItemsForPage } from "./extractTextItems";

/** Left boundary: pt from the left; region extends to `pageWidth`. PDF user space. */
const FOOTER_X_FROM_LEFT_PT = 470;
/** Top boundary of the region is `pageHeight -` this (pt down from the page top). */
const FOOTER_Y_FROM_TOP_PT = 730;

type Rect = { x0: number; x1: number; y0: number; y1: number };

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

export async function readFooterLine(
  doc: PDFDocumentProxy,
  pageNum: number,
): Promise<string> {
  const { width, height, items } = await extractRawTextItemsForPage(doc, pageNum);
  const region = footerSymbolRegion(width, height);
  return buildLineInRegion(items, region);
}

export type ExcerptPageRange = { start: number; end: number };

/**
 * Finds the page range for one meeting: first footer match for `symbol` after the ToC,
 * through the last page before a different known meeting symbol appears in the footer.
 *
 * Intermediate pages may have empty footers or non-symbol text; only footers that equal
 * another entry in `knownMeetingSymbols` (other than `symbol`) end the range.
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
  const sym = symbol.trim();
  const numPages = doc.numPages;
  let start: number | null = null;

  for (let p = tocPageEnd + 1; p <= numPages; p++) {
    const line = await readFooterLine(doc, p);
    if (line === sym) {
      start = p;
      break;
    }
  }

  if (start === null) return null;

  let end = start;
  for (let p = start + 1; p <= numPages; p++) {
    const line = (await readFooterLine(doc, p)).trim();
    if (
      line !== "" &&
      knownMeetingSymbols.has(line) &&
      line !== sym
    ) {
      break;
    }
    end = p;
  }

  return { start, end };
}
