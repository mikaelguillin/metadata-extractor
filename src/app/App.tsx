import "../lib/pdf/worker";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { AppHeader } from "../components/AppHeader";
import { BooksPanel } from "../components/BooksPanel";
import { SessionsTable } from "../components/SessionsTable";
import { usePersistedBooks } from "../hooks/usePersistedBooks";
import { downloadSessionExcerptPdf } from "../lib/pdf/downloadSessionExcerpt";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildSessions } from "../lib/sessions/buildSessions";
import {
  effectiveSessionTitlePattern,
  sessionTitleFromFields,
} from "../lib/sessions/sessionTitlePattern";
import { savePdfBlob } from "../lib/storage/pdfBlobStore";
import type { SessionEntry } from "../types/session";

function parsePositiveInt(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export const App: React.FC = () => {
  const {
    books,
    selectedBookId,
    selectedBook,
    addBook,
    deleteBook,
    selectBook,
    patchBook,
  } = usePersistedBooks();
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [excerptDownloadingId, setExcerptDownloadingId] = useState<
    string | null
  >(null);
  const [tocStartInput, setTocStartInput] = useState("");
  const [tocEndInput, setTocEndInput] = useState("");
  const [symbolPrefixInput, setSymbolPrefixInput] = useState("");
  const [sessionTitlePatternInput, setSessionTitlePatternInput] =
    useState("");

  const selectedBookRef = useRef(selectedBook);
  selectedBookRef.current = selectedBook;

  useEffect(() => {
    if (!selectedBook) {
      setTocStartInput("");
      setTocEndInput("");
      return;
    }
    setTocStartInput(
      selectedBook.tocPageStart != null ? String(selectedBook.tocPageStart) : "",
    );
    setTocEndInput(
      selectedBook.tocPageEnd != null ? String(selectedBook.tocPageEnd) : "",
    );
  }, [
    selectedBookId,
    selectedBook?.tocPageStart,
    selectedBook?.tocPageEnd,
  ]);

  useEffect(() => {
    if (!selectedBook) {
      setSymbolPrefixInput("");
      return;
    }
    setSymbolPrefixInput(selectedBook.symbolPrefix);
  }, [selectedBookId, selectedBook?.symbolPrefix]);

  useEffect(() => {
    if (!selectedBook) {
      setSessionTitlePatternInput("");
      return;
    }
    setSessionTitlePatternInput(selectedBook.sessionTitlePattern);
  }, [selectedBookId, selectedBook?.sessionTitlePattern]);

  useEffect(() => {
    if (!selectedBookId) return;
    const t = window.setTimeout(() => {
      const book = selectedBookRef.current;
      if (!book || book.id !== selectedBookId) return;
      if (symbolPrefixInput === book.symbolPrefix) return;
      patchBook(selectedBookId, {
        symbolPrefix: symbolPrefixInput,
        entries: book.entries.map((e) => ({
          ...e,
          symbol: symbolPrefixInput + e.sessionNumber,
        })),
      });
    }, 350);
    return () => clearTimeout(t);
  }, [symbolPrefixInput, selectedBookId, patchBook]);

  useEffect(() => {
    if (!selectedBookId) return;
    const t = window.setTimeout(() => {
      const book = selectedBookRef.current;
      if (!book || book.id !== selectedBookId) return;
      const nextPattern = effectiveSessionTitlePattern(
        sessionTitlePatternInput,
      );
      const bookPattern = effectiveSessionTitlePattern(
        book.sessionTitlePattern,
      );
      if (nextPattern === bookPattern) return;
      patchBook(selectedBookId, {
        sessionTitlePattern: nextPattern,
        entries: book.entries.map((e) => ({
          ...e,
          sessionTitle: sessionTitleFromFields(
            nextPattern,
            e.sessionNumber,
            e.dateText,
          ),
        })),
      });
    }, 350);
    return () => clearTimeout(t);
  }, [sessionTitlePatternInput, selectedBookId, patchBook]);

  const tocRange = useMemo(() => {
    const start = parsePositiveInt(tocStartInput);
    const end = parsePositiveInt(tocEndInput);
    if (start === null || end === null) return { ok: false as const };
    if (start > end) return { ok: false as const };
    return { ok: true as const, start, end };
  }, [tocStartInput, tocEndInput]);

  const tocRangeHint = useMemo((): string | null => {
    if (!selectedBookId) return null;
    const tStart = tocStartInput.trim();
    const tEnd = tocEndInput.trim();
    if (tStart === "" && tEnd === "") {
      return "Indiquez la première et la dernière page de la table des matières (indices du fichier PDF).";
    }
    if (tStart === "" || tEnd === "") {
      return "Les deux champs sont requis.";
    }
    const start = parsePositiveInt(tocStartInput);
    const end = parsePositiveInt(tocEndInput);
    if (start === null || end === null) {
      return "Entrez des nombres entiers ≥ 1.";
    }
    if (start > end) {
      return "La page de début doit être inférieure ou égale à la page de fin.";
    }
    return null;
  }, [selectedBookId, tocStartInput, tocEndInput]);

  const uploadDisabled = !selectedBookId || !tocRange.ok;

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBookId) return;

    if (!tocRange.ok) {
      setStatus("Plage de pages ToC invalide.");
      e.target.value = "";
      return;
    }

    setStatus(`Chargement du PDF "${file.name}"…`);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // PDF.js may detach the buffer passed to getDocument; keep the original for IndexedDB.
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const doc = await loadingTask.promise;

      if (tocRange.end > doc.numPages) {
        setStatus(
          `La page fin (${tocRange.end}) dépasse le nombre de pages du PDF (${doc.numPages}).`,
        );
        return;
      }

      setStatus(
        `PDF chargé (${doc.numPages} pages). Extraction du texte des pages ${tocRange.start}–${tocRange.end}…`,
      );

      const pages = await extractTextItems(doc, {
        start: tocRange.start,
        end: tocRange.end,
      });
      setStatus(`Texte extrait. Construction des documents…`);

      const sessions = buildSessions(
        pages.map((p) => ({
          page: p.page,
          items: p.items,
        })),
        symbolPrefixInput,
        effectiveSessionTitlePattern(sessionTitlePatternInput),
      );

      await savePdfBlob(selectedBookId, arrayBuffer);

      patchBook(selectedBookId, {
        pdfFileName: file.name,
        pdfBlobKey: selectedBookId,
        tocPageStart: tocRange.start,
        tocPageEnd: tocRange.end,
        symbolPrefix: symbolPrefixInput,
        sessionTitlePattern: effectiveSessionTitlePattern(
          sessionTitlePatternInput,
        ),
        entries: sessions,
      });
      setStatus(`Terminé. ${sessions.length} document(s) détectée(s) (pages ToC ${tocRange.start}–${tocRange.end}).`);
    } catch (err) {
      console.error(err);
      setStatus("Erreur lors du traitement du PDF.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

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

  const handleDeleteEntry = (id: string) => {
    if (!selectedBookId) return;
    const next = (selectedBook?.entries ?? []).filter(
      (entry) => entry.id !== id,
    );
    patchBook(selectedBookId, {
      entries: next,
      pdfFileName:
        next.length === 0 ? null : (selectedBook?.pdfFileName ?? null),
    });
  };

  const handleUpdateEntry = (
    id: string,
    updates: Partial<
      Pick<SessionEntry, "sessionNumber" | "dateText" | "description">
    >,
  ) => {
    if (!selectedBookId || !selectedBook) return;
    const prefix = symbolPrefixInput;
    const pattern = effectiveSessionTitlePattern(
      selectedBook.sessionTitlePattern,
    );
    const next = selectedBook.entries.map((entry) => {
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
    patchBook(selectedBookId, { entries: next });
  };

  const handleSymbolPrefixChange: React.ChangeEventHandler<HTMLInputElement> = (
    ev,
  ) => {
    setSymbolPrefixInput(ev.target.value);
  };

  const handleSessionTitlePatternChange: React.ChangeEventHandler<
    HTMLTextAreaElement
  > = (ev) => {
    setSessionTitlePatternInput(ev.target.value);
  };

  const handleClearAll = () => {
    if (!selectedBookId) return;
    patchBook(selectedBookId, { entries: [], pdfFileName: null });
    setStatus("Toutes les entrées de ce livre ont été supprimées.");
  };

  const handleDownloadExcerpt = useCallback(
    async (entryId: string) => {
      if (!selectedBookId || !selectedBook) return;
      if (
        !selectedBook.pdfBlobKey ||
        selectedBook.tocPageEnd == null ||
        selectedBook.entries.length === 0
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
          bookId: selectedBookId,
          tocPageEnd: selectedBook.tocPageEnd,
          entries: selectedBook.entries,
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
    [selectedBook, selectedBookId],
  );

  const entries = selectedBook?.entries ?? [];
  const excerptDownloadEnabled =
    !!selectedBook?.pdfBlobKey &&
    selectedBook.tocPageEnd != null &&
    entries.length > 0;
  const emptyTableMessage = !selectedBookId
    ? "Sélectionnez un livre dans la liste."
    : !selectedBook?.pdfFileName
      ? "Indiquez la plage de pages de la table des matières, puis chargez le PDF du livre entier."
      : "Aucun document détecté dans la plage ToC indiquée.";

  return (
    <div className="app">
      <div className="card layout-with-books">
        <BooksPanel
          books={books}
          selectedBookId={selectedBookId}
          onSelect={selectBook}
          onAdd={addBook}
          onRename={(id, nextName) => patchBook(id, { name: nextName })}
          onDelete={deleteBook}
        />
        <div className="main-column">
          <AppHeader
            selectedBookName={selectedBook?.name ?? null}
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
      </div>
    </div>
  );
};
