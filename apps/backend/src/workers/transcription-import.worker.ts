import type {
  TranscriptionImport,
  TranscriptionImportService,
} from "#features/transcription-import";
import { pino } from "pino";

const logger = pino().child({ worker: "transcription-import" });

export class TranscriptionImportWorker {
  private interval: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly transcriptionImportService: TranscriptionImportService,
    private readonly pollIntervalMs: number,
  ) {}

  start(): void {
    if (this.interval) {
      return;
    }

    void this.tick();
    this.interval = setInterval(() => void this.tick(), this.pollIntervalMs);
  }

  stop(): void {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      let transcriptionImport = await this.transcriptionImportService.claimNextQueuedImport();

      while (transcriptionImport) {
        await this.process(transcriptionImport);
        transcriptionImport = await this.transcriptionImportService.claimNextQueuedImport();
      }
    } catch (error) {
      logger.error({ error }, "transcription import worker tick failed");
    } finally {
      this.running = false;
    }
  }

  private async process(transcriptionImport: TranscriptionImport): Promise<void> {
    try {
      // TODO: Read, validate and persist transcriptions once the transcription schema exists.
      await this.transcriptionImportService.markProcessingCompleted(transcriptionImport.id);
      logger.info({ importId: transcriptionImport.id }, "transcription import completed");
    } catch (error) {
      logger.error({ error, importId: transcriptionImport.id }, "transcription import failed");
      await this.transcriptionImportService.markProcessingFailed(
        transcriptionImport.id,
        "PROCESSING_FAILED",
        "The transcription import could not be processed",
      );
    }
  }
}
