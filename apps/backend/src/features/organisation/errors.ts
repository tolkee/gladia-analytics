export class OrganisationNotFoundError extends Error {
  constructor() {
    super("Organisation not found");
    this.name = "OrganisationNotFoundError";
  }
}

export class OrganisationPermissionDeniedError extends Error {
  constructor() {
    super("Organisation permission denied");
    this.name = "OrganisationPermissionDeniedError";
  }
}

export class OrganisationMemberNotFoundError extends Error {
  constructor() {
    super("Organisation member not found");
    this.name = "OrganisationMemberNotFoundError";
  }
}

export class OrganisationMemberAlreadyExistsError extends Error {
  constructor() {
    super("Organisation member already exists");
    this.name = "OrganisationMemberAlreadyExistsError";
  }
}

export class OrganisationMemberUserNotFoundError extends Error {
  constructor() {
    super("Organisation member user not found");
    this.name = "OrganisationMemberUserNotFoundError";
  }
}

export class OrganisationOwnerImmutableError extends Error {
  constructor() {
    super("Organisation owner is immutable");
    this.name = "OrganisationOwnerImmutableError";
  }
}
