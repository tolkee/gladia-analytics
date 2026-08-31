import type { ApiErrorResponse } from "@gladia-analytics/common/errors";
import type { ClientResponse, InferResponseType } from "hono/client";
import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode,
} from "hono/utils/http-status";

export class ApiError<TResponse extends ApiErrorResponse = ApiErrorResponse> extends Error {
  constructor(readonly response: TResponse) {
    super(response.message);
    this.name = "ApiError";
  }
}

type ApiErrorBody<TResponse> =
  TResponse extends ClientResponse<infer TBody, number, "json">
    ? Extract<TBody, ApiErrorResponse>
    : never;

export async function jsErrorFromApiError<
  TResponse extends ClientResponse<ApiErrorResponse, number, "json">,
>(response: TResponse): Promise<ApiError<ApiErrorBody<TResponse>>> {
  const apiErrorResponse = (await response.json()) as ApiErrorBody<TResponse>;
  return new ApiError(apiErrorResponse);
}

export type InferErrorResponseType<T> = Extract<
  InferResponseType<T, ClientErrorStatusCode | ServerErrorStatusCode>,
  ApiErrorResponse
>;
export type InferSuccessResponseType<T> = InferResponseType<T, SuccessStatusCode>;
