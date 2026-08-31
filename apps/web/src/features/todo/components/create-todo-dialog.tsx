import { PlusIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@gladia-analytics/ui/components/button";
import { Dialog, DialogContent, DialogTrigger } from "@gladia-analytics/ui/components/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@gladia-analytics/ui/components/input-group";
import { createTodoMutation } from "../api/create-todo.mutation";
import { Route } from "#routes/_auth";
import React from "react";
import { Spinner } from "@gladia-analytics/ui/components/spinner";
import { Kbd } from "@gladia-analytics/ui/components/kbd";
import { cn } from "@gladia-analytics/ui/lib/utils";

export function CreateTodoDialog() {
  const { user } = Route.useRouteContext();
  const {
    mutateAsync: createTodo,
    isPending: isCreating,
    isError,
  } = useMutation(createTodoMutation.options(user.id));

  const [isOpen, setIsOpen] = React.useState(false);
  const [todoContent, setTodoContent] = React.useState("");
  const normalizedContent = React.useMemo(() => todoContent.trim(), [todoContent]);
  const canSubmit = React.useMemo(
    () => !isCreating && normalizedContent,
    [isCreating, normalizedContent],
  );

  const handleSubmit = React.useCallback(
    async (event: React.SubmitEvent) => {
      event.preventDefault();
      if (!canSubmit) return;

      await createTodo({
        todo: {
          content: normalizedContent,
        },
      });

      setTodoContent("");
      setIsOpen(false);
    },
    [createTodo, normalizedContent, setIsOpen, setTodoContent],
  );

  React.useEffect(() => {
    const openDialogOnShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "n" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isOpen ||
        event.repeat
      )
        return;

      const target = event.target as HTMLElement;
      const isTyping = target.matches("input, textarea, select") || target.isContentEditable;

      // Don't interrupt another input or form.
      if (isTyping) return;

      event.preventDefault();
      setIsOpen(true);
    };

    window.addEventListener("keydown", openDialogOnShortcut);

    return () => {
      window.removeEventListener("keydown", openDialogOnShortcut);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button type="button" className="w-fit">
            <HugeiconsIcon icon={PlusIcon} />
            New
            <Kbd className="ml-3 hidden sm:flex">N</Kbd>
          </Button>
        }
      />

      <DialogContent showCloseButton={false} className="p-0">
        <form onSubmit={handleSubmit}>
          <InputGroup className={cn("border-input/30 bg-input/30", isError && "border-red-500")}>
            <InputGroupInput
              autoFocus
              value={todoContent}
              onChange={(e) => setTodoContent(e.target.value)}
              className="w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            />
            <InputGroupAddon></InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {isCreating ? (
                <Spinner />
              ) : (
                <Button type="submit" size="icon-xs" disabled={!canSubmit}>
                  <HugeiconsIcon icon={PlusIcon} />
                </Button>
              )}
            </InputGroupAddon>
          </InputGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
