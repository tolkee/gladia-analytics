import type { TranscriptionAnalytics } from "../../api/get-transcription-analytics.query";
import { Card, CardContent, CardHeader, CardTitle } from "@gladia-analytics/ui/components/card";

const breakdownColors = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
];
const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

type AnalyticsBreakdownsProps = {
  analytics: TranscriptionAnalytics;
};

export function AnalyticsBreakdowns({ analytics }: AnalyticsBreakdownsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AnalyticsBreakdownCard
        title="Transcription type"
        items={analytics.types.map((item, index) => ({
          key: item.type,
          label: item.type === "realtime" ? "Real-time" : "Async",
          value: item.transcriptionCount,
          color: getBreakdownColor(index),
        }))}
      />
      <AnalyticsBreakdownCard
        title="Models"
        emptyMessage="No models were used in this period."
        items={analytics.models.map((item, index) => ({
          key: item.model,
          label: item.model,
          value: item.transcriptionCount,
          color: getBreakdownColor(index),
        }))}
      />
      <AnalyticsBreakdownCard
        title="Languages"
        emptyMessage="No explicit languages. Requests may be using auto-detect."
        items={analytics.languages.byLanguage.map((item, index) => ({
          key: item.language,
          label: item.language.toUpperCase(),
          value: item.transcriptionCount,
          color: getBreakdownColor(index),
        }))}
      />
      <AnalyticsBreakdownCard
        title="Language setup"
        items={analytics.languages.byMode.map((item, index) => ({
          key: item.mode,
          label: formatLanguageMode(item.mode),
          value: item.transcriptionCount,
          color: getBreakdownColor(index),
        }))}
      />
    </div>
  );
}

type AnalyticsBreakdownItem = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type AnalyticsBreakdownCardProps = {
  title: string;
  items: AnalyticsBreakdownItem[];
  emptyMessage?: string;
};

function AnalyticsBreakdownCard({ title, items, emptyMessage }: AnalyticsBreakdownCardProps) {
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

function formatLanguageMode(
  mode: TranscriptionAnalytics["languages"]["byMode"][number]["mode"],
): string {
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
