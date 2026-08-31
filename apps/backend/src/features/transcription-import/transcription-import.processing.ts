import { transcriptionSourceSchema, type TranscriptionSource } from "#features/transcription";
import type { TranscriptionImportError } from "./transcription-import.schema";

const MAX_STORED_VALIDATION_ISSUES = 10;

export class TranscriptionImportProcessingError extends Error {
  constructor(
    readonly details: TranscriptionImportError,
    options?: ErrorOptions,
  ) {
    super(details.message, options);
    this.name = "TranscriptionImportProcessingError";
  }
}

export function validateTranscriptionItem(index: number, value: unknown): TranscriptionSource {
  const result = transcriptionSourceSchema.safeParse(value);

  if (!result.success) {
    throw new TranscriptionImportProcessingError({
      code: "INVALID_TRANSCRIPTION",
      message: `Transcription at index ${index} is invalid`,
      metadata: {
        itemIndex: index,
        issues: result.error.issues.slice(0, MAX_STORED_VALIDATION_ISSUES).map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
        issuesTruncated: result.error.issues.length > MAX_STORED_VALIDATION_ISSUES,
      },
    });
  }

  return result.data;
}

export function toTranscriptionImportError(error: unknown): TranscriptionImportError {
  if (error instanceof TranscriptionImportProcessingError) {
    return error.details;
  }

  return {
    code: "PROCESSING_FAILED",
    message: "The transcription import could not be processed",
  };
}
