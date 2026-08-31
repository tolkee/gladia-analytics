import { usersTable } from "#schemas/auth";
import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const organisationRoles = ["owner", "admin", "viewer"] as const;
export const organisationRoleEnum = pgEnum("organisation_role", organisationRoles);

export const organisationsTable = pgTable(
  "organisations",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("organisations_owner_id_idx").on(table.ownerId)],
);

export type Organisation = typeof organisationsTable.$inferSelect;

export const organisationMembersTable = pgTable(
  "organisation_members",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: organisationRoleEnum().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.organisationId, table.userId],
      name: "organisation_members_pk",
    }),
    index("organisation_members_user_id_idx").on(table.userId),
  ],
);

export type OrganisationMember = typeof organisationMembersTable.$inferSelect;
export type OrganisationRole = OrganisationMember["role"];

export const organisationsRelations = relations(organisationsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [organisationsTable.ownerId],
    references: [usersTable.id],
  }),
  members: many(organisationMembersTable),
}));

export const organisationMembersRelations = relations(organisationMembersTable, ({ one }) => ({
  organisation: one(organisationsTable, {
    fields: [organisationMembersTable.organisationId],
    references: [organisationsTable.id],
  }),
  user: one(usersTable, {
    fields: [organisationMembersTable.userId],
    references: [usersTable.id],
  }),
}));
