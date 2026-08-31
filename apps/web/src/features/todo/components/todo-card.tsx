import type { Todo } from "../api/get-todo.query";
import { useMutation } from "@tanstack/react-query";
import { updateTodoMutation } from "../api/update-todo.mutation";
import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01FreeIcons, CircleIcon, Delete01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@gladia-analytics/ui/lib/utils";
import { Route } from "#routes/_auth";
import { Button } from "@gladia-analytics/ui/components/button";
import { deleteTodoMutation } from "../api/delete-todo.mutation";
import { toast } from "@gladia-analytics/ui/components/toast";
import { ApiErrorCode } from "@gladia-analytics/common/errors";

type TodoCardProps = {
  className?: string;
  todo: Todo;
};

export function TodoCard({ className, todo }: TodoCardProps) {
  const { user } = Route.useRouteContext();
  const { mutate: updateTodo } = useMutation({
    ...updateTodoMutation.options(user.id),
    onError: (err) => {
      if (err.response.errorCode == ApiErrorCode.INVALID_REQUEST)
        toast.add({
          type: "error",
          description:
            "Failed to mark as completed this todo, please refresh the page or try again after.",
        });
    },
  });

  const { mutate: deleteTodo } = useMutation({
    ...deleteTodoMutation.options(user.id),
    onError: () => {
      toast.add({
        type: "error",
        description: "Failed to delete this todo, please refresh the page or try again after.",
      });
    },
  });

  const handleToggleComplete = React.useCallback(() => {
    updateTodo({ id: todo.id, updates: { isCompleted: !todo.isCompleted } });
  }, [todo, updateTodo]);

  const handleDeleteTodo = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      deleteTodo({ id: todo.id });
    },
    [todo, deleteTodo],
  );

  return (
    <div
      onClick={handleToggleComplete}
      role="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg bg-accent px-4 py-2 hover:bg-accent/50",
        todo.isCompleted && "bg-accent/50",
        className,
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-2", todo.isCompleted && "opacity-50")}>
        {todo.isCompleted ? (
          <HugeiconsIcon icon={CheckmarkCircle01FreeIcons} className="size-4 shrink-0" />
        ) : (
          <HugeiconsIcon icon={CircleIcon} className="size-4 shrink-0" />
        )}

        <span>{todo.content}</span>
      </div>

      <Button
        size="icon-sm"
        variant="destructive"
        className="ml-auto shrink-0"
        onClick={handleDeleteTodo}
      >
        <HugeiconsIcon icon={Delete01Icon} />
      </Button>
    </div>
  );
}
