export class TranscriptionImportNotFoundError extends Error {
  constructor() {
    super("Transcription import not found");
    this.name = "TranscriptionImportNotFoundError";
  }
}

export class TranscriptionImportInvalidStateError extends Error {
  constructor() {
    super("Transcription import is not awaiting an upload");
    this.name = "TranscriptionImportInvalidStateError";
  }
}

export class TranscriptionImportObjectNotFoundError extends Error {
  constructor() {
    super("Uploaded object not found");
    this.name = "TranscriptionImportObjectNotFoundError";
  }
}

export class TranscriptionImportFileSizeMismatchError extends Error {
  constructor(
    readonly expectedSizeBytes: number,
    readonly actualSizeBytes: number,
  ) {
    super("Uploaded object size does not match the declared size");
    this.name = "TranscriptionImportFileSizeMismatchError";
  }
}

export class TranscriptionImportContentTypeMismatchError extends Error {
  constructor(
    readonly expectedContentType: string,
    readonly actualContentType: string,
  ) {
    super("Uploaded object content type does not match the declared content type");
    this.name = "TranscriptionImportContentTypeMismatchError";
  }
}
