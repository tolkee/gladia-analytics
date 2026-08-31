import { apiClient } from "#lib/api";
import type { Mutation } from "#lib/query";
import { mutationOptions } from "@tanstack/react-query";
import type { InferRequestType } from "hono";
import { getTodoQuery } from "./get-todo.query";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";

const endpoint = apiClient.api.todo[":id"].$patch;

type UpdateTodoSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type UpdateTodoErrorResponse = InferErrorResponseType<typeof endpoint>;
type UpdateTodoVariables = { id: string; updates: InferRequestType<typeof endpoint>["json"] };

const key = (userId: string) => ["todo", "update", userId];
const options = (userId: string) =>
  mutationOptions<
    UpdateTodoSuccessResponse,
    ApiError<UpdateTodoErrorResponse>,
    UpdateTodoVariables
  >({
    mutationKey: key(userId),
    mutationFn: async ({ id, updates }) => {
      const response = await endpoint({
        param: { id },
        json: updates,
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

export const updateTodoMutation = {
  key,
  options,
} satisfies Mutation;
