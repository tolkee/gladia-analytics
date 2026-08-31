import type { TranscriptionAnalytics } from "../../api/get-transcription-analytics.query";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@gladia-analytics/ui/components/card";
import { AiTranscribeAudioIcon, Clock01Icon, DollarCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

type AnalyticsSummaryProps = {
  totals: TranscriptionAnalytics["totals"];
};

export function AnalyticsSummary({ totals }: AnalyticsSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <AnalyticsMetricCard
        title="Transcriptions"
        value={integerFormatter.format(totals.transcriptionCount)}
        icon={AiTranscribeAudioIcon}
      />
      <AnalyticsMetricCard
        title="Usage"
        value={`${decimalFormatter.format(totals.usageMinutes)} min`}
        icon={Clock01Icon}
      />
      <AnalyticsMetricCard
        title="Estimated cost"
        value={currencyFormatter.format(totals.costUsd)}
        icon={DollarCircleIcon}
      />
    </div>
  );
}

type AnalyticsMetricCardProps = {
  title: string;
  value: string;
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
};

function AnalyticsMetricCard({ title, value, icon }: AnalyticsMetricCardProps) {
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
