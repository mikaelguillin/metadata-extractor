import type React from "react";

type AppHeaderProps = {
  entryCount: number;
  status: string;
  loading: boolean;
  onFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onClearAll: () => void;
};

export function AppHeader({
  entryCount,
  status,
  loading,
  onFileChange,
  onClearAll,
}: AppHeaderProps) {
  return (
    <>
      <div className="header">
        <div>
          <div className="title">Analyseur de PDF</div>
          <div className="subtitle">Détecte les documents et persiste le résultat.</div>
        </div>
        <div className="controls">
          <label className="file-input-label">
            <span>Choisir un PDF</span>
            <span className="pill monospace">pdfjs-dist</span>
            <input type="file" accept="application/pdf" onChange={onFileChange} />
          </label>
          <button
            className="button danger"
            onClick={onClearAll}
            disabled={entryCount === 0}
          >
            Clear All
          </button>
          <div className="badge">
            <span className="badge-dot" />
            <span>{entryCount} entrées</span>
          </div>
        </div>
      </div>

      {status && <div className="status">{loading ? `⏳ ${status}` : status}</div>}
    </>
  );
}
