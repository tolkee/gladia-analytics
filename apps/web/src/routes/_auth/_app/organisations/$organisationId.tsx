import { periodSearchSchema } from "#features/transcriptions";
import { AppSidebar } from "#components/app-sidebar";
import { AppSiteHeader } from "#components/app-site-header";
import { SidebarInset, SidebarProvider } from "@gladia-analytics/ui/components/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId")({
  validateSearch: periodSearchSchema,
  beforeLoad: ({ context, params, search, location }) => {
    const organisation = context.organisations.find(
      (availableOrganisation) => availableOrganisation.id === params.organisationId,
    );

    if (!organisation) {
      throw redirect({ to: "/" });
    }

    // Anchor relative periods in the URL so both views use exactly the same window.
    if (
      /\/(analytics|transcriptions)$/.test(location.pathname) &&
      !("from" in search && search.from) &&
      !("at" in search && search.at)
    ) {
      const nextSearch = new URLSearchParams(location.searchStr);
      nextSearch.set("at", new Date().toISOString());
      throw redirect({ href: `${location.pathname}?${nextSearch}`, replace: true });
    }

    return { organisation };
  },
  component: OrganisationAppLayout,
});

function OrganisationAppLayout() {
  const { organisation, organisations } = Route.useRouteContext();

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar organisations={organisations} organisation={organisation} />
      <SidebarInset className="min-w-0">
        <AppSiteHeader organisation={organisation} />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
