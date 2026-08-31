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
    const result =
      await this.transcriptionImportService.processTranscriptionImport(transcriptionImport);

    if (result.status === "completed") {
      logger.info(
        { importId: transcriptionImport.id, processedItems: result.processedItems },
        "transcription import completed",
      );
      return;
    }

    logger.error(
      {
        importId: transcriptionImport.id,
        importError: result.error,
        cleanupFailed: result.cleanupFailed,
      },
      "transcription import failed",
    );
  }
}
