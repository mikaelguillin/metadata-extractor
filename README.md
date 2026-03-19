# PDF 2-Column Parser (React + TypeScript)

This is a minimal React + TypeScript web app that parses 2‑column PDFs using `pdfjs-dist`, extracts text items with coordinates, and applies a state machine to detect sessions and their descriptions.

## Features

- Uses `pdfjs-dist` to read **text items with coordinates** per page.
- Sorts items **column-wise**:
  - All items with `x < halfWidth` (left column) ordered top-to-bottom.
  - Then all items with `x >= halfWidth` (right column) ordered top-to-bottom.
- Filters out noise lines:
  - Lines containing `Table des matières` or `Pages`.
  - Lines that are just page numbers.
- Stateful parsing:
  - A **new entry** starts when a line matches `"[Number]ème séance"` and the **next line** is a French date.
  - Everything after the date up to the next séance is the **description**.
- Results are persisted in `localStorage` and displayed in a table with:
  - Per-row **Delete** button.
  - **Clear All** button.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL (by default `http://localhost:5173`) in your browser and drop a 2‑column PDF that matches your structure.

