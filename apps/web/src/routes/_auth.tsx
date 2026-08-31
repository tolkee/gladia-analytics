import { listUserOrganisationsQuery } from "#features/organisations";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location, context }) => {
    if (!context.session || !context.user) {
      const currentPath = location.pathname;
      throw redirect({
        to: "/login",
        search: { redirect: currentPath !== "/" ? currentPath : undefined },
      });
    }

    const organisations = await context.queryClient.query(
      listUserOrganisationsQuery.options(context.user.id),
    );
    if (organisations.length === 0 && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }

    return { user: context.user, session: context.session, organisations };
  },
  component: Outlet,
});
