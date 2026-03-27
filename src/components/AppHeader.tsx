import type React from "react";
import { useState } from "react";
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
  onClearAll: () => void;
};

export function AppHeader({
  selectedBookName,
  entryCount,
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
  onClearAll,
}: AppHeaderProps) {
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
                Selected book:{" "}
                <strong className="text-foreground">{selectedBookName}</strong>
              </>
            ) : (
              <>Select a book to load a PDF.</>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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
            <span>{entryCount} meetings</span>
          </Badge>
        </div>
      </div>

      {selectedBookName && (
        <Card size="sm" className="mb-4 border-border/80 bg-muted/15">
          <CardContent className="flex flex-col gap-3 px-4 pb-4">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                  ToC start
                </span>
                <Input
                  type="number"
                  className="w-[5.5rem] font-mono"
                  min={1}
                  step={1}
                  value={tocStartInput}
                  onChange={onTocStartChange}
                  placeholder="e.g. 5"
                  aria-invalid={!!tocRangeHint}
                />
              </div>
              <span className="pb-2 text-[0.85rem] text-muted-foreground">
                —
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                  ToC end
                </span>
                <Input
                  type="number"
                  className="w-[5.5rem] font-mono"
                  min={1}
                  step={1}
                  value={tocEndInput}
                  onChange={onTocEndChange}
                  placeholder="e.g. 12"
                  aria-invalid={!!tocRangeHint}
                />
              </div>
            </div>
            <div className="flex min-w-0 max-w-full flex-col gap-1">
              <Label
                htmlFor="symbol-prefix"
                className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Symbol prefix
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
                aria-label="Document symbol prefix"
              />
            </div>
            <div className="flex min-w-0 w-full flex-col gap-1">
              <Label
                htmlFor="meeting-title-pattern"
                className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Meeting title template
              </Label>
              <Textarea
                id="meeting-title-pattern"
                className="min-h-[2.75rem] resize-y font-mono text-[0.8rem] leading-snug"
                value={meetingTitlePatternInput}
                onChange={onMeetingTitlePatternChange}
                rows={2}
                spellCheck={false}
                placeholder="General Assembly, nth meeting, official records, nth Committee, summary record of the {meetingNumber}th meeting, {meetingDate}, New York"
                aria-label="Meeting title template ({meetingNumber}, {meetingDate})"
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
            All {entryCount} {entryCount === 1 ? "entry" : "entries"} for this book
            will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Clear all"
        onConfirm={onClearAll}
      />
    </>
  );
}
