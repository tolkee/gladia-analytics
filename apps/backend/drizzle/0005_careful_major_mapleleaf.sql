CREATE TYPE "public"."transcription_import_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "transcription_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"created_by" text,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "transcription_import_status" DEFAULT 'queued' NOT NULL,
	"phase" text,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"total_items" integer,
	"error_code" text,
	"error_message" text,
	"validation_errors" jsonb,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "transcription_imports_size_positive" CHECK ("transcription_imports"."size_bytes" > 0),
	CONSTRAINT "transcription_imports_processed_items_positive" CHECK ("transcription_imports"."processed_items" >= 0),
	CONSTRAINT "transcription_imports_total_items_positive" CHECK ("transcription_imports"."total_items" IS NULL OR "transcription_imports"."total_items" >= 0)
);
--> statement-breakpoint
ALTER TABLE "transcription_imports" ADD CONSTRAINT "transcription_imports_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_imports" ADD CONSTRAINT "transcription_imports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transcription_imports_object_key_uidx" ON "transcription_imports" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "transcription_imports_organisation_created_at_idx" ON "transcription_imports" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "transcription_imports_status_created_at_idx" ON "transcription_imports" USING btree ("status","created_at");