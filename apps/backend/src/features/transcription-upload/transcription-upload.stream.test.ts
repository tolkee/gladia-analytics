import { describe, expect, test } from "bun:test";
import { TranscriptionUploadProcessingError } from "./transcription-upload.processing";
import { streamTranscriptionItems } from "./transcription-upload.stream";

const encoder = new TextEncoder();

describe("streamTranscriptionItems", () => {
  test("emits items without retaining the surrounding document", async () => {
    const input = streamChunks(['{"items":[{"id":1},', '{"id":2}],"next":"ignored"}']);
    const items = [];

    for await (const item of streamTranscriptionItems(input)) {
      items.push(item);
    }

    expect(items).toEqual([
      { index: 0, value: { id: 1 } },
      { index: 1, value: { id: 2 } },
    ]);
  });

  test("rejects malformed JSON even after emitting valid items", async () => {
    const iterator = streamTranscriptionItems(streamChunks(['{"items":[{"id":1},']));

    expect(await iterator.next()).toEqual({ done: false, value: { index: 0, value: { id: 1 } } });

    await expect(iterator.next()).rejects.toMatchObject({
      details: { code: "INVALID_JSON" },
    });
  });

  test.each([
    ["a missing items property", '{"next":null}'],
    ["an empty items array", '{"items":[]}'],
    ["a non-array items property", '{"items":{"id":1}}'],
  ])("rejects %s", async (_scenario, document) => {
    await expect(collect(streamTranscriptionItems(streamChunks([document])))).rejects.toMatchObject(
      {
        details: { code: "INVALID_UPLOAD_FORMAT" },
      },
    );
  });

  test("distinguishes storage failures from invalid JSON", async () => {
    const storageError = new Error("storage unavailable");
    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(storageError);
      },
    });

    try {
      await collect(streamTranscriptionItems(input));
      throw new Error("Expected the stream to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TranscriptionUploadProcessingError);
      expect((error as TranscriptionUploadProcessingError).details.code).toBe(
        "STORAGE_READ_FAILED",
      );
    }
  });
});

function streamChunks(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
}

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const collected = [];

  for await (const item of items) {
    collected.push(item);
  }

  return collected;
}
