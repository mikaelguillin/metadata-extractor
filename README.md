# Metadata extractor

Web app that parses **two-column PDF tables of contents** with [pdfjs-dist](https://mozilla.github.io/pdf.js/), applies heuristics to detect each session row, and lets you edit metadata, keep multiple books, and **download a per-session PDF excerpt** built from the full document.

## Features

### Books workspace

- **Multiple books**: create a book by name, **select** it, **rename** inline, or **delete** it.
- **Per-book settings**: symbol prefix, session title pattern, and table-of-contents (ToC) page range are stored with each book.
- **Persistence**:
  - Book list, settings, and extracted rows live in **`localStorage`** (`metadataExtractorBooks`).
  - The **full PDF** for each book is stored in **IndexedDB** so excerpt downloads still work after you clear or reload extracted rows (as long as you do not delete the book or re-upload).

### PDF upload and ToC extraction

- Enter a **ToC page range** (1-based start and end). Only those pages are parsed; the app validates the range against the document page count.
- Upload is disabled until a book is selected and the range is valid.
- Text is extracted with coordinates, sorted **column-wise** (left column top-to-bottom, then right column), and merged into logical lines.
- **Noise filtering**: drops lines such as “Table des matières” / “Pages”, standalone page numbers, and similar clutter (see `lineHeuristics`).

### Session detection

- **Stateful parsing**: a new entry starts when a line matches a session heading (e.g. `…ème séance`) and the **next** line looks like a **French date**; following lines form the **description** until the next session.
- Each entry stores **session number**, **date text**, **description**, **source page**, a **symbol** (`symbolPrefix` + session number), and a **session title** derived from the book’s title pattern.

### Configurable symbol and title

- **Symbol prefix** (e.g. `A/C.3/SR.`) is prepended to every session number; changing it updates all symbols for that book.
- **Session title pattern** defaults to `{sessionNumber}-{sessionDate}`; you can use the placeholders `{sessionNumber}` and `{sessionDate}`. The read-only **Title** field in the list reflects this pattern.

### Results UI

- Sessions appear as **cards** (not a classic data grid) with fields for symbol (display), session number, date, derived title, and description.
- **Inline editing** with debounced save for session number, date, and description; invalid empty values revert on blur.
- **Delete** per row; **Clear All** removes every entry for the current book (and clears the linked file name when the list is empty).

### Per-session PDF download

- After a successful upload, **Download PDF** on a row uses the **stored full PDF**, searches **page footers** for the entry’s symbol (from the ToC end page onward), and builds a **subset PDF** with [pdf-lib](https://pdf-lib.js.org/) for download (filename based on the symbol).

## Tech stack

- **React 18**, **TypeScript**, **Vite**
- **pdfjs-dist** — render/extract text and coordinates
- **pdf-lib** — assemble excerpt PDFs

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default **http://localhost:5173**). Create a book, set the ToC page range, then choose a PDF that matches the expected two-column ToC layout and session/date pattern.
