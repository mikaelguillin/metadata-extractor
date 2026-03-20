import { useCallback, useEffect, useState } from "react";
import type { SessionEntry } from "../types/session";

const STORAGE_KEY = "twoColumnPdfSessions";

export function usePersistedSessions() {
  const [entries, setEntries] = useState<SessionEntry[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SessionEntry[];
      setEntries(parsed);
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((data: SessionEntry[]) => {
    setEntries(data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  return { entries, persist };
}
