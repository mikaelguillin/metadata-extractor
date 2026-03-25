export type MeetingEntry = {
  id: string;
  page: number;
  meetingNumber: string;
  /** Full symbol: book `symbolPrefix` + `meetingNumber` (persisted). */
  symbol: string;
  dateText: string;
  /** Formatted from the book pattern, meeting number, and date (recomputed when those change). */
  meetingTitle: string;
  description: string;
};

export type FlatTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
};
