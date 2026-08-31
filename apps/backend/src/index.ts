import { createApi } from "./api";
import { createServices } from "#lib/services";
import { env } from "#lib/env";
import { db } from "#lib/db";
import { S3Client } from "bun";
import { S3Storage } from "#features/transcription-import";
import { TranscriptionImportWorker } from "./workers/transcription-import.worker";

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
});
const fileStorage = new S3Storage(s3Client);
const services = createServices(db, fileStorage);
const api = createApi(services);
const transcriptionImportWorker = new TranscriptionImportWorker(
  services.transcriptionImportService,
  env.TRANSCRIPTION_IMPORT_WORKER_POLL_INTERVAL_MS,
);

transcriptionImportWorker.start();

Bun.serve({
  port: env.PORT,
  fetch: api.fetch,
});
