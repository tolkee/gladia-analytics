import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/transcriptions")({
  beforeLoad: ({ context }) => {
    const organisation = context.organisations[0];

    if (!organisation) {
      throw redirect({ to: "/onboarding" });
    }

    throw redirect({
      to: "/organisations/$organisationId/transcriptions",
      params: { organisationId: organisation.id },
    });
  },
});
