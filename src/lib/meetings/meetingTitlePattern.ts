import type { BookLanguage } from "../../types/book";

/** Default document symbol prefix for new books (UN-style; edit per committee/session). */
export const DEFAULT_SYMBOL_PREFIX = "A/C.N/SR.";

export const DEFAULT_MEETING_TITLE_PATTERN_EN =
  "General Assembly, nth meeting, official records, nth Committee, summary record of the {meetingNumber}th meeting, {meetingDate}, New York";

export const DEFAULT_MEETING_TITLE_PATTERN_FR =
  "Assemblée Générale, nième session, documents officiels, nième Commission, compte rendu analytique de la {meetingNumber}ème séance, {meetingDate}, New York";

/** @deprecated Same as {@link DEFAULT_MEETING_TITLE_PATTERN_EN}. */
export const DEFAULT_MEETING_TITLE_PATTERN = DEFAULT_MEETING_TITLE_PATTERN_EN;

export function defaultMeetingTitlePatternForLanguage(
  language: BookLanguage,
): string {
  return language === "en"
    ? DEFAULT_MEETING_TITLE_PATTERN_EN
    : DEFAULT_MEETING_TITLE_PATTERN_FR;
}

export function effectiveMeetingTitlePattern(
  pattern: string,
  language: BookLanguage = "fr",
): string {
  const t = pattern.trim();
  return t === "" ? defaultMeetingTitlePatternForLanguage(language) : t;
}

export function formatMeetingTitle(
  pattern: string,
  meetingNumber: string,
  meetingDate: string,
  language: BookLanguage = "fr",
): string {
  const p = effectiveMeetingTitlePattern(pattern, language);
  return p
    .replaceAll("{meetingNumber}", meetingNumber.trim())
    .replaceAll("{meetingDate}", meetingDate.trim());
}

/** Empty until both meeting number and date are non-empty (after trim). */
export function meetingTitleFromFields(
  pattern: string,
  meetingNumber: string,
  meetingDate: string,
  language: BookLanguage = "fr",
): string {
  if (meetingNumber.trim() === "" || meetingDate.trim() === "") return "";
  return formatMeetingTitle(pattern, meetingNumber, meetingDate, language);
}
