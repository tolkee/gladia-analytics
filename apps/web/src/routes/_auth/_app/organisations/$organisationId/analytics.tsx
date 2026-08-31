import {
  AnalyticsPeriodPicker,
  analyticsSelectionFromSearch,
  formatAnalyticsSelectionLabel,
  formatAnalyticsSelectionShortLabel,
  getTranscriptionAnalyticsQuery,
  isAnalyticsCalendarDate,
  isAnalyticsPeriod,
  type AnalyticsPeriod,
  type AnalyticsRange,
  type AnalyticsSelection,
  type TranscriptionAnalytics,
} from "#features/transcriptions";
import { Button } from "@gladia-analytics/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gladia-analytics/ui/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@gladia-analytics/ui/components/chart";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@gladia-analytics/ui/components/tabs";
import {
  AiTranscribeAudioIcon,
  AlertCircleIcon,
  Analytics02Icon,
  Clock01Icon,
  DollarCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type ComponentProps } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  realtimeMinutes: {
    label: "Real-time minutes",
    color: "var(--chart-2)",
  },
  asyncMinutes: {
    label: "Async minutes",
    color: "var(--chart-4)",
  },
  costUsd: {
    label: "Cost (USD)",
    color: "var(--chart-3)",
  },
  transcriptionCount: {
    label: "Transcriptions",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const chartMetricDetails = {
  usage: {
    label: "Usage",
    title: "Usage over time (minutes)",
  },
  cost: {
    label: "Cost",
    title: "Cost over time (dollars)",
  },
  transcriptions: {
    label: "Volume",
    title: "Transcriptions over time",
  },
} as const;

type ChartMetric = keyof typeof chartMetricDetails;

const breakdownColors = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
];

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const hourTickFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const monthTickFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "2-digit",
});
const dayTickFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const hourTooltipFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
});
const monthTooltipFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/analytics")({
  validateSearch: validateAnalyticsSearch,
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

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            title="Transcriptions"
            value={integerFormatter.format(analytics.totals.transcriptionCount)}
            icon={AiTranscribeAudioIcon}
          />
          <MetricCard
            title="Usage"
            value={formatMinutes(analytics.totals.usageMinutes)}
            icon={Clock01Icon}
          />
          <MetricCard
            title="Estimated cost"
            value={currencyFormatter.format(analytics.totals.costUsd)}
            icon={DollarCircleIcon}
          />
        </div>

        {analytics.totals.transcriptionCount === 0 ? (
          <AnalyticsEmptyState selection={selection} />
        ) : (
          <>
            <AnalyticsTimeline analytics={analytics} range={range} />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <BreakdownCard
                title="Transcription type"
                items={analytics.types.map((item, index) => ({
                  key: item.type,
                  label: item.type === "realtime" ? "Real-time" : "Async",
                  value: item.transcriptionCount,
                  color: getBreakdownColor(index),
                }))}
              />
              <BreakdownCard
                title="Models"
                emptyMessage="No models were used in this period."
                items={analytics.models.map((item, index) => ({
                  key: item.model,
                  label: item.model,
                  value: item.transcriptionCount,
                  color: getBreakdownColor(index),
                }))}
              />
              <BreakdownCard
                title="Languages"
                emptyMessage="No explicit languages. Requests may be using auto-detect."
                items={analytics.languages.byLanguage.map((item, index) => ({
                  key: item.language,
                  label: item.language.toUpperCase(),
                  value: item.transcriptionCount,
                  color: getBreakdownColor(index),
                }))}
              />
              <BreakdownCard
                title="Language setup"
                items={analytics.languages.byMode.map((item, index) => ({
                  key: item.mode,
                  label: formatLanguageMode(item.mode),
                  value: item.transcriptionCount,
                  color: getBreakdownColor(index),
                }))}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
};

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardAction className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

type AnalyticsTimelineProps = {
  analytics: TranscriptionAnalytics;
  range: AnalyticsRange;
};

function AnalyticsTimeline({ analytics, range }: AnalyticsTimelineProps) {
  const [metric, setMetric] = useState<ChartMetric>("usage");
  const metricDetails = chartMetricDetails[metric];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{metricDetails.title}</CardTitle>
        <CardAction>
          <Tabs
            value={metric}
            onValueChange={(value) => {
              if (isChartMetric(value)) setMetric(value);
            }}
          >
            <TabsList aria-label="Chart metric">
              {(Object.keys(chartMetricDetails) as ChartMetric[]).map((availableMetric) => (
                <TabsTrigger
                  key={availableMetric}
                  value={availableMetric}
                  className="px-3 data-active:border-border"
                >
                  {chartMetricDetails[availableMetric].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto sm:h-80">
          <AreaChart
            accessibilityLayer
            data={analytics.timeline}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillRealtime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-realtimeMinutes)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-realtimeMinutes)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="fillAsync" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-asyncMinutes)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-asyncMinutes)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-costUsd)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-costUsd)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="fillTranscriptions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-transcriptionCount)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-transcriptionCount)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="start"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={28}
              tickFormatter={(value: string) => formatTimelineTick(value, range.interval)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value: number) => formatChartAxisValue(value, metric)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => formatTimelineTooltip(String(value), range.interval)}
                />
              }
            />
            {metric === "usage" ? (
              <>
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey="asyncMinutes"
                  type="monotone"
                  fill="url(#fillAsync)"
                  stroke="var(--color-asyncMinutes)"
                  stackId="usage"
                />
                <Area
                  dataKey="realtimeMinutes"
                  type="monotone"
                  fill="url(#fillRealtime)"
                  stroke="var(--color-realtimeMinutes)"
                  stackId="usage"
                />
              </>
            ) : metric === "cost" ? (
              <Area
                dataKey="costUsd"
                type="monotone"
                fill="url(#fillCost)"
                stroke="var(--color-costUsd)"
              />
            ) : (
              <Area
                dataKey="transcriptionCount"
                type="monotone"
                fill="url(#fillTranscriptions)"
                stroke="var(--color-transcriptionCount)"
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

type BreakdownItem = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type BreakdownCardProps = {
  title: string;
  items: BreakdownItem[];
  emptyMessage?: string;
};

function BreakdownCard({ title, items, emptyMessage }: BreakdownCardProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const visibleItems = items.filter((item) => item.value > 0);

  return (
    <Card size="sm" className="min-h-64">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="mx-(--card-spacing) min-h-0 flex-1 overflow-y-auto rounded-lg bg-muted/40 p-(--card-spacing)">
        {visibleItems.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {emptyMessage ?? "No data for this period."}
          </p>
        ) : (
          <ul className="space-y-4" aria-label={`${title} breakdown`}>
            {visibleItems.map((item) => {
              const percentage = total === 0 ? 0 : (item.value / total) * 100;

              return (
                <li key={item.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium" title={item.label}>
                      {item.label}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      {integerFormatter.format(item.value)} · {decimalFormatter.format(percentage)}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${item.label}: ${decimalFormatter.format(percentage)}%`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsEmptyState({ selection }: { selection: AnalyticsSelection }) {
  return (
    <Card className="min-h-80 items-center justify-center text-center">
      <CardContent className="flex max-w-md flex-col items-center py-10">
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Analytics02Icon} strokeWidth={2} className="size-5" />
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

function AnalyticsPageError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="flex h-[calc(100svh-var(--header-height))] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center py-8">
          <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-5" />
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

function AnalyticsPageSkeleton() {
  return (
    <section className="h-[calc(100svh-var(--header-height))] overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
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

function formatMinutes(value: number): string {
  return `${decimalFormatter.format(value)} min`;
}

function formatTimelineTick(value: string, interval: AnalyticsRange["interval"]): string {
  const date = new Date(value);

  if (interval === "hour") {
    return hourTickFormatter.format(date);
  }

  if (interval === "month") {
    return monthTickFormatter.format(date);
  }

  return dayTickFormatter.format(date);
}

function formatTimelineTooltip(value: string, interval: AnalyticsRange["interval"]): string {
  const date = new Date(value);

  if (interval === "hour") {
    return hourTooltipFormatter.format(date);
  }

  if (interval === "month") {
    return monthTooltipFormatter.format(date);
  }

  return dateFormatter.format(date);
}

function formatChartAxisValue(value: number, metric: ChartMetric): string {
  if (metric === "cost") return currencyFormatter.format(value);
  return compactFormatter.format(value);
}

function isChartMetric(value: string): value is ChartMetric {
  return value === "usage" || value === "cost" || value === "transcriptions";
}

function formatLanguageMode(mode: TranscriptionAnalytics["languages"]["byMode"][number]["mode"]) {
  const labels = {
    "auto-detect": "Auto-detect",
    "single-language": "Single language",
    "multiple-languages": "Multiple languages",
  } satisfies Record<typeof mode, string>;

  return labels[mode];
}

function getBreakdownColor(index: number): string {
  return breakdownColors[index % breakdownColors.length] ?? "var(--chart-2)";
}

type AnalyticsSearch = {
  period?: AnalyticsPeriod;
  from?: string;
  to?: string;
};

function validateAnalyticsSearch(search: Record<string, unknown>): AnalyticsSearch {
  if (
    isAnalyticsCalendarDate(search.from) &&
    isAnalyticsCalendarDate(search.to) &&
    search.from <= search.to
  ) {
    return { from: search.from, to: search.to };
  }

  return isAnalyticsPeriod(search.period) ? { period: search.period } : {};
}

function emptyStateRangeLabel(selection: AnalyticsSelection): string {
  if (selection.type === "preset") {
    return `the last ${formatAnalyticsSelectionShortLabel(selection)}`;
  }

  return formatAnalyticsSelectionLabel(selection);
}
