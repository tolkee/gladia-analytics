import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { TranscriptionService, TranscriptionSource } from "#features/transcription";
import type { Db } from "#lib/db";
import { InvariantError } from "#lib/errors";
import { and, asc, desc, eq } from "drizzle-orm";
import { TranscriptionImportEmptyFileError, TranscriptionImportNotFoundError } from "./errors";
import type { FileStorage, PresignedDownloadRequest } from "./file-storage";
import {
  TRANSCRIPTION_IMPORT_CONTENT_TYPE,
  type CreateTranscriptionImportInput,
} from "./transcription-import.dto";
import {
  toTranscriptionImportError,
  TranscriptionImportProcessingError,
  validateTranscriptionItem,
} from "./transcription-import.processing";
import {
  transcriptionImportsTable,
  type TranscriptionImport,
  type TranscriptionImportError,
} from "./transcription-import.schema";
import { streamTranscriptionItems } from "./transcription-import.stream";

const PROCESSING_BATCH_SIZE = 500;

export type TranscriptionImportDetails = Omit<TranscriptionImport, "objectKey">;

export type CreatedTranscriptionImport = TranscriptionImportDetails;

export type ProcessTranscriptionImportResult =
  | { status: "completed"; processedItems: number }
  | { status: "failed"; error: TranscriptionImportError; cleanupFailed: boolean };

export class TranscriptionImportService {
  constructor(
    private readonly db: Db,
    private readonly storage: FileStorage,
    private readonly organisationService: OrganisationService,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  async createTranscriptionImport(
    userId: User["id"],
    organisationId: Organisation["id"],
    input: CreateTranscriptionImportInput,
    file: Request,
  ): Promise<CreatedTranscriptionImport> {
    await this.organisationService.isInOrganisation(userId, organisationId, "admin");

    const id = crypto.randomUUID();
    const objectKey = `organisations/${organisationId}/transcription-imports/${id}.json`;
    const sizeBytes = await this.storage.write(objectKey, file, TRANSCRIPTION_IMPORT_CONTENT_TYPE);

    if (sizeBytes === 0) {
      await this.storage.delete(objectKey);
      throw new TranscriptionImportEmptyFileError();
    }

    try {
      const [transcriptionImport] = await this.db
        .insert(transcriptionImportsTable)
        .values({
          id,
          organisationId,
          createdBy: userId,
          objectKey,
          originalFilename: input.filename,
          contentType: TRANSCRIPTION_IMPORT_CONTENT_TYPE,
          sizeBytes,
          status: "queued",
        })
        .returning();

      if (!transcriptionImport) {
        throw new InvariantError("Transcription import insert returned no row");
      }

      return this.toDetails(transcriptionImport);
    } catch (error) {
      try {
        await this.storage.delete(objectKey);
      } catch {
        // Preserve the database error; orphaned objects can be cleaned up independently.
      }

      throw error;
    }
  }

  async getTranscriptionImports(
    userId: User["id"],
    organisationId: Organisation["id"],
  ): Promise<TranscriptionImportDetails[]> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const imports = await this.db
      .select()
      .from(transcriptionImportsTable)
      .where(eq(transcriptionImportsTable.organisationId, organisationId))
      .orderBy(desc(transcriptionImportsTable.createdAt));

    return imports.map((transcriptionImport) => this.toDetails(transcriptionImport));
  }

  async getTranscriptionImport(
    userId: User["id"],
    organisationId: Organisation["id"],
    importId: TranscriptionImport["id"],
  ): Promise<TranscriptionImportDetails> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const transcriptionImport = await this.findTranscriptionImport(organisationId, importId);

    return this.toDetails(transcriptionImport);
  }

  async createDownloadRequest(
    userId: User["id"],
    organisationId: Organisation["id"],
    importId: TranscriptionImport["id"],
  ): Promise<PresignedDownloadRequest> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const transcriptionImport = await this.findTranscriptionImport(organisationId, importId);

    return this.storage.createDownloadRequest(transcriptionImport.objectKey);
  }

  async claimNextQueuedImport(): Promise<TranscriptionImport | null> {
    const [candidate] = await this.db
      .select({ id: transcriptionImportsTable.id })
      .from(transcriptionImportsTable)
      .where(eq(transcriptionImportsTable.status, "queued"))
      .orderBy(asc(transcriptionImportsTable.createdAt))
      .limit(1);

    if (!candidate) {
      return null;
    }

    const now = new Date();
    const [claimedImport] = await this.db
      .update(transcriptionImportsTable)
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
          eq(transcriptionImportsTable.id, candidate.id),
          eq(transcriptionImportsTable.status, "queued"),
        ),
      )
      .returning();

    return claimedImport ?? null;
  }

  async processTranscriptionImport(
    transcriptionImport: TranscriptionImport,
  ): Promise<ProcessTranscriptionImportResult> {
    let processedItems = 0;
    let batch: TranscriptionSource[] = [];

    try {
      let input: ReadableStream<Uint8Array>;

      try {
        input = this.storage.read(transcriptionImport.objectKey);
      } catch (error) {
        throw new TranscriptionImportProcessingError(
          {
            code: "STORAGE_READ_FAILED",
            message: "The transcription import could not be read from storage",
          },
          { cause: error },
        );
      }

      for await (const item of streamTranscriptionItems(input)) {
        batch.push(validateTranscriptionItem(item.index, item.value));

        if (batch.length === PROCESSING_BATCH_SIZE) {
          processedItems = await this.stageBatch(transcriptionImport, batch, processedItems);
          batch = [];
        }
      }

      processedItems = await this.stageBatch(transcriptionImport, batch, processedItems);

      try {
        await this.transcriptionService.mergeStagedTranscriptions(
          transcriptionImport.id,
          transcriptionImport.organisationId,
        );
      } catch (error) {
        throw new TranscriptionImportProcessingError(
          {
            code: "PUBLISH_FAILED",
            message: "The validated transcriptions could not be published",
          },
          { cause: error },
        );
      }
    } catch (error) {
      const importError = toTranscriptionImportError(error);
      let cleanupFailed = false;

      try {
        await this.markProcessingFailed(transcriptionImport.id, importError);
      } finally {
        try {
          await this.transcriptionService.removeStagedTranscriptions(
            transcriptionImport.id,
            transcriptionImport.organisationId,
          );
        } catch {
          cleanupFailed = true;
        }
      }

      return { status: "failed", error: importError, cleanupFailed };
    }

    await this.markProcessingCompleted(transcriptionImport.id, processedItems);

    return { status: "completed", processedItems };
  }

  private async stageBatch(
    transcriptionImport: TranscriptionImport,
    items: TranscriptionSource[],
    processedItems: number,
  ): Promise<number> {
    if (items.length === 0) {
      return processedItems;
    }

    const nextProcessedItems = processedItems + items.length;

    try {
      await this.transcriptionService.addStagedTranscriptions(
        transcriptionImport.id,
        transcriptionImport.organisationId,
        items,
      );

      const [updatedImport] = await this.db
        .update(transcriptionImportsTable)
        .set({ processedItems: nextProcessedItems, updatedAt: new Date() })
        .where(
          and(
            eq(transcriptionImportsTable.id, transcriptionImport.id),
            eq(transcriptionImportsTable.status, "processing"),
          ),
        )
        .returning({ id: transcriptionImportsTable.id });

      if (!updatedImport) {
        throw new InvariantError("Could not update a non-processing transcription import");
      }
    } catch (error) {
      throw new TranscriptionImportProcessingError(
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
    importId: TranscriptionImport["id"],
    processedItems: number,
  ): Promise<void> {
    const now = new Date();
    const [completedImport] = await this.db
      .update(transcriptionImportsTable)
      .set({
        status: "completed",
        processedItems,
        completedAt: now,
        updatedAt: now,
        error: null,
      })
      .where(
        and(
          eq(transcriptionImportsTable.id, importId),
          eq(transcriptionImportsTable.status, "processing"),
        ),
      )
      .returning({ id: transcriptionImportsTable.id });

    if (!completedImport) {
      throw new InvariantError("Could not complete a non-processing transcription import");
    }
  }

  private async markProcessingFailed(
    importId: TranscriptionImport["id"],
    error: TranscriptionImportError,
  ): Promise<void> {
    const now = new Date();

    const [failedImport] = await this.db
      .update(transcriptionImportsTable)
      .set({
        status: "failed",
        error,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(transcriptionImportsTable.id, importId),
          eq(transcriptionImportsTable.status, "processing"),
        ),
      )
      .returning({ id: transcriptionImportsTable.id });

    if (!failedImport) {
      throw new InvariantError("Could not fail a non-processing transcription import");
    }
  }

  private async findTranscriptionImport(
    organisationId: Organisation["id"],
    importId: TranscriptionImport["id"],
  ): Promise<TranscriptionImport> {
    const [transcriptionImport] = await this.db
      .select()
      .from(transcriptionImportsTable)
      .where(
        and(
          eq(transcriptionImportsTable.id, importId),
          eq(transcriptionImportsTable.organisationId, organisationId),
        ),
      )
      .limit(1);

    if (!transcriptionImport) {
      throw new TranscriptionImportNotFoundError();
    }

    return transcriptionImport;
  }

  private toDetails(transcriptionImport: TranscriptionImport): TranscriptionImportDetails {
    const { objectKey: _, ...details } = transcriptionImport;
    return details;
  }
}
