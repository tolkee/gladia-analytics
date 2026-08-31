import { SheetDescription, SheetHeader, SheetTitle } from "@gladia-analytics/ui/components/sheet";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";

export function TranscriptionDetailSkeleton() {
  return (
    <>
      <SheetHeader className="pr-14">
        <SheetTitle className="sr-only">Loading transcription</SheetTitle>
        <SheetDescription className="sr-only">
          Loading the selected transcription details.
        </SheetDescription>
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-40" />
        </div>
      </SheetHeader>
      <div className="border-b bg-background px-4 py-2" aria-hidden="true">
        <Skeleton className="h-7 w-4/5" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-4" aria-hidden="true">
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </>
  );
}
