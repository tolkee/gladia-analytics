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
