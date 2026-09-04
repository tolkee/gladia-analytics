import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";
import { getPeriodRange, type PeriodRange, type PeriodSelection } from "../period";

const endpoint = apiClient.api.organisations[":organisationId"].analytics.$get;
const millisecondsPerDay = 24 * 60 * 60 * 1_000;

type GetTranscriptionAnalyticsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTranscriptionAnalyticsErrorResponse = InferErrorResponseType<typeof endpoint>;
export type TranscriptionAnalytics = GetTranscriptionAnalyticsSuccessResponse;

export type AnalyticsRange = PeriodRange & {
  interval: "hour" | "day" | "week" | "month";
};

type TranscriptionAnalyticsResult = {
  analytics: TranscriptionAnalytics;
  range: AnalyticsRange;
};

const key = (userId: string, organisationId: string, selection: PeriodSelection) =>
  selection.type === "preset"
    ? ["transcription-analytics", userId, organisationId, "preset", selection.period, selection.at]
    : ["transcription-analytics", userId, organisationId, "custom", selection.from, selection.to];

const options = (userId: string, organisationId: string, selection: PeriodSelection) =>
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

function getAnalyticsRange(selection: PeriodSelection): AnalyticsRange {
  const range = getPeriodRange(selection);

  if (selection.type === "custom") {
    return { ...range, interval: getCustomAnalyticsInterval(selection) };
  }

  const interval =
    selection.period === "24h" ? "hour" : selection.period === "12m" ? "month" : "day";
  return { ...range, interval };
}

function getCustomAnalyticsInterval({
  from: fromValue,
  to: toValue,
}: Extract<PeriodSelection, { type: "custom" }>): AnalyticsRange["interval"] {
  const from = dateFromCalendarValue(fromValue);
  const to = dateFromCalendarValue(toValue);
  to.setDate(to.getDate() + 1);

  const durationDays =
    (calendarDayTimestamp(toValue) - calendarDayTimestamp(fromValue)) / millisecondsPerDay + 1;
  const sixMonthBoundary = addCalendarMonths(from, 6);
  return durationDays <= 1 ? "hour" : to <= sixMonthBoundary ? "day" : "month";
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
