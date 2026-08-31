import type { AnalyticsSelection } from "../../api/get-transcription-analytics.query";
import {
  formatAnalyticsSelectionLabel,
  formatAnalyticsSelectionShortLabel,
} from "./analytics-period-picker";
import { Button } from "@gladia-analytics/ui/components/button";
import { Card, CardContent } from "@gladia-analytics/ui/components/card";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { AlertCircleIcon, Analytics02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type AnalyticsEmptyStateProps = {
  selection: AnalyticsSelection;
};

export function AnalyticsEmptyState({ selection }: AnalyticsEmptyStateProps) {
  return (
    <Card className="min-h-80 items-center justify-center text-center">
      <CardContent className="flex max-w-md flex-col items-center py-10">
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={Analytics02Icon}
            strokeWidth={2}
            className="size-5"
            aria-hidden="true"
          />
        </span>
        <h2 className="text-base font-semibold">No usage in this period</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          There are no transcriptions for {emptyStateRangeLabel(selection)}. Select a longer period
          to look further back.
        </p>
      </CardContent>
    </Card>
  );
}

type AnalyticsPageErrorProps = {
  error: Error;
  reset: () => void;
};

export function AnalyticsPageError({ error, reset }: AnalyticsPageErrorProps) {
  return (
    <section className="flex h-[calc(100svh-var(--header-height))] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center py-8">
          <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              strokeWidth={2}
              className="size-5"
              aria-hidden="true"
            />
          </span>
          <h1 className="text-base font-semibold">Analytics could not be loaded</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{error.message}</p>
          <Button type="button" className="mt-5" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <section className="h-[calc(100svh-var(--header-height))] overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-xl" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

function emptyStateRangeLabel(selection: AnalyticsSelection): string {
  if (selection.type === "preset") {
    return `the last ${formatAnalyticsSelectionShortLabel(selection)}`;
  }

  return formatAnalyticsSelectionLabel(selection);
}
