import type {
  AnalyticsRange,
  TranscriptionAnalytics,
} from "../../api/get-transcription-analytics.query";
import {
  Card,
  CardAction,
  CardContent,
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
import { Tabs, TabsList, TabsTrigger } from "@gladia-analytics/ui/components/tabs";
import { useState } from "react";
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
const chartMetrics = ["usage", "cost", "transcriptions"] as const satisfies readonly ChartMetric[];

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

type AnalyticsTimelineProps = {
  analytics: TranscriptionAnalytics;
  range: AnalyticsRange;
};

export function AnalyticsTimeline({ analytics, range }: AnalyticsTimelineProps) {
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
              {chartMetrics.map((availableMetric) => (
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
