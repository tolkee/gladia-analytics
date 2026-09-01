import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { InfiniteQuery } from "#lib/query";
import { infiniteQueryOptions, type InfiniteData } from "@tanstack/react-query";
import type { InferRequestType } from "hono";
import type { PeriodRange, PeriodSelection } from "../period";

const endpoint = apiClient.api.organisations[":organisationId"].transcriptions.$get;
const PAGE_SIZE = 50;

type ListTranscriptionsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type ListTranscriptionsErrorResponse = InferErrorResponseType<typeof endpoint>;
type ListTranscriptionsRequestQuery = InferRequestType<typeof endpoint>["query"];
export type TranscriptionSummary = ListTranscriptionsSuccessResponse["data"][number];
export type TranscriptionKind = NonNullable<ListTranscriptionsRequestQuery["kind"]>;
export type TranscriptionSortField = NonNullable<ListTranscriptionsRequestQuery["sort"]>;
export type TranscriptionSortOrder = NonNullable<ListTranscriptionsRequestQuery["order"]>;
export type TranscriptionListOptions = {
  kind?: TranscriptionKind;
  sort: TranscriptionSortField;
  order: TranscriptionSortOrder;
};
export type TranscriptionSorting = Partial<Pick<TranscriptionListOptions, "sort" | "order">>;

export const transcriptionKinds = [
  "live",
  "pre-recorded",
] as const satisfies readonly TranscriptionKind[];
export const transcriptionSortFields = [
  "status",
  "kind",
  "model",
  "languages",
  "duration",
  "createdAt",
] as const satisfies readonly TranscriptionSortField[];
export const transcriptionSortOrders = [
  "asc",
  "desc",
] as const satisfies readonly TranscriptionSortOrder[];
export const defaultTranscriptionListOptions = {
  sort: "createdAt",
  order: "desc",
} as const satisfies TranscriptionListOptions;

const key = (
  userId: string,
  organisationId: string,
  selection: PeriodSelection,
  range: PeriodRange,
  listOptions: TranscriptionListOptions,
) =>
  selection.type === "preset"
    ? [
        "transcriptions",
        userId,
        organisationId,
        "preset",
        selection.period,
        range.from,
        range.to,
        listOptions,
      ]
    : ["transcriptions", userId, organisationId, "custom", range.from, range.to, listOptions];

const options = (
  userId: string,
  organisationId: string,
  selection: PeriodSelection,
  range: PeriodRange,
  listOptions: TranscriptionListOptions,
) =>
  infiniteQueryOptions<
    ListTranscriptionsSuccessResponse,
    ApiError<ListTranscriptionsErrorResponse>,
    InfiniteData<ListTranscriptionsSuccessResponse, string | null>,
    ReturnType<typeof key>,
    string | null
  >({
    queryKey: key(userId, organisationId, selection, range, listOptions),
    queryFn: async ({ pageParam }) => {
      const response = await endpoint({
        param: { organisationId },
        query: {
          ...range,
          limit: PAGE_SIZE.toString(),
          sort: listOptions.sort,
          order: listOptions.order,
          ...(listOptions.kind ? { kind: listOptions.kind } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.meta.next,
  });

export const listTranscriptionsQuery = {
  key,
  options,
} satisfies InfiniteQuery;
