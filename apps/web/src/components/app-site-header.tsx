import type { Organisation } from "#features/organisations";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gladia-analytics/ui/components/breadcrumb";
import { Button } from "@gladia-analytics/ui/components/button";
import { SidebarTrigger } from "@gladia-analytics/ui/components/sidebar";
import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeSwitcher } from "./theme-switcher";

type AppSiteHeaderProps = {
  organisation: Organisation;
};

export function AppSiteHeader({ organisation }: AppSiteHeaderProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const pageName = getPageName(pathname);

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

        <div className="ml-auto flex items-center gap-1">
          {organisation.role !== "viewer" ? (
            <Button
              size="sm"
              className="max-sm:size-7 max-sm:gap-0 max-sm:px-0 max-sm:has-data-[icon=inline-start]:pl-0"
              nativeButton={false}
              aria-label="Upload file"
              render={
                <Link
                  to="/organisations/$organisationId/new-upload"
                  params={{ organisationId: organisation.id }}
                />
              }
            >
              <HugeiconsIcon icon={Upload01Icon} data-icon="inline-start" strokeWidth={2} />
              <span className="hidden sm:inline">Upload file</span>
            </Button>
          ) : null}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}

function getPageName(pathname: string) {
  if (pathname.endsWith("/transcriptions")) return "Transcriptions";
  if (pathname.endsWith("/new-upload")) return "New upload";
  if (pathname.endsWith("/uploads")) return "Uploads";
  return "Analytics";
}
