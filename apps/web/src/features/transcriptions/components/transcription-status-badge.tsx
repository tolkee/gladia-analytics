import { formatTranscriptionLabel } from "../transcription-formatters";
import { Badge } from "@gladia-analytics/ui/components/badge";

export function TranscriptionStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const isError = normalizedStatus.includes("error") || normalizedStatus.includes("fail");
  const isComplete =
    normalizedStatus.includes("complete") ||
    normalizedStatus.includes("success") ||
    normalizedStatus === "done";

  return (
    <Badge variant={isError ? "destructive" : isComplete ? "secondary" : "outline"}>
      <span
        aria-hidden="true"
        className={
          isError
            ? "size-1.5 rounded-full bg-destructive"
            : isComplete
              ? "size-1.5 rounded-full bg-emerald-500"
              : "size-1.5 rounded-full bg-amber-500"
        }
      />
      {formatTranscriptionLabel(status)}
    </Badge>
  );
}
