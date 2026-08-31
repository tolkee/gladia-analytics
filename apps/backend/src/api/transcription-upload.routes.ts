import {
  createTranscriptionUploadHeadersSchema,
  createTranscriptionUploadQuerySchema,
  TranscriptionUploadEmptyFileError,
  TranscriptionUploadNotFoundError,
  transcriptionUploadParamsSchema,
  type TranscriptionUploadService,
} from "#features/transcription-upload";
import { apiError } from "#lib/errors";
import { ApiErrorCode } from "@gladia-analytics/common/errors";
import { Hono, type Context } from "hono";
import {
  OrganisationNotFoundError,
  OrganisationPermissionDeniedError,
} from "#features/organisation";
import { authGuardMiddleware } from "./middlewares/auth-guard";
import { requestValidator } from "./middlewares/request-validator";
import type { ApiEnv } from "./types";

export function createTranscriptionUploadRoutes(
  transcriptionUploadService: TranscriptionUploadService,
) {
  return new Hono<ApiEnv>()
    .get(
      "/:organisationId/transcription-uploads",
      authGuardMiddleware,
      requestValidator("param", transcriptionUploadParamsSchema.omit({ uploadId: true })),
      async (ctx) => {
        try {
          const uploads = await transcriptionUploadService.getTranscriptionUploads(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
          );

          return ctx.json(uploads, 200);
        } catch (error) {
          return handleTranscriptionUploadError(ctx, error);
        }
      },
    )
    .post(
      "/:organisationId/transcription-uploads",
      authGuardMiddleware,
      requestValidator("param", transcriptionUploadParamsSchema.omit({ uploadId: true })),
      requestValidator("query", createTranscriptionUploadQuerySchema),
      requestValidator("header", createTranscriptionUploadHeadersSchema),
      async (ctx) => {
        try {
          const createdUpload = await transcriptionUploadService.createTranscriptionUpload(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("query"),
            ctx.req.raw,
          );

          return ctx.json(createdUpload, 202);
        } catch (error) {
          return handleTranscriptionUploadError(ctx, error);
        }
      },
    )
    .get(
      "/:organisationId/transcription-uploads/:uploadId",
      authGuardMiddleware,
      requestValidator("param", transcriptionUploadParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const transcriptionUpload = await transcriptionUploadService.getTranscriptionUpload(
            ctx.get("user").id,
            params.organisationId,
            params.uploadId,
          );

          return ctx.json(transcriptionUpload, 200);
        } catch (error) {
          return handleTranscriptionUploadError(ctx, error);
        }
      },
    )
    .get(
      "/:organisationId/transcription-uploads/:uploadId/download",
      authGuardMiddleware,
      requestValidator("param", transcriptionUploadParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const download = await transcriptionUploadService.createDownloadRequest(
            ctx.get("user").id,
            params.organisationId,
            params.uploadId,
          );

          ctx.header("Cache-Control", "no-store");
          return ctx.json(download, 200);
        } catch (error) {
          return handleTranscriptionUploadError(ctx, error);
        }
      },
    );
}

function handleTranscriptionUploadError(ctx: Context, error: unknown) {
  if (error instanceof OrganisationNotFoundError) {
    return apiError(ctx, 404, ApiErrorCode.ORGANISATION_NOT_FOUND, "Organisation not found");
  }

  if (error instanceof OrganisationPermissionDeniedError) {
    return apiError(
      ctx,
      403,
      ApiErrorCode.ORGANISATION_FORBIDDEN,
      "You do not have permission to perform this action",
    );
  }

  if (error instanceof TranscriptionUploadNotFoundError) {
    return apiError(
      ctx,
      404,
      ApiErrorCode.TRANSCRIPTION_UPLOAD_NOT_FOUND,
      "Transcription upload not found",
    );
  }

  if (error instanceof TranscriptionUploadEmptyFileError) {
    return apiError(
      ctx,
      400,
      ApiErrorCode.INVALID_REQUEST,
      "The transcription upload file must not be empty",
    );
  }

  throw error;
}
