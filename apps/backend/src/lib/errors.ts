import type { ApiErrorCode } from "@gladia-analytics/common/errors";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvariantError";
  }
}

export function apiError<
  TStatus extends ContentfulStatusCode,
  TCode extends ApiErrorCode,
  TMetadata extends Record<string, unknown> = never,
>(ctx: Context, status: TStatus, code: TCode, message: string, metadata?: TMetadata) {
  return ctx.json({ errorCode: code, message, ...(metadata && { metadata }) }, status);
}
