import { apiClient } from "#lib/api";
import type { Mutation } from "#lib/query";
import { mutationOptions } from "@tanstack/react-query";
import { getTodoQuery } from "./get-todo.query";
import { ApiError, jsErrorFromApiError, type InferErrorResponseType } from "#lib/errors";

const endpoint = apiClient.api.todo[":id"].$delete;

type DeleteTodoErrorResponse = InferErrorResponseType<typeof endpoint>;
type DeleteTodoVariables = { id: string };

const key = (userId: string) => ["todo", "delete", userId];
const options = (userId: string) =>
  mutationOptions<void, ApiError<DeleteTodoErrorResponse>, DeleteTodoVariables>({
    mutationKey: key(userId),
    mutationFn: async ({ id }) => {
      const response = await endpoint({
        param: { id },
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }
    },
    onSuccess: (_d, _v, _r, { client }) => {
      return client.invalidateQueries({
        queryKey: getTodoQuery.key(userId),
      });
    },
  });

export const deleteTodoMutation = {
  key,
  options,
} satisfies Mutation;
