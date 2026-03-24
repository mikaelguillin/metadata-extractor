import type React from "react";
import { useCallback, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { extractTextItems } from "../lib/pdf/extractTextItems";
import { buildSessions } from "../lib/sessions/buildSessions";
import { effectiveSessionTitlePattern } from "../lib/sessions/sessionTitlePattern";
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
};

export function useBookPdfUpload({
  bookId,
  tocRange,
  symbolPrefixInput,
  sessionTitlePatternInput,
  patchBook,
}: UseBookPdfUploadArgs) {
  const [loading, setLoading] = useState(false);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      async (e) => {
        const file = e.target.files?.[0];
        if (!file || !bookId) return;

        if (!tocRange.ok) {
          appToastManager.add({
            type: "error",
            description: "Plage de pages ToC invalide.",
          });
          e.target.value = "";
          return;
        }

        const toastId = appToastManager.add({
          type: "loading",
          description: `Chargement du PDF "${file.name}"…`,
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
              description: `La page fin (${tocRange.end}) dépasse le nombre de pages du PDF (${doc.numPages}).`,
              timeout: 7000,
            });
            return;
          }

          appToastManager.update(toastId, {
            type: "loading",
            description: `PDF chargé (${doc.numPages} pages). Extraction du texte des pages ${tocRange.start}–${tocRange.end}…`,
          });

          const pages = await extractTextItems(doc, {
            start: tocRange.start,
            end: tocRange.end,
          });
          appToastManager.update(toastId, {
            type: "loading",
            description: "Texte extrait. Construction des documents…",
          });

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
          appToastManager.update(toastId, {
            type: "success",
            description: `Terminé. ${sessions.length} document(s) détectée(s) (pages ToC ${tocRange.start}–${tocRange.end}).`,
            timeout: 5000,
          });
        } catch (err) {
          console.error(err);
          appToastManager.update(toastId, {
            type: "error",
            description: "Erreur lors du traitement du PDF.",
            timeout: 7000,
          });
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
        tocRange,
      ],
    );

  return { loading, handleFileChange };
}
