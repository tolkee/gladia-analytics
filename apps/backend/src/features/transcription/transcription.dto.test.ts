import { describe, expect, test } from "bun:test";
import { transcriptionsQuerySchema } from "./transcription.dto";

const timeRange = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-02-01T00:00:00.000Z",
};

describe("transcriptionsQuerySchema", () => {
  test("uses the current list defaults", () => {
    const query = transcriptionsQuerySchema.parse(timeRange);

    expect(query).toMatchObject({
      limit: 25,
      sort: "createdAt",
      order: "desc",
    });
  });

  test("accepts a kind filter and supported sorting", () => {
    const query = transcriptionsQuerySchema.parse({
      ...timeRange,
      kind: "live",
      sort: "duration",
      order: "asc",
    });

    expect(query).toMatchObject({
      kind: "live",
      sort: "duration",
      order: "asc",
    });
  });

  test("rejects unsupported filters and sort fields", () => {
    expect(
      transcriptionsQuerySchema.safeParse({ ...timeRange, kind: "batch" }).success,
    ).toBeFalse();
    expect(
      transcriptionsQuerySchema.safeParse({ ...timeRange, sort: "fileName" }).success,
    ).toBeFalse();
  });
});
