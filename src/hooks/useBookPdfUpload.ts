import type React from "react";
import { useCallback, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildSessions } from "../lib/sessions/buildSessions";
import { effectiveSessionTitlePattern } from "../lib/sessions/sessionTitlePattern";
import type { TocRangeResult } from "../lib/tocRange";
import { savePdfBlob } from "../lib/storage/pdfBlobStore";
import type { Book } from "../types/book";

type PatchBook = (
  id: string,
  patch: Partial<
    Pick<
      Book,
      | "symbolPrefix"
      | "sessionTitlePattern"
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
  sessionTitlePatternInput: string;
  patchBook: PatchBook;
  setStatus: (message: string) => void;
};

export function useBookPdfUpload({
  bookId,
  tocRange,
  symbolPrefixInput,
  sessionTitlePatternInput,
  patchBook,
  setStatus,
}: UseBookPdfUploadArgs) {
  const [loading, setLoading] = useState(false);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      async (e) => {
        const file = e.target.files?.[0];
        if (!file || !bookId) return;

        if (!tocRange.ok) {
          setStatus("Plage de pages ToC invalide.");
          e.target.value = "";
          return;
        }

        setStatus(`Chargement du PDF "${file.name}"…`);
        setLoading(true);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
          const doc = await loadingTask.promise;

          if (tocRange.end > doc.numPages) {
            setStatus(
              `La page fin (${tocRange.end}) dépasse le nombre de pages du PDF (${doc.numPages}).`,
            );
            return;
          }

          setStatus(
            `PDF chargé (${doc.numPages} pages). Extraction du texte des pages ${tocRange.start}–${tocRange.end}…`,
          );

          const pages = await extractTextItems(doc, {
            start: tocRange.start,
            end: tocRange.end,
          });
          setStatus(`Texte extrait. Construction des documents…`);

          const sessions = buildSessions(
            pages.map((p) => ({
              page: p.page,
              items: p.items,
            })),
            symbolPrefixInput,
            effectiveSessionTitlePattern(sessionTitlePatternInput),
          );

          await savePdfBlob(bookId, arrayBuffer);

          patchBook(bookId, {
            pdfFileName: file.name,
            pdfBlobKey: bookId,
            tocPageStart: tocRange.start,
            tocPageEnd: tocRange.end,
            symbolPrefix: symbolPrefixInput,
            sessionTitlePattern: effectiveSessionTitlePattern(
              sessionTitlePatternInput,
            ),
            entries: sessions,
          });
          setStatus(
            `Terminé. ${sessions.length} document(s) détectée(s) (pages ToC ${tocRange.start}–${tocRange.end}).`,
          );
        } catch (err) {
          console.error(err);
          setStatus("Erreur lors du traitement du PDF.");
        } finally {
          setLoading(false);
          e.target.value = "";
        }
      },
      [
        bookId,
        patchBook,
        sessionTitlePatternInput,
        symbolPrefixInput,
        setStatus,
        tocRange,
      ],
    );

  return { loading, handleFileChange };
}
