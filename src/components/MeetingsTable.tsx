import type React from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FileText } from "lucide-react";
import { meetingTitleFromFields } from "../lib/meetings/meetingTitlePattern";
import type { MeetingEntry } from "../types/meeting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const SAVE_DEBOUNCE_MS = 400;

type MeetingsTableProps = {
  entries: MeetingEntry[];
  meetingTitlePattern: string;
  emptyMessage: string;
  /** When true and there are no rows, show drag-and-drop PDF upload instead of plain text. */
  pdfDropZone?: boolean;
  uploadDisabled?: boolean;
  pdfUploading?: boolean;
  onPdfFile?: (file: File) => void | Promise<void>;
  onPdfFileInputChange?: React.ChangeEventHandler<HTMLInputElement>;
  onDelete: (id: string) => void;
  onUpdateEntry: (
    id: string,
    updates: Partial<
      Pick<MeetingEntry, "meetingNumber" | "dateText" | "description">
    >,
  ) => void;
  excerptDownloadEnabled?: boolean;
  excerptDownloadingId?: string | null;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
};

function MeetingRow({
  entry,
  meetingTitlePattern,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
}: {
  entry: MeetingEntry;
  meetingTitlePattern: string;
  onDelete: (id: string) => void;
  onUpdateEntry: MeetingsTableProps["onUpdateEntry"];
  excerptDownloadEnabled: boolean;
  excerptDownloading: boolean;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
}) {
  const [meetingNumber, setMeetingNumber] = useState(entry.meetingNumber);
  const [dateText, setDateText] = useState(entry.dateText);
  const [description, setDescription] = useState(entry.description);

  const meetingNumberRef = useRef(meetingNumber);
  const dateRef = useRef(dateText);
  const descriptionRef = useRef(description);
  meetingNumberRef.current = meetingNumber;
  dateRef.current = dateText;
  descriptionRef.current = description;

  const restDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMeetingNumber(entry.meetingNumber);
    setDateText(entry.dateText);
    setDescription(entry.description);
  }, [entry.id, entry.meetingNumber, entry.dateText, entry.description]);

  useEffect(
    () => () => {
      if (restDebounceRef.current) clearTimeout(restDebounceRef.current);
    },
    [],
  );

  const flushRestDebounced = useCallback(() => {
    if (restDebounceRef.current) {
      clearTimeout(restDebounceRef.current);
      restDebounceRef.current = null;
    }
  }, []);

  const scheduleRestSave = useCallback(() => {
    flushRestDebounced();
    restDebounceRef.current = setTimeout(() => {
      restDebounceRef.current = null;
      const num = meetingNumberRef.current.trim();
      const d = dateRef.current.trim();
      const desc = descriptionRef.current.trim();
      if (!num || !d || !desc) return;
      if (
        num === entry.meetingNumber &&
        d === entry.dateText &&
        desc === entry.description
      )
        return;
      onUpdateEntry(entry.id, {
        meetingNumber: num,
        dateText: d,
        description: desc,
      });
    }, SAVE_DEBOUNCE_MS);
  }, [
    entry.meetingNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushRestDebounced,
    onUpdateEntry,
  ]);

  const handleBlurRest = useCallback(() => {
    flushRestDebounced();
    const num = meetingNumberRef.current.trim();
    const d = dateRef.current.trim();
    const desc = descriptionRef.current.trim();
    if (!num || !d || !desc) {
      setMeetingNumber(entry.meetingNumber);
      setDateText(entry.dateText);
      setDescription(entry.description);
      return;
    }
    if (
      num === entry.meetingNumber &&
      d === entry.dateText &&
      desc === entry.description
    )
      return;
    onUpdateEntry(entry.id, {
      meetingNumber: num,
      dateText: d,
      description: desc,
    });
  }, [
    entry.meetingNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushRestDebounced,
    onUpdateEntry,
  ]);

  const meetingNoId = `meeting-no-${entry.id}`;
  const dateId = `meeting-date-${entry.id}`;
  const titleId = `meeting-title-${entry.id}`;
  const descId = `meeting-desc-${entry.id}`;

  const displayedTitle = meetingTitleFromFields(
    meetingTitlePattern,
    meetingNumber,
    dateText,
  );

  const fieldCaption =
    "text-[0.72rem] font-medium tracking-wide text-muted-foreground uppercase";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <li className="list-none">
      <Card
        size="sm"
        className="gap-0 sm:flex-row sm:items-start"
      >
        <CardContent className="flex min-w-0 flex-1 flex-col gap-3 py-4">
          <div className="border-border border-b pb-2">
            <div className={fieldCaption}>Symbol</div>
            <div
              className="mt-1 break-all font-mono text-[0.95rem] font-semibold tracking-wide text-indigo-700 dark:text-indigo-100"
              title={entry.symbol}
            >
              {entry.symbol}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={meetingNoId} className={fieldCaption}>
              Meeting no.
            </Label>
            <Input
              id={meetingNoId}
              className="font-mono tabular-nums"
              type="text"
              inputMode="numeric"
              value={meetingNumber}
              onChange={(e) => {
                setMeetingNumber(e.target.value);
                scheduleRestSave();
              }}
              onBlur={handleBlurRest}
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={dateId} className={fieldCaption}>
              Date
            </Label>
            <Input
              id={dateId}
              type="text"
              value={dateText}
              onChange={(e) => {
                setDateText(e.target.value);
                scheduleRestSave();
              }}
              onBlur={handleBlurRest}
              spellCheck={true}
              lang="fr"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId} className={fieldCaption}>
              Title
            </Label>
            <Input
              id={titleId}
              readOnly
              aria-readonly="true"
              value={displayedTitle}
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={descId} className={fieldCaption}>
              Description
            </Label>
            <Textarea
              id={descId}
              className="min-h-[5.5rem] resize-y leading-snug whitespace-pre-wrap"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                scheduleRestSave();
              }}
              onBlur={handleBlurRest}
              rows={10}
              spellCheck={true}
              lang="fr"
            />
          </div>
        </CardContent>
        <div className="flex shrink-0 flex-col gap-2 border-border border-t px-4 py-3 sm:self-start sm:border-t-0 sm:border-l sm:pt-4">
          {onDownloadExcerpt && (
            <Button
              type="button"
              size="sm"
              disabled={!excerptDownloadEnabled || excerptDownloading}
              title={
                excerptDownloadEnabled
                  ? "Download PDF"
                  : "Save the book PDF (ToC excerpt) first."
              }
              onClick={() => onDownloadExcerpt(entry.id)}
            >
              {excerptDownloading ? "…" : "Download PDF"}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              flushRestDebounced();
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this meeting?"
        description={
          <>
            This removes the meeting{" "}
            <span className="font-mono text-foreground">{entry.symbol}</span>.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => onDelete(entry.id)}
      />
    </li>
  );
}

function PdfUploadDropZone({
  message,
  uploadDisabled,
  uploading,
  onPdfFile,
  onPdfFileInputChange,
}: {
  message: string;
  uploadDisabled: boolean;
  uploading: boolean;
  onPdfFile: (file: File) => void | Promise<void>;
  onPdfFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const disabled = uploadDisabled || uploading;

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      const ok =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!ok) return;
      void onPdfFile(file);
    },
    [disabled, onPdfFile],
  );

  return (
    <div className="p-5 sm:p-8">
      <div
        className={cn(
          "relative flex min-h-[min(22rem,50vh)] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-[border-color,background-color,box-shadow] duration-150",
          disabled
            ? "cursor-not-allowed border-muted-foreground/20 bg-muted/20 opacity-[0.72]"
            : isDragging
              ? "border-primary bg-primary/[0.06] shadow-[0_0_0_3px_hsl(var(--ring)/0.35)]"
              : "border-muted-foreground/25 bg-gradient-to-b from-muted/30 to-muted/10 hover:border-primary/45 hover:from-muted/40 hover:to-muted/15",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          dragDepthRef.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragging(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepthRef.current = 0;
          setIsDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          acceptFile(file);
        }}
      >
        <input
          ref={inputRef}
          id="book-pdf-file-drop"
          type="file"
          accept="application/pdf"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={onPdfFileInputChange}
          aria-label="Book PDF file"
        />
        <button
          type="button"
          disabled={disabled}
          aria-describedby="pdf-drop-instructions"
          className={cn(
            "flex max-w-lg flex-col items-center gap-5 rounded-xl p-2 outline-none",
            !disabled &&
              "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <div
            className={cn(
              "relative flex size-[4.25rem] items-center justify-center rounded-2xl shadow-md ring-1 ring-inset transition-transform duration-150",
              disabled
                ? "bg-muted text-muted-foreground ring-border"
                : "bg-card text-red-500 ring-border/70 hover:scale-[1.02] hover:ring-primary/35",
            )}
            aria-hidden
          >
            <FileText className="size-[2.35rem]" strokeWidth={1.5} />
            <span className="absolute -right-1 -bottom-1 rounded-md bg-red-600 px-1.5 py-px text-[0.58rem] font-bold tracking-wide text-white uppercase shadow-sm">
              PDF
            </span>
          </div>
          <p
            id="pdf-drop-instructions"
            className="m-0 text-[0.95rem] text-foreground leading-relaxed"
          >
            {message}
          </p>
        </button>
        {uploading ? (
          <p className="mt-2 text-[0.8rem] text-muted-foreground" role="status">
            Processing…
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MeetingsTable({
  entries,
  meetingTitlePattern,
  emptyMessage,
  pdfDropZone = false,
  uploadDisabled = false,
  pdfUploading = false,
  onPdfFile,
  onPdfFileInputChange,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled = false,
  excerptDownloadingId = null,
  onDownloadExcerpt,
}: MeetingsTableProps) {
  if (entries.length === 0) {
    if (
      pdfDropZone &&
      onPdfFile &&
      onPdfFileInputChange
    ) {
      return (
        <PdfUploadDropZone
          message={emptyMessage}
          uploadDisabled={uploadDisabled}
          uploading={pdfUploading}
          onPdfFile={onPdfFile}
          onPdfFileInputChange={onPdfFileInputChange}
        />
      );
    }
    return (
      <div className="p-5 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-3"
      aria-label="Extracted documents"
    >
      {entries.map((entry) => (
        <MeetingRow
          key={entry.id}
          entry={entry}
          meetingTitlePattern={meetingTitlePattern}
          onDelete={onDelete}
          onUpdateEntry={onUpdateEntry}
          excerptDownloadEnabled={excerptDownloadEnabled}
          excerptDownloading={excerptDownloadingId === entry.id}
          onDownloadExcerpt={onDownloadExcerpt}
        />
      ))}
    </ul>
  );
}
