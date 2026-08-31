import { TranscriptionsDataTable, getTranscriptionsQuery } from "#features/transcriptions";
import { Button } from "@gladia-analytics/ui/components/button";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/transcriptions")({
  loader: async ({ context, params }) => {
    await context.queryClient.fetchInfiniteQuery(
      getTranscriptionsQuery.options(context.user.id, params.organisationId),
    );
  },
  pendingComponent: TranscriptionsPageSkeleton,
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  const { organisation, user } = Route.useRouteContext();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    getTranscriptionsQuery.options(user.id, organisation.id),
  );
  const transcriptions = useMemo(() => data.pages.flatMap((page) => page.data), [data.pages]);

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

        <Button type="button" variant="outline" size="sm" className="ml-auto" disabled>
          Period
        </Button>
      </div>

      <TranscriptionsDataTable
        transcriptions={transcriptions}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
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
