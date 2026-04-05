import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/ui/copy-button";

const fieldCaption =
  "text-[0.72rem] font-medium tracking-wide text-muted-foreground uppercase";

export function MeetingRowForm({
  symbol,
  meetingNoId,
  dateId,
  titleId,
  descId,
  meetingNumber,
  dateText,
  description,
  displayedTitle,
  onMeetingNumberChange,
  onDateChange,
  onDescriptionChange,
  onBlurRest,
}: {
  symbol: string;
  meetingNoId: string;
  dateId: string;
  titleId: string;
  descId: string;
  meetingNumber: string;
  dateText: string;
  description: string;
  displayedTitle: string;
  onMeetingNumberChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBlurRest: () => void;
}) {
  return (
    <CardContent className="flex min-w-0 flex-1 flex-col gap-3 py-4">
      <div className="border-border border-b pb-2">
        <div className={fieldCaption}>Symbol</div>
        <div
          className="mt-1 break-all font-mono text-[0.95rem] font-semibold tracking-wide text-indigo-700 dark:text-indigo-100"
          title={symbol}
        >
          {symbol}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={meetingNoId} className={fieldCaption}>
          Meeting no.
        </Label>
        <Input
          id={meetingNoId}
          className="font-mono tabular-nums"
          type="text"
          inputMode="numeric"
          value={meetingNumber}
          onChange={(e) => onMeetingNumberChange(e.target.value)}
          onBlur={onBlurRest}
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={dateId} className={fieldCaption}>
          Date
        </Label>
        <Input
          id={dateId}
          type="text"
          value={dateText}
          onChange={(e) => onDateChange(e.target.value)}
          onBlur={onBlurRest}
          spellCheck={true}
          lang="fr"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={titleId} className={fieldCaption}>
            Title
          </Label>
          <CopyButton
            text={displayedTitle}
            title="Copy title"
            aria-label="Copy title"
          />
        </div>
        <Input
          id={titleId}
          readOnly
          aria-readonly="true"
          value={displayedTitle}
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={descId} className={fieldCaption}>
            Description
          </Label>
          <CopyButton
            text={description}
            title="Copy description"
            aria-label="Copy description"
          />
        </div>
        <Textarea
          id={descId}
          className="min-h-[5.5rem] resize-y leading-snug whitespace-pre-wrap"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={onBlurRest}
          rows={10}
          spellCheck={true}
          lang="fr"
        />
      </div>
    </CardContent>
  );
}
