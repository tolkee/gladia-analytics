import { usersTable, type User } from "#features/auth";
import type { Db } from "#lib/db";
import { InvariantError } from "#lib/errors";
import { and, asc, eq } from "drizzle-orm";
import type {
  AddOrganisationMemberInput,
  CreateOrganisationInput,
  UpdateOrganisationInput,
  UpdateOrganisationMemberInput,
} from "./organisation.dto";
import {
  OrganisationMemberAlreadyExistsError,
  OrganisationMemberNotFoundError,
  OrganisationMemberUserNotFoundError,
  OrganisationNotFoundError,
  OrganisationOwnerImmutableError,
  OrganisationPermissionDeniedError,
} from "./errors";
import {
  organisationMembersTable,
  organisationsTable,
  type Organisation,
  type OrganisationRole,
} from "./organisation.schema";

export type UserOrganisation = Organisation & {
  role: OrganisationRole;
};

export type OrganisationMemberDetails = {
  userId: User["id"];
  name: User["name"];
  email: User["email"];
  image: User["image"];
  role: OrganisationRole;
  createdAt: Date;
};

const organisationRoleRank: Record<OrganisationRole, number> = {
  viewer: 0,
  admin: 1,
  owner: 2,
};

export class OrganisationService {
  constructor(private readonly db: Db) {}

  async assertOrganisationAccess(
    userId: User["id"],
    organisationId: Organisation["id"],
    requiredRole: OrganisationRole = "viewer",
  ): Promise<OrganisationRole> {
    const [membership] = await this.db
      .select({ role: organisationMembersTable.role })
      .from(organisationMembersTable)
      .where(
        and(
          eq(organisationMembersTable.organisationId, organisationId),
          eq(organisationMembersTable.userId, userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new OrganisationNotFoundError();
    }

    if (organisationRoleRank[membership.role] < organisationRoleRank[requiredRole]) {
      throw new OrganisationPermissionDeniedError();
    }

    return membership.role;
  }

  async getOrganisation(
    userId: User["id"],
    organisationId: Organisation["id"],
  ): Promise<UserOrganisation> {
    const role = await this.assertOrganisationAccess(userId, organisationId, "viewer");
    const [organisation] = await this.db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId))
      .limit(1);

    if (!organisation) {
      throw new OrganisationNotFoundError();
    }

    return { ...organisation, role };
  }

  async createOrganisation(
    ownerId: User["id"],
    input: CreateOrganisationInput,
  ): Promise<UserOrganisation> {
    return this.db.transaction(async (tx) => {
      const [organisation] = await tx
        .insert(organisationsTable)
        .values({ ...input, ownerId })
        .returning();

      if (!organisation) {
        throw new InvariantError("Organisation insert returned no row");
      }

      const [membership] = await tx
        .insert(organisationMembersTable)
        .values({ organisationId: organisation.id, userId: ownerId, role: "owner" })
        .returning();

      if (!membership) {
        throw new InvariantError("Organisation owner membership insert returned no row");
      }

      return { ...organisation, role: membership.role };
    });
  }

  async deleteOrganisation(userId: User["id"], organisationId: Organisation["id"]): Promise<void> {
    await this.assertOrganisationAccess(userId, organisationId, "owner");

    await this.db
      .delete(organisationsTable)
      .where(
        and(eq(organisationsTable.id, organisationId), eq(organisationsTable.ownerId, userId)),
      );
  }

  async updateOrganisation(
    userId: User["id"],
    organisationId: Organisation["id"],
    updates: UpdateOrganisationInput,
  ): Promise<UserOrganisation> {
    const role = await this.assertOrganisationAccess(userId, organisationId, "admin");

    const [organisation] = await this.db
      .update(organisationsTable)
      .set(updates)
      .where(eq(organisationsTable.id, organisationId))
      .returning();

    if (!organisation) {
      throw new OrganisationNotFoundError();
    }

    return { ...organisation, role };
  }

  async getUserOrganisations(userId: User["id"]): Promise<UserOrganisation[]> {
    return this.db
      .select({
        id: organisationsTable.id,
        name: organisationsTable.name,
        ownerId: organisationsTable.ownerId,
        createdAt: organisationsTable.createdAt,
        role: organisationMembersTable.role,
      })
      .from(organisationMembersTable)
      .innerJoin(
        organisationsTable,
        eq(organisationMembersTable.organisationId, organisationsTable.id),
      )
      .where(eq(organisationMembersTable.userId, userId))
      .orderBy(asc(organisationsTable.createdAt));
  }

  async getMembers(
    userId: User["id"],
    organisationId: Organisation["id"],
  ): Promise<OrganisationMemberDetails[]> {
    await this.assertOrganisationAccess(userId, organisationId, "viewer");

    return this.db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
        role: organisationMembersTable.role,
        createdAt: organisationMembersTable.createdAt,
      })
      .from(organisationMembersTable)
      .innerJoin(usersTable, eq(organisationMembersTable.userId, usersTable.id))
      .where(eq(organisationMembersTable.organisationId, organisationId))
      .orderBy(asc(organisationMembersTable.createdAt));
  }

  async addMember(
    userId: User["id"],
    organisationId: Organisation["id"],
    input: AddOrganisationMemberInput,
  ): Promise<OrganisationMemberDetails> {
    await this.assertOrganisationAccess(userId, organisationId, "admin");

    const [memberUser] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .limit(1);

    if (!memberUser) {
      throw new OrganisationMemberUserNotFoundError();
    }

    const [membership] = await this.db
      .insert(organisationMembersTable)
      .values({ organisationId, ...input })
      .onConflictDoNothing()
      .returning();

    if (!membership) {
      throw new OrganisationMemberAlreadyExistsError();
    }

    return {
      userId: memberUser.id,
      name: memberUser.name,
      email: memberUser.email,
      image: memberUser.image,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  }

  async removeMember(
    userId: User["id"],
    organisationId: Organisation["id"],
    memberUserId: User["id"],
  ): Promise<void> {
    await this.assertOrganisationAccess(userId, organisationId, "admin");
    await this.assertIsNotOwner(organisationId, memberUserId);

    const [removedMember] = await this.db
      .delete(organisationMembersTable)
      .where(
        and(
          eq(organisationMembersTable.organisationId, organisationId),
          eq(organisationMembersTable.userId, memberUserId),
        ),
      )
      .returning({ userId: organisationMembersTable.userId });

    if (!removedMember) {
      throw new OrganisationMemberNotFoundError();
    }
  }

  async updateMember(
    userId: User["id"],
    organisationId: Organisation["id"],
    memberUserId: User["id"],
    updates: UpdateOrganisationMemberInput,
  ): Promise<OrganisationMemberDetails> {
    await this.assertOrganisationAccess(userId, organisationId, "admin");
    await this.assertIsNotOwner(organisationId, memberUserId);

    const [membership] = await this.db
      .update(organisationMembersTable)
      .set(updates)
      .where(
        and(
          eq(organisationMembersTable.organisationId, organisationId),
          eq(organisationMembersTable.userId, memberUserId),
        ),
      )
      .returning();

    if (!membership) {
      throw new OrganisationMemberNotFoundError();
    }

    const [memberUser] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, memberUserId))
      .limit(1);

    if (!memberUser) {
      throw new InvariantError("Organisation membership references a missing user");
    }

    return {
      userId: memberUser.id,
      name: memberUser.name,
      email: memberUser.email,
      image: memberUser.image,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  }

  private async assertIsNotOwner(
    organisationId: Organisation["id"],
    memberUserId: User["id"],
  ): Promise<void> {
    const [organisation] = await this.db
      .select({ ownerId: organisationsTable.ownerId })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId))
      .limit(1);

    if (!organisation) {
      throw new OrganisationNotFoundError();
    }

    if (organisation.ownerId === memberUserId) {
      throw new OrganisationOwnerImmutableError();
    }
  }
}
