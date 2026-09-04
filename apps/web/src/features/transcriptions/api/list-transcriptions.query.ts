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
import { getPeriodRange, type PeriodRange, type PeriodSelection } from "../period";

const endpoint = apiClient.api.organisations[":organisationId"].transcriptions.$get;
const PAGE_SIZE = 50;

type ListTranscriptionsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type TranscriptionsPage = ListTranscriptionsSuccessResponse & { range: PeriodRange };
type TranscriptionsPageParam = { cursor: string; range: PeriodRange } | null;

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
  listOptions: TranscriptionListOptions,
) =>
  selection.type === "preset"
    ? [
        "transcriptions",
        userId,
        organisationId,
        "preset",
        selection.period,
        selection.at,
        listOptions,
      ]
    : [
        "transcriptions",
        userId,
        organisationId,
        "custom",
        selection.from,
        selection.to,
        listOptions,
      ];

const options = (
  userId: string,
  organisationId: string,
  selection: PeriodSelection,
  listOptions: TranscriptionListOptions,
) =>
  infiniteQueryOptions<
    TranscriptionsPage,
    ApiError<ListTranscriptionsErrorResponse>,
    InfiniteData<TranscriptionsPage, TranscriptionsPageParam>,
    ReturnType<typeof key>,
    TranscriptionsPageParam
  >({
    queryKey: key(userId, organisationId, selection, listOptions),
    queryFn: async ({ pageParam }) => {
      // Keep every page on the first page’s window, even after the preset cache is reused.
      const range = pageParam?.range ?? getPeriodRange(selection);
      const response = await endpoint({
        param: { organisationId },
        query: {
          ...range,
          limit: PAGE_SIZE.toString(),
          sort: listOptions.sort,
          order: listOptions.order,
          ...(listOptions.kind ? { kind: listOptions.kind } : {}),
          ...(pageParam ? { cursor: pageParam.cursor } : {}),
        },
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return { ...(await response.json()), range };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.meta.next ? { cursor: lastPage.meta.next, range: lastPage.range } : null,
  });

export const listTranscriptionsQuery = {
  key,
  options,
} satisfies InfiniteQuery;
