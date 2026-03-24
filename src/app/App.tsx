import "../lib/pdf/worker";
import type React from "react";
import { Toast } from "@base-ui/react/toast";
import { BookWorkspace } from "../components/BookWorkspace";
import { BooksPanel } from "../components/BooksPanel";
import { Toaster } from "@/components/ui/toaster";
import { usePersistedBooks } from "../hooks/usePersistedBooks";
import { appToastManager } from "@/lib/appToast";
import { Card, CardContent } from "@/components/ui/card";

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
    <Toast.Provider toastManager={appToastManager} limit={4}>
    <div className="mx-auto flex w-full min-h-screen max-w-[1200px] items-stretch justify-center p-6">
      <Card className="w-full gap-0 py-6">
        <CardContent className="grid grid-cols-1 gap-5 p-0 px-6 md:grid-cols-[minmax(200px,240px)_1fr] md:items-start">
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
        </CardContent>
      </Card>
    </div>
    <Toaster />
    </Toast.Provider>
  );
};
