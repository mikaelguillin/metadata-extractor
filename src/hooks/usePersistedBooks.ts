import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultMeetingTitlePatternForLanguage,
  DEFAULT_SYMBOL_PREFIX,
  effectiveMeetingTitlePattern,
  meetingTitleFromFields,
} from "../lib/meetings/meetingTitlePattern";
import { deletePdfBlob } from "../lib/storage/pdfBlobStore";
import type { Book, BookLanguage } from "../types/book";
import type { MeetingEntry } from "../types/meeting";

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
      const symbolPrefixDefault = DEFAULT_SYMBOL_PREFIX;
      const books = parsed.books.map((b) => {
        const language: BookLanguage = b.language ?? "fr";
        const symbolPrefix = b.symbolPrefix ?? symbolPrefixDefault;
        const meetingTitlePattern = effectiveMeetingTitlePattern(
          b.meetingTitlePattern ?? "",
          language,
        );
        return {
          ...b,
          language,
          symbolPrefix,
          meetingTitlePattern,
          pdfBlobKey: b.pdfBlobKey ?? null,
          tocPageStart: b.tocPageStart ?? null,
          tocPageEnd: b.tocPageEnd ?? null,
          entries: (b.entries ?? []).map((e) => {
            const row = e as Partial<MeetingEntry>;
            const meetingNumber = String(row.meetingNumber ?? "").trim();
            const dateText =
              row.dateText != null ? String(row.dateText) : "";
            const symbol =
              row.symbol != null && String(row.symbol).trim() !== ""
                ? String(row.symbol).trim()
                : symbolPrefix + meetingNumber;
            const meetingTitle = meetingTitleFromFields(
              meetingTitlePattern,
              meetingNumber,
              dateText,
              language,
            );
            return {
              id: String(row.id ?? ""),
              page: Number(row.page) || 0,
              meetingNumber,
              symbol,
              dateText,
              meetingTitle,
              description: String(row.description ?? ""),
            };
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
    (name: string, language: BookLanguage) => {
      const id = crypto.randomUUID();
      const book: Book = {
        id,
        name,
        language,
        symbolPrefix: DEFAULT_SYMBOL_PREFIX,
        meetingTitlePattern: defaultMeetingTitlePatternForLanguage(language),
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
          | "name"
          | "symbolPrefix"
          | "meetingTitlePattern"
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
