import { AppSidebar } from "#components/app-sidebar";
import { AppSiteHeader } from "#components/app-site-header";
import { SidebarInset, SidebarProvider } from "@gladia-analytics/ui/components/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppSiteHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
