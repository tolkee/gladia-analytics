import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint = apiClient.api.organisations[":organisationId"].analytics.$get;
const millisecondsPerDay = 24 * 60 * 60 * 1_000;

export const analyticsPeriods = ["24h", "7d", "30d", "90d", "12m"] as const;
export type AnalyticsPeriod = (typeof analyticsPeriods)[number];
export const defaultAnalyticsPeriod = "30d" satisfies AnalyticsPeriod;

export type AnalyticsSelection =
  | { type: "preset"; period: AnalyticsPeriod }
  | { type: "custom"; from: string; to: string };

type GetTranscriptionAnalyticsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTranscriptionAnalyticsErrorResponse = InferErrorResponseType<typeof endpoint>;
export type TranscriptionAnalytics = GetTranscriptionAnalyticsSuccessResponse;

export type AnalyticsRange = {
  from: string;
  to: string;
  interval: "hour" | "day" | "week" | "month";
};

type TranscriptionAnalyticsResult = {
  analytics: TranscriptionAnalytics;
  range: AnalyticsRange;
};

const key = (userId: string, organisationId: string, selection: AnalyticsSelection) =>
  selection.type === "preset"
    ? ["transcription-analytics", userId, organisationId, "preset", selection.period]
    : ["transcription-analytics", userId, organisationId, "custom", selection.from, selection.to];

const options = (userId: string, organisationId: string, selection: AnalyticsSelection) =>
  queryOptions<
    TranscriptionAnalyticsResult,
    ApiError<GetTranscriptionAnalyticsErrorResponse>,
    TranscriptionAnalyticsResult,
    ReturnType<typeof key>
  >({
    queryKey: key(userId, organisationId, selection),
    queryFn: async () => {
      const range = getAnalyticsRange(selection);
      const response = await endpoint({
        param: { organisationId },
        query: range,
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return {
        analytics: await response.json(),
        range,
      };
    },
    staleTime: 60_000,
  });

export const getTranscriptionAnalyticsQuery = {
  key,
  options,
} satisfies Query;

export function isAnalyticsPeriod(value: unknown): value is AnalyticsPeriod {
  return analyticsPeriods.some((period) => period === value);
}

export function isAnalyticsCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function analyticsSelectionFromSearch(search: {
  period?: AnalyticsPeriod;
  from?: string;
  to?: string;
}): AnalyticsSelection {
  if (
    isAnalyticsCalendarDate(search.from) &&
    isAnalyticsCalendarDate(search.to) &&
    search.from <= search.to
  ) {
    return { type: "custom", from: search.from, to: search.to };
  }

  return { type: "preset", period: search.period ?? defaultAnalyticsPeriod };
}

function getAnalyticsRange(selection: AnalyticsSelection): AnalyticsRange {
  if (selection.type === "custom") {
    return getCustomAnalyticsRange(selection);
  }

  const period = selection.period;
  const to = new Date();
  const from = new Date(to);

  if (period === "24h") {
    from.setUTCHours(from.getUTCHours() - 24);
    return { from: from.toISOString(), to: to.toISOString(), interval: "hour" };
  }

  if (period === "12m") {
    from.setUTCMonth(from.getUTCMonth() - 12);
    return { from: from.toISOString(), to: to.toISOString(), interval: "month" };
  }

  const dayCount = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  }[period];
  from.setUTCDate(from.getUTCDate() - dayCount);

  return { from: from.toISOString(), to: to.toISOString(), interval: "day" };
}

function getCustomAnalyticsRange({
  from: fromValue,
  to: toValue,
}: Extract<AnalyticsSelection, { type: "custom" }>): AnalyticsRange {
  const from = dateFromCalendarValue(fromValue);
  const to = dateFromCalendarValue(toValue);
  to.setDate(to.getDate() + 1);

  const durationDays =
    (calendarDayTimestamp(toValue) - calendarDayTimestamp(fromValue)) / millisecondsPerDay + 1;
  const sixMonthBoundary = addCalendarMonths(from, 6);
  const interval = durationDays <= 1 ? "hour" : to <= sixMonthBoundary ? "day" : "month";

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    interval,
  };
}

function dateFromCalendarValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function calendarDayTimestamp(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function addCalendarMonths(date: Date, monthCount: number): Date {
  const result = new Date(date);
  const day = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + monthCount);

  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));

  return result;
}
