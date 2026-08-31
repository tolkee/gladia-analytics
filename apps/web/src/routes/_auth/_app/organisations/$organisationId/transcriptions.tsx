import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/transcriptions")({
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  return null;
}
