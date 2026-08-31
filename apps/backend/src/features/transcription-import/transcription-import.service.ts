import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { Db } from "#lib/db";
import { InvariantError } from "#lib/errors";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  TranscriptionImportContentTypeMismatchError,
  TranscriptionImportFileSizeMismatchError,
  TranscriptionImportInvalidStateError,
  TranscriptionImportNotFoundError,
  TranscriptionImportObjectNotFoundError,
} from "./errors";
import type { FileStorage, PresignedFileRequest } from "./file-storage";
import type { CreateTranscriptionImportInput } from "./transcription-import.dto";
import { transcriptionImportsTable, type TranscriptionImport } from "./transcription-import.schema";

export type TranscriptionImportDetails = Omit<TranscriptionImport, "objectKey">;

export type CreatedTranscriptionImport = {
  transcriptionImport: TranscriptionImportDetails;
  upload: PresignedFileRequest;
};

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
  ): Promise<CreatedTranscriptionImport> {
    await this.organisationService.isInOrganisation(userId, organisationId, "admin");

    const id = crypto.randomUUID();
    const objectKey = `organisations/${organisationId}/transcription-imports/${id}.json`;
    const [transcriptionImport] = await this.db
      .insert(transcriptionImportsTable)
      .values({
        id,
        organisationId,
        createdBy: userId,
        objectKey,
        originalFilename: input.filename,
        contentType: input.contentType,
        expectedSizeBytes: input.sizeBytes,
      })
      .returning();

    if (!transcriptionImport) {
      throw new InvariantError("Transcription import insert returned no row");
    }

    return {
      transcriptionImport: this.toDetails(transcriptionImport),
      upload: this.storage.createUploadRequest(objectKey, input.contentType),
    };
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

  async completeUpload(
    userId: User["id"],
    organisationId: Organisation["id"],
    importId: TranscriptionImport["id"],
  ): Promise<TranscriptionImportDetails> {
    await this.organisationService.isInOrganisation(userId, organisationId, "admin");

    const transcriptionImport = await this.findTranscriptionImport(organisationId, importId);

    if (["queued", "processing", "completed"].includes(transcriptionImport.status)) {
      return this.toDetails(transcriptionImport);
    }

    if (transcriptionImport.status !== "awaiting_upload") {
      throw new TranscriptionImportInvalidStateError();
    }

    const storedFile = await this.storage.stat(transcriptionImport.objectKey);

    if (!storedFile) {
      throw new TranscriptionImportObjectNotFoundError();
    }

    if (storedFile.size !== transcriptionImport.expectedSizeBytes) {
      await this.markUploadFailed(
        transcriptionImport.id,
        "FILE_SIZE_MISMATCH",
        "Uploaded object size does not match the declared size",
        storedFile.size,
      );

      throw new TranscriptionImportFileSizeMismatchError(
        transcriptionImport.expectedSizeBytes,
        storedFile.size,
      );
    }

    const storedContentType = storedFile.contentType.split(";", 1)[0]?.trim().toLowerCase();
    if (storedContentType !== transcriptionImport.contentType) {
      await this.markUploadFailed(
        transcriptionImport.id,
        "CONTENT_TYPE_MISMATCH",
        "Uploaded object content type does not match the declared content type",
        storedFile.size,
      );

      throw new TranscriptionImportContentTypeMismatchError(
        transcriptionImport.contentType,
        storedFile.contentType,
      );
    }

    const now = new Date();
    const [queuedImport] = await this.db
      .update(transcriptionImportsTable)
      .set({
        status: "queued",
        phase: "queued",
        actualSizeBytes: storedFile.size,
        etag: storedFile.etag,
        uploadedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(transcriptionImportsTable.id, transcriptionImport.id),
          eq(transcriptionImportsTable.organisationId, organisationId),
          eq(transcriptionImportsTable.status, "awaiting_upload"),
        ),
      )
      .returning();

    if (!queuedImport) {
      throw new TranscriptionImportInvalidStateError();
    }

    return this.toDetails(queuedImport);
  }

  async createDownloadRequest(
    userId: User["id"],
    organisationId: Organisation["id"],
    importId: TranscriptionImport["id"],
  ): Promise<PresignedFileRequest> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const transcriptionImport = await this.findTranscriptionImport(organisationId, importId);

    if (transcriptionImport.status === "awaiting_upload") {
      throw new TranscriptionImportInvalidStateError();
    }

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

  private async markUploadFailed(
    importId: TranscriptionImport["id"],
    errorCode: string,
    errorMessage: string,
    actualSizeBytes: number,
  ): Promise<void> {
    const now = new Date();
    await this.db
      .update(transcriptionImportsTable)
      .set({
        status: "failed",
        phase: "upload_validation",
        actualSizeBytes,
        errorCode,
        errorMessage,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(transcriptionImportsTable.id, importId),
          eq(transcriptionImportsTable.status, "awaiting_upload"),
        ),
      );
  }

  private toDetails(transcriptionImport: TranscriptionImport): TranscriptionImportDetails {
    const { objectKey: _, ...details } = transcriptionImport;
    return details;
  }
}
