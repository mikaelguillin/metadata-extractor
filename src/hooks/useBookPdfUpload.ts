import type React from "react";
import { useCallback, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildMeetings } from "../lib/meetings/buildMeetings";
import { effectiveMeetingTitlePattern } from "../lib/meetings/meetingTitlePattern";
import type { TocRangeResult } from "../lib/tocRange";
import { appToastManager } from "../lib/appToast";
import { savePdfBlob } from "../lib/storage/pdfBlobStore";
import type { Book } from "../types/book";

type PatchBook = (
  id: string,
  patch: Partial<
    Pick<
      Book,
      | "symbolPrefix"
      | "meetingTitlePattern"
      | "pdfFileName"
      | "pdfBlobKey"
      | "entries"
      | "tocPageStart"
      | "tocPageEnd"
    >
  >,
) => void;

type UseBookPdfUploadArgs = {
  bookId: string | null;
  tocRange: TocRangeResult;
  symbolPrefixInput: string;
  meetingTitlePatternInput: string;
  patchBook: PatchBook;
};

export function useBookPdfUpload({
  bookId,
  tocRange,
  symbolPrefixInput,
  meetingTitlePatternInput,
  patchBook,
}: UseBookPdfUploadArgs) {
  const [loading, setLoading] = useState(false);

  const handlePdfFile = useCallback(
    async (file: File) => {
      if (!bookId) return;

      if (!tocRange.ok) {
        appToastManager.add({
          type: "error",
          description: "Invalid ToC page range.",
        });
        return;
      }

      const toastId = appToastManager.add({
        type: "loading",
        description: `Loading PDF "${file.name}"…`,
        timeout: 0,
      });
      setLoading(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        const doc = await loadingTask.promise;

        if (tocRange.end > doc.numPages) {
          appToastManager.update(toastId, {
            type: "error",
            description: `End page (${tocRange.end}) is past the PDF page count (${doc.numPages}).`,
            timeout: 7000,
          });
          return;
        }

        appToastManager.update(toastId, {
          type: "loading",
          description: `PDF loaded (${doc.numPages} pages). Extracting metadata from pages ${tocRange.start}–${tocRange.end}…`,
        });

        const pages = await extractTextItems(doc, {
          start: tocRange.start,
          end: tocRange.end,
        });
        appToastManager.update(toastId, {
          type: "loading",
          description: "Metadata extracted. Building meeting documents…",
        });

        const meetings = buildMeetings(
          pages.map((p) => ({
            page: p.page,
            items: p.items,
          })),
          symbolPrefixInput,
          effectiveMeetingTitlePattern(meetingTitlePatternInput),
        );

        await savePdfBlob(bookId, arrayBuffer);

        patchBook(bookId, {
          pdfFileName: file.name,
          pdfBlobKey: bookId,
          tocPageStart: tocRange.start,
          tocPageEnd: tocRange.end,
          symbolPrefix: symbolPrefixInput,
          meetingTitlePattern: effectiveMeetingTitlePattern(
            meetingTitlePatternInput,
          ),
          entries: meetings,
        });
        appToastManager.update(toastId, {
          type: "success",
          description: `Done. ${meetings.length} document(s) detected (ToC pages ${tocRange.start}–${tocRange.end}).`,
          timeout: 5000,
        });
      } catch (err) {
        console.error(err);
        appToastManager.update(toastId, {
          type: "error",
          description: "Error while processing the PDF.",
          timeout: 7000,
        });
      } finally {
        setLoading(false);
      }
    },
    [
      bookId,
      patchBook,
      meetingTitlePatternInput,
      symbolPrefixInput,
      tocRange,
    ],
  );

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handlePdfFile(file);
        e.target.value = "";
      },
      [handlePdfFile],
    );

  return { loading, handlePdfFile, handleFileChange };
}
