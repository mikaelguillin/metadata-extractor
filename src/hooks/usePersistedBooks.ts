import { useCallback, useEffect, useMemo, useState } from "react";
import type { Book } from "../types/book";

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
      const next: PersistedState = {
        books: parsed.books,
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
      const book: Book = { id, name, pdfFileName: null, entries: [] };
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
    (id: string, patch: Partial<Pick<Book, "pdfFileName" | "entries">>) => {
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
