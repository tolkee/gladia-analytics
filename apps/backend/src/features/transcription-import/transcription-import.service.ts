import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { Db } from "#lib/db";
import { InvariantError } from "#lib/errors";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  TranscriptionImportEmptyFileError,
  TranscriptionImportFileTooLargeError,
  TranscriptionImportNotFoundError,
} from "./errors";
import type { FileStorage, PresignedDownloadRequest } from "./file-storage";
import {
  MAX_TRANSCRIPTION_IMPORT_SIZE_BYTES,
  TRANSCRIPTION_IMPORT_CONTENT_TYPE,
  type CreateTranscriptionImportInput,
} from "./transcription-import.dto";
import { transcriptionImportsTable, type TranscriptionImport } from "./transcription-import.schema";

export type TranscriptionImportDetails = Omit<TranscriptionImport, "objectKey">;

export type CreatedTranscriptionImport = TranscriptionImportDetails;

export class TranscriptionImportService {
  constructor(
    private readonly db: Db,
    private readonly storage: FileStorage,
    private readonly organisationService: OrganisationService,
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

    if (sizeBytes > MAX_TRANSCRIPTION_IMPORT_SIZE_BYTES) {
      await this.storage.delete(objectKey);
      throw new TranscriptionImportFileTooLargeError(
        sizeBytes,
        MAX_TRANSCRIPTION_IMPORT_SIZE_BYTES,
      );
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
          phase: "queued",
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
        phase: "processing",
        processingStartedAt: now,
        updatedAt: now,
        attemptCount: sql`${transcriptionImportsTable.attemptCount} + 1`,
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

  async markProcessingCompleted(importId: TranscriptionImport["id"]): Promise<void> {
    const now = new Date();
    const [completedImport] = await this.db
      .update(transcriptionImportsTable)
      .set({
        status: "completed",
        phase: "completed",
        processedItems: 0,
        totalItems: 0,
        completedAt: now,
        updatedAt: now,
        errorCode: null,
        errorMessage: null,
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

  async markProcessingFailed(
    importId: TranscriptionImport["id"],
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.db
      .update(transcriptionImportsTable)
      .set({
        status: "failed",
        phase: "failed",
        errorCode,
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transcriptionImportsTable.id, importId),
          eq(transcriptionImportsTable.status, "processing"),
        ),
      );
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
