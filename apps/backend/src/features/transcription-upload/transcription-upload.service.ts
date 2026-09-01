import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { TranscriptionService, TranscriptionSource } from "#features/transcription";
import type { Db } from "#lib/db";
import { InvariantError } from "#lib/errors";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  TranscriptionUploadEmptyFileError,
  TranscriptionUploadNotFoundError,
  TranscriptionUploadProcessingError,
  toTranscriptionUploadError,
} from "./errors";
import type { FileStorage, PresignedDownloadRequest } from "./file-storage";
import { validateTranscriptionItem } from "./processing";
import { streamTranscriptionItems } from "./stream";
import {
  TRANSCRIPTION_UPLOAD_CONTENT_TYPE,
  type CreateTranscriptionUploadInput,
} from "./transcription-upload.dto";
import {
  transcriptionUploadsTable,
  type TranscriptionUpload,
  type TranscriptionUploadError,
} from "./transcription-upload.schema";

const PROCESSING_BATCH_SIZE = 500;

export type TranscriptionUploadDetails = Omit<TranscriptionUpload, "objectKey">;

export type CreatedTranscriptionUpload = TranscriptionUploadDetails;

export type ProcessTranscriptionUploadResult =
  | { status: "completed"; processedItems: number }
  | { status: "failed"; error: TranscriptionUploadError; cleanupFailed: boolean };

export class TranscriptionUploadService {
  constructor(
    private readonly db: Db,
    private readonly storage: FileStorage,
    private readonly organisationService: OrganisationService,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  async createTranscriptionUpload(
    userId: User["id"],
    organisationId: Organisation["id"],
    input: CreateTranscriptionUploadInput,
    file: Request,
  ): Promise<CreatedTranscriptionUpload> {
    await this.organisationService.assertOrganisationAccess(userId, organisationId, "admin");

    const id = crypto.randomUUID();
    const objectKey = `organisations/${organisationId}/transcription-uploads/${id}.json`;
    const sizeBytes = await this.storage.write(objectKey, file, TRANSCRIPTION_UPLOAD_CONTENT_TYPE);

    if (sizeBytes === 0) {
      await this.storage.delete(objectKey);
      throw new TranscriptionUploadEmptyFileError();
    }

    try {
      const [transcriptionUpload] = await this.db
        .insert(transcriptionUploadsTable)
        .values({
          id,
          organisationId,
          createdBy: userId,
          objectKey,
          originalFilename: input.filename,
          contentType: TRANSCRIPTION_UPLOAD_CONTENT_TYPE,
          sizeBytes,
          status: "queued",
        })
        .returning();

      if (!transcriptionUpload) {
        throw new InvariantError("Transcription upload insert returned no row");
      }

      return this.toDetails(transcriptionUpload);
    } catch (error) {
      try {
        await this.storage.delete(objectKey);
      } catch {
        // Preserve the database error; orphaned objects can be cleaned up independently.
      }

      throw error;
    }
  }

  async getTranscriptionUploads(
    userId: User["id"],
    organisationId: Organisation["id"],
  ): Promise<TranscriptionUploadDetails[]> {
    await this.organisationService.assertOrganisationAccess(userId, organisationId, "viewer");

    const uploads = await this.db
      .select()
      .from(transcriptionUploadsTable)
      .where(eq(transcriptionUploadsTable.organisationId, organisationId))
      .orderBy(desc(transcriptionUploadsTable.createdAt));

    return uploads.map((transcriptionUpload) => this.toDetails(transcriptionUpload));
  }

  async getTranscriptionUpload(
    userId: User["id"],
    organisationId: Organisation["id"],
    uploadId: TranscriptionUpload["id"],
  ): Promise<TranscriptionUploadDetails> {
    await this.organisationService.assertOrganisationAccess(userId, organisationId, "viewer");

    const transcriptionUpload = await this.findTranscriptionUpload(organisationId, uploadId);

    return this.toDetails(transcriptionUpload);
  }

  async createDownloadRequest(
    userId: User["id"],
    organisationId: Organisation["id"],
    uploadId: TranscriptionUpload["id"],
  ): Promise<PresignedDownloadRequest> {
    await this.organisationService.assertOrganisationAccess(userId, organisationId, "viewer");

    const transcriptionUpload = await this.findTranscriptionUpload(organisationId, uploadId);

    return this.storage.createDownloadRequest(transcriptionUpload.objectKey);
  }

  async claimNextQueuedUpload(): Promise<TranscriptionUpload | null> {
    const [candidate] = await this.db
      .select({ id: transcriptionUploadsTable.id })
      .from(transcriptionUploadsTable)
      .where(eq(transcriptionUploadsTable.status, "queued"))
      .orderBy(asc(transcriptionUploadsTable.createdAt))
      .limit(1);

    if (!candidate) {
      return null;
    }

    const now = new Date();
    const [claimedUpload] = await this.db
      .update(transcriptionUploadsTable)
      .set({
        status: "processing",
        processedItems: 0,
        error: null,
        processingStartedAt: now,
        completedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(transcriptionUploadsTable.id, candidate.id),
          eq(transcriptionUploadsTable.status, "queued"),
        ),
      )
      .returning();

    return claimedUpload ?? null;
  }

  async processTranscriptionUpload(
    transcriptionUpload: TranscriptionUpload,
  ): Promise<ProcessTranscriptionUploadResult> {
    let processedItems = 0;
    let batch: TranscriptionSource[] = [];

    try {
      let input: ReadableStream<Uint8Array>;

      try {
        input = this.storage.read(transcriptionUpload.objectKey);
      } catch (error) {
        throw new TranscriptionUploadProcessingError(
          {
            code: "STORAGE_READ_FAILED",
            message: "The transcription upload could not be read from storage",
          },
          { cause: error },
        );
      }

      for await (const item of streamTranscriptionItems(input)) {
        batch.push(validateTranscriptionItem(item.index, item.value));

        if (batch.length === PROCESSING_BATCH_SIZE) {
          processedItems = await this.stageBatch(transcriptionUpload, batch, processedItems);
          batch = [];
        }
      }

      processedItems = await this.stageBatch(transcriptionUpload, batch, processedItems);

      try {
        await this.transcriptionService.mergeStagedTranscriptions(
          transcriptionUpload.id,
          transcriptionUpload.organisationId,
        );
      } catch (error) {
        throw new TranscriptionUploadProcessingError(
          {
            code: "PUBLISH_FAILED",
            message: "The validated transcriptions could not be published",
          },
          { cause: error },
        );
      }
    } catch (error) {
      const uploadError = toTranscriptionUploadError(error);
      let cleanupFailed = false;

      try {
        await this.markProcessingFailed(transcriptionUpload.id, uploadError);
      } finally {
        try {
          await this.transcriptionService.removeStagedTranscriptions(
            transcriptionUpload.id,
            transcriptionUpload.organisationId,
          );
        } catch {
          cleanupFailed = true;
        }
      }

      return { status: "failed", error: uploadError, cleanupFailed };
    }

    await this.markProcessingCompleted(transcriptionUpload.id, processedItems);

    return { status: "completed", processedItems };
  }

  private async stageBatch(
    transcriptionUpload: TranscriptionUpload,
    items: TranscriptionSource[],
    processedItems: number,
  ): Promise<number> {
    if (items.length === 0) {
      return processedItems;
    }

    const nextProcessedItems = processedItems + items.length;

    try {
      await this.transcriptionService.addStagedTranscriptions(
        transcriptionUpload.id,
        transcriptionUpload.organisationId,
        items,
      );

      const [updatedUpload] = await this.db
        .update(transcriptionUploadsTable)
        .set({ processedItems: nextProcessedItems, updatedAt: new Date() })
        .where(
          and(
            eq(transcriptionUploadsTable.id, transcriptionUpload.id),
            eq(transcriptionUploadsTable.status, "processing"),
          ),
        )
        .returning({ id: transcriptionUploadsTable.id });

      if (!updatedUpload) {
        throw new InvariantError("Could not update a non-processing transcription upload");
      }
    } catch (error) {
      throw new TranscriptionUploadProcessingError(
        {
          code: "STAGING_WRITE_FAILED",
          message: "A transcription batch could not be staged",
          metadata: { processedItems },
        },
        { cause: error },
      );
    }

    return nextProcessedItems;
  }

  private async markProcessingCompleted(
    uploadId: TranscriptionUpload["id"],
    processedItems: number,
  ): Promise<void> {
    const now = new Date();
    const [completedUpload] = await this.db
      .update(transcriptionUploadsTable)
      .set({
        status: "completed",
        processedItems,
        completedAt: now,
        updatedAt: now,
        error: null,
      })
      .where(
        and(
          eq(transcriptionUploadsTable.id, uploadId),
          eq(transcriptionUploadsTable.status, "processing"),
        ),
      )
      .returning({ id: transcriptionUploadsTable.id });

    if (!completedUpload) {
      throw new InvariantError("Could not complete a non-processing transcription upload");
    }
  }

  private async markProcessingFailed(
    uploadId: TranscriptionUpload["id"],
    error: TranscriptionUploadError,
  ): Promise<void> {
    const now = new Date();

    const [failedUpload] = await this.db
      .update(transcriptionUploadsTable)
      .set({
        status: "failed",
        error,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(transcriptionUploadsTable.id, uploadId),
          eq(transcriptionUploadsTable.status, "processing"),
        ),
      )
      .returning({ id: transcriptionUploadsTable.id });

    if (!failedUpload) {
      throw new InvariantError("Could not fail a non-processing transcription upload");
    }
  }

  private async findTranscriptionUpload(
    organisationId: Organisation["id"],
    uploadId: TranscriptionUpload["id"],
  ): Promise<TranscriptionUpload> {
    const [transcriptionUpload] = await this.db
      .select()
      .from(transcriptionUploadsTable)
      .where(
        and(
          eq(transcriptionUploadsTable.id, uploadId),
          eq(transcriptionUploadsTable.organisationId, organisationId),
        ),
      )
      .limit(1);

    if (!transcriptionUpload) {
      throw new TranscriptionUploadNotFoundError();
    }

    return transcriptionUpload;
  }

  private toDetails(transcriptionUpload: TranscriptionUpload): TranscriptionUploadDetails {
    const { objectKey: _, ...details } = transcriptionUpload;
    return details;
  }
}
