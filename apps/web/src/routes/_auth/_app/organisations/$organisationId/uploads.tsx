import { getTranscriptionUploadsQuery, UploadsDataTable } from "#features/uploads";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/uploads")({
  loader: async ({ context, params }) => {
    await context.queryClient.query(
      getTranscriptionUploadsQuery.options(context.user.id, params.organisationId),
    );
  },
  pendingComponent: UploadsPageSkeleton,
  component: UploadsPage,
});

function UploadsPage() {
  const { organisation, user } = Route.useRouteContext();
  const { data: uploads } = useSuspenseQuery(
    getTranscriptionUploadsQuery.options(user.id, organisation.id),
  );

  return (
    <section className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col gap-3 p-4">
      <UploadsDataTable uploads={uploads} />
    </section>
  );
}

function UploadsPageSkeleton() {
  return (
    <section className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col p-4">
      <Skeleton className="min-h-0 flex-1 rounded-lg" />
    </section>
  );
}
