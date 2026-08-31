import { apiClient } from "#lib/api";
import {
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint = apiClient.api.todo.$get;

type GetTodoSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTodoErrorResponse = InferErrorResponseType<typeof endpoint>;
export type Todo = GetTodoSuccessResponse[number];

const key = (userId: string) => ["todo", userId];
const options = (userId: string) =>
  queryOptions<GetTodoSuccessResponse, GetTodoErrorResponse>({
    queryKey: key(userId),
    queryFn: async () => {
      const response = await endpoint();

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      const data = await response.json();
      return data;
    },
  });

export const getTodoQuery = {
  key,
  options,
} satisfies Query;
