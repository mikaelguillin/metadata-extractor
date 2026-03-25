import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { sessionTitleFromFields } from "../lib/sessions/sessionTitlePattern";
import type { SessionEntry } from "../types/session";
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

type SessionsTableProps = {
  entries: SessionEntry[];
  sessionTitlePattern: string;
  emptyMessage: string;
  onDelete: (id: string) => void;
  onUpdateEntry: (
    id: string,
    updates: Partial<
      Pick<SessionEntry, "sessionNumber" | "dateText" | "description">
    >,
  ) => void;
  excerptDownloadEnabled?: boolean;
  excerptDownloadingId?: string | null;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
};

function SessionRow({
  entry,
  sessionTitlePattern,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
}: {
  entry: SessionEntry;
  sessionTitlePattern: string;
  onDelete: (id: string) => void;
  onUpdateEntry: SessionsTableProps["onUpdateEntry"];
  excerptDownloadEnabled: boolean;
  excerptDownloading: boolean;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
}) {
  const [sessionNumber, setSessionNumber] = useState(entry.sessionNumber);
  const [dateText, setDateText] = useState(entry.dateText);
  const [description, setDescription] = useState(entry.description);

  const sessionNumberRef = useRef(sessionNumber);
  const dateRef = useRef(dateText);
  const descriptionRef = useRef(description);
  sessionNumberRef.current = sessionNumber;
  dateRef.current = dateText;
  descriptionRef.current = description;

  const restDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSessionNumber(entry.sessionNumber);
    setDateText(entry.dateText);
    setDescription(entry.description);
  }, [entry.id, entry.sessionNumber, entry.dateText, entry.description]);

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
      const num = sessionNumberRef.current.trim();
      const d = dateRef.current.trim();
      const desc = descriptionRef.current.trim();
      if (!num || !d || !desc) return;
      if (
        num === entry.sessionNumber &&
        d === entry.dateText &&
        desc === entry.description
      )
        return;
      onUpdateEntry(entry.id, {
        sessionNumber: num,
        dateText: d,
        description: desc,
      });
    }, SAVE_DEBOUNCE_MS);
  }, [
    entry.sessionNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushRestDebounced,
    onUpdateEntry,
  ]);

  const handleBlurRest = useCallback(() => {
    flushRestDebounced();
    const num = sessionNumberRef.current.trim();
    const d = dateRef.current.trim();
    const desc = descriptionRef.current.trim();
    if (!num || !d || !desc) {
      setSessionNumber(entry.sessionNumber);
      setDateText(entry.dateText);
      setDescription(entry.description);
      return;
    }
    if (
      num === entry.sessionNumber &&
      d === entry.dateText &&
      desc === entry.description
    )
      return;
    onUpdateEntry(entry.id, {
      sessionNumber: num,
      dateText: d,
      description: desc,
    });
  }, [
    entry.sessionNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushRestDebounced,
    onUpdateEntry,
  ]);

  const sessionNoId = `session-no-${entry.id}`;
  const dateId = `session-date-${entry.id}`;
  const titleId = `session-title-${entry.id}`;
  const descId = `session-desc-${entry.id}`;

  const displayedTitle = sessionTitleFromFields(
    sessionTitlePattern,
    sessionNumber,
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
            <div className={fieldCaption}>Symbole</div>
            <div
              className="mt-1 break-all font-mono text-[0.95rem] font-semibold tracking-wide text-indigo-100"
              title={entry.symbol}
            >
              {entry.symbol}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={sessionNoId} className={fieldCaption}>
              Session no.
            </Label>
            <Input
              id={sessionNoId}
              className="font-mono tabular-nums"
              type="text"
              inputMode="numeric"
              value={sessionNumber}
              onChange={(e) => {
                setSessionNumber(e.target.value);
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
                  ? "Télécharger l’extrait PDF (pied de page)"
                  : "Enregistrez d’abord le PDF du livre (extrait ToC)."
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
        title="Delete this entry?"
        description={
          <>
            This removes the row for symbol{" "}
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

export function SessionsTable({
  entries,
  sessionTitlePattern,
  emptyMessage,
  onDelete,
  onUpdateEntry,
  excerptDownloadEnabled = false,
  excerptDownloadingId = null,
  onDownloadExcerpt,
}: SessionsTableProps) {
  if (entries.length === 0) {
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
        <SessionRow
          key={entry.id}
          entry={entry}
          sessionTitlePattern={sessionTitlePattern}
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
