/** Default document symbol prefix for new books (UN-style; edit per committee/session). */
export const DEFAULT_SYMBOL_PREFIX = "A/C.N/SR.";

/** Default when the book pattern is empty or missing. */
export const DEFAULT_MEETING_TITLE_PATTERN =
  "General Assembly, nth meeting, official records, nth Committee, summary record of the {meetingNumber}th meeting, {meetingDate}, New York";

export function effectiveMeetingTitlePattern(pattern: string): string {
  const t = pattern.trim();
  return t === "" ? DEFAULT_MEETING_TITLE_PATTERN : t;
}

export function formatMeetingTitle(
  pattern: string,
  meetingNumber: string,
  meetingDate: string,
): string {
  const p = effectiveMeetingTitlePattern(pattern);
  return p
    .replaceAll("{meetingNumber}", meetingNumber.trim())
    .replaceAll("{meetingDate}", meetingDate.trim());
}

/** Empty until both meeting number and date are non-empty (after trim). */
export function meetingTitleFromFields(
  pattern: string,
  meetingNumber: string,
  meetingDate: string,
): string {
  if (meetingNumber.trim() === "" || meetingDate.trim() === "") return "";
  return formatMeetingTitle(pattern, meetingNumber, meetingDate);
}
