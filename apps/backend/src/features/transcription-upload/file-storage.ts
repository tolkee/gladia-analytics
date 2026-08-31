export type PresignedDownloadRequest = {
  url: string;
  method: "GET";
  headers: Record<string, string>;
  expiresAt: Date;
};

export interface FileStorage {
  write(key: string, data: Request, contentType: string): Promise<number>;
  createDownloadRequest(key: string): PresignedDownloadRequest;
  read(key: string): ReadableStream<Uint8Array>;
  delete(key: string): Promise<void>;
}
