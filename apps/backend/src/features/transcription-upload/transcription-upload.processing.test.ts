import { describe, expect, test } from "bun:test";
import {
  TranscriptionUploadProcessingError,
  validateTranscriptionItem,
} from "./transcription-upload.processing";

describe("validateTranscriptionItem", () => {
  test("validates and normalizes one transcription without retaining unknown fields", () => {
    const transcription = validateTranscriptionItem(0, {
      ...validSource(),
      ignored_future_field: "ignored",
      request_params: {
        ...validSource().request_params,
        language_config: {
          languages: ["EN", "en", "FR"],
          code_switching: true,
        },
      },
    });

    expect(transcription.request_params.language_config.languages).toEqual(["en", "fr"]);
    expect(transcription).not.toHaveProperty("ignored_future_field");
  });

  test("returns a bounded structured error with the item index and field path", () => {
    try {
      validateTranscriptionItem(42, { ...validSource(), created_at: "not-a-date" });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TranscriptionUploadProcessingError);
      expect((error as TranscriptionUploadProcessingError).details).toMatchObject({
        code: "INVALID_TRANSCRIPTION",
        metadata: {
          itemIndex: 42,
          issues: [{ path: "created_at" }],
          issuesTruncated: false,
        },
      });
    }
  });
});

function validSource() {
  return {
    id: "87af7340-99d7-403b-8acb-696ed3b91009",
    request_id: "G-87af7340",
    version: 2,
    status: "done",
    created_at: "2026-01-20T15:45:09.791Z",
    completed_at: "2026-01-20T15:45:54.524Z",
    custom_metadata: null,
    error_code: null,
    kind: "live" as const,
    file: null,
    request_params: {
      model: "solaria-1",
      language_config: { languages: [], code_switching: true },
    },
    result: { metadata: { billing_time: 13 } },
  };
}
