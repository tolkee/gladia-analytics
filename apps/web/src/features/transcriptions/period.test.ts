import { describe, expect, test } from "bun:test";
import { getPeriodRange, periodSearchSchema, periodSelectionFromSearch } from "./period";

describe("shared period search", () => {
  test("preserves a preset's exact window between views", () => {
    const search = { period: "7d", at: "2026-09-04T14:23:45.123Z" } as const;
    const selection = periodSelectionFromSearch(periodSearchSchema.parse(search));
    expect(getPeriodRange(selection)).toEqual({
      from: "2026-08-28T14:23:45.123Z",
      to: "2026-09-04T14:23:45.123Z",
    });
    expect(
      periodSearchSchema.parse({ ...search, kind: "live", transcriptionId: "detail" }),
    ).toEqual(search);
  });

  test("custom dates replace the preset and anchor", () => {
    const search = periodSearchSchema.parse({
      period: "7d",
      at: "2026-09-04T14:23:45.123Z",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(search).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    const range = getPeriodRange(periodSelectionFromSearch(search));
    expect(new Date(range.from)).toEqual(new Date(2026, 7, 1));
    expect(new Date(range.to)).toEqual(new Date(2026, 8, 1));
  });

  test("invalid dates and anchors fall back to a default preset", () => {
    const search = periodSearchSchema.parse({
      period: "bad",
      at: "bad",
      from: "2026-09-10",
      to: "2026-09-01",
    });
    expect(periodSelectionFromSearch(search)).toEqual({ type: "preset", period: "30d" });
  });
});
