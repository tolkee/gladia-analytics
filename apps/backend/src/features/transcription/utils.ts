import type { Organisation } from "#features/organisation";
import { sql } from "drizzle-orm";
import type {
  AnalyticsInterval,
  AnalyticsLanguageMode,
  AnalyticsResponse,
  AnalyticsTimeRange,
  TranscriptionSource,
} from "./transcription.dto";
import { transcriptionsTable } from "./transcription.schema";

export function toTranscriptionInsert(
  organisationId: Organisation["id"],
  source: TranscriptionSource,
): typeof transcriptionsTable.$inferInsert {
  const file = source.file;
  const result = source.result?.metadata;

  return {
    organisationId,
    id: source.id,
    requestId: source.request_id,
    version: source.version,
    status: source.status,
    createdAt: new Date(source.created_at),
    completedAt: source.completed_at ? new Date(source.completed_at) : null,
    customMetadata: source.custom_metadata,
    errorCode: source.error_code,
    kind: source.kind,
    fileId: file?.id ?? null,
    fileName: file?.filename ?? null,
    fileSource: file?.source ?? null,
    fileAudioDuration: file?.audio_duration ?? null,
    fileNumberOfChannels: file?.number_of_channels ?? null,
    model: source.request_params.model,
    detectLanguage: source.request_params.detect_language ?? null,
    languages: source.request_params.language_config.languages,
    codeSwitching: source.request_params.language_config.code_switching,
    resultAudioDuration: result?.audio_duration ?? null,
    resultNumberOfDistinctChannels: result?.number_of_distinct_channels ?? null,
    resultBillingTime: result?.billing_time ?? null,
    resultTranscriptionTime: result?.transcription_time ?? null,
    billableSeconds: result?.billing_time ?? result?.audio_duration ?? file?.audio_duration ?? 0,
  };
}

type TimelineAggregateRow = {
  bucketStartMs: number;
  transcriptionCount: number;
  usageMinutes: number;
  costUsd: number;
  realtimeMinutes: number;
  asyncMinutes: number;
};

export function fillTimeline(
  timeRange: AnalyticsTimeRange,
  rows: TimelineAggregateRow[],
): AnalyticsResponse["timeline"] {
  const rowsByStart = new Map(
    rows.map((row) => [new Date(toNumber(row.bucketStartMs)).toISOString(), row]),
  );
  const timeline: AnalyticsResponse["timeline"] = [];

  for (
    let bucketStart = floorToInterval(timeRange.from, timeRange.interval);
    bucketStart < timeRange.to;
    bucketStart = incrementInterval(bucketStart, timeRange.interval)
  ) {
    const start = bucketStart.toISOString();
    const row = rowsByStart.get(start);

    timeline.push({
      start,
      transcriptionCount: toNumber(row?.transcriptionCount),
      usageMinutes: round(toNumber(row?.usageMinutes)),
      costUsd: round(toNumber(row?.costUsd)),
      realtimeMinutes: round(toNumber(row?.realtimeMinutes)),
      asyncMinutes: round(toNumber(row?.asyncMinutes)),
    });
  }

  return timeline;
}

export function fillLanguageModes(
  rows: Array<{ mode: AnalyticsLanguageMode; transcriptionCount: number }>,
): AnalyticsResponse["languages"]["byMode"] {
  const counts = new Map(rows.map((row) => [row.mode, toNumber(row.transcriptionCount)]));

  return (["auto-detect", "single-language", "multiple-languages"] as const).map((mode) => ({
    mode,
    transcriptionCount: counts.get(mode) ?? 0,
  }));
}

export function fillTypes(
  rows: Array<{ type: "realtime" | "async"; transcriptionCount: number }>,
): AnalyticsResponse["types"] {
  const counts = new Map(rows.map((row) => [row.type, toNumber(row.transcriptionCount)]));

  return (["realtime", "async"] as const).map((type) => ({
    type,
    transcriptionCount: counts.get(type) ?? 0,
  }));
}

export function toNumber(value: number | string | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function excluded(columnName: string) {
  return sql.raw(`excluded."${columnName}"`);
}

function floorToInterval(date: Date, interval: AnalyticsInterval): Date {
  const result = new Date(date);
  result.setUTCMinutes(0, 0, 0);

  if (interval === "hour") return result;

  result.setUTCHours(0, 0, 0, 0);

  if (interval === "day") return result;

  if (interval === "week") {
    const daysSinceMonday = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - daysSinceMonday);
    return result;
  }

  result.setUTCDate(1);
  return result;
}

function incrementInterval(date: Date, interval: AnalyticsInterval): Date {
  const result = new Date(date);

  if (interval === "hour") result.setUTCHours(result.getUTCHours() + 1);
  if (interval === "day") result.setUTCDate(result.getUTCDate() + 1);
  if (interval === "week") result.setUTCDate(result.getUTCDate() + 7);
  if (interval === "month") result.setUTCMonth(result.getUTCMonth() + 1);

  return result;
}
