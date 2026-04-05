import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Book } from "../types/book";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [bookDeleteDialogOpen, setBookDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
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
    <aside>
      <Card size="sm" className="border-border/80 bg-muted/20">
        <CardHeader className="px-4 pt-4 pb-0">
          <CardTitle className="text-[0.78rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Books
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pb-4">
          <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <Label htmlFor="new-book-name" className="sr-only">
              Book name
            </Label>
            <Input
              id="new-book-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Book name"
              maxLength={200}
              aria-label="Book name"
            />
            <Button type="submit" size="sm">
              Create
            </Button>
          </form>
          {books.length === 0 ? (
            <p className="m-0 text-[0.8rem] text-muted-foreground leading-snug">
              Create a book to attach a PDF.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {books.map((book) => {
                const selected = book.id === selectedBookId;
                const isRenaming = book.id === renamingId;
                return (
                  <li key={book.id} className="flex items-stretch gap-1.5">
                    {isRenaming ? (
                      <Input
                        ref={renameInputRef}
                        type="text"
                        className="min-w-0 flex-1 font-sans text-[0.82rem]"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKeyDown}
                        maxLength={200}
                        aria-label="New book name"
                      />
                    ) : (
                      <Button
                        type="button"
                        variant={selected ? "secondary" : "outline"}
                        size="sm"
                        className="h-auto min-w-0 flex-1 justify-between gap-2 py-2 text-left text-[0.82rem] font-normal"
                        onClick={() => onSelect(book.id)}
                      >
                        <span className="truncate">{book.name}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="shrink-0 text-base"
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
                          ? "Save name"
                          : `Rename ${book.name}`
                      }
                      title={isRenaming ? "Save" : "Rename"}
                    >
                      ✎
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="shrink-0 text-lg leading-none"
                      onClick={() => {
                        setBookToDelete(book);
                        setBookDeleteDialogOpen(true);
                      }}
                      disabled={isRenaming}
                      aria-label={`Delete ${book.name}`}
                    >
                      ×
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={bookDeleteDialogOpen}
        onOpenChange={setBookDeleteDialogOpen}
        onOpenChangeComplete={(opened) => {
          if (!opened) setBookToDelete(null);
        }}
        title="Delete this book?"
        description={
          bookToDelete ? (
            <>
              “{bookToDelete.name}” and its local data will be removed. This
              cannot be undone.
            </>
          ) : null
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onConfirm={() => {
          if (bookToDelete) onDelete(bookToDelete.id);
        }}
      />
    </aside>
  );
}
