import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Book } from "../types/book";

type BooksPanelProps = {
  books: Book[];
  selectedBookId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export function BooksPanel({
  books,
  selectedBookId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: BooksPanelProps) {
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId == null) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingId]);

  const beginRename = (book: Book) => {
    setRenamingId(book.id);
    setRenameDraft(book.name);
  };

  const commitRename = () => {
    if (renamingId == null) return;
    const trimmed = renameDraft.trim();
    if (trimmed !== "") {
      const book = books.find((b) => b.id === renamingId);
      if (book && trimmed !== book.name) {
        onRename(renamingId, trimmed);
      }
    }
    setRenamingId(null);
    setRenameDraft("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameDraft("");
  };

  const handleRenameKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  };

  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  };

  return (
    <aside className="books-panel">
      <div className="books-panel-title">Livres</div>
      <form className="books-panel-form" onSubmit={handleSubmit}>
        <input
          className="books-panel-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du livre"
          maxLength={200}
          aria-label="Nom du livre"
        />
        <button className="button primary" type="submit">
          Créer
        </button>
      </form>
      {books.length === 0 ? (
        <p className="books-panel-empty">Créez un livre pour y associer un PDF.</p>
      ) : (
        <ul className="books-list">
          {books.map((book) => {
            const selected = book.id === selectedBookId;
            const isRenaming = book.id === renamingId;
            return (
              <li key={book.id}>
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    className="books-list-rename-input"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={handleRenameKeyDown}
                    maxLength={200}
                    aria-label="Nouveau nom du livre"
                  />
                ) : (
                  <button
                    type="button"
                    className={`books-list-item${selected ? " selected" : ""}`}
                    onClick={() => onSelect(book.id)}
                  >
                    <span className="books-list-name">{book.name}</span>
                    {(book.pdfBlobKey || book.pdfFileName) && (
                      <span
                        className="books-list-pdf monospace"
                        title={book.pdfFileName ?? "PDF enregistré"}
                      >
                        PDF
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="button books-list-rename"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isRenaming) {
                      commitRename();
                    } else {
                      beginRename(book);
                    }
                  }}
                  aria-label={
                    isRenaming
                      ? "Valider le nom"
                      : `Renommer ${book.name}`
                  }
                  title={isRenaming ? "Valider" : "Renommer"}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="button danger books-list-delete"
                  onClick={() => onDelete(book.id)}
                  disabled={isRenaming}
                  aria-label={`Supprimer ${book.name}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
