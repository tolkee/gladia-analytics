import {
  TRANSCRIPTION_UPLOAD_MAX_SIZE_BYTES,
  TRANSCRIPTION_UPLOAD_MAX_SIZE_LABEL,
} from "@gladia-analytics/common/constants";
import { ApiError } from "#lib/errors";

type TranscriptionUploadFile = Pick<File, "name" | "size" | "type">;

export function getTranscriptionUploadFileError(file: TranscriptionUploadFile): string | null {
  const isJson = file.type === "application/json" || file.name.toLowerCase().endsWith(".json");

  if (!isJson) {
    return "Select a JSON file containing transcription data.";
  }

  if (file.size > TRANSCRIPTION_UPLOAD_MAX_SIZE_BYTES) {
    return `The file is too large. Upload a JSON file no larger than ${TRANSCRIPTION_UPLOAD_MAX_SIZE_LABEL}.`;
  }

  return null;
}

export function getTranscriptionUploadRequestError(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "The upload could not be completed. Check your connection and try again.";
}

const fileSizeFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1_000) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = sizeBytes / 1_000;
  let unitIndex = 0;

  while (value >= 1_000 && unitIndex < units.length - 1) {
    value /= 1_000;
    unitIndex += 1;
  }

  return `${fileSizeFormatter.format(value)} ${units[unitIndex]}`;
}
