import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return null;
}
