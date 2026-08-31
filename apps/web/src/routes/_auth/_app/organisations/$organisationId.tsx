import { AppSidebar } from "#components/app-sidebar";
import { AppSiteHeader } from "#components/app-site-header";
import { SidebarInset, SidebarProvider } from "@gladia-analytics/ui/components/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId")({
  beforeLoad: ({ context, params }) => {
    const organisation = context.organisations.find(
      (availableOrganisation) => availableOrganisation.id === params.organisationId,
    );

    if (!organisation) {
      throw redirect({ to: "/" });
    }

    return { organisation };
  },
  component: OrganisationAppLayout,
});

function OrganisationAppLayout() {
  const { organisation, organisations } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <AppSidebar organisations={organisations} organisation={organisation} />
      <SidebarInset className="min-w-0">
        <AppSiteHeader organisation={organisation} />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
