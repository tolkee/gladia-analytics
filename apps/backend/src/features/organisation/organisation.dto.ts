import * as z from "zod";

const organisationNameSchema = z.string().trim().min(1);

export const createOrganisationSchema = z.object({
  name: organisationNameSchema,
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;

export const updateOrganisationSchema = z.object({
  name: organisationNameSchema,
});

export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;

export const organisationRoleSchema = z.enum(["owner", "admin", "viewer"]);
export const manageableOrganisationRoleSchema = z.enum(["admin", "viewer"]);

export const addOrganisationMemberSchema = z.object({
  userId: z.string().min(1),
  role: manageableOrganisationRoleSchema.default("viewer"),
});

export type AddOrganisationMemberInput = z.infer<typeof addOrganisationMemberSchema>;

export const updateOrganisationMemberSchema = z.object({
  role: manageableOrganisationRoleSchema,
});

export type UpdateOrganisationMemberInput = z.infer<typeof updateOrganisationMemberSchema>;

export const organisationParamsSchema = z.object({
  organisationId: z.uuid(),
});

export const organisationMemberParamsSchema = z.object({
  organisationId: z.uuid(),
  userId: z.string().min(1),
});
