import { createMiddleware } from "hono/factory";
import type { AuthedApiEnv } from "../types";
import { apiError } from "#lib/errors";
import { ApiErrorCode } from "@gladia-analytics/common/errors";

export const authGuardMiddleware = createMiddleware<AuthedApiEnv>(async (ctx, next) => {
  if (!ctx.get("user")) {
    return apiError(ctx, 401, ApiErrorCode.UNAUTHORIZED, "Unauthorized");
  }

  await next();
});
