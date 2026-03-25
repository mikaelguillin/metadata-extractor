import type React from "react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type AppHeaderProps = {
  selectedBookName: string | null;
  entryCount: number;
  loading: boolean;
  uploadDisabled: boolean;
  tocStartInput: string;
  tocEndInput: string;
  onTocStartChange: React.ChangeEventHandler<HTMLInputElement>;
  onTocEndChange: React.ChangeEventHandler<HTMLInputElement>;
  tocRangeHint: string | null;
  symbolPrefixInput: string;
  onSymbolPrefixChange: React.ChangeEventHandler<HTMLInputElement>;
  meetingTitlePatternInput: string;
  onMeetingTitlePatternChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onFileChange: React.ChangeEventHandler<HTMLInputElement>;
  onClearAll: () => void;
};

export function AppHeader({
  selectedBookName,
  entryCount,
  loading,
  uploadDisabled,
  tocStartInput,
  tocEndInput,
  onTocStartChange,
  onTocEndChange,
  tocRangeHint,
  symbolPrefixInput,
  onSymbolPrefixChange,
  meetingTitlePatternInput,
  onMeetingTitlePatternChange,
  onFileChange,
  onClearAll,
}: AppHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-heading text-[1.4rem] font-semibold tracking-wide">
            Metadata extractor
          </div>
          <div className="mt-1 text-[0.9rem] text-muted-foreground">
            {selectedBookName ? (
              <>
                Livre sélectionné :{" "}
                <strong className="text-foreground">{selectedBookName}</strong>
              </>
            ) : (
              <>Sélectionnez un livre pour charger un PDF.</>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            id="book-pdf-file"
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            disabled={uploadDisabled}
            className="sr-only"
            tabIndex={-1}
            aria-label="Fichier PDF du livre"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadDisabled || loading}
            className="inline-flex items-center gap-2 rounded-full border-dashed"
            onClick={() => fileInputRef.current?.click()}
            aria-disabled={uploadDisabled || loading}
            aria-controls="book-pdf-file"
          >
            <span className="font-medium">Choisir un PDF</span>
            <Badge variant="secondary" className="font-mono text-[0.72rem]">
              pdfjs-dist
            </Badge>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setClearAllOpen(true)}
            disabled={entryCount === 0 || uploadDisabled}
          >
            Clear All
          </Button>
          <Badge variant="outline" className="gap-1.5 py-0.5 pr-2 pl-2">
            <span
              className="size-1.5 shrink-0 rounded-full bg-green-500"
              aria-hidden
            />
            <span>{entryCount} entrées</span>
          </Badge>
        </div>
      </div>

      {selectedBookName && (
        <Card size="sm" className="mb-4 border-border/80 bg-muted/15">
          <CardContent className="flex flex-col gap-3 px-4 pb-4">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Début TOC
                </span>
                <Input
                  type="number"
                  className="w-[5.5rem] font-mono"
                  min={1}
                  step={1}
                  value={tocStartInput}
                  onChange={onTocStartChange}
                  placeholder="ex. 5"
                  aria-invalid={!!tocRangeHint}
                />
              </div>
              <span className="pb-2 text-[0.85rem] text-muted-foreground">
                —
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Fin TOC
                </span>
                <Input
                  type="number"
                  className="w-[5.5rem] font-mono"
                  min={1}
                  step={1}
                  value={tocEndInput}
                  onChange={onTocEndChange}
                  placeholder="ex. 12"
                  aria-invalid={!!tocRangeHint}
                />
              </div>
            </div>
            <div className="flex min-w-0 max-w-full flex-col gap-1">
              <Label
                htmlFor="symbol-prefix"
                className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Préfixe symbole
              </Label>
              <Input
                id="symbol-prefix"
                type="text"
                className="max-w-[14rem] font-mono"
                value={symbolPrefixInput}
                onChange={onSymbolPrefixChange}
                placeholder="A/C.3/SR."
                maxLength={80}
                spellCheck={false}
                aria-label="Préfixe symbole des documents"
              />
            </div>
            <div className="flex min-w-0 w-full flex-col gap-1">
              <Label
                htmlFor="meeting-title-pattern"
                className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Modèle du titre de meeting
              </Label>
              <Textarea
                id="meeting-title-pattern"
                className="min-h-[2.75rem] resize-y font-mono text-[0.8rem] leading-snug"
                value={meetingTitlePatternInput}
                onChange={onMeetingTitlePatternChange}
                rows={2}
                spellCheck={false}
                placeholder="General Assembly, nth meeting, official records, nth Committee, summary record of the {meetingNumber}th meeting, {meetingDate}, New York"
                aria-label="Modèle du titre de réunion ({meetingNumber}, {meetingDate})"
              />
            </div>
            {tocRangeHint && (
              <p
                className="m-0 text-[0.75rem] text-destructive leading-snug"
                role="status"
              >
                {tocRangeHint}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={clearAllOpen}
        onOpenChange={setClearAllOpen}
        title="Clear all entries?"
        description={
          <>
            All {entryCount} entrée{entryCount === 1 ? "" : "s"} for this book
            will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Clear all"
        onConfirm={onClearAll}
      />
    </>
  );
}
