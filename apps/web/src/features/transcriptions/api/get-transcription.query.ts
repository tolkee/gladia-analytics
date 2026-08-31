import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint =
  apiClient.api.organisations[":organisationId"].transcriptions[":transcriptionId"].$get;

type GetTranscriptionSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTranscriptionErrorResponse = InferErrorResponseType<typeof endpoint>;
export type TranscriptionDetail = GetTranscriptionSuccessResponse;

const key = (userId: string, organisationId: string, transcriptionId: string) => [
  "transcription",
  userId,
  organisationId,
  transcriptionId,
];

const options = (userId: string, organisationId: string, transcriptionId: string) =>
  queryOptions<GetTranscriptionSuccessResponse, ApiError<GetTranscriptionErrorResponse>>({
    queryKey: key(userId, organisationId, transcriptionId),
    queryFn: async () => {
      const response = await endpoint({
        param: { organisationId, transcriptionId },
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
  });

export const getTranscriptionQuery = {
  key,
  options,
} satisfies Query;
