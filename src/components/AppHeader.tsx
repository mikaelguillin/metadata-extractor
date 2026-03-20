import type React from "react";

type AppHeaderProps = {
  selectedBookName: string | null;
  entryCount: number;
  status: string;
  loading: boolean;
  uploadDisabled: boolean;
  tocStartInput: string;
  tocEndInput: string;
  onTocStartChange: React.ChangeEventHandler<HTMLInputElement>;
  onTocEndChange: React.ChangeEventHandler<HTMLInputElement>;
  tocRangeHint: string | null;
  onFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onClearAll: () => void;
};

export function AppHeader({
  selectedBookName,
  entryCount,
  status,
  loading,
  uploadDisabled,
  tocStartInput,
  tocEndInput,
  onTocStartChange,
  onTocEndChange,
  tocRangeHint,
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

      {selectedBookName && (
        <div className="toc-range-bar">
          <span className="toc-range-label">
            Table des matières — pages du PDF (inclus, ordre du fichier)
          </span>
          <div className="toc-range-inputs">
            <label className="toc-range-field">
              <span className="toc-range-field-caption">Début</span>
              <input
                type="number"
                className="toc-range-input monospace"
                min={1}
                step={1}
                value={tocStartInput}
                onChange={onTocStartChange}
                placeholder="ex. 5"
                aria-invalid={!!tocRangeHint}
              />
            </label>
            <span className="toc-range-sep">—</span>
            <label className="toc-range-field">
              <span className="toc-range-field-caption">Fin</span>
              <input
                type="number"
                className="toc-range-input monospace"
                min={1}
                step={1}
                value={tocEndInput}
                onChange={onTocEndChange}
                placeholder="ex. 12"
                aria-invalid={!!tocRangeHint}
              />
            </label>
          </div>
          {tocRangeHint && (
            <p className="toc-range-hint" role="status">
              {tocRangeHint}
            </p>
          )}
        </div>
      )}

      {status && <div className="status">{loading ? `⏳ ${status}` : status}</div>}
    </>
  );
}
