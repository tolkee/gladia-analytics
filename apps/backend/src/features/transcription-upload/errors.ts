import type { TranscriptionUploadError } from "./transcription-upload.schema";

export class TranscriptionUploadNotFoundError extends Error {
  constructor() {
    super("Transcription upload not found");
    this.name = "TranscriptionUploadNotFoundError";
  }
}

export class TranscriptionUploadEmptyFileError extends Error {
  constructor() {
    super("Transcription upload file is empty");
    this.name = "TranscriptionUploadEmptyFileError";
  }
}

export class TranscriptionUploadProcessingError extends Error {
  constructor(
    readonly details: TranscriptionUploadError,
    options?: ErrorOptions,
  ) {
    super(details.message, options);
    this.name = "TranscriptionUploadProcessingError";
  }
}

export function toTranscriptionUploadError(error: unknown): TranscriptionUploadError {
  if (error instanceof TranscriptionUploadProcessingError) {
    return error.details;
  }

  return {
    code: "PROCESSING_FAILED",
    message: "The transcription upload could not be processed",
  };
}
