import { JSONParser } from "@streamparser/json-whatwg";
import { TranscriptionImportProcessingError } from "./transcription-import.processing";

const PARSER_BUFFER_SIZE_BYTES = 64 * 1024;

class StorageStreamError extends Error {
  constructor(options: ErrorOptions) {
    super("The storage stream failed", options);
    this.name = "StorageStreamError";
  }
}

export type StreamedTranscriptionItem = {
  index: number;
  value: unknown;
};

export async function* streamTranscriptionItems(
  input: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamedTranscriptionItem> {
  const reader = wrapStorageErrors(input)
    .pipeThrough(splitByteChunks(PARSER_BUFFER_SIZE_BYTES))
    .pipeThrough(
      new JSONParser({
        paths: ["$.items.*"],
        keepStack: false,
        stringBufferSize: PARSER_BUFFER_SIZE_BYTES,
      }),
    )
    .getReader();
  let itemCount = 0;
  let reachedEnd = false;

  try {
    while (true) {
      const parsed = await reader.read();

      if (parsed.done) {
        reachedEnd = true;
        break;
      }

      if (typeof parsed.value.key !== "number" || !Array.isArray(parsed.value.parent)) {
        throw new TranscriptionImportProcessingError({
          code: "INVALID_IMPORT_FORMAT",
          message: "The import items property must be an array",
        });
      }

      itemCount += 1;
      yield { index: parsed.value.key, value: parsed.value.value };
    }
  } catch (error) {
    if (error instanceof TranscriptionImportProcessingError) {
      throw error;
    }

    if (error instanceof StorageStreamError) {
      throw new TranscriptionImportProcessingError(
        {
          code: "STORAGE_READ_FAILED",
          message: "The transcription import could not be read from storage",
        },
        { cause: error },
      );
    }

    throw new TranscriptionImportProcessingError(
      {
        code: "INVALID_JSON",
        message: "The transcription import is not valid JSON",
        ...(error instanceof Error && {
          metadata: { reason: error.message.slice(0, 500) },
        }),
      },
      { cause: error },
    );
  } finally {
    if (!reachedEnd) {
      try {
        await reader.cancel();
      } catch {
        // Preserve the processing error that stopped iteration.
      }
    }

    reader.releaseLock();
  }

  if (itemCount === 0) {
    throw new TranscriptionImportProcessingError({
      code: "INVALID_IMPORT_FORMAT",
      message: "The import must contain a non-empty items array",
    });
  }
}

function splitByteChunks(maxChunkSize: number): TransformStream<Uint8Array, Uint8Array> {
  return new TransformStream({
    transform(chunk, controller) {
      for (let offset = 0; offset < chunk.length; offset += maxChunkSize) {
        controller.enqueue(chunk.subarray(offset, offset + maxChunkSize));
      }
    },
  });
}

function wrapStorageErrors(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = input.getReader();
  let released = false;

  const release = () => {
    if (!released) {
      reader.releaseLock();
      released = true;
    }
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        const chunk = await reader.read();

        if (chunk.done) {
          controller.close();
          release();
          return;
        }

        controller.enqueue(chunk.value);
      } catch (error) {
        controller.error(new StorageStreamError({ cause: error }));
        release();
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    },
  });
}
