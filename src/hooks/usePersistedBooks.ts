import { useCallback, useEffect, useMemo, useState } from "react";
import { extractSessionNumber } from "../lib/sessions/lineHeuristics";
import { deletePdfBlob } from "../lib/storage/pdfBlobStore";
import type { Book } from "../types/book";
import type { SessionEntry } from "../types/session";

const STORAGE_KEY = "metadataExtractorBooks";

type PersistedState = {
  books: Book[];
  selectedBookId: string | null;
};

export function usePersistedBooks() {
  const [state, setState] = useState<PersistedState>({
    books: [],
    selectedBookId: null,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedState;
      if (!Array.isArray(parsed.books)) return;
      let selectedBookId = parsed.selectedBookId ?? null;
      if (
        selectedBookId &&
        !parsed.books.some((b) => b.id === selectedBookId)
      ) {
        selectedBookId = parsed.books[0]?.id ?? null;
      }
      const symbolPrefixDefault = "";
      const books = parsed.books.map((b) => {
        const symbolPrefix = b.symbolPrefix ?? symbolPrefixDefault;
        return {
          ...b,
          symbolPrefix,
          pdfBlobKey: b.pdfBlobKey ?? null,
          tocPageStart: b.tocPageStart ?? null,
          tocPageEnd: b.tocPageEnd ?? null,
          entries: (b.entries ?? []).map((e) => {
            const legacy = e as SessionEntry & { sessionLabel?: string };
            const sessionNumber =
              legacy.sessionNumber ??
              (legacy.sessionLabel != null
                ? extractSessionNumber(legacy.sessionLabel) ||
                  String(legacy.sessionLabel).trim()
                : "");
            const { sessionLabel: _omit, symbol: _prevSym, ...rest } = legacy;
            const symbol =
              legacy.symbol != null && String(legacy.symbol).trim() !== ""
                ? String(legacy.symbol)
                : symbolPrefix + "SR." + sessionNumber;
            return { ...rest, sessionNumber, symbol };
          }),
        };
      });
      const next: PersistedState = {
        books,
        selectedBookId,
      };
      setState(next);
      if (selectedBookId !== (parsed.selectedBookId ?? null)) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // ignore
    }
  }, []);

  const addBook = useCallback(
    (name: string) => {
      const id = crypto.randomUUID();
      const book: Book = {
        id,
        name,
        symbolPrefix: "",
        pdfFileName: null,
        pdfBlobKey: null,
        tocPageStart: null,
        tocPageEnd: null,
        entries: [],
      };
      setState((prev) => {
        const next: PersistedState = {
          books: [...prev.books, book],
          selectedBookId: id,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const deleteBook = useCallback((id: string) => {
    void deletePdfBlob(id).catch(() => {});
    setState((prev) => {
      const books = prev.books.filter((b) => b.id !== id);
      let selectedBookId = prev.selectedBookId;
      if (selectedBookId === id) {
        selectedBookId = books[0]?.id ?? null;
      }
      const next: PersistedState = { books, selectedBookId };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const selectBook = useCallback(
    (id: string | null) => {
      setState((prev) => {
        const next: PersistedState = { ...prev, selectedBookId: id };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const patchBook = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Book,
          | "symbolPrefix"
          | "pdfFileName"
          | "pdfBlobKey"
          | "entries"
          | "tocPageStart"
          | "tocPageEnd"
        >
      >,
    ) => {
      setState((prev) => {
        const books = prev.books.map((b) =>
          b.id === id ? { ...b, ...patch } : b
        );
        const next: PersistedState = { ...prev, books };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const selectedBook = useMemo(
    () => state.books.find((b) => b.id === state.selectedBookId) ?? null,
    [state.books, state.selectedBookId]
  );

  return {
    books: state.books,
    selectedBookId: state.selectedBookId,
    selectedBook,
    addBook,
    deleteBook,
    selectBook,
    patchBook,
  };
}
