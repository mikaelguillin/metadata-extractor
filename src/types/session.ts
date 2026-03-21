export type SessionEntry = {
  id: string;
  page: number;
  sessionNumber: string;
  /** Full symbol: book `symbolPrefix` + `sessionNumber` (persisted). */
  symbol: string;
  dateText: string;
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
