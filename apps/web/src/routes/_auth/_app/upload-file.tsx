import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/upload-file")({
  beforeLoad: ({ context }) => {
    const organisation = context.organisations.find(
      (availableOrganisation) => availableOrganisation.role !== "viewer",
    );

    if (!organisation) {
      throw redirect({ to: "/uploads" });
    }

    throw redirect({
      to: "/organisations/$organisationId/upload-file",
      params: { organisationId: organisation.id },
    });
  },
});
