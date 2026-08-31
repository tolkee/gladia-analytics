import {
  PeriodPicker,
  TranscriptionDetailDrawer,
  TranscriptionsDataTable,
  getPeriodRange,
  listTranscriptionsQuery,
  periodSearchSchema,
  periodSelectionFromSearch,
  type PeriodSelection,
} from "#features/transcriptions";
import { Button } from "@gladia-analytics/ui/components/button";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import * as z from "zod";

const transcriptionsSearchSchema = periodSearchSchema.and(
  z.object({
    transcriptionId: z.uuid().optional(),
  }),
);

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/transcriptions")({
  validateSearch: transcriptionsSearchSchema,
  loaderDeps: ({ search }) => {
    const selection = periodSelectionFromSearch(search);
    return { selection, range: getPeriodRange(selection) };
  },
  loader: async ({ context, deps, params }) => {
    await context.queryClient.fetchInfiniteQuery(
      listTranscriptionsQuery.options(
        context.user.id,
        params.organisationId,
        deps.selection,
        deps.range,
      ),
    );
  },
  pendingComponent: TranscriptionsPageSkeleton,
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  const { organisation, user } = Route.useRouteContext();
  const { transcriptionId } = Route.useSearch();
  const { range, selection } = Route.useLoaderDeps();
  const navigate = Route.useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    listTranscriptionsQuery.options(user.id, organisation.id, selection, range),
  );
  const transcriptions = useMemo(() => data.pages.flatMap((page) => page.data), [data.pages]);

  function openTranscription(nextTranscriptionId: string) {
    void navigate({
      search: (previous) => ({ ...previous, transcriptionId: nextTranscriptionId }),
      replace: transcriptionId !== undefined,
    });
  }

  function closeTranscription() {
    void navigate({
      search: (previous) => ({ ...previous, transcriptionId: undefined }),
      replace: true,
    });
  }

  function selectPeriod(nextSelection: PeriodSelection) {
    void navigate({
      search:
        nextSelection.type === "preset"
          ? { period: nextSelection.period }
          : { from: nextSelection.from, to: nextSelection.to },
    });
  }

  return (
    <section className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col gap-3 p-4">
      <div
        role="toolbar"
        aria-label="Transcription actions"
        className="flex flex-wrap items-center gap-2"
      >
        <Button type="button" variant="outline" size="sm" disabled>
          <HugeiconsIcon icon={FilterIcon} data-icon="inline-start" strokeWidth={2} />
          Add filters
        </Button>

        <PeriodPicker
          value={selection}
          onValueChange={selectPeriod}
          size="sm"
          className="ml-auto"
        />
      </div>

      <TranscriptionsDataTable
        transcriptions={transcriptions}
        selectedTranscriptionId={transcriptionId}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onTranscriptionOpen={openTranscription}
      />

      <TranscriptionDetailDrawer
        userId={user.id}
        organisationId={organisation.id}
        transcriptionId={transcriptionId}
        onClose={closeTranscription}
      />
    </section>
  );
}

function TranscriptionsPageSkeleton() {
  return (
    <section className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col gap-3 p-4">
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="ml-auto h-7 w-28" />
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-lg" />
    </section>
  );
}
