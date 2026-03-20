import type React from "react";
import { useState } from "react";
import type { Book } from "../types/book";

type BooksPanelProps = {
  books: Book[];
  selectedBookId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
};

export function BooksPanel({
  books,
  selectedBookId,
  onSelect,
  onAdd,
  onDelete,
}: BooksPanelProps) {
  const [name, setName] = useState("");

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
            return (
              <li key={book.id}>
                <button
                  type="button"
                  className={`books-list-item${selected ? " selected" : ""}`}
                  onClick={() => onSelect(book.id)}
                >
                  <span className="books-list-name">{book.name}</span>
                  {book.pdfFileName && (
                    <span className="books-list-pdf monospace" title={book.pdfFileName}>
                      PDF
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="button danger books-list-delete"
                  onClick={() => onDelete(book.id)}
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
