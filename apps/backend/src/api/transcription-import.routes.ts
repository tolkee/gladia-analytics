import {
  createTranscriptionImportSchema,
  TranscriptionImportContentTypeMismatchError,
  TranscriptionImportFileSizeMismatchError,
  TranscriptionImportInvalidStateError,
  TranscriptionImportNotFoundError,
  TranscriptionImportObjectNotFoundError,
  transcriptionImportParamsSchema,
  type TranscriptionImportService,
} from "#features/transcription-import";
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

export function createTranscriptionImportRoutes(
  transcriptionImportService: TranscriptionImportService,
) {
  return new Hono<ApiEnv>()
    .get(
      "/:organisationId/transcription-imports",
      authGuardMiddleware,
      requestValidator("param", transcriptionImportParamsSchema.omit({ importId: true })),
      async (ctx) => {
        try {
          const imports = await transcriptionImportService.getTranscriptionImports(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
          );

          return ctx.json(imports, 200);
        } catch (error) {
          return handleTranscriptionImportError(ctx, error);
        }
      },
    )
    .post(
      "/:organisationId/transcription-imports",
      authGuardMiddleware,
      requestValidator("param", transcriptionImportParamsSchema.omit({ importId: true })),
      requestValidator("json", createTranscriptionImportSchema),
      async (ctx) => {
        try {
          const createdImport = await transcriptionImportService.createTranscriptionImport(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("json"),
          );

          ctx.header("Cache-Control", "no-store");
          return ctx.json(createdImport, 201);
        } catch (error) {
          return handleTranscriptionImportError(ctx, error);
        }
      },
    )
    .get(
      "/:organisationId/transcription-imports/:importId",
      authGuardMiddleware,
      requestValidator("param", transcriptionImportParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const transcriptionImport = await transcriptionImportService.getTranscriptionImport(
            ctx.get("user").id,
            params.organisationId,
            params.importId,
          );

          return ctx.json(transcriptionImport, 200);
        } catch (error) {
          return handleTranscriptionImportError(ctx, error);
        }
      },
    )
    .post(
      "/:organisationId/transcription-imports/:importId/complete",
      authGuardMiddleware,
      requestValidator("param", transcriptionImportParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const transcriptionImport = await transcriptionImportService.completeUpload(
            ctx.get("user").id,
            params.organisationId,
            params.importId,
          );

          return ctx.json(transcriptionImport, 202);
        } catch (error) {
          return handleTranscriptionImportError(ctx, error);
        }
      },
    )
    .get(
      "/:organisationId/transcription-imports/:importId/download",
      authGuardMiddleware,
      requestValidator("param", transcriptionImportParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const download = await transcriptionImportService.createDownloadRequest(
            ctx.get("user").id,
            params.organisationId,
            params.importId,
          );

          ctx.header("Cache-Control", "no-store");
          return ctx.json(download, 200);
        } catch (error) {
          return handleTranscriptionImportError(ctx, error);
        }
      },
    );
}

function handleTranscriptionImportError(ctx: Context, error: unknown) {
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

  if (error instanceof TranscriptionImportNotFoundError) {
    return apiError(
      ctx,
      404,
      ApiErrorCode.TRANSCRIPTION_IMPORT_NOT_FOUND,
      "Transcription import not found",
    );
  }

  if (error instanceof TranscriptionImportObjectNotFoundError) {
    return apiError(
      ctx,
      409,
      ApiErrorCode.TRANSCRIPTION_IMPORT_OBJECT_NOT_FOUND,
      "The file has not been uploaded yet",
    );
  }

  if (error instanceof TranscriptionImportInvalidStateError) {
    return apiError(
      ctx,
      409,
      ApiErrorCode.TRANSCRIPTION_IMPORT_INVALID_STATE,
      "The transcription import is not in the expected state",
    );
  }

  if (error instanceof TranscriptionImportFileSizeMismatchError) {
    return apiError(
      ctx,
      422,
      ApiErrorCode.TRANSCRIPTION_IMPORT_FILE_SIZE_MISMATCH,
      "The uploaded file size does not match the declared size",
      {
        expectedSizeBytes: error.expectedSizeBytes,
        actualSizeBytes: error.actualSizeBytes,
      },
    );
  }

  if (error instanceof TranscriptionImportContentTypeMismatchError) {
    return apiError(
      ctx,
      422,
      ApiErrorCode.TRANSCRIPTION_IMPORT_CONTENT_TYPE_MISMATCH,
      "The uploaded file content type must be application/json",
      {
        expectedContentType: error.expectedContentType,
        actualContentType: error.actualContentType,
      },
    );
  }

  throw error;
}
