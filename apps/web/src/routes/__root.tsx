import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

import { Toaster } from "@gladia-analytics/ui/components/toast";
import { TooltipProvider } from "@gladia-analytics/ui/components/tooltip";

import { type RouterContext } from "../router";
import { getSessionQuery } from "#features/auth";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        title: "Gladia Analytics",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  component: RootDocument,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.query(getSessionQuery.options());

    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    };
  },
});

function RootDocument() {
  return (
    <>
      <HeadContent />
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
      <Toaster />
      <Scripts />
    </>
  );
}
