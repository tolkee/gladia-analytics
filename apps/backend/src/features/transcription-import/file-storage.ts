export type PresignedFileRequest = {
  url: string;
  method: "GET" | "PUT";
  headers: Record<string, string>;
  expiresAt: Date;
};

export type StoredFileMetadata = {
  size: number;
  etag: string;
  contentType: string;
  lastModified: Date;
};

export interface FileStorage {
  createUploadRequest(key: string, contentType: string): PresignedFileRequest;
  createDownloadRequest(key: string): PresignedFileRequest;
  stat(key: string): Promise<StoredFileMetadata | null>;
  read(key: string): ReadableStream<Uint8Array>;
  delete(key: string): Promise<void>;
}
