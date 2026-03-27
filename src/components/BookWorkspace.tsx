import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./AppHeader";
import { MeetingsTable } from "./MeetingsTable";
import { useBookPdfUpload } from "../hooks/useBookPdfUpload";
import { downloadMeetingExcerptPdf } from "../lib/pdf/downloadMeetingExcerpt";
import {
  createAdjacentMeetingEntry,
  type AdjacentPlacement,
} from "../lib/meetings/adjacentMeeting";
import {
  effectiveMeetingTitlePattern,
  meetingTitleFromFields,
} from "../lib/meetings/meetingTitlePattern";
import {
  computeTocRange,
  computeTocRangeHint,
} from "../lib/tocRange";
import type { Book } from "../types/book";
import type { MeetingEntry } from "../types/meeting";
import { appToastManager } from "@/lib/appToast";

type PatchBook = (
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
  const [meetingTitlePatternInput, setMeetingTitlePatternInput] = useState(
    () => book?.meetingTitlePattern ?? "",
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

  const { loading, handlePdfFile, handleFileChange } = useBookPdfUpload({
    bookId,
    tocRange,
    symbolPrefixInput,
    meetingTitlePatternInput,
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
            symbol: value + e.meetingNumber,
          })),
        });
      }, 350);
    },
    [bookId, patchBook],
  );

  const scheduleMeetingTitlePatternPatch = useCallback(
    (rawInput: string) => {
      if (!bookId) return;
      if (patternPatchTimerRef.current != null) {
        window.clearTimeout(patternPatchTimerRef.current);
      }
      patternPatchTimerRef.current = window.setTimeout(() => {
        patternPatchTimerRef.current = null;
        const b = bookRef.current;
        if (!b || b.id !== bookId) return;
        const nextPattern = effectiveMeetingTitlePattern(rawInput);
        const bookPattern = effectiveMeetingTitlePattern(b.meetingTitlePattern);
        if (nextPattern === bookPattern) return;
        patchBook(bookId, {
          meetingTitlePattern: nextPattern,
          entries: b.entries.map((e) => ({
            ...e,
            meetingTitle: meetingTitleFromFields(
              nextPattern,
              e.meetingNumber,
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

  const handleMeetingTitlePatternChange: React.ChangeEventHandler<
    HTMLTextAreaElement
  > = (ev) => {
    const value = ev.target.value;
    setMeetingTitlePatternInput(value);
    scheduleMeetingTitlePatternPatch(value);
  };

  const handleDeleteEntry = (id: string) => {
    if (!bookId) return;
    const next = (book?.entries ?? []).filter((entry) => entry.id !== id);
    patchBook(bookId, {
      entries: next,
      pdfFileName: next.length === 0 ? null : (book?.pdfFileName ?? null),
    });
  };

  const handleAddMeetingAdjacent = (
    anchorId: string,
    placement: AdjacentPlacement,
  ) => {
    if (!bookId || !book) return;
    const idx = book.entries.findIndex((e) => e.id === anchorId);
    if (idx === -1) return;
    const anchor = book.entries[idx];
    const insertIndex = placement === "before" ? idx : idx + 1;
    const newEntry = createAdjacentMeetingEntry(
      anchor,
      placement,
      symbolPrefixInput,
      book.meetingTitlePattern,
    );
    const next = [
      ...book.entries.slice(0, insertIndex),
      newEntry,
      ...book.entries.slice(insertIndex),
    ];
    patchBook(bookId, { entries: next });
  };

  const handleUpdateEntry = (
    id: string,
    updates: Partial<
      Pick<MeetingEntry, "meetingNumber" | "dateText" | "description">
    >,
  ) => {
    if (!bookId || !book) return;
    const prefix = symbolPrefixInput;
    const pattern = effectiveMeetingTitlePattern(book.meetingTitlePattern);
    const next = book.entries.map((entry) => {
      if (entry.id !== id) return entry;
      const merged = { ...entry };
      if (updates.meetingNumber !== undefined) {
        merged.meetingNumber = updates.meetingNumber.trim();
        merged.symbol = prefix + merged.meetingNumber;
      }
      if (updates.dateText !== undefined) {
        merged.dateText = updates.dateText.trim();
      }
      if (updates.description !== undefined) {
        merged.description = updates.description.trim();
      }
      if (
        updates.meetingNumber !== undefined ||
        updates.dateText !== undefined
      ) {
        merged.meetingTitle = meetingTitleFromFields(
          pattern,
          merged.meetingNumber,
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
      description: "All entries for this book have been removed.",
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
            "Book PDF not found. Please upload the PDF file again.",
        });
        return;
      }
      setExcerptDownloadingId(entryId);
      const toastId = appToastManager.add({
        type: "loading",
        description: "Preparing PDF excerpt…",
        timeout: 0,
      });
      try {
        await downloadMeetingExcerptPdf({
          bookId,
          tocPageEnd: book.tocPageEnd,
          entries: book.entries,
          entryId,
        });
        appToastManager.update(toastId, {
          type: "success",
          description: "PDF excerpt downloaded.",
          timeout: 5000,
        });
      } catch (err) {
        console.error(err);
        appToastManager.update(toastId, {
          type: "error",
          description:
            err instanceof Error
              ? err.message
              : "Could not create the PDF for this meeting.",
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
    ? "Select a book from the list."
    : !book?.pdfFileName
      ? "Set the table of contents page range, then upload the full book PDF."
      : "No meetings detected in the given ToC page range.";

  return (
    <div className="min-w-0">
      <AppHeader
        selectedBookName={book?.name ?? null}
        entryCount={entries.length}
        uploadDisabled={uploadDisabled}
        tocStartInput={tocStartInput}
        tocEndInput={tocEndInput}
        onTocStartChange={handleTocStartChange}
        onTocEndChange={handleTocEndChange}
        tocRangeHint={tocRangeHint}
        symbolPrefixInput={symbolPrefixInput}
        onSymbolPrefixChange={handleSymbolPrefixChange}
        meetingTitlePatternInput={meetingTitlePatternInput}
        onMeetingTitlePatternChange={handleMeetingTitlePatternChange}
        onClearAll={handleClearAll}
      />

      <MeetingsTable
        entries={entries}
        meetingTitlePattern={effectiveMeetingTitlePattern(
          meetingTitlePatternInput,
        )}
        emptyMessage={emptyTableMessage}
        pdfDropZone={!!bookId && !book?.pdfFileName}
        uploadDisabled={uploadDisabled}
        pdfUploading={loading}
        onPdfFile={handlePdfFile}
        onPdfFileInputChange={handleFileChange}
        onDelete={handleDeleteEntry}
        onAddMeetingAdjacent={handleAddMeetingAdjacent}
        onUpdateEntry={handleUpdateEntry}
        excerptDownloadEnabled={excerptDownloadEnabled}
        excerptDownloadingId={excerptDownloadingId}
        onDownloadExcerpt={handleDownloadExcerpt}
      />
    </div>
  );
}
