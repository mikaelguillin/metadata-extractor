import { useCallback, useEffect, useRef, useState } from "react";
import { CardFooter } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";

export const SAVED_ACK_MS = 1000;

export function useMeetingRowSavedAck(): readonly [
  showSavedAck: boolean,
  triggerSavedAck: () => void,
] {
  const [showSavedAck, setShowSavedAck] = useState(false);
  const savedAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedAckTimerRef.current) clearTimeout(savedAckTimerRef.current);
    },
    [],
  );

  const triggerSavedAck = useCallback(() => {
    setShowSavedAck(true);
    if (savedAckTimerRef.current) clearTimeout(savedAckTimerRef.current);
    savedAckTimerRef.current = setTimeout(() => {
      savedAckTimerRef.current = null;
      setShowSavedAck(false);
    }, SAVED_ACK_MS);
  }, []);

  return [showSavedAck, triggerSavedAck] as const;
}

export type MeetingRowFooterProps = {
  isDirty: boolean;
  debounceScheduled: boolean;
  showSavedAck: boolean;
  canPersist: boolean;
};

export function MeetingRowFooter({
  isDirty,
  debounceScheduled,
  showSavedAck,
  canPersist,
}: MeetingRowFooterProps) {
  return (
    <CardFooter
      className="mt-0 min-h-[2.25rem] w-full shrink-0 gap-2 border-border py-2.5 text-xs"
      role="status"
      aria-live="polite"
    >
      {isDirty && debounceScheduled ? (
        <>
          <Loader2
            className="size-3.5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
          <span className="text-muted-foreground">Saving…</span>
        </>
      ) : isDirty ? (
        <span
          className={
            canPersist
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground"
          }
        >
          {canPersist
            ? "Unsaved changes"
            : "Unsaved — fill meeting no., date, and description to save."}
        </span>
      ) : showSavedAck ? (
        <>
          <Check
            className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <span className="text-muted-foreground">Saved</span>
        </>
      ) : null}
    </CardFooter>
  );
}
