import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/new-upload")({
  beforeLoad: ({ context }) => {
    const organisation = context.organisations.find(
      (availableOrganisation) => availableOrganisation.role !== "viewer",
    );

    if (!organisation) {
      throw redirect({ to: "/uploads" });
    }

    throw redirect({
      to: "/organisations/$organisationId/new-upload",
      params: { organisationId: organisation.id },
    });
  },
});
