import { stubOrganization } from "#lib/app-stubs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gladia-analytics/ui/components/breadcrumb";
import { SidebarTrigger } from "@gladia-analytics/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeSwitcher } from "./theme-switcher";

const pageNames = {
  "/analytics": "Analytics",
  "/transcriptions": "Transcriptions",
} as const;

export function AppSiteHeader() {
  const location = useLocation();
  const pageName = pageNames[location.pathname as keyof typeof pageNames] ?? "App";

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-(--header-height) items-center gap-2 px-4">
        <SidebarTrigger />

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/analytics" />}>
                {stubOrganization.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
