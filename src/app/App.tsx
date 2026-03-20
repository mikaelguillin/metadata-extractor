import "../lib/pdf/worker";
import type React from "react";
import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { AppHeader } from "../components/AppHeader";
import { SessionsTable } from "../components/SessionsTable";
import { usePersistedSessions } from "../hooks/usePersistedSessions";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildSessions } from "../lib/sessions/buildSessions";

export const App: React.FC = () => {
  const { entries, persist } = usePersistedSessions();
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        }))
      );

      persist(sessions);
      setStatus(`Terminé. ${sessions.length} document(s) détectée(s).`);
    } catch (err) {
      console.error(err);
      setStatus("Erreur lors du traitement du PDF.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (id: string) => {
    const next = entries.filter((entry) => entry.id !== id);
    persist(next);
  };

  const handleClearAll = () => {
    persist([]);
    setStatus("Toutes les entrées ont été supprimées.");
  };

  return (
    <div className="app">
      <div className="card">
        <AppHeader
          entryCount={entries.length}
          status={status}
          loading={loading}
          onFileChange={handleFileChange}
          onClearAll={handleClearAll}
        />

        <div className="table-wrapper">
          <SessionsTable entries={entries} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
};
