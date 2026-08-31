import { getTodoQuery, TodoCard, CreateTodoDialog } from "#features/todo";
import { Warning } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@gladia-analytics/ui/components/skeleton";

export const Route = createFileRoute("/_auth/(todo)/")({
  component: App,
  pendingComponent: PendingApp,
  loader: async ({ context: { user, queryClient } }) => {
    await queryClient.query(getTodoQuery.options(user.id));
  },
  errorComponent: () => (
    <div className="flex flex-col gap-8 min-h-svh p-6 max-w-prose mx-auto">
      <div className="flex items-center gap-2 text-red-500">
        <HugeiconsIcon icon={Warning} />
        <span>Failed to load todo list, please refresh the page or try again later.</span>
      </div>
    </div>
  ),
});

function App() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(getTodoQuery.options(user.id));

  return (
    <div className="flex flex-col gap-8 min-h-svh p-6 max-w-prose mx-auto">
      <CreateTodoDialog />
      <div className="flex flex-col gap-3">
        {data.map((todo) => (
          <TodoCard key={todo.id} todo={todo} />
        ))}
      </div>
    </div>
  );
}

function PendingApp() {
  return (
    <div className="flex flex-col gap-8 min-h-svh p-6 max-w-prose mx-auto">
      <Skeleton className="h-9 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
