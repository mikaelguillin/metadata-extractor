import "../lib/pdf/worker";
import type React from "react";
import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { AppHeader } from "../components/AppHeader";
import { BooksPanel } from "../components/BooksPanel";
import { SessionsTable } from "../components/SessionsTable";
import { usePersistedBooks } from "../hooks/usePersistedBooks";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildSessions } from "../lib/sessions/buildSessions";
import type { SessionEntry } from "../types/session";

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

  const uploadDisabled = !selectedBookId;

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBookId) return;

    setStatus(`Chargement du PDF "${file.name}"…`);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setStatus(`PDF chargé (${doc.numPages} pages). Extraction du texte…`);

      const pages = await extractTextItems(doc);
      setStatus(`Texte extrait. Construction des documents…`);

      const sessions = buildSessions(
        pages.map((p) => ({
          page: p.page,
          items: p.items,
        })),
      );

      patchBook(selectedBookId, {
        pdfFileName: file.name,
        entries: sessions,
      });
      setStatus(`Terminé. ${sessions.length} document(s) détectée(s).`);
    } catch (err) {
      console.error(err);
      setStatus("Erreur lors du traitement du PDF.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
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
    updates: Pick<SessionEntry, "dateText" | "description">,
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
      ? "Chargez un PDF pour ce livre (une table des matières donne de meilleurs résultats)."
      : "Aucun document détecté dans ce PDF.";

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
