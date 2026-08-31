import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/organisations/$organisationId/analytics",
      params,
    });
  },
});
