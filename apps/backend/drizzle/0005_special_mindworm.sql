ALTER TABLE "staged_transcriptions" RENAME COLUMN "import_id" TO "upload_id";--> statement-breakpoint
ALTER TABLE "staged_transcriptions" RENAME CONSTRAINT "staged_transcriptions_import_id_organisation_id_id_pk" TO "staged_transcriptions_upload_id_organisation_id_id_pk";--> statement-breakpoint
CREATE TYPE "public"."transcription_upload_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "transcription_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"created_by" text,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"status" "transcription_upload_status" DEFAULT 'queued' NOT NULL,
	"processed_items" bigint DEFAULT 0 NOT NULL,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "transcription_uploads_size_positive" CHECK ("transcription_uploads"."size_bytes" > 0),
	CONSTRAINT "transcription_uploads_processed_items_positive" CHECK ("transcription_uploads"."processed_items" >= 0)
);
--> statement-breakpoint
ALTER TABLE "transcription_uploads" ADD CONSTRAINT "transcription_uploads_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_uploads" ADD CONSTRAINT "transcription_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transcription_uploads_object_key_uidx" ON "transcription_uploads" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "transcription_uploads_organisation_created_at_idx" ON "transcription_uploads" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "transcription_uploads_status_created_at_idx" ON "transcription_uploads" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "staged_transcriptions" ADD CONSTRAINT "staged_transcriptions_upload_id_transcription_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."transcription_uploads"("id") ON DELETE cascade ON UPDATE no action;
