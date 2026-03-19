import React, { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";

// Configure pdf.js worker (Vite-friendly)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type SessionEntry = {
  id: string;
  page: number;
  sessionLabel: string;
  dateText: string;
  description: string;
};

type FlatTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
};

/** PDF user space: y increases upward, so larger y = higher on the page (read first). */
const SAME_LINE_TOL = 2.5;

function compareReadingOrder(a: FlatTextItem, b: FlatTextItem): number {
  const sameLine = Math.abs(a.y - b.y) < SAME_LINE_TOL;
  if (sameLine) return a.x - b.x;
  return b.y - a.y;
}

function needsSpaceBetween(prev: FlatTextItem, next: FlatTextItem): boolean {
  const prevEnd = prev.x + prev.width;
  const gap = next.x - prevEnd;
  if (gap <= 0) return false;
  const threshold = Math.max(0.8, prev.height * 0.12);
  if (gap < threshold) return false;
  const ps = prev.str;
  const ns = next.str;
  if (/\s$/.test(ps) || /^\s/.test(ns)) return false;
  return true;
}

const STORAGE_KEY = "twoColumnPdfSessions";

function isNoiseLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (/^Table des matières$/i.test(trimmed)) return true;
  if (/^Pages?$/i.test(trimmed)) return true;
  return false;
}

function isSessionLine(text: string): boolean {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  return /^\d+$/.test(compact.substring(0, 2));
}

function isFrenchDate(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const monthsRegex =
    /janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre/i;

  const hasMonth = monthsRegex.test(trimmed);
  const hasYear = /\d{4}/.test(trimmed);

  return hasMonth && hasYear;
}

async function extractTextItems(doc: PDFDocumentProxy): Promise<
  {
    page: number;
    width: number;
    height: number;
    items: FlatTextItem[];
  }[]
> {
  const pages: {
    page: number;
    width: number;
    height: number;
    items: FlatTextItem[];
  }[] = [];

  const numPages = doc.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const mapped: FlatTextItem[] = textContent.items
      .map((item) => {
        const textItem = item as TextItem | TextMarkedContent;
        if (!("transform" in textItem) || !("str" in textItem)) return null;
        const [, , , , e, f] = textItem.transform;
        return {
          str: textItem.str,
          x: e,
          y: f,
          width: textItem.width,
          height: textItem.height,
          hasEOL: textItem.hasEOL,
        };
      })
      .filter((it): it is FlatTextItem => !!it && !!it.str.trim());

    const halfWidth = viewport.width / 2;

    const left = mapped
      .filter((i) => i.x < halfWidth)
      .sort(compareReadingOrder);
    const right = mapped
      .filter((i) => i.x >= halfWidth)
      .sort(compareReadingOrder);

    pages.push({
      page: pageNum,
      width: viewport.width,
      height: viewport.height,
      items: [...left, ...right],
    });
  }

  return pages;
}

function buildSessions(
  pages: {
    page: number;
    items: FlatTextItem[];
  }[]
): SessionEntry[] {
  const sessions: SessionEntry[] = [];

  let currentSessionLabel: string | null = null;
  let currentDate: string | null = null;
  let currentPage = 0;
  let currentDescription: string[] = [];

  const flush = () => {
    if (currentSessionLabel && currentDate) {
      sessions.push({
        id: `${currentPage}-${sessions.length}-${Date.now()}`,
        page: currentPage,
        sessionLabel: currentSessionLabel,
        dateText: currentDate,
        description: currentDescription
          .filter((line) => !isFrenchDate(line))
          .join("\n")
          .trim(),
      });
    }
    currentSessionLabel = null;
    currentDate = null;
    currentDescription = [];
  };

  for (const page of pages) {
    const logicalLines: string[] = [];
    let buffer = "";
    let lastY: number | null = null;

    let lastItem: FlatTextItem | null = null;

    for (const item of page.items) {
      if (lastY === null) {
        buffer = item.str;
        lastY = item.y;
        lastItem = item;
      } else if (Math.abs(item.y - lastY) < SAME_LINE_TOL) {
        if (lastItem && needsSpaceBetween(lastItem, item)) buffer += " ";
        buffer += item.str;
        lastItem = item;
      } else {
        logicalLines.push(buffer);
        buffer = item.str;
        lastY = item.y;
        lastItem = item;
      }
    }
    if (buffer) logicalLines.push(buffer);

    const filteredLines = logicalLines.filter((line) => !isNoiseLine(line));

    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i].trim();
      const nextLine = filteredLines[i + 1]?.trim() ?? "";
      const prevLine = filteredLines[i - 1]?.trim() ?? "";

      if (
        isSessionLine(line) &&
        (isFrenchDate(nextLine) || isFrenchDate(prevLine))
      ) {
        flush();
        currentSessionLabel = line;
        currentDate = isFrenchDate(nextLine) ? nextLine : prevLine;
        currentPage = page.page;
        if (isFrenchDate(nextLine)) {
          i++;
        }
        continue;
      }

      if (currentSessionLabel && currentDate) {
        currentDescription.push(line);
      }
    }
  }

  flush();
  return sessions;
}

export const App: React.FC = () => {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SessionEntry[];
      setEntries(parsed);
    } catch {
      // ignore
    }
  }, []);

  const persist = (data: SessionEntry[]) => {
    setEntries(data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(`Chargement du PDF "${file.name}"…`);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setStatus(`PDF chargé (${doc.numPages} pages). Extraction du texte…`);

      const pages = await extractTextItems(doc);
      setStatus(`Texte extrait. Construction des documents…`);

      const sessions = buildSessions(
        pages.map((p) => ({
          page: p.page,
          items: p.items,
        }))
      );

      persist(sessions);
      setStatus(`Terminé. ${sessions.length} document(s) détectée(s).`);
    } catch (err) {
      console.error(err);
      setStatus("Erreur lors du traitement du PDF.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    persist(next);
  };

  const handleClearAll = () => {
    persist([]);
    setStatus("Toutes les entrées ont été supprimées.");
  };

  return (
    <div className="app">
      <div className="card">
        <div className="header">
          <div>
            <div className="title">Analyseur de PDF</div>
            <div className="subtitle">
              Détecte les documents et persiste le résultat.
            </div>
          </div>
          <div className="controls">
            <label className="file-input-label">
              <span>Choisir un PDF</span>
              <span className="pill monospace">pdfjs-dist</span>
              <input type="file" accept="application/pdf" onChange={handleFileChange} />
            </label>
            <button
              className="button danger"
              onClick={handleClearAll}
              disabled={entries.length === 0}
            >
              Clear All
            </button>
            <div className="badge">
              <span className="badge-dot" />
              <span>{entries.length} entrées</span>
            </div>
          </div>
        </div>

        {status && <div className="status">{loading ? `⏳ ${status}` : status}</div>}

        <div className="table-wrapper">
          {entries.length === 0 ? (
            <div className="empty">
              Aucune entrée pour l'instant. Chargez un PDF contenant une table des matières pour commencer.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="col-title">{entry.sessionLabel}</td>
                    <td className="col-date">{entry.dateText}</td>
                    <td className="col-description">{entry.description}</td>
                    <td>
                      <button
                        className="button"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

