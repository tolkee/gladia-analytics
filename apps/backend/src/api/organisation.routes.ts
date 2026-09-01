import { createOrganisationSchema, type OrganisationService } from "#features/organisation";
import { Hono } from "hono";
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
    );
}
