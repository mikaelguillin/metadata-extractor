import type { BookLanguage } from "../../types/book";
import type { MeetingEntry, FlatTextItem } from "../../types/meeting";
import {
  DEFAULT_MEETING_TITLE_PATTERN_FR,
  meetingTitleFromFields,
} from "./meetingTitlePattern";
import {
  SAME_LINE_TOL,
  needsSpaceBetween,
  isNoiseLine,
  isMeetingLine,
  isTocDateLine,
  stripTocDateTimeSuffix,
  stripTrailingTocLeaders,
  extractMeetingNumber,
} from "./lineHeuristics";

export function buildMeetings(
  pages: {
    page: number;
    items: FlatTextItem[];
  }[],
  symbolPrefix = "",
  meetingTitlePattern = DEFAULT_MEETING_TITLE_PATTERN_FR,
  language: BookLanguage = "fr",
): MeetingEntry[] {
  const meetings: MeetingEntry[] = [];

  let currentMeetingNumber: string | null = null;
  let currentDate: string | null = null;
  let currentPage = 0;
  let currentDescription: string[] = [];

  const flush = () => {
    if (currentMeetingNumber && currentDate) {
      meetings.push({
        id: `${currentPage}-${meetings.length}-${Date.now()}`,
        page: currentPage,
        meetingNumber: currentMeetingNumber,
        symbol: symbolPrefix + currentMeetingNumber,
        dateText: currentDate,
        meetingTitle: meetingTitleFromFields(
          meetingTitlePattern,
          currentMeetingNumber,
          currentDate,
          language,
        ),
        description: currentDescription
          .filter((line) => !isTocDateLine(line, language))
          .join("\n")
          .trim(),
      });
    }
    currentMeetingNumber = null;
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

    const filteredLines = logicalLines.filter(
      (line) => !isNoiseLine(line, language),
    );

    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i].trim();
      const nextLine = filteredLines[i + 1]?.trim() ?? "";
      const prevLine = filteredLines[i - 1]?.trim() ?? "";

      if (
        isMeetingLine(line, language) &&
        (isTocDateLine(nextLine, language) || isTocDateLine(prevLine, language))
      ) {
        flush();
        const n = extractMeetingNumber(line, language);
        currentMeetingNumber = n.length > 0 ? n : line.trim();
        const rawDate = isTocDateLine(nextLine, language)
          ? nextLine
          : prevLine;
        currentDate = stripTocDateTimeSuffix(rawDate, language).toLowerCase();
        currentPage = page.page;
        if (isTocDateLine(nextLine, language)) {
          i++;
        }
        continue;
      }

      if (currentMeetingNumber && currentDate) {
        currentDescription.push(stripTrailingTocLeaders(line));
      }
    }
  }

  flush();
  return meetings;
}
