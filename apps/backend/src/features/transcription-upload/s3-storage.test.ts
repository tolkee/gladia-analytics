import { describe, expect, mock, test } from "bun:test";
import type { S3Client } from "bun";
import { S3Storage } from "./s3-storage";

describe("S3Storage", () => {
  test.each([
    ["a non-empty upload", 10_656_661],
    ["an empty upload", 0],
  ])("returns the persisted size for %s", async (_scenario, persistedSize) => {
    const write = mock(async () => 0);
    const stat = mock(async () => ({ size: persistedSize }));
    const storage = new S3Storage({ write, stat } as unknown as S3Client);
    const request = new Request("http://localhost/upload", {
      method: "POST",
      body: persistedSize === 0 ? null : "payload",
    });

    expect(await storage.write("upload.json", request, "application/json")).toBe(persistedSize);
    expect(write).toHaveBeenCalledWith("upload.json", request, { type: "application/json" });
    expect(stat).toHaveBeenCalledWith("upload.json");
  });
});
