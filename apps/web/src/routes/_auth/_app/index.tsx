import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics" });
  },
});
