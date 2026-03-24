import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./AppHeader";
import { SessionsTable } from "./SessionsTable";
import { useBookPdfUpload } from "../hooks/useBookPdfUpload";
import { downloadSessionExcerptPdf } from "../lib/pdf/downloadSessionExcerpt";
import {
  effectiveSessionTitlePattern,
  sessionTitleFromFields,
} from "../lib/sessions/sessionTitlePattern";
import {
  computeTocRange,
  computeTocRangeHint,
} from "../lib/tocRange";
import type { Book } from "../types/book";
import type { SessionEntry } from "../types/session";

type PatchBook = (
  id: string,
  patch: Partial<
    Pick<
      Book,
      | "name"
      | "symbolPrefix"
      | "sessionTitlePattern"
      | "pdfFileName"
      | "pdfBlobKey"
      | "entries"
      | "tocPageStart"
      | "tocPageEnd"
    >
  >,
) => void;

export type BookWorkspaceProps = {
  book: Book | null;
  bookId: string | null;
  patchBook: PatchBook;
};

function initialTocStart(book: Book | null): string {
  return book?.tocPageStart != null ? String(book.tocPageStart) : "";
}

function initialTocEnd(book: Book | null): string {
  return book?.tocPageEnd != null ? String(book.tocPageEnd) : "";
}

export function BookWorkspace({ book, bookId, patchBook }: BookWorkspaceProps) {
  const [status, setStatus] = useState("");
  const [excerptDownloadingId, setExcerptDownloadingId] = useState<
    string | null
  >(null);
  const [tocStartInput, setTocStartInput] = useState(() => initialTocStart(book));
  const [tocEndInput, setTocEndInput] = useState(() => initialTocEnd(book));
  const [symbolPrefixInput, setSymbolPrefixInput] = useState(
    () => book?.symbolPrefix ?? "",
  );
  const [sessionTitlePatternInput, setSessionTitlePatternInput] = useState(
    () => book?.sessionTitlePattern ?? "",
  );

  const bookRef = useRef(book);
  bookRef.current = book;

  const symbolPatchTimerRef = useRef<number | null>(null);
  const patternPatchTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (symbolPatchTimerRef.current != null) {
        window.clearTimeout(symbolPatchTimerRef.current);
      }
      if (patternPatchTimerRef.current != null) {
        window.clearTimeout(patternPatchTimerRef.current);
      }
    },
    [],
  );

  const tocRange = useMemo(
    () => computeTocRange(tocStartInput, tocEndInput),
    [tocStartInput, tocEndInput],
  );

  const tocRangeHint = useMemo(
    () => computeTocRangeHint(!!bookId, tocStartInput, tocEndInput),
    [bookId, tocStartInput, tocEndInput],
  );

  const { loading, handleFileChange } = useBookPdfUpload({
    bookId,
    tocRange,
    symbolPrefixInput,
    sessionTitlePatternInput,
    patchBook,
    setStatus,
  });

  const uploadDisabled = !bookId || !tocRange.ok;

  const scheduleSymbolPrefixPatch = useCallback(
    (value: string) => {
      if (!bookId) return;
      if (symbolPatchTimerRef.current != null) {
        window.clearTimeout(symbolPatchTimerRef.current);
      }
      symbolPatchTimerRef.current = window.setTimeout(() => {
        symbolPatchTimerRef.current = null;
        const b = bookRef.current;
        if (!b || b.id !== bookId) return;
        if (value === b.symbolPrefix) return;
        patchBook(bookId, {
          symbolPrefix: value,
          entries: b.entries.map((e) => ({
            ...e,
            symbol: value + e.sessionNumber,
          })),
        });
      }, 350);
    },
    [bookId, patchBook],
  );

  const scheduleSessionTitlePatternPatch = useCallback(
    (rawInput: string) => {
      if (!bookId) return;
      if (patternPatchTimerRef.current != null) {
        window.clearTimeout(patternPatchTimerRef.current);
      }
      patternPatchTimerRef.current = window.setTimeout(() => {
        patternPatchTimerRef.current = null;
        const b = bookRef.current;
        if (!b || b.id !== bookId) return;
        const nextPattern = effectiveSessionTitlePattern(rawInput);
        const bookPattern = effectiveSessionTitlePattern(b.sessionTitlePattern);
        if (nextPattern === bookPattern) return;
        patchBook(bookId, {
          sessionTitlePattern: nextPattern,
          entries: b.entries.map((e) => ({
            ...e,
            sessionTitle: sessionTitleFromFields(
              nextPattern,
              e.sessionNumber,
              e.dateText,
            ),
          })),
        });
      }, 350);
    },
    [bookId, patchBook],
  );

  const handleTocStartChange: React.ChangeEventHandler<HTMLInputElement> = (
    ev,
  ) => {
    setTocStartInput(ev.target.value);
  };

  const handleTocEndChange: React.ChangeEventHandler<HTMLInputElement> = (
    ev,
  ) => {
    setTocEndInput(ev.target.value);
  };

  const handleSymbolPrefixChange: React.ChangeEventHandler<HTMLInputElement> = (
    ev,
  ) => {
    const value = ev.target.value;
    setSymbolPrefixInput(value);
    scheduleSymbolPrefixPatch(value);
  };

  const handleSessionTitlePatternChange: React.ChangeEventHandler<
    HTMLTextAreaElement
  > = (ev) => {
    const value = ev.target.value;
    setSessionTitlePatternInput(value);
    scheduleSessionTitlePatternPatch(value);
  };

  const handleDeleteEntry = (id: string) => {
    if (!bookId) return;
    const next = (book?.entries ?? []).filter((entry) => entry.id !== id);
    patchBook(bookId, {
      entries: next,
      pdfFileName: next.length === 0 ? null : (book?.pdfFileName ?? null),
    });
  };

  const handleUpdateEntry = (
    id: string,
    updates: Partial<
      Pick<SessionEntry, "sessionNumber" | "dateText" | "description">
    >,
  ) => {
    if (!bookId || !book) return;
    const prefix = symbolPrefixInput;
    const pattern = effectiveSessionTitlePattern(book.sessionTitlePattern);
    const next = book.entries.map((entry) => {
      if (entry.id !== id) return entry;
      const merged = { ...entry };
      if (updates.sessionNumber !== undefined) {
        merged.sessionNumber = updates.sessionNumber.trim();
        merged.symbol = prefix + merged.sessionNumber;
      }
      if (updates.dateText !== undefined) {
        merged.dateText = updates.dateText.trim();
      }
      if (updates.description !== undefined) {
        merged.description = updates.description.trim();
      }
      if (
        updates.sessionNumber !== undefined ||
        updates.dateText !== undefined
      ) {
        merged.sessionTitle = sessionTitleFromFields(
          pattern,
          merged.sessionNumber,
          merged.dateText,
        );
      }
      return merged;
    });
    patchBook(bookId, { entries: next });
  };

  const handleClearAll = () => {
    if (!bookId) return;
    patchBook(bookId, { entries: [], pdfFileName: null });
    setStatus("Toutes les entrées de ce livre ont été supprimées.");
  };

  const handleDownloadExcerpt = useCallback(
    async (entryId: string) => {
      if (!bookId || !book) return;
      if (
        !book.pdfBlobKey ||
        book.tocPageEnd == null ||
        book.entries.length === 0
      ) {
        setStatus(
          "PDF du livre introuvable. Veuillez recharger le fichier PDF.",
        );
        return;
      }
      setExcerptDownloadingId(entryId);
      setStatus("Préparation de l'extrait PDF…");
      try {
        await downloadSessionExcerptPdf({
          bookId,
          tocPageEnd: book.tocPageEnd,
          entries: book.entries,
          entryId,
        });
        setStatus("Extrait PDF téléchargé.");
      } catch (err) {
        console.error(err);
        setStatus(
          err instanceof Error
            ? err.message
            : "Erreur lors de la création de l'extrait PDF.",
        );
      } finally {
        setExcerptDownloadingId(null);
      }
    },
    [book, bookId],
  );

  const entries = book?.entries ?? [];
  const excerptDownloadEnabled =
    !!book?.pdfBlobKey &&
    book.tocPageEnd != null &&
    entries.length > 0;
  const emptyTableMessage = !bookId
    ? "Sélectionnez un livre dans la liste."
    : !book?.pdfFileName
      ? "Indiquez la plage de pages de la table des matières, puis chargez le PDF du livre entier."
      : "Aucun document détecté dans la plage ToC indiquée.";

  return (
    <div className="main-column">
      <AppHeader
        selectedBookName={book?.name ?? null}
        entryCount={entries.length}
        status={status}
        loading={loading}
        uploadDisabled={uploadDisabled}
        tocStartInput={tocStartInput}
        tocEndInput={tocEndInput}
        onTocStartChange={handleTocStartChange}
        onTocEndChange={handleTocEndChange}
        tocRangeHint={tocRangeHint}
        symbolPrefixInput={symbolPrefixInput}
        onSymbolPrefixChange={handleSymbolPrefixChange}
        sessionTitlePatternInput={sessionTitlePatternInput}
        onSessionTitlePatternChange={handleSessionTitlePatternChange}
        onFileChange={handleFileChange}
        onClearAll={handleClearAll}
      />

      <div className="table-wrapper">
        <SessionsTable
          entries={entries}
          sessionTitlePattern={effectiveSessionTitlePattern(
            sessionTitlePatternInput,
          )}
          emptyMessage={emptyTableMessage}
          onDelete={handleDeleteEntry}
          onUpdateEntry={handleUpdateEntry}
          excerptDownloadEnabled={excerptDownloadEnabled}
          excerptDownloadingId={excerptDownloadingId}
          onDownloadExcerpt={handleDownloadExcerpt}
        />
      </div>
    </div>
  );
}
