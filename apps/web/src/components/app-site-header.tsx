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
import { FileUploadIcon } from "@hugeicons/core-free-icons";
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
              variant="outline"
              size="sm"
              nativeButton={false}
              aria-label="Upload file"
              render={
                <Link
                  to="/organisations/$organisationId/upload-file"
                  params={{ organisationId: organisation.id }}
                />
              }
            >
              <HugeiconsIcon icon={FileUploadIcon} data-icon="inline-start" strokeWidth={2} />
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
  if (pathname.endsWith("/upload-file")) return "Upload file";
  if (pathname.endsWith("/uploads")) return "Uploads";
  return "Analytics";
}
