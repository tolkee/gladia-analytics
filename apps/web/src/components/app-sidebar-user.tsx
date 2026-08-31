import { authClient } from "#lib/auth";
import { Route } from "#routes/_auth";
import { Avatar, AvatarFallback, AvatarImage } from "@gladia-analytics/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gladia-analytics/ui/components/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@gladia-analytics/ui/components/sidebar";
import { Logout02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";

type UserIdentityProps = {
  email: string;
  image?: string | null;
  name: string;
};

function UserIdentity({ email, image, name }: UserIdentityProps) {
  const initials = name
    .split(/\s+/)
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <Avatar className="size-8 rounded-lg">
        {image ? <AvatarImage src={image} alt={name} /> : null}
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{email}</span>
      </span>
    </>
  );
}

export function AppSidebarUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { user } = Route.useRouteContext();

  async function logout() {
    await authClient.signOut();
    await router.invalidate();
    await router.navigate({ to: "/login" });
  }

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                >
                  <UserIdentity name={user.name} email={user.email} image={user.image} />
                  <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ml-auto" />
                </SidebarMenuButton>
              }
            />
            <DropdownMenuContent
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
              className="min-w-56"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-1.5 font-normal">
                  <div className="flex items-center gap-2">
                    <UserIdentity name={user.name} email={user.email} image={user.image} />
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <HugeiconsIcon icon={Logout02Icon} strokeWidth={2} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
