import {
  AiTranscribeAudioIcon,
  Analytics02Icon,
  ArrowDown01Icon,
  Building02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@gladia-analytics/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@gladia-analytics/ui/components/sidebar";
import type { Organisation } from "#features/organisations";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AppSidebarUser } from "./app-sidebar-user";

const navigation = [
  {
    label: "Analytics",
    to: "/organisations/$organisationId/analytics" as const,
    pathSuffix: "/analytics",
    icon: Analytics02Icon,
  },
  {
    label: "Transcriptions",
    to: "/organisations/$organisationId/transcriptions" as const,
    pathSuffix: "/transcriptions",
    icon: AiTranscribeAudioIcon,
  },
];

type AppSidebarProps = {
  organisations: Organisation[];
  organisation: Organisation;
};

export function AppSidebar({ organisations, organisation }: AppSidebarProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();

  function selectOrganisation(organisationId: string) {
    if (organisationId === organisation.id) {
      return;
    }

    if (pathname.endsWith("/transcriptions")) {
      void navigate({
        to: "/organisations/$organisationId/transcriptions",
        params: { organisationId },
      });
      return;
    }

    void navigate({
      to: "/organisations/$organisationId/analytics",
      params: { organisationId },
    });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" tooltip={organisation.name}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                      <HugeiconsIcon icon={Building02Icon} strokeWidth={2} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left font-medium">
                      {organisation.name}
                    </span>
                    <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="bottom" align="start">
                <DropdownMenuRadioGroup value={organisation.id} onValueChange={selectOrganisation}>
                  {organisations.map((availableOrganisation) => (
                    <DropdownMenuRadioItem
                      key={availableOrganisation.id}
                      value={availableOrganisation.id}
                    >
                      {availableOrganisation.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={<Link to={item.to} params={{ organisationId: organisation.id }} />}
                    isActive={pathname.endsWith(item.pathSuffix)}
                    tooltip={item.label}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <AppSidebarUser />
      <SidebarRail />
    </Sidebar>
  );
}
