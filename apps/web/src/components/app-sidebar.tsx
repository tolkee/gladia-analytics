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
import { Link, useLocation } from "@tanstack/react-router";
import { stubOrganization } from "#lib/app-stubs";
import { AppSidebarUser } from "./app-sidebar-user";

const navigation = [
  {
    label: "Analytics",
    to: "/analytics" as const,
    icon: Analytics02Icon,
  },
  {
    label: "Transcriptions",
    to: "/transcriptions" as const,
    icon: AiTranscribeAudioIcon,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" tooltip={stubOrganization.name}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                      <HugeiconsIcon icon={Building02Icon} strokeWidth={2} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left font-medium">
                      {stubOrganization.name}
                    </span>
                    <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent side="bottom" align="start">
                <DropdownMenuRadioGroup value={stubOrganization.slug}>
                  <DropdownMenuRadioItem value={stubOrganization.slug}>
                    {stubOrganization.name}
                  </DropdownMenuRadioItem>
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
                    render={<Link to={item.to} />}
                    isActive={location.pathname === item.to}
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
