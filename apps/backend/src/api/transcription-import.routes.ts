import {
  createTranscriptionImportHeadersSchema,
  createTranscriptionImportQuerySchema,
  TranscriptionImportEmptyFileError,
  TranscriptionImportNotFoundError,
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
      requestValidator("query", createTranscriptionImportQuerySchema),
      requestValidator("header", createTranscriptionImportHeadersSchema),
      async (ctx) => {
        try {
          const createdImport = await transcriptionImportService.createTranscriptionImport(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("query"),
            ctx.req.raw,
          );

          return ctx.json(createdImport, 202);
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

  if (error instanceof TranscriptionImportEmptyFileError) {
    return apiError(
      ctx,
      400,
      ApiErrorCode.INVALID_REQUEST,
      "The transcription import file must not be empty",
    );
  }

  throw error;
}
