import type React from "react";
import {
  useCallback,
  useRef,
  useState,
} from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function PdfUploadDropZone({
  message,
  uploadDisabled,
  uploading,
  onPdfFile,
  onPdfFileInputChange,
}: {
  message: string;
  uploadDisabled: boolean;
  uploading: boolean;
  onPdfFile: (file: File) => void | Promise<void>;
  onPdfFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const disabled = uploadDisabled || uploading;

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      const ok =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!ok) return;
      void onPdfFile(file);
    },
    [disabled, onPdfFile],
  );

  return (
    <div className="p-5 sm:p-8">
      <div
        className={cn(
          "relative flex min-h-[min(22rem,50vh)] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-[border-color,background-color,box-shadow] duration-150",
          disabled
            ? "cursor-not-allowed border-muted-foreground/20 bg-muted/20 opacity-[0.72]"
            : isDragging
              ? "border-primary bg-primary/[0.06] shadow-[0_0_0_3px_hsl(var(--ring)/0.35)]"
              : "border-muted-foreground/25 bg-gradient-to-b from-muted/30 to-muted/10 hover:border-primary/45 hover:from-muted/40 hover:to-muted/15",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          dragDepthRef.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragging(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepthRef.current = 0;
          setIsDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          acceptFile(file);
        }}
      >
        <input
          ref={inputRef}
          id="book-pdf-file-drop"
          type="file"
          accept="application/pdf"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={onPdfFileInputChange}
          aria-label="Book PDF file"
        />
        <button
          type="button"
          disabled={disabled}
          aria-describedby="pdf-drop-instructions"
          className={cn(
            "flex max-w-lg flex-col items-center gap-5 rounded-xl p-2 outline-none",
            !disabled &&
              "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <div
            className={cn(
              "relative flex size-[4.25rem] items-center justify-center rounded-2xl shadow-md ring-1 ring-inset transition-transform duration-150",
              disabled
                ? "bg-muted text-muted-foreground ring-border"
                : "bg-card text-red-500 ring-border/70 hover:scale-[1.02] hover:ring-primary/35",
            )}
            aria-hidden
          >
            <FileText className="size-[2.35rem]" strokeWidth={1.5} />
            <span className="absolute -right-1 -bottom-1 rounded-md bg-red-600 px-1.5 py-px text-[0.58rem] font-bold tracking-wide text-white uppercase shadow-sm">
              PDF
            </span>
          </div>
          <p
            id="pdf-drop-instructions"
            className="m-0 text-[0.95rem] text-foreground leading-relaxed"
          >
            {message}
          </p>
        </button>
        {uploading ? (
          <p className="mt-2 text-[0.8rem] text-muted-foreground" role="status">
            Processing…
          </p>
        ) : null}
      </div>
    </div>
  );
}
