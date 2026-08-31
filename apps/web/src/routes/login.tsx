import { SiteHeader } from "#components/site-header";
import { authClient } from "#lib/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@gladia-analytics/ui/components/button";
import { Google } from "@gladia-analytics/ui/components/ui/svgs/google";
import * as z from "zod";

const searchParamsSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();

    if (session) {
      throw redirect({ to: search.redirect ?? "/" });
    }

    return null;
  },
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const searchParams = Route.useSearch();

  return (
    <div>
      <SiteHeader />
      <div className="flex flex-col min-h-[calc(100svh-3.5rem)] items-center justify-center">
        <Button
          size="lg"
          variant="outline"
          onClick={() =>
            authClient.signIn.social({
              provider: "google",
              callbackURL: `${window.location.origin}${searchParams.redirect ?? ""}`,
            })
          }
        >
          <Google /> Login with Google
        </Button>
      </div>
    </div>
  );
}
