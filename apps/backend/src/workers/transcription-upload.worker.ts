import type {
  TranscriptionUpload,
  TranscriptionUploadService,
} from "#features/transcription-upload";
import { pino } from "pino";

const logger = pino().child({ worker: "transcription-upload" });

export class TranscriptionUploadWorker {
  private interval: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly transcriptionUploadService: TranscriptionUploadService,
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
      let transcriptionUpload = await this.transcriptionUploadService.claimNextQueuedUpload();

      while (transcriptionUpload) {
        await this.process(transcriptionUpload);
        transcriptionUpload = await this.transcriptionUploadService.claimNextQueuedUpload();
      }
    } catch (error) {
      logger.error({ error }, "transcription upload worker tick failed");
    } finally {
      this.running = false;
    }
  }

  private async process(transcriptionUpload: TranscriptionUpload): Promise<void> {
    const result =
      await this.transcriptionUploadService.processTranscriptionUpload(transcriptionUpload);

    if (result.status === "completed") {
      logger.info(
        { uploadId: transcriptionUpload.id, processedItems: result.processedItems },
        "transcription upload completed",
      );
      return;
    }

    logger.error(
      {
        uploadId: transcriptionUpload.id,
        uploadError: result.error,
        cleanupFailed: result.cleanupFailed,
      },
      "transcription upload failed",
    );
  }
}
