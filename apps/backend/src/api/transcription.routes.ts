import { OrganisationNotFoundError, organisationParamsSchema } from "#features/organisation";
import {
  analyticsTimeRangeSchema,
  transcriptionsQuerySchema,
  TranscriptionNotFoundError,
  transcriptionParamsSchema,
  type TranscriptionService,
} from "#features/transcription";
import { apiError } from "#lib/errors";
import { InvalidPaginationCursorError } from "#lib/pagination";
import { ApiErrorCode } from "@gladia-analytics/common/errors";
import { Hono } from "hono";
import { authGuardMiddleware } from "./middlewares/auth-guard";
import { requestValidator } from "./middlewares/request-validator";
import type { ApiEnv } from "./types";

export function createTranscriptionRoutes(transcriptionService: TranscriptionService) {
  return new Hono<ApiEnv>()
    .get(
      "/:organisationId/analytics",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      requestValidator("query", analyticsTimeRangeSchema),
      async (ctx) => {
        try {
          const analytics = await transcriptionService.getAnalytics(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("query"),
          );

          return ctx.json(analytics, 200);
        } catch (error) {
          if (error instanceof OrganisationNotFoundError) {
            return apiError(
              ctx,
              404,
              ApiErrorCode.ORGANISATION_NOT_FOUND,
              "Organisation not found",
            );
          }

          throw error;
        }
      },
    )
    .get(
      "/:organisationId/transcriptions",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      requestValidator("query", transcriptionsQuerySchema),
      async (ctx) => {
        try {
          const transcriptions = await transcriptionService.getTranscriptions(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("query"),
          );

          return ctx.json(transcriptions, 200);
        } catch (error) {
          if (error instanceof OrganisationNotFoundError) {
            return apiError(
              ctx,
              404,
              ApiErrorCode.ORGANISATION_NOT_FOUND,
              "Organisation not found",
            );
          }

          if (error instanceof InvalidPaginationCursorError) {
            return apiError(
              ctx,
              400,
              ApiErrorCode.INVALID_REQUEST,
              "The pagination cursor is invalid",
              {
                location: "query",
                issues: [{ path: ["cursor"], message: "Invalid cursor" }],
              },
            );
          }

          throw error;
        }
      },
    )
    .get(
      "/:organisationId/transcriptions/:transcriptionId",
      authGuardMiddleware,
      requestValidator("param", transcriptionParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const transcription = await transcriptionService.getTranscription(
            ctx.get("user").id,
            params.organisationId,
            params.transcriptionId,
          );

          return ctx.json(transcription, 200);
        } catch (error) {
          if (error instanceof OrganisationNotFoundError) {
            return apiError(
              ctx,
              404,
              ApiErrorCode.ORGANISATION_NOT_FOUND,
              "Organisation not found",
            );
          }

          if (error instanceof TranscriptionNotFoundError) {
            return apiError(
              ctx,
              404,
              ApiErrorCode.TRANSCRIPTION_NOT_FOUND,
              "Transcription not found",
            );
          }

          throw error;
        }
      },
    );
}
