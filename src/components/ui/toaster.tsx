import { Toast } from "@base-ui/react/toast";
import { Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-[100] flex w-[min(100vw-2rem,22rem)] max-w-[100vw] flex-col gap-2 outline-none">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "z-[calc(1000-var(--toast-index))] rounded-lg border bg-card text-card-foreground shadow-lg ring-1 ring-foreground/10",
              "translate-y-[var(--toast-swipe-movement-y,0)] transition-[transform,opacity] duration-200",
              "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
              "data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0",
              toast.type === "error" &&
                "border-destructive/40 bg-destructive/10 text-destructive",
              toast.type === "success" &&
                "border-emerald-600/35 bg-emerald-600/10 text-foreground",
              toast.type === "loading" && "border-border",
            )}
          >
            <Toast.Content className="flex items-start gap-2.5 p-3 pr-2">
              {toast.type === "loading" ? (
                <Loader2
                  className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              <Toast.Description className="min-w-0 flex-1 text-[0.8rem] leading-snug">
                {toast.description}
              </Toast.Description>
              <Toast.Close
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" strokeWidth={2} />
              </Toast.Close>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
