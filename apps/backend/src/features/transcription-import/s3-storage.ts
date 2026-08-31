import { S3Client } from "bun";
import type { FileStorage, PresignedFileRequest, StoredFileMetadata } from "./file-storage";

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

export class S3Storage implements FileStorage {
  constructor(private readonly client: S3Client) {}

  createUploadRequest(key: string, contentType: string): PresignedFileRequest {
    return {
      url: this.client.presign(key, {
        method: "PUT",
        expiresIn: PRESIGNED_URL_TTL_SECONDS,
        type: contentType,
      }),
      method: "PUT",
      headers: { "content-type": contentType },
      expiresAt: this.getExpirationDate(),
    };
  }

  createDownloadRequest(key: string): PresignedFileRequest {
    return {
      url: this.client.presign(key, {
        method: "GET",
        expiresIn: PRESIGNED_URL_TTL_SECONDS,
      }),
      method: "GET",
      headers: {},
      expiresAt: this.getExpirationDate(),
    };
  }

  async stat(key: string): Promise<StoredFileMetadata | null> {
    if (!(await this.client.exists(key))) {
      return null;
    }

    const stats = await this.client.stat(key);

    return {
      size: stats.size,
      etag: stats.etag,
      contentType: stats.type,
      lastModified: stats.lastModified,
    };
  }

  read(key: string): ReadableStream<Uint8Array> {
    return this.client.file(key).stream();
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(key);
  }

  private getExpirationDate(): Date {
    return new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1_000);
  }
}
