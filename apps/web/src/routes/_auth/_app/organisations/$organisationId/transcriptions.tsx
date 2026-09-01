import {
  PeriodPicker,
  TranscriptionDetailDrawer,
  TranscriptionFilters,
  TranscriptionsDataTable,
  defaultTranscriptionListOptions,
  getPeriodRange,
  listTranscriptionsQuery,
  periodSearchSchema,
  periodSelectionFromSearch,
  transcriptionKinds,
  transcriptionSortFields,
  transcriptionSortOrders,
  type PeriodSelection,
  type TranscriptionKind,
  type TranscriptionListOptions,
  type TranscriptionSorting,
} from "#features/transcriptions";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import * as z from "zod";

const transcriptionsSearchSchema = periodSearchSchema.and(
  z.object({
    transcriptionId: z.uuid().optional(),
    kind: z.enum(transcriptionKinds).optional(),
    sort: z.enum(transcriptionSortFields).optional(),
    order: z.enum(transcriptionSortOrders).optional(),
  }),
);

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/transcriptions")({
  validateSearch: transcriptionsSearchSchema,
  loaderDeps: ({ search }) => {
    const selection = periodSelectionFromSearch(search);
    const listOptions: TranscriptionListOptions = {
      ...(search.kind ? { kind: search.kind } : {}),
      sort: search.sort ?? defaultTranscriptionListOptions.sort,
      order: search.order ?? defaultTranscriptionListOptions.order,
    };

    return { selection, range: getPeriodRange(selection), listOptions };
  },
  loader: async ({ context, deps, params }) => {
    await context.queryClient.fetchInfiniteQuery(
      listTranscriptionsQuery.options(
        context.user.id,
        params.organisationId,
        deps.selection,
        deps.range,
        deps.listOptions,
      ),
    );
  },
  pendingComponent: TranscriptionsPageSkeleton,
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  const { organisation, user } = Route.useRouteContext();
  const { order, sort, transcriptionId } = Route.useSearch();
  const { listOptions, range, selection } = Route.useLoaderDeps();
  const navigate = Route.useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    listTranscriptionsQuery.options(user.id, organisation.id, selection, range, listOptions),
  );
  const transcriptions = useMemo(() => data.pages.flatMap((page) => page.data), [data.pages]);

  const openTranscription = useCallback(
    (nextTranscriptionId: string) => {
      void navigate({
        search: (previous) => ({ ...previous, transcriptionId: nextTranscriptionId }),
        replace: transcriptionId !== undefined,
      });
    },
    [navigate, transcriptionId],
  );

  const closeTranscription = useCallback(() => {
    void navigate({
      search: (previous) => ({ ...previous, transcriptionId: undefined }),
      replace: true,
    });
  }, [navigate]);

  const selectPeriod = useCallback(
    (nextSelection: PeriodSelection) => {
      void navigate({
        search: (previous) =>
          nextSelection.type === "preset"
            ? {
                ...previous,
                period: nextSelection.period,
                from: undefined,
                to: undefined,
                transcriptionId: undefined,
              }
            : {
                ...previous,
                period: undefined,
                from: nextSelection.from,
                to: nextSelection.to,
                transcriptionId: undefined,
              },
      });
    },
    [navigate],
  );

  const changeKind = useCallback(
    (kind: TranscriptionKind | undefined) => {
      void navigate({
        search: (previous) => ({ ...previous, kind, transcriptionId: undefined }),
      });
    },
    [navigate],
  );

  const changeSorting = useCallback(
    (sorting: TranscriptionSorting) => {
      void navigate({
        search: (previous) => ({
          ...previous,
          sort: sorting.sort,
          order: sorting.order,
          transcriptionId: undefined,
        }),
      });
    },
    [navigate],
  );

  return (
    <section className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col gap-3 p-4">
      <div
        role="toolbar"
        aria-label="Transcription actions"
        className="flex flex-wrap items-center gap-2"
      >
        <TranscriptionFilters kind={listOptions.kind} onKindChange={changeKind} />

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
        sorting={{ order, sort }}
        onSortingChange={changeSorting}
        hasActiveFilters={listOptions.kind !== undefined}
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
