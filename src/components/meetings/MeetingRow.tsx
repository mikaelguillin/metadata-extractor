import { useCallback, useEffect, useRef, useState } from "react";
import { meetingTitleFromFields } from "../../lib/meetings/meetingTitlePattern";
import type { MeetingEntry } from "../../types/meeting";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { MeetingsTableProps } from "@/components/meetings/MeetingsTable";
import { MeetingRowActions } from "@/components/meetings/MeetingRowActions";
import { MeetingRowFooter, useMeetingRowSavedAck } from "@/components/meetings/MeetingRowFooter";
import { MeetingRowForm } from "@/components/meetings/MeetingRowForm";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 400;

export function MeetingRow({
  entry,
  expanded,
  onToggleExpanded,
  meetingTitlePattern,
  onDelete,
  onAddMeetingAdjacent,
  onUpdateEntry,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
}: {
  entry: MeetingEntry;
  expanded: boolean;
  onToggleExpanded: () => void;
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
  const [debounceScheduled, setDebounceScheduled] = useState(false);
  const [showSavedAck, triggerSavedAck] = useMeetingRowSavedAck();

  const isDirty =
    meetingNumber.trim() !== entry.meetingNumber.trim() ||
    dateText.trim() !== entry.dateText.trim() ||
    description.trim() !== entry.description.trim();

  const canPersist =
    !!meetingNumber.trim() &&
    !!dateText.trim() &&
    !!description.trim();

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
    setDebounceScheduled(false);
  }, []);

  useEffect(() => {
    if (!isDirty) flushRestDebounced();
  }, [isDirty, flushRestDebounced]);

  const scheduleRestSave = useCallback(() => {
    flushRestDebounced();
    setDebounceScheduled(true);
    restDebounceRef.current = setTimeout(() => {
      restDebounceRef.current = null;
      setDebounceScheduled(false);
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
      triggerSavedAck();
    }, SAVE_DEBOUNCE_MS);
  }, [
    entry.meetingNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushRestDebounced,
    onUpdateEntry,
    triggerSavedAck,
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
    triggerSavedAck();
  }, [
    entry.meetingNumber,
    entry.dateText,
    entry.description,
    entry.id,
    flushRestDebounced,
    onUpdateEntry,
    triggerSavedAck,
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const collapseToggle = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-foreground"
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse meeting" : "Expand meeting"}
      onClick={onToggleExpanded}
    >
      {expanded ? (
        <ChevronUp className="size-4" aria-hidden />
      ) : (
        <ChevronDown className="size-4" aria-hidden />
      )}
    </Button>
  );

  return (
    <li className="list-none">
      <Card
        size="sm"
        className={cn(
          "relative flex flex-col gap-0",
          expanded && "pt-10",
        )}
      >
        <div className="absolute top-2 right-2 z-10">{collapseToggle}</div>
        {!expanded ? (
          <div className="flex min-h-[2.75rem] items-center px-3 pr-14 sm:px-3">
            <div
              className="min-w-0 break-all font-mono text-[0.95rem] font-semibold tracking-wide text-indigo-700 dark:text-indigo-100"
              title={entry.symbol}
            >
              {entry.symbol}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-0 sm:flex-row sm:items-start">
              <MeetingRowForm
                symbol={entry.symbol}
                meetingNoId={meetingNoId}
                dateId={dateId}
                titleId={titleId}
                descId={descId}
                meetingNumber={meetingNumber}
                dateText={dateText}
                description={description}
                displayedTitle={displayedTitle}
                onMeetingNumberChange={(value) => {
                  setMeetingNumber(value);
                  scheduleRestSave();
                }}
                onDateChange={(value) => {
                  setDateText(value);
                  scheduleRestSave();
                }}
                onDescriptionChange={(value) => {
                  setDescription(value);
                  scheduleRestSave();
                }}
                onBlurRest={handleBlurRest}
              />
              <MeetingRowActions
                meetingId={entry.id}
                excerptDownloadEnabled={excerptDownloadEnabled}
                excerptDownloading={excerptDownloading}
                onDownloadExcerpt={onDownloadExcerpt}
                onAddMeetingAdjacent={onAddMeetingAdjacent}
                onDeleteClick={() => {
                  flushRestDebounced();
                  setDeleteDialogOpen(true);
                }}
              />
            </div>
            <MeetingRowFooter
              isDirty={isDirty}
              debounceScheduled={debounceScheduled}
              showSavedAck={showSavedAck}
              canPersist={canPersist}
            />
          </>
        )}
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
