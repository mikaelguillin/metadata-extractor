import type { BookLanguage } from "../../types/book";
import type { MeetingEntry } from "../../types/meeting";
import {
  decrementMeetingNumber,
  incrementMeetingNumber,
} from "./lineHeuristics";
import {
  effectiveMeetingTitlePattern,
  meetingTitleFromFields,
} from "./meetingTitlePattern";

export type AdjacentPlacement = "before" | "after";

/**
 * Builds a blank manual row next to an anchor: decremented number when `before`,
 * incremented when `after`. Reuses the anchor’s ToC `page`.
 */
export function createAdjacentMeetingEntry(
  anchor: MeetingEntry,
  placement: AdjacentPlacement,
  symbolPrefix: string,
  rawMeetingTitlePattern: string,
  language: BookLanguage,
): MeetingEntry {
  const meetingNumber =
    placement === "before"
      ? decrementMeetingNumber(anchor.meetingNumber)
      : incrementMeetingNumber(anchor.meetingNumber);
  const pattern = effectiveMeetingTitlePattern(rawMeetingTitlePattern, language);
  return {
    id: crypto.randomUUID(),
    page: anchor.page,
    meetingNumber,
    symbol: symbolPrefix + meetingNumber,
    dateText: "",
    meetingTitle: meetingTitleFromFields(pattern, meetingNumber, "", language),
    description: "",
  };
}
