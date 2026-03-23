import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SessionEntry } from "../types/session";

const SAVE_DEBOUNCE_MS = 400;

type SessionsTableProps = {
  entries: SessionEntry[];
  emptyMessage: string;
  onDelete: (id: string) => void;
  onUpdateEntry: (
    id: string,
    updates: Pick<
      SessionEntry,
      "sessionNumber" | "dateText" | "description"
    >,
  ) => void;
  excerptDownloadEnabled?: boolean;
  excerptDownloadingId?: string | null;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
};

function SessionRow({
  entry,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
}: {
  entry: SessionEntry;
  onDelete: (id: string) => void;
  onUpdateEntry: SessionsTableProps["onUpdateEntry"];
  excerptDownloadEnabled: boolean;
  excerptDownloading: boolean;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
}) {
  const [sessionNumber, setSessionNumber] = useState(entry.sessionNumber);
  const [dateText, setDateText] = useState(entry.dateText);
  const [description, setDescription] = useState(entry.description);

  const sessionNumberRef = useRef(sessionNumber);
  const dateRef = useRef(dateText);
  const descriptionRef = useRef(description);
  sessionNumberRef.current = sessionNumber;
  dateRef.current = dateText;
  descriptionRef.current = description;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSessionNumber(entry.sessionNumber);
    setDateText(entry.dateText);
    setDescription(entry.description);
  }, [entry.id, entry.sessionNumber, entry.dateText, entry.description]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const flushDebouncedSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    flushDebouncedSave();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const num = sessionNumberRef.current.trim();
      const d = dateRef.current.trim();
      const desc = descriptionRef.current.trim();
      if (!num || !d || !desc) return;
      if (
        num === entry.sessionNumber &&
        d === entry.dateText &&
        desc === entry.description
      )
        return;
      onUpdateEntry(entry.id, {
        sessionNumber: num,
        dateText: d,
        description: desc,
      });
    }, SAVE_DEBOUNCE_MS);
  }, [
    entry.sessionNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushDebouncedSave,
    onUpdateEntry,
  ]);

  const handleBlur = useCallback(() => {
    flushDebouncedSave();
    const num = sessionNumberRef.current.trim();
    const d = dateRef.current.trim();
    const desc = descriptionRef.current.trim();
    if (!num || !d || !desc) {
      setSessionNumber(entry.sessionNumber);
      setDateText(entry.dateText);
      setDescription(entry.description);
      return;
    }
    if (
      num === entry.sessionNumber &&
      d === entry.dateText &&
      desc === entry.description
    )
      return;
    onUpdateEntry(entry.id, {
      sessionNumber: num,
      dateText: d,
      description: desc,
    });
  }, [
    entry.sessionNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushDebouncedSave,
    onUpdateEntry,
  ]);

  const sessionNoId = `session-no-${entry.id}`;
  const dateId = `session-date-${entry.id}`;
  const descId = `session-desc-${entry.id}`;

  return (
    <li className="session-card">
      <div className="session-card-main">
        <div className="session-symbol-display">
          <div className="session-field-label">Symbole</div>
          <div className="session-symbol-text monospace" title={entry.symbol}>
            {entry.symbol}
          </div>
        </div>
        <div className="session-field">
          <label className="session-field-label" htmlFor={sessionNoId}>
            Session no.
          </label>
          <input
            id={sessionNoId}
            className="session-field-input monospace"
            type="text"
            inputMode="numeric"
            value={sessionNumber}
            onChange={(e) => {
              setSessionNumber(e.target.value);
              scheduleSave();
            }}
            onBlur={handleBlur}
            spellCheck="false"
          />
        </div>
        <div className="session-field">
          <label className="session-field-label" htmlFor={dateId}>
            Date
          </label>
          <input
            id={dateId}
            className="session-field-input"
            type="text"
            value={dateText}
            onChange={(e) => {
              setDateText(e.target.value);
              scheduleSave();
            }}
            onBlur={handleBlur}
            spellCheck="true"
            lang="fr"
          />
        </div>
        <div className="session-field">
          <label className="session-field-label" htmlFor={descId}>
            Description
          </label>
          <textarea
            id={descId}
            className="session-field-input session-field-textarea"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              scheduleSave();
            }}
            onBlur={handleBlur}
            rows={10}
            spellCheck="true"
            lang="fr"
          />
        </div>
      </div>
      <div className="session-card-actions">
        {onDownloadExcerpt && (
          <button
            type="button"
            className="button primary"
            disabled={!excerptDownloadEnabled || excerptDownloading}
            title={
              excerptDownloadEnabled
                ? "Télécharger l’extrait PDF (pied de page)"
                : "Enregistrez d’abord le PDF du livre (extrait ToC)."
            }
            onClick={() => onDownloadExcerpt(entry.id)}
          >
            {excerptDownloading ? "…" : "PDF extrait"}
          </button>
        )}
        <button
          type="button"
          className="button danger"
          onClick={() => onDelete(entry.id)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function SessionsTable({
  entries,
  emptyMessage,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled = false,
  excerptDownloadingId = null,
  onDownloadExcerpt,
}: SessionsTableProps) {
  if (entries.length === 0) {
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <ul className="sessions-list" aria-label="Extracted documents">
      {entries.map((entry) => (
        <SessionRow
          key={entry.id}
          entry={entry}
          onDelete={onDelete}
          onUpdateEntry={onUpdateEntry}
          excerptDownloadEnabled={excerptDownloadEnabled}
          excerptDownloading={excerptDownloadingId === entry.id}
          onDownloadExcerpt={onDownloadExcerpt}
        />
      ))}
    </ul>
  );
}
