import { describe, expect, test } from "bun:test";
import { analyticsTimeRangeSchema, transcriptionSourceSchema } from "./transcription.dto";
import {
  decodeCursor,
  encodeCursor,
  fillTimeline,
  toTranscriptionInsert,
} from "./transcription.service";

const sourceTranscription = {
  id: "729c2416-8fca-4f24-ac23-f43cbf6a5f4e",
  request_id: "G-729c2416",
  version: 2,
  status: "done",
  created_at: "2026-01-20T15:45:09.791Z",
  completed_at: "2026-01-20T15:45:54.524Z",
  custom_metadata: null,
  error_code: null,
  kind: "pre-recorded",
  file: {
    id: "fc3a610a-9766-46d0-952e-9e4ff27e30f8",
    filename: "recording.mp3",
    source: null,
    audio_duration: 12,
    number_of_channels: 2,
  },
  request_params: {
    model: "solaria-1",
    detect_language: true,
    language_config: {
      languages: ["EN", "fr", "en"],
      code_switching: true,
    },
  },
  result: {
    metadata: {
      audio_duration: 11,
      number_of_distinct_channels: 1,
      billing_time: 10,
      transcription_time: 5,
    },
  },
};

describe("transcription source validation", () => {
  test("normalizes and deduplicates configured languages", () => {
    const parsed = transcriptionSourceSchema.parse(sourceTranscription);

    expect(parsed.request_params.language_config.languages).toEqual(["en", "fr"]);
  });

  test("precomputes billable seconds using the documented fallback order", () => {
    const parsed = transcriptionSourceSchema.parse(sourceTranscription);
    const fromBillingTime = toTranscriptionInsert("16d32b80-8201-4fc5-8031-19f68811c189", parsed);
    const fromResultDuration = toTranscriptionInsert("16d32b80-8201-4fc5-8031-19f68811c189", {
      ...parsed,
      result: { metadata: { ...parsed.result!.metadata, billing_time: null } },
    });
    const fromFileDuration = toTranscriptionInsert("16d32b80-8201-4fc5-8031-19f68811c189", {
      ...parsed,
      result: null,
    });

    expect(fromBillingTime.billableSeconds).toBe(10);
    expect(fromResultDuration.billableSeconds).toBe(11);
    expect(fromFileDuration.billableSeconds).toBe(12);
  });
});

describe("analytics time range", () => {
  test("rejects a range whose interval would create too many points", () => {
    const result = analyticsTimeRangeSchema.safeParse({
      from: "2020-01-01T00:00:00Z",
      to: "2026-01-01T00:00:00Z",
      interval: "day",
    });

    expect(result.success).toBeFalse();
  });

  test("fills absent UTC timeline buckets with zero values", () => {
    const timeRange = analyticsTimeRangeSchema.parse({
      from: "2026-01-01T12:00:00Z",
      to: "2026-01-03T00:00:00Z",
      interval: "day",
    });
    const timeline = fillTimeline(timeRange, [
      {
        bucketStartMs: Date.parse("2026-01-02T00:00:00Z"),
        transcriptionCount: 2,
        usageMinutes: 3,
        costUsd: 0.1,
        realtimeMinutes: 1,
        asyncMinutes: 2,
      },
    ]);

    expect(timeline).toEqual([
      {
        start: "2026-01-01T00:00:00.000Z",
        transcriptionCount: 0,
        usageMinutes: 0,
        costUsd: 0,
        realtimeMinutes: 0,
        asyncMinutes: 0,
      },
      {
        start: "2026-01-02T00:00:00.000Z",
        transcriptionCount: 2,
        usageMinutes: 3,
        costUsd: 0.1,
        realtimeMinutes: 1,
        asyncMinutes: 2,
      },
    ]);
  });
});

describe("transcription pagination cursor", () => {
  test("round-trips an opaque cursor", () => {
    const payload = {
      createdAt: "2026-01-20T15:45:09.791Z",
      id: "729c2416-8fca-4f24-ac23-f43cbf6a5f4e",
    };

    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });
});
