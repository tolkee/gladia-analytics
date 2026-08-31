import { usersTable } from "#schemas/auth";
import { organisationsTable } from "#schemas/organisation";
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const transcriptionImportStatuses = ["queued", "processing", "completed", "failed"] as const;

export const transcriptionImportStatusEnum = pgEnum(
  "transcription_import_status",
  transcriptionImportStatuses,
);

export type TranscriptionImportError = {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
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
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    status: transcriptionImportStatusEnum().default("queued").notNull(),
    processedItems: bigint("processed_items", { mode: "number" }).default(0).notNull(),
    error: jsonb().$type<TranscriptionImportError>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
    check("transcription_imports_size_positive", sql`${table.sizeBytes} > 0`),
    check("transcription_imports_processed_items_positive", sql`${table.processedItems} >= 0`),
  ],
);

export type TranscriptionImport = typeof transcriptionImportsTable.$inferSelect;
export type TranscriptionImportStatus = TranscriptionImport["status"];
