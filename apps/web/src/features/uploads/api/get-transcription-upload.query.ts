import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint = apiClient.api.organisations[":organisationId"]["transcription-uploads"].$get;

type GetTranscriptionUploadsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTranscriptionUploadsErrorResponse = InferErrorResponseType<typeof endpoint>;
export type TranscriptionUpload = GetTranscriptionUploadsSuccessResponse[number];

const key = (userId: string, organisationId: string) => [
  "transcription-uploads",
  userId,
  organisationId,
];

const options = (userId: string, organisationId: string) =>
  queryOptions<
    GetTranscriptionUploadsSuccessResponse,
    ApiError<GetTranscriptionUploadsErrorResponse>
  >({
    queryKey: key(userId, organisationId),
    queryFn: async () => {
      const response = await endpoint({ param: { organisationId } });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
    refetchInterval: (query) =>
      query.state.data?.some(
        (upload) => upload.status === "queued" || upload.status === "processing",
      )
        ? 1_000
        : false,
  });

export const getTranscriptionUploadsQuery = {
  key,
  options,
} satisfies Query;
