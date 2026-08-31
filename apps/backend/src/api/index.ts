import { Hono } from "hono";
import { createTodoRoutes } from "./todo.routes";
import type { Services } from "#lib/services";
import { auth } from "#features/auth";
import { authContextMiddleware } from "./middlewares/auth-context";
import { ApiErrorCode } from "@gladia-analytics/common/errors";
import { loggerMiddleware } from "./middlewares/logger";
import { requestId } from "hono/request-id";
import { cors } from "hono/cors";
import { env } from "#lib/env";
import { apiError } from "#lib/errors";
import type { ApplyGlobalResponse } from "hono/client";
import { createOrganisationRoutes } from "./organisation.routes";
import { createTranscriptionRoutes } from "./transcription.routes";

export function createApi(services: Services) {
  const todoRoutes = createTodoRoutes(services.todoService);
  const organisationRoutes = createOrganisationRoutes(services.organisationService);
  const transcriptionRoutes = createTranscriptionRoutes(services.transcriptionService);

  return new Hono()
    .use(requestId())
    .use(
      cors({
        origin: env.TRUSTED_ORIGINS,
        credentials: true,
      }),
    )
    .use(loggerMiddleware)
    .use(authContextMiddleware)
    .all("/api/auth/*", (ctx) => auth.handler(ctx.req.raw))
    .route("api/todo", todoRoutes)
    .route("/api/organisations", organisationRoutes)
    .route("/api/organisations", transcriptionRoutes)
    .get("/api/health", (ctx) => {
      return ctx.json({ status: "ok" });
    })
    .onError((_, ctx) =>
      // Fallback for unhandled/unexpected errors
      apiError(ctx, 500, ApiErrorCode.INTERNAL_SERVER_ERROR, "Internal server error"),
    );
}

export type ApiType = ApplyGlobalResponse<
  ReturnType<typeof createApi>,
  {
    500: { json: { errorCode: "INTERNAL_SERVER_ERROR"; message: "Internal server error" } };
  }
>;
