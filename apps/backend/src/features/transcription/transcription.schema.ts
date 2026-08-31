import { organisationsTable } from "#schemas/organisation";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const transcriptionKinds = ["live", "pre-recorded"] as const;
export const transcriptionKindEnum = pgEnum("transcription_kind", transcriptionKinds);

export const transcriptionsTable = pgTable(
  "transcriptions",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),

    id: uuid().notNull(),
    requestId: text("request_id").notNull(),
    version: integer().notNull(),
    status: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    customMetadata: jsonb("custom_metadata").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    kind: transcriptionKindEnum().notNull(),

    fileId: uuid("file_id"),
    fileName: text("file_name"),
    fileSource: text("file_source"),
    fileAudioDuration: doublePrecision("file_audio_duration"),
    fileNumberOfChannels: integer("file_number_of_channels"),

    model: text().notNull(),
    detectLanguage: boolean("detect_language"),
    languages: text().array().notNull(),
    codeSwitching: boolean("code_switching").notNull(),

    resultAudioDuration: doublePrecision("result_audio_duration"),
    resultNumberOfDistinctChannels: integer("result_number_of_distinct_channels"),
    resultBillingTime: doublePrecision("result_billing_time"),
    resultTranscriptionTime: doublePrecision("result_transcription_time"),

    billableSeconds: doublePrecision("billable_seconds").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.organisationId, table.id],
      name: "transcriptions_organisation_id_id_pk",
    }),
    index("transcriptions_organisation_id_created_at_id_idx").on(
      table.organisationId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export type Transcription = typeof transcriptionsTable.$inferSelect;
