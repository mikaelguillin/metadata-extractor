import "../lib/pdf/worker";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { AppHeader } from "../components/AppHeader";
import { BooksPanel } from "../components/BooksPanel";
import { SessionsTable } from "../components/SessionsTable";
import { usePersistedBooks } from "../hooks/usePersistedBooks";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildSessions } from "../lib/sessions/buildSessions";
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
  const [tocStartInput, setTocStartInput] = useState("");
  const [tocEndInput, setTocEndInput] = useState("");

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
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
      );

      patchBook(selectedBookId, {
        pdfFileName: file.name,
        tocPageStart: tocRange.start,
        tocPageEnd: tocRange.end,
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
    updates: Pick<
      SessionEntry,
      "sessionNumber" | "dateText" | "description"
    >,
  ) => {
    if (!selectedBookId) return;
    const next = (selectedBook?.entries ?? []).map((entry) =>
      entry.id === id ? { ...entry, ...updates } : entry,
    );
    patchBook(selectedBookId, { entries: next });
  };

  const handleClearAll = () => {
    if (!selectedBookId) return;
    patchBook(selectedBookId, { entries: [], pdfFileName: null });
    setStatus("Toutes les entrées de ce livre ont été supprimées.");
  };

  const entries = selectedBook?.entries ?? [];
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
            onFileChange={handleFileChange}
            onClearAll={handleClearAll}
          />

          <div className="table-wrapper">
            <SessionsTable
              entries={entries}
              emptyMessage={emptyTableMessage}
              onDelete={handleDeleteEntry}
              onUpdateEntry={handleUpdateEntry}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
