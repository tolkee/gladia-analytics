import { createApi } from "./api";
import { createServices } from "#lib/services";
import { env } from "#lib/env";
import { db } from "#lib/db";
import { S3Client } from "bun";
import { S3Storage } from "#features/transcription-upload";
import { TranscriptionUploadWorker } from "./workers/transcription-upload.worker";
import { TRANSCRIPTION_UPLOAD_MAX_SIZE_BYTES } from "@gladia-analytics/common/constants";

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
const transcriptionUploadWorker = new TranscriptionUploadWorker(
  services.transcriptionUploadService,
  env.TRANSCRIPTION_UPLOAD_WORKER_POLL_INTERVAL_MS,
);

transcriptionUploadWorker.start();

Bun.serve({
  port: env.PORT,
  maxRequestBodySize: TRANSCRIPTION_UPLOAD_MAX_SIZE_BYTES,
  fetch: api.fetch,
});
