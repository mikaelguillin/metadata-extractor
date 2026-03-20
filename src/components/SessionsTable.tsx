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
    updates: Pick<SessionEntry, "dateText" | "description">,
  ) => void;
};

function SessionRow({
  entry,
  onDelete,
  onUpdateEntry,
}: {
  entry: SessionEntry;
  onDelete: (id: string) => void;
  onUpdateEntry: SessionsTableProps["onUpdateEntry"];
}) {
  const [dateText, setDateText] = useState(entry.dateText);
  const [description, setDescription] = useState(entry.description);

  const dateRef = useRef(dateText);
  const descriptionRef = useRef(description);
  dateRef.current = dateText;
  descriptionRef.current = description;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDateText(entry.dateText);
    setDescription(entry.description);
  }, [entry.id, entry.dateText, entry.description]);

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
      const d = dateRef.current.trim();
      const desc = descriptionRef.current.trim();
      if (!d || !desc) return;
      if (d === entry.dateText && desc === entry.description) return;
      onUpdateEntry(entry.id, { dateText: d, description: desc });
    }, SAVE_DEBOUNCE_MS);
  }, [
    entry.dateText,
    entry.description,
    entry.id,
    flushDebouncedSave,
    onUpdateEntry,
  ]);

  const handleBlur = useCallback(() => {
    flushDebouncedSave();
    const d = dateRef.current.trim();
    const desc = descriptionRef.current.trim();
    if (!d || !desc) {
      setDateText(entry.dateText);
      setDescription(entry.description);
      return;
    }
    if (d === entry.dateText && desc === entry.description) return;
    onUpdateEntry(entry.id, { dateText: d, description: desc });
  }, [
    entry.dateText,
    entry.description,
    entry.id,
    flushDebouncedSave,
    onUpdateEntry,
  ]);

  return (
    <tr>
      <td className="col-title">{entry.sessionLabel}</td>
      <td className="col-date">
        <input
          className="table-cell-input"
          type="text"
          value={dateText}
          onChange={(e) => {
            setDateText(e.target.value);
            scheduleSave();
          }}
          onBlur={handleBlur}
          aria-label={`Date — ${entry.sessionLabel}`}
        />
      </td>
      <td className="col-description">
        <textarea
          className="table-cell-input table-cell-textarea"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            scheduleSave();
          }}
          onBlur={handleBlur}
          rows={2}
          aria-label={`Description — ${entry.sessionLabel}`}
          spellCheck="true"
          lang="fr"
        />
      </td>
      <td>
        <button type="button" className="button" onClick={() => onDelete(entry.id)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export function SessionsTable({
  entries,
  emptyMessage,
  onDelete,
  onUpdateEntry,
}: SessionsTableProps) {
  if (entries.length === 0) {
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Document</th>
          <th>Date</th>
          <th>Description</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <SessionRow
            key={entry.id}
            entry={entry}
            onDelete={onDelete}
            onUpdateEntry={onUpdateEntry}
          />
        ))}
      </tbody>
    </table>
  );
}
