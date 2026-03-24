import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { sessionTitleFromFields } from "../lib/sessions/sessionTitlePattern";
import type { SessionEntry } from "../types/session";

const SAVE_DEBOUNCE_MS = 400;

type SessionsTableProps = {
  entries: SessionEntry[];
  sessionTitlePattern: string;
  emptyMessage: string;
  onDelete: (id: string) => void;
  onUpdateEntry: (
    id: string,
    updates: Partial<
      Pick<SessionEntry, "sessionNumber" | "dateText" | "description">
    >,
  ) => void;
  excerptDownloadEnabled?: boolean;
  excerptDownloadingId?: string | null;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
};

function SessionRow({
  entry,
  sessionTitlePattern,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
}: {
  entry: SessionEntry;
  sessionTitlePattern: string;
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

  const restDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSessionNumber(entry.sessionNumber);
    setDateText(entry.dateText);
    setDescription(entry.description);
  }, [entry.id, entry.sessionNumber, entry.dateText, entry.description]);

  useEffect(
    () => () => {
      if (restDebounceRef.current) clearTimeout(restDebounceRef.current);
    },
    [],
  );

  const flushRestDebounced = useCallback(() => {
    if (restDebounceRef.current) {
      clearTimeout(restDebounceRef.current);
      restDebounceRef.current = null;
    }
  }, []);

  const scheduleRestSave = useCallback(() => {
    flushRestDebounced();
    restDebounceRef.current = setTimeout(() => {
      restDebounceRef.current = null;
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
    flushRestDebounced,
    onUpdateEntry,
  ]);

  const handleBlurRest = useCallback(() => {
    flushRestDebounced();
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
    flushRestDebounced,
    onUpdateEntry,
  ]);

  const sessionNoId = `session-no-${entry.id}`;
  const dateId = `session-date-${entry.id}`;
  const titleId = `session-title-${entry.id}`;
  const descId = `session-desc-${entry.id}`;

  const displayedTitle = sessionTitleFromFields(
    sessionTitlePattern,
    sessionNumber,
    dateText,
  );

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
              scheduleRestSave();
            }}
            onBlur={handleBlurRest}
            spellCheck={false}
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
              scheduleRestSave();
            }}
            onBlur={handleBlurRest}
            spellCheck={true}
            lang="fr"
          />
        </div>
        <div className="session-field">
          <label className="session-field-label" htmlFor={titleId}>
            Title
          </label>
          <input
            id={titleId}
            className="session-field-input"
            readOnly
            aria-readonly="true"
            value={displayedTitle}
            spellCheck={false}
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
              scheduleRestSave();
            }}
            onBlur={handleBlurRest}
            rows={10}
            spellCheck={true}
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
            {excerptDownloading ? "…" : "Download PDF"}
          </button>
        )}
        <button
          type="button"
          className="button danger"
          onClick={() => {
            flushRestDebounced();
            onDelete(entry.id);
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function SessionsTable({
  entries,
  sessionTitlePattern,
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
          sessionTitlePattern={sessionTitlePattern}
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
