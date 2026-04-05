import { Button } from "@/components/ui/button";
import type { MeetingsTableProps } from "@/components/meetings/MeetingsTable";

export function MeetingRowActions({
  meetingId,
  excerptDownloadEnabled,
  excerptDownloading,
  onDownloadExcerpt,
  onAddMeetingAdjacent,
  onDeleteClick,
}: {
  meetingId: string;
  excerptDownloadEnabled: boolean;
  excerptDownloading: boolean;
  onDownloadExcerpt?: (id: string) => void | Promise<void>;
  onAddMeetingAdjacent: MeetingsTableProps["onAddMeetingAdjacent"];
  onDeleteClick: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-border border-t px-4 py-3 sm:self-start sm:border-t-0 sm:border-l sm:pt-8">
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
          onClick={() => onDownloadExcerpt(meetingId)}
        >
          {excerptDownloading ? "…" : "Download PDF"}
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onAddMeetingAdjacent(meetingId, "before")}
      >
        Add meeting above
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onAddMeetingAdjacent(meetingId, "after")}
      >
        Add meeting below
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDeleteClick}
      >
        Delete
      </Button>
    </div>
  );
}
