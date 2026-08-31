export const ApiErrorCode = {
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  TODO_NOT_FOUND: "TODO_NOT_FOUND",
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export type ApiErrorResponse<
  TApiErrorCode extends ApiErrorCode = ApiErrorCode,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> = {
  errorCode: TApiErrorCode;
  message: string;
  metadata?: TMetadata;
};
