import type { SessionEntry } from "../types/session";

type SessionsTableProps = {
  entries: SessionEntry[];
  onDelete: (id: string) => void;
};

export function SessionsTable({ entries, onDelete }: SessionsTableProps) {
  if (entries.length === 0) {
    return (
      <div className="empty">
        Aucune entrée pour l'instant. Chargez un PDF contenant une table des matières pour commencer.
      </div>
    );
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
          <tr key={entry.id}>
            <td className="col-title">{entry.sessionLabel}</td>
            <td className="col-date">{entry.dateText}</td>
            <td className="col-description">{entry.description}</td>
            <td>
              <button className="button" onClick={() => onDelete(entry.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
