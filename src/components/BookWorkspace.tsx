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
import { ScrollArea } from "@/components/ui/scroll-area";
import { appToastManager } from "@/lib/appToast";

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
    appToastManager.add({
      description: "Toutes les entrées de ce livre ont été supprimées.",
    });
  };

  const handleDownloadExcerpt = useCallback(
    async (entryId: string) => {
      if (!bookId || !book) return;
      if (
        !book.pdfBlobKey ||
        book.tocPageEnd == null ||
        book.entries.length === 0
      ) {
        appToastManager.add({
          type: "error",
          description:
            "PDF du livre introuvable. Veuillez recharger le fichier PDF.",
        });
        return;
      }
      setExcerptDownloadingId(entryId);
      const toastId = appToastManager.add({
        type: "loading",
        description: "Préparation de l’extrait PDF…",
        timeout: 0,
      });
      try {
        await downloadSessionExcerptPdf({
          bookId,
          tocPageEnd: book.tocPageEnd,
          entries: book.entries,
          entryId,
        });
        appToastManager.update(toastId, {
          type: "success",
          description: "Extrait PDF téléchargé.",
          timeout: 5000,
        });
      } catch (err) {
        console.error(err);
        appToastManager.update(toastId, {
          type: "error",
          description:
            err instanceof Error
              ? err.message
              : "Erreur lors de la création de l’extrait PDF.",
          timeout: 7000,
        });
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
    <div className="min-w-0">
      <AppHeader
        selectedBookName={book?.name ?? null}
        entryCount={entries.length}
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

      <ScrollArea className="h-[65vh] rounded-xl border border-border bg-card ring-1 ring-foreground/10">
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
      </ScrollArea>
    </div>
  );
}
