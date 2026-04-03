import { MeetingEntry } from "@/types/meeting";
import { MeetingRow } from "./MeetingRow";
import { PdfUploadDropZone } from "./PdfUploadDropZone";
import { AdjacentPlacement } from "@/lib/meetings/adjacentMeeting";

export type MeetingsTableProps = {
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
  onAddMeetingAdjacent: (
    anchorId: string,
    placement: AdjacentPlacement,
  ) => void;
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
  onAddMeetingAdjacent,
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
      className="m-0 flex list-none flex-col gap-3"
      aria-label="Extracted documents"
    >
      {entries.map((entry) => (
        <MeetingRow
          key={entry.id}
          entry={entry}
          meetingTitlePattern={meetingTitlePattern}
          onDelete={onDelete}
          onAddMeetingAdjacent={onAddMeetingAdjacent}
          onUpdateEntry={onUpdateEntry}
          excerptDownloadEnabled={excerptDownloadEnabled}
          excerptDownloading={excerptDownloadingId === entry.id}
          onDownloadExcerpt={onDownloadExcerpt}
        />
      ))}
    </ul>
  );
}
