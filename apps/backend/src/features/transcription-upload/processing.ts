import { transcriptionSourceSchema, type TranscriptionSource } from "#features/transcription";
import { TranscriptionUploadProcessingError } from "./errors";

const MAX_STORED_VALIDATION_ISSUES = 10;

export function validateTranscriptionItem(index: number, value: unknown): TranscriptionSource {
  const result = transcriptionSourceSchema.safeParse(value);

  if (!result.success) {
    throw new TranscriptionUploadProcessingError({
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
