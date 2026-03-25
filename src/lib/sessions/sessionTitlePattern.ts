/** Default when the book pattern is empty or missing. */
export const DEFAULT_SESSION_TITLE_PATTERN = "General Assembly, nth session, official records, nth Committee, summary record of the {sessionNumber}th meeting, {sessionDate}, New York";

export function effectiveSessionTitlePattern(pattern: string): string {
  const t = pattern.trim();
  return t === "" ? DEFAULT_SESSION_TITLE_PATTERN : t;
}

export function formatSessionTitle(
  pattern: string,
  sessionNumber: string,
  sessionDate: string,
): string {
  const p = effectiveSessionTitlePattern(pattern);
  return p
    .replaceAll("{sessionNumber}", sessionNumber.trim())
    .replaceAll("{sessionDate}", sessionDate.trim());
}

/** Empty until both session number and date are non-empty (after trim). */
export function sessionTitleFromFields(
  pattern: string,
  sessionNumber: string,
  sessionDate: string,
): string {
  if (sessionNumber.trim() === "" || sessionDate.trim() === "") return "";
  return formatSessionTitle(pattern, sessionNumber, sessionDate);
}
