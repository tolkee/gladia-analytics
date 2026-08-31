import { SiteHeader } from "#components/site-header";
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

    return { user: context.user, session: context.session };
  },
  component: () => (
    <>
      <SiteHeader />
      <Outlet />
    </>
  ),
});
