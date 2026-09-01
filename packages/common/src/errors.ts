export const ApiErrorCode = {
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  ORGANISATION_NOT_FOUND: "ORGANISATION_NOT_FOUND",
  ORGANISATION_FORBIDDEN: "ORGANISATION_FORBIDDEN",
  TRANSCRIPTION_NOT_FOUND: "TRANSCRIPTION_NOT_FOUND",
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
