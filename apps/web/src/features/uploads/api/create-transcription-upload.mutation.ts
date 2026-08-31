import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Mutation } from "#lib/query";
import { mutationOptions } from "@tanstack/react-query";
import { getTranscriptionUploadsQuery } from "./get-transcription-upload.query";

const endpoint = apiClient.api.organisations[":organisationId"]["transcription-uploads"].$post;

type CreateTranscriptionUploadSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type CreateTranscriptionUploadErrorResponse = InferErrorResponseType<typeof endpoint>;
type CreateTranscriptionUploadVariables = { file: File };

const key = (userId: string, organisationId: string) => [
  "transcription-uploads",
  "create",
  userId,
  organisationId,
];

const options = (userId: string, organisationId: string) =>
  mutationOptions<
    CreateTranscriptionUploadSuccessResponse,
    ApiError<CreateTranscriptionUploadErrorResponse>,
    CreateTranscriptionUploadVariables
  >({
    mutationKey: key(userId, organisationId),
    mutationFn: async ({ file }) => {
      const response = await endpoint(
        {
          param: { organisationId },
          query: { filename: file.name },
          header: { "content-type": "application/json" },
        },
        { init: { body: file } },
      );

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
    onSuccess: (_data, _variables, _onMutateResult, { client }) => {
      return client.invalidateQueries({
        queryKey: getTranscriptionUploadsQuery.key(userId, organisationId),
      });
    },
  });

export const createTranscriptionUploadMutation = {
  key,
  options,
} satisfies Mutation;
