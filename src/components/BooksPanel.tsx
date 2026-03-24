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
    <aside>
      <Card size="sm" className="border-border/80 bg-muted/20">
        <CardHeader className="px-4 pt-4 pb-0">
          <CardTitle className="text-[0.78rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Livres
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pb-4">
          <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <Label htmlFor="new-book-name" className="sr-only">
              Nom du livre
            </Label>
            <Input
              id="new-book-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du livre"
              maxLength={200}
              aria-label="Nom du livre"
            />
            <Button type="submit" size="sm">
              Créer
            </Button>
          </form>
          {books.length === 0 ? (
            <p className="m-0 text-[0.8rem] text-muted-foreground leading-snug">
              Créez un livre pour y associer un PDF.
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
                        aria-label="Nouveau nom du livre"
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
                        {(book.pdfBlobKey || book.pdfFileName) && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0 text-[0.65rem] text-emerald-300 font-mono"
                            title={book.pdfFileName ?? "PDF enregistré"}
                          >
                            PDF
                          </Badge>
                        )}
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
                          ? "Valider le nom"
                          : `Renommer ${book.name}`
                      }
                      title={isRenaming ? "Valider" : "Renommer"}
                    >
                      ✎
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="shrink-0 text-lg leading-none"
                      onClick={() => onDelete(book.id)}
                      disabled={isRenaming}
                      aria-label={`Supprimer ${book.name}`}
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
    </aside>
  );
}
