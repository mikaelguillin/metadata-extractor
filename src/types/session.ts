export type SessionEntry = {
  id: string;
  page: number;
  sessionNumber: string;
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
