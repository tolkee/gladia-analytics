CREATE TYPE "public"."transcription_kind" AS ENUM('live', 'pre-recorded');--> statement-breakpoint
CREATE TABLE "transcriptions" (
	"organisation_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"custom_metadata" jsonb,
	"error_code" text,
	"kind" "transcription_kind" NOT NULL,
	"file_id" uuid,
	"file_name" text,
	"file_source" text,
	"file_audio_duration" double precision,
	"file_number_of_channels" integer,
	"model" text NOT NULL,
	"detect_language" boolean,
	"languages" text[] NOT NULL,
	"code_switching" boolean NOT NULL,
	"result_audio_duration" double precision,
	"result_number_of_distinct_channels" integer,
	"result_billing_time" double precision,
	"result_transcription_time" double precision,
	"billable_seconds" double precision NOT NULL,
	CONSTRAINT "transcriptions_organisation_id_id_pk" PRIMARY KEY("organisation_id","id")
);
--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcriptions_organisation_id_created_at_id_idx" ON "transcriptions" USING btree ("organisation_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);