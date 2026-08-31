import { usersTable } from "#schemas/auth";
import { organisationsTable } from "#schemas/organisation";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const transcriptionImportStatuses = [
  "awaiting_upload",
  "queued",
  "processing",
  "completed",
  "failed",
] as const;

export const transcriptionImportStatusEnum = pgEnum(
  "transcription_import_status",
  transcriptionImportStatuses,
);

export type TranscriptionImportValidationError = {
  path: string;
  message: string;
};

export const transcriptionImportsTable = pgTable(
  "transcription_imports",
  {
    id: uuid().defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    contentType: text("content_type").notNull(),
    expectedSizeBytes: integer("expected_size_bytes").notNull(),
    actualSizeBytes: integer("actual_size_bytes"),
    etag: text(),
    status: transcriptionImportStatusEnum().default("awaiting_upload").notNull(),
    phase: text(),
    processedItems: integer("processed_items").default(0).notNull(),
    totalItems: integer("total_items"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    validationErrors: jsonb("validation_errors").$type<TranscriptionImportValidationError[]>(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("transcription_imports_object_key_uidx").on(table.objectKey),
    index("transcription_imports_organisation_created_at_idx").on(
      table.organisationId,
      table.createdAt,
    ),
    index("transcription_imports_status_created_at_idx").on(table.status, table.createdAt),
    check("transcription_imports_expected_size_positive", sql`${table.expectedSizeBytes} > 0`),
    check(
      "transcription_imports_actual_size_non_negative",
      sql`${table.actualSizeBytes} IS NULL OR ${table.actualSizeBytes} >= 0`,
    ),
    check("transcription_imports_processed_items_positive", sql`${table.processedItems} >= 0`),
    check(
      "transcription_imports_total_items_positive",
      sql`${table.totalItems} IS NULL OR ${table.totalItems} >= 0`,
    ),
  ],
);

export type TranscriptionImport = typeof transcriptionImportsTable.$inferSelect;
export type TranscriptionImportStatus = TranscriptionImport["status"];
