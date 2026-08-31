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
