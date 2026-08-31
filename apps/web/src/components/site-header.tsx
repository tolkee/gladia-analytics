import { authClient } from "#lib/auth";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@gladia-analytics/ui/components/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout02FreeIcons } from "@hugeicons/core-free-icons";
import { ThemeSwitcher } from "./theme-switcher";
import { Separator } from "@gladia-analytics/ui/components/separator";
import { Route } from "#routes/__root";

export function SiteHeader() {
  const router = useRouter();
  const { user } = Route.useRouteContext();

  async function logout() {
    await authClient.signOut();
    await router.invalidate();
    await router.navigate({ to: "/login" });
  }
  return (
    <header className="sticky top-0 z-50 max-w-prose mx-auto bg-background">
      <div className="mx-auto h-(--header-height) flex items-center px-2 sm:px-6 2xl:px-10">
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher />
          {user && (
            <>
              <Separator orientation="vertical" className="my-2" />
              <Button onClick={logout} variant="ghost">
                <HugeiconsIcon icon={Logout02FreeIcons} />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
