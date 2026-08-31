import {
  addOrganisationMemberSchema,
  createOrganisationSchema,
  OrganisationMemberAlreadyExistsError,
  OrganisationMemberNotFoundError,
  OrganisationMemberUserNotFoundError,
  OrganisationNotFoundError,
  organisationMemberParamsSchema,
  organisationParamsSchema,
  OrganisationPermissionDeniedError,
  updateOrganisationMemberSchema,
  updateOrganisationSchema,
  type OrganisationService,
} from "#features/organisation";
import { apiError } from "#lib/errors";
import { ApiErrorCode } from "@gladia-analytics/common/errors";
import { Hono, type Context } from "hono";
import { authGuardMiddleware } from "./middlewares/auth-guard";
import { requestValidator } from "./middlewares/request-validator";
import type { ApiEnv } from "./types";

export function createOrganisationRoutes(organisationService: OrganisationService) {
  return new Hono<ApiEnv>()
    .get("/", authGuardMiddleware, async (ctx) => {
      const organisations = await organisationService.getUserOrganisations(ctx.get("user").id);

      return ctx.json(organisations, 200);
    })
    .post(
      "/",
      authGuardMiddleware,
      requestValidator("json", createOrganisationSchema),
      async (ctx) => {
        const organisation = await organisationService.createOrganisation(
          ctx.get("user").id,
          ctx.req.valid("json"),
        );

        return ctx.json(organisation, 201);
      },
    )
    .get(
      "/:organisationId",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      async (ctx) => {
        try {
          const organisation = await organisationService.getOrganisation(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
          );

          return ctx.json(organisation, 200);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    )
    .patch(
      "/:organisationId",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      requestValidator("json", updateOrganisationSchema),
      async (ctx) => {
        try {
          const organisation = await organisationService.updateOrganisation(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("json"),
          );

          return ctx.json(organisation, 200);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    )
    .delete(
      "/:organisationId",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      async (ctx) => {
        try {
          await organisationService.deleteOrganisation(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
          );

          return ctx.body(null, 204);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    )
    .get(
      "/:organisationId/members",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      async (ctx) => {
        try {
          const members = await organisationService.getMembers(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
          );

          return ctx.json(members, 200);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    )
    .post(
      "/:organisationId/members",
      authGuardMiddleware,
      requestValidator("param", organisationParamsSchema),
      requestValidator("json", addOrganisationMemberSchema),
      async (ctx) => {
        try {
          const member = await organisationService.addMember(
            ctx.get("user").id,
            ctx.req.valid("param").organisationId,
            ctx.req.valid("json"),
          );

          return ctx.json(member, 201);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    )
    .patch(
      "/:organisationId/members/:userId",
      authGuardMiddleware,
      requestValidator("param", organisationMemberParamsSchema),
      requestValidator("json", updateOrganisationMemberSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          const member = await organisationService.updateMember(
            ctx.get("user").id,
            params.organisationId,
            params.userId,
            ctx.req.valid("json"),
          );

          return ctx.json(member, 200);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    )
    .delete(
      "/:organisationId/members/:userId",
      authGuardMiddleware,
      requestValidator("param", organisationMemberParamsSchema),
      async (ctx) => {
        const params = ctx.req.valid("param");

        try {
          await organisationService.removeMember(
            ctx.get("user").id,
            params.organisationId,
            params.userId,
          );

          return ctx.body(null, 204);
        } catch (error) {
          return handleOrganisationError(ctx, error);
        }
      },
    );
}

function handleOrganisationError(ctx: Context, error: unknown) {
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

  if (error instanceof OrganisationMemberNotFoundError) {
    return apiError(ctx, 404, ApiErrorCode.ORGANISATION_MEMBER_NOT_FOUND, "Member not found");
  }

  if (error instanceof OrganisationMemberUserNotFoundError) {
    return apiError(
      ctx,
      404,
      ApiErrorCode.ORGANISATION_MEMBER_USER_NOT_FOUND,
      "The selected user could not be found",
    );
  }

  if (error instanceof OrganisationMemberAlreadyExistsError) {
    return apiError(
      ctx,
      409,
      ApiErrorCode.ORGANISATION_MEMBER_ALREADY_EXISTS,
      "This user is already a member of the organisation",
    );
  }

  throw error;
}
