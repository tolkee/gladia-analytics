import type { Organisation } from "#features/organisations";
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

type AppSiteHeaderProps = {
  organisation: Organisation;
};

export function AppSiteHeader({ organisation }: AppSiteHeaderProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const pageName = pathname.endsWith("/transcriptions") ? "Transcriptions" : "Analytics";

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-(--header-height) items-center gap-2 px-4">
        <SidebarTrigger />

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    to="/organisations/$organisationId/analytics"
                    params={{ organisationId: organisation.id }}
                  />
                }
              >
                {organisation.name}
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
