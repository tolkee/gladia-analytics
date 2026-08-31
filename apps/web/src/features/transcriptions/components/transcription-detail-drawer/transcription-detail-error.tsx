import { Button } from "@gladia-analytics/ui/components/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@gladia-analytics/ui/components/sheet";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type TranscriptionDetailErrorProps = {
  error: Error;
  onRetry: () => void;
};

export function TranscriptionDetailError({ error, onRetry }: TranscriptionDetailErrorProps) {
  return (
    <>
      <SheetHeader className="border-b pr-14">
        <SheetTitle>Unable to load transcription</SheetTitle>
        <SheetDescription>{error.message}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} className="size-5" strokeWidth={2} />
        </span>
        <div className="max-w-sm space-y-1">
          <p className="font-medium">The transcription details are unavailable</p>
          <p className="text-sm text-muted-foreground">
            It may have been removed, or the request could not be completed.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </>
  );
}
