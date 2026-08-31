import { getTranscriptionQuery } from "../../api/get-transcription.query";
import {
  TranscriptionDetailError,
  TranscriptionDetailSkeleton,
} from "./transcription-detail-states";
import { TranscriptionDetailView } from "./transcription-detail-view";
import { Sheet, SheetContent } from "@gladia-analytics/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";

type TranscriptionDetailDrawerProps = {
  userId: string;
  organisationId: string;
  transcriptionId?: string;
  onClose: () => void;
};

export function TranscriptionDetailDrawer({
  userId,
  organisationId,
  transcriptionId,
  onClose,
}: TranscriptionDetailDrawerProps) {
  return (
    <Sheet
      open={transcriptionId !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-none gap-0 overflow-hidden rounded-none border-0 data-[side=right]:inset-0 data-[side=right]:h-dvh data-[side=right]:w-full data-[side=right]:sm:inset-y-3 data-[side=right]:sm:right-3 data-[side=right]:sm:left-auto data-[side=right]:sm:h-[calc(100%-1.5rem)] data-[side=right]:sm:max-w-2xl data-[side=right]:sm:rounded-2xl data-[side=right]:sm:border before:absolute before:inset-y-5 before:-left-2 before:hidden before:w-2 before:rounded-l-xl before:border before:bg-muted/90 before:content-[''] after:absolute after:inset-y-9 after:-left-4 after:hidden after:w-2 after:rounded-l-lg after:border after:bg-muted/60 after:content-[''] sm:before:block sm:after:block"
      >
        {transcriptionId ? (
          <TranscriptionDetailContent
            userId={userId}
            organisationId={organisationId}
            transcriptionId={transcriptionId}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TranscriptionDetailContent({
  userId,
  organisationId,
  transcriptionId,
}: Required<Omit<TranscriptionDetailDrawerProps, "onClose">>) {
  const { data, error, isPending, refetch } = useQuery(
    getTranscriptionQuery.options(userId, organisationId, transcriptionId),
  );

  if (isPending) return <TranscriptionDetailSkeleton />;

  if (error) {
    return <TranscriptionDetailError error={error} onRetry={() => void refetch()} />;
  }

  return <TranscriptionDetailView transcription={data} />;
}
