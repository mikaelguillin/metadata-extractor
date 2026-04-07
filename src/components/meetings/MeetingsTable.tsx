import { useCallback, useState } from "react";
import type { BookLanguage } from "@/types/book";
import { MeetingEntry } from "@/types/meeting";
import { MeetingRow } from "./MeetingRow";
import { PdfUploadDropZone } from "./PdfUploadDropZone";
import { AdjacentPlacement } from "@/lib/meetings/adjacentMeeting";
import { Button } from "@/components/ui/button";

export type MeetingsTableProps = {
  entries: MeetingEntry[];
  meetingTitlePattern: string;
  bookLanguage: BookLanguage;
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
  bookLanguage,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const allCollapsed =
    entries.length > 0 && entries.every((e) => !expandedIds.has(e.id));

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(entries.map((e) => e.id)));
  }, [entries]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  if (entries.length === 0) {
    if (pdfDropZone && onPdfFile && onPdfFileInputChange) {
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
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={allCollapsed ? expandAll : collapseAll}
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
      </div>
      <ul
        className="m-0 flex list-none flex-col gap-3"
        aria-label="Extracted documents"
      >
        {entries.map((entry) => (
          <MeetingRow
            key={entry.id}
            entry={entry}
            expanded={expandedIds.has(entry.id)}
            onToggleExpanded={() => {
              setExpandedIds((prev) => {
                const next = new Set(prev);
                if (next.has(entry.id)) next.delete(entry.id);
                else next.add(entry.id);
                return next;
              });
            }}
            meetingTitlePattern={meetingTitlePattern}
            bookLanguage={bookLanguage}
            onDelete={onDelete}
            onAddMeetingAdjacent={onAddMeetingAdjacent}
            onUpdateEntry={onUpdateEntry}
            excerptDownloadEnabled={excerptDownloadEnabled}
            excerptDownloading={excerptDownloadingId === entry.id}
            onDownloadExcerpt={onDownloadExcerpt}
          />
        ))}
      </ul>
    </div>
  );
}
