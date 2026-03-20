import type {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
import type { FlatTextItem } from "../../types/session";
import { compareReadingOrder } from "../sessions/lineHeuristics";

export type PageTextItems = {
  page: number;
  width: number;
  height: number;
  items: FlatTextItem[];
};

/** Inclusive 1-based PDF page indices (pdf.js order). */
export type PageIndexRange = {
  start: number;
  end: number;
};

export async function extractTextItems(
  doc: PDFDocumentProxy,
  tocPages?: PageIndexRange,
): Promise<PageTextItems[]> {
  const pages: PageTextItems[] = [];

  const numPages = doc.numPages;
  const startPage = tocPages?.start ?? 1;
  const endPage = tocPages?.end ?? numPages;

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const mapped: FlatTextItem[] = textContent.items
      .map((item) => {
        const textItem = item as TextItem | TextMarkedContent;
        if (!("transform" in textItem) || !("str" in textItem)) return null;
        const [, , , , e, f] = textItem.transform;
        return {
          str: textItem.str,
          x: e,
          y: f,
          width: textItem.width,
          height: textItem.height,
          hasEOL: textItem.hasEOL,
        };
      })
      .filter((it): it is FlatTextItem => !!it && !!it.str.trim());

    const halfWidth = viewport.width / 2;

    const left = mapped
      .filter((i) => i.x < halfWidth)
      .sort(compareReadingOrder);
    const right = mapped
      .filter((i) => i.x >= halfWidth)
      .sort(compareReadingOrder);

    pages.push({
      page: pageNum,
      width: viewport.width,
      height: viewport.height,
      items: [...left, ...right],
    });
  }

  return pages;
}
