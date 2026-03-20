import type { SessionEntry, FlatTextItem } from "../../types/session";
import {
  SAME_LINE_TOL,
  needsSpaceBetween,
  isNoiseLine,
  isSessionLine,
  isFrenchDate,
  stripFrenchTimeFromDate,
  stripTrailingTocLeaders,
  extractSessionNumber,
} from "./lineHeuristics";

export function buildSessions(
  pages: {
    page: number;
    items: FlatTextItem[];
  }[],
): SessionEntry[] {
  const sessions: SessionEntry[] = [];

  let currentSessionNumber: string | null = null;
  let currentDate: string | null = null;
  let currentPage = 0;
  let currentDescription: string[] = [];

  const flush = () => {
    if (currentSessionNumber && currentDate) {
      sessions.push({
        id: `${currentPage}-${sessions.length}-${Date.now()}`,
        page: currentPage,
        sessionNumber: currentSessionNumber,
        dateText: currentDate,
        description: currentDescription
          .filter((line) => !isFrenchDate(line))
          .join("\n")
          .trim(),
      });
    }
    currentSessionNumber = null;
    currentDate = null;
    currentDescription = [];
  };

  for (const page of pages) {
    const logicalLines: string[] = [];
    let buffer = "";
    let lastY: number | null = null;

    let lastItem: FlatTextItem | null = null;

    for (const item of page.items) {
      if (lastY === null) {
        buffer = item.str;
        lastY = item.y;
        lastItem = item;
      } else if (Math.abs(item.y - lastY) < SAME_LINE_TOL) {
        if (lastItem && needsSpaceBetween(lastItem, item)) buffer += " ";
        buffer += item.str;
        lastItem = item;
      } else {
        logicalLines.push(buffer);
        buffer = item.str;
        lastY = item.y;
        lastItem = item;
      }
    }
    if (buffer) logicalLines.push(buffer);

    const filteredLines = logicalLines.filter((line) => !isNoiseLine(line));

    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i].trim();
      const nextLine = filteredLines[i + 1]?.trim() ?? "";
      const prevLine = filteredLines[i - 1]?.trim() ?? "";

      if (
        isSessionLine(line) &&
        (isFrenchDate(nextLine) || isFrenchDate(prevLine))
      ) {
        flush();
        const n = extractSessionNumber(line);
        currentSessionNumber = n.length > 0 ? n : line.trim();
        const rawDate = isFrenchDate(nextLine) ? nextLine : prevLine;
        currentDate = stripFrenchTimeFromDate(rawDate);
        currentPage = page.page;
        if (isFrenchDate(nextLine)) {
          i++;
        }
        continue;
      }

      if (currentSessionNumber && currentDate) {
        currentDescription.push(stripTrailingTocLeaders(line));
      }
    }
  }

  flush();
  return sessions;
}
