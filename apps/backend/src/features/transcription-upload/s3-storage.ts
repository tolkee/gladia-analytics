import { S3Client } from "bun";
import type { FileStorage, PresignedDownloadRequest } from "./file-storage";

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

export class S3Storage implements FileStorage {
  constructor(private readonly client: S3Client) {}

  async write(key: string, data: Request, contentType: string): Promise<number> {
    await this.client.write(key, data, { type: contentType });

    // Bun can report zero bytes for successfully persisted streamed uploads, so rely on the
    // stored object's metadata instead of the write return value.
    return (await this.client.stat(key)).size;
  }

  createDownloadRequest(key: string): PresignedDownloadRequest {
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
