import { ApiErrorCode } from "@gladia-analytics/common/errors";
import { sValidator } from "@hono/standard-validator";
import type { ValidationTargets } from "hono";
import { apiError } from "#lib/errors";

export function requestValidator<
  Schema extends StandardSchema,
  Target extends keyof ValidationTargets,
>(target: Target, schema: Schema) {
  return sValidator(target, schema, (result, ctx) => {
    if (!result.success) {
      const details = targetDetails[target];

      return apiError(ctx, 400, ApiErrorCode.INVALID_REQUEST, details.message, {
        location: details.location,
        issues: result.error.map((issue) => ({
          path: normalizePathToPathSegmentArray(issue.path),
          message: issue.message,
        })),
      });
    }
  });
}

type StandardSchema = Parameters<typeof sValidator>[1];

const targetDetails = {
  json: {
    location: "body",
    message: "The request body contains invalid fields.",
  },
  query: {
    location: "query",
    message: "The query parameters are invalid.",
  },
  param: {
    location: "path",
    message: "The path parameters are invalid.",
  },
  header: {
    location: "headers",
    message: "The request headers are invalid.",
  },
  cookie: {
    location: "cookies",
    message: "The request cookies are invalid.",
  },
  form: {
    location: "form",
    message: "The submitted form contains invalid fields.",
  },
} as const satisfies Record<
  keyof ValidationTargets,
  {
    location: string;
    message: string;
  }
>;

/**
 * A Standard Schema path can contain either direct property keys or `{ key }` path segment
 * objects. This function unwrap the PropertyKey and so we only keep an array of path segments.
 * It also converts symbols to string to that value stays serializable.
 */
function normalizePathToPathSegmentArray(
  path: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined,
): Array<string | number> {
  if (!path) return [];

  return path.map((segment) => {
    const key = typeof segment === "object" ? segment.key : segment;

    return typeof key === "symbol" ? (key.description ?? key.toString()) : key;
  });
}
