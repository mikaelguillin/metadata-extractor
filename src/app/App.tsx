import "../lib/pdf/worker";
import type React from "react";
import { BookWorkspace } from "../components/BookWorkspace";
import { BooksPanel } from "../components/BooksPanel";
import { usePersistedBooks } from "../hooks/usePersistedBooks";

export const App: React.FC = () => {
  const {
    books,
    selectedBookId,
    selectedBook,
    addBook,
    deleteBook,
    selectBook,
    patchBook,
  } = usePersistedBooks();

  return (
    <div className="app">
      <div className="card layout-with-books">
        <BooksPanel
          books={books}
          selectedBookId={selectedBookId}
          onSelect={selectBook}
          onAdd={addBook}
          onRename={(id, nextName) => patchBook(id, { name: nextName })}
          onDelete={deleteBook}
        />
        <BookWorkspace
          key={selectedBookId ?? "__none__"}
          book={selectedBook}
          bookId={selectedBookId}
          patchBook={patchBook}
        />
      </div>
    </div>
  );
};
