export class TranscriptionNotFoundError extends Error {
  constructor() {
    super("Transcription not found");
    this.name = "TranscriptionNotFoundError";
  }
}
