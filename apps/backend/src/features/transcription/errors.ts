export class TranscriptionNotFoundError extends Error {
  constructor() {
    super("Transcription not found");
    this.name = "TranscriptionNotFoundError";
  }
}

export class InvalidTranscriptionCursorError extends Error {
  constructor() {
    super("Invalid transcription pagination cursor");
    this.name = "InvalidTranscriptionCursorError";
  }
}
