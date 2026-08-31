import {
  AnalyticsBreakdowns,
  AnalyticsEmptyState,
  AnalyticsPageError,
  AnalyticsPageSkeleton,
  AnalyticsPeriodPicker,
  AnalyticsSummary,
  AnalyticsTimeline,
  analyticsPeriods,
  analyticsSelectionFromSearch,
  getTranscriptionAnalyticsQuery,
  type AnalyticsSelection,
} from "#features/transcriptions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const analyticsSearchSchema = z
  .object({
    period: z.enum(analyticsPeriods).optional().catch(undefined),
    from: z.iso.date().optional().catch(undefined),
    to: z.iso.date().optional().catch(undefined),
  })
  .transform(({ period, from, to }) => {
    if (from && to && from <= to) {
      return { from, to };
    }

    return period ? { period } : {};
  });

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/analytics")({
  validateSearch: analyticsSearchSchema,
  loaderDeps: ({ search }) => ({ selection: analyticsSelectionFromSearch(search) }),
  loader: async ({ context, deps, params }) => {
    await context.queryClient.query(
      getTranscriptionAnalyticsQuery.options(
        context.user.id,
        params.organisationId,
        deps.selection,
      ),
    );
  },
  pendingComponent: AnalyticsPageSkeleton,
  errorComponent: ({ error, reset }) => <AnalyticsPageError error={error} reset={reset} />,
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { organisation, user } = Route.useRouteContext();
  const search = Route.useSearch();
  const selection = analyticsSelectionFromSearch(search);
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(
    getTranscriptionAnalyticsQuery.options(user.id, organisation.id, selection),
  );
  const { analytics, range } = data;

  function selectPeriod(nextSelection: AnalyticsSelection) {
    void navigate({
      search:
        nextSelection.type === "preset"
          ? { period: nextSelection.period }
          : { from: nextSelection.from, to: nextSelection.to },
    });
  }

  return (
    <section className="h-[calc(100svh-var(--header-height))] overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex justify-end">
          <AnalyticsPeriodPicker value={selection} onValueChange={selectPeriod} />
        </div>

        <AnalyticsSummary totals={analytics.totals} />

        {analytics.totals.transcriptionCount === 0 ? (
          <AnalyticsEmptyState selection={selection} />
        ) : (
          <>
            <AnalyticsTimeline analytics={analytics} range={range} />
            <AnalyticsBreakdowns analytics={analytics} />
          </>
        )}
      </div>
    </section>
  );
}
