import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/uploads")({
  beforeLoad: ({ context }) => {
    const organisation = context.organisations[0];

    if (!organisation) {
      throw redirect({ to: "/onboarding" });
    }

    throw redirect({
      to: "/organisations/$organisationId/uploads",
      params: { organisationId: organisation.id },
    });
  },
});
