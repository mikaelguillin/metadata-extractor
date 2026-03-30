import type { ComponentProps, ReactNode } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appToastManager } from "@/lib/appToast";
import { cn } from "@/lib/utils";

export type CopyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "children" | "type"
> & {
  /** String written to the clipboard when the button is activated. */
  text: string;
  /** Toast description on success. Ignored when `toast` is false. */
  successMessage?: string;
  /** Toast description on failure. Ignored when `toast` is false. */
  errorMessage?: string;
  /** When true (default), show success/error toasts. */
  toast?: boolean;
  onCopied?: () => void;
  onCopyError?: (error: unknown) => void;
  children?: ReactNode;
};

export function CopyButton({
  text,
  successMessage = "Copied to clipboard.",
  errorMessage = "Could not copy.",
  toast: showToast = true,
  onCopied,
  onCopyError,
  variant = "ghost",
  size = "icon-xs",
  className,
  title,
  "aria-label": ariaLabel = "Copy to clipboard",
  children,
  disabled,
  ...rest
}: CopyButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-foreground",
        className,
      )}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        void (async () => {
          try {
            await navigator.clipboard.writeText(text);
            if (showToast) {
              appToastManager.add({
                type: "success",
                description: successMessage,
                timeout: 2000,
              });
            }
            onCopied?.();
          } catch (err) {
            if (showToast) {
              appToastManager.add({
                type: "error",
                description: errorMessage,
                timeout: 3000,
              });
            }
            onCopyError?.(err);
          }
        })();
      }}
      {...rest}
    >
      {children ?? <Copy />}
    </Button>
  );
}
