import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

import { Toaster } from "@gladia-analytics/ui/components/toast";

import { type RouterContext } from "../router";
import { authClient } from "#lib/auth";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Todo app",
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
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

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
      <Outlet />
      <Toaster />
      <Scripts />
    </>
  );
}
