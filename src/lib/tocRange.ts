export function parsePositiveInt(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export type TocRangeResult =
  | { ok: false }
  | { ok: true; start: number; end: number };

export function computeTocRange(
  tocStartInput: string,
  tocEndInput: string,
): TocRangeResult {
  const start = parsePositiveInt(tocStartInput);
  const end = parsePositiveInt(tocEndInput);
  if (start === null || end === null) return { ok: false };
  if (start > end) return { ok: false };
  return { ok: true, start, end };
}

export function computeTocRangeHint(
  hasSelectedBook: boolean,
  tocStartInput: string,
  tocEndInput: string,
): string | null {
  if (!hasSelectedBook) return null;
  const tStart = tocStartInput.trim();
  const tEnd = tocEndInput.trim();
  if (tStart === "" && tEnd === "") {
    return "Enter the first and last page of the table of contents (PDF file page indices).";
  }
  if (tStart === "" || tEnd === "") {
    return "Both fields are required.";
  }
  const start = parsePositiveInt(tocStartInput);
  const end = parsePositiveInt(tocEndInput);
  if (start === null || end === null) {
    return "Enter whole numbers ≥ 1.";
  }
  if (start > end) {
    return "The start page must be less than or equal to the end page.";
  }
  return null;
}
