import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { InfiniteQuery } from "#lib/query";
import { infiniteQueryOptions, type InfiniteData } from "@tanstack/react-query";

const endpoint = apiClient.api.organisations[":organisationId"].transcriptions.$get;
const PAGE_SIZE = 50;

type GetTranscriptionsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTranscriptionsErrorResponse = InferErrorResponseType<typeof endpoint>;
export type Transcription = GetTranscriptionsSuccessResponse["data"][number];

const key = (userId: string, organisationId: string) => ["transcriptions", userId, organisationId];

const options = (userId: string, organisationId: string) =>
  infiniteQueryOptions<
    GetTranscriptionsSuccessResponse,
    ApiError<GetTranscriptionsErrorResponse>,
    InfiniteData<GetTranscriptionsSuccessResponse, string | null>,
    ReturnType<typeof key>,
    string | null
  >({
    queryKey: key(userId, organisationId),
    queryFn: async ({ pageParam }) => {
      const response = await endpoint({
        param: { organisationId },
        query: {
          limit: PAGE_SIZE.toString(),
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

export const getTranscriptionsQuery = {
  key,
  options,
} satisfies InfiniteQuery;
