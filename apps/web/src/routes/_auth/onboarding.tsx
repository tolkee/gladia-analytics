import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/onboarding")({
  beforeLoad: ({ context }) => {
    if (context.organisations.length > 0) {
      throw redirect({ to: "/" });
    }
  },
  component: () => null,
});
