import { apiClient } from "#lib/api";
import type { Mutation } from "#lib/query";
import { mutationOptions } from "@tanstack/react-query";
import type { InferRequestType } from "hono";
import { getTodoQuery } from "./get-todo.query";
import {
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";

const endpoint = apiClient.api.todo.$post;

type CreateTodoSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type CreateTodoErrorResponse = InferErrorResponseType<typeof endpoint>;
type CreateTodoVariables = { todo: InferRequestType<typeof endpoint>["json"] };

const key = (userId: string) => ["todo", "create", userId];
const options = (userId: string) =>
  mutationOptions<CreateTodoSuccessResponse, CreateTodoErrorResponse, CreateTodoVariables>({
    mutationKey: key(userId),
    mutationFn: async ({ todo }) => {
      const response = await endpoint({
        json: todo,
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (_d, _v, _r, { client }) => {
      return client.invalidateQueries({
        queryKey: getTodoQuery.key(userId),
      });
    },
  });

export const createTodoMutation = {
  key,
  options,
} satisfies Mutation;
