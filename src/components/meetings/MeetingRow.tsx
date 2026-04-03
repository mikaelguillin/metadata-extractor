import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { meetingTitleFromFields } from "../../lib/meetings/meetingTitlePattern";
import type { MeetingEntry } from "../../types/meeting";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import type { MeetingsTableProps } from "@/components/meetings/MeetingsTable";

const SAVE_DEBOUNCE_MS = 400;

export function MeetingRow({
  entry,
  meetingTitlePattern,
  onDelete,
  onAddMeetingAdjacent,
  onUpdateEntry,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
}: {
  entry: MeetingEntry;
  meetingTitlePattern: string;
  onDelete: (id: string) => void;
  onAddMeetingAdjacent: MeetingsTableProps["onAddMeetingAdjacent"];
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
      const num = meetingNumberRef.current;
      const d = dateRef.current;
      const desc = descriptionRef.current;
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
    const num = meetingNumberRef.current;
    const d = dateRef.current;
    const desc = descriptionRef.current;
    // Incomplete rows: keep local state. Resetting from `entry` would wipe
    // in-progress typing (new meetings stay empty in the parent until all fields are set).
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={titleId} className={fieldCaption}>
                Title
              </Label>
              <CopyButton
                text={displayedTitle}
                title="Copy title"
                aria-label="Copy title"
              />
            </div>
            <Input
              id={titleId}
              readOnly
              aria-readonly="true"
              value={displayedTitle}
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={descId} className={fieldCaption}>
                Description
              </Label>
              <CopyButton
                text={description}
                title="Copy description"
                aria-label="Copy description"
              />
            </div>
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
            variant="secondary"
            size="sm"
            onClick={() => onAddMeetingAdjacent(entry.id, "before")}
          >
            Add meeting above
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onAddMeetingAdjacent(entry.id, "after")}
          >
            Add meeting below
          </Button>
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
