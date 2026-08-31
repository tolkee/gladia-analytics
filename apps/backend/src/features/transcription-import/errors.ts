export class TranscriptionImportNotFoundError extends Error {
  constructor() {
    super("Transcription import not found");
    this.name = "TranscriptionImportNotFoundError";
  }
}

export class TranscriptionImportEmptyFileError extends Error {
  constructor() {
    super("Transcription import file is empty");
    this.name = "TranscriptionImportEmptyFileError";
  }
}

export class TranscriptionImportFileTooLargeError extends Error {
  constructor(
    readonly sizeBytes: number,
    readonly maxSizeBytes: number,
  ) {
    super("Transcription import file is too large");
    this.name = "TranscriptionImportFileTooLargeError";
  }
}
