import type React from "react";

type AppHeaderProps = {
  selectedBookName: string | null;
  entryCount: number;
  status: string;
  loading: boolean;
  uploadDisabled: boolean;
  onFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onClearAll: () => void;
};

export function AppHeader({
  selectedBookName,
  entryCount,
  status,
  loading,
  uploadDisabled,
  onFileChange,
  onClearAll,
}: AppHeaderProps) {
  return (
    <>
      <div className="header">
        <div>
          <div className="title">Analyseur de PDF</div>
          <div className="subtitle">
            {selectedBookName ? (
              <>
                Livre sélectionné : <strong>{selectedBookName}</strong>
              </>
            ) : (
              <>Sélectionnez un livre pour charger un PDF.</>
            )}
          </div>
        </div>
        <div className="controls">
          <label
            className={`file-input-label${uploadDisabled ? " disabled" : ""}`}
            aria-disabled={uploadDisabled}
          >
            <span>Choisir un PDF</span>
            <span className="pill monospace">pdfjs-dist</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              disabled={uploadDisabled}
            />
          </label>
          <button
            className="button danger"
            onClick={onClearAll}
            disabled={entryCount === 0 || uploadDisabled}
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
