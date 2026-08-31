import { describe, expect, test } from "bun:test";

import { filterOutNullish } from "./utils";

describe("filterOutNullish", () => {
  test("removes null and undefined values", () => {
    expect(filterOutNullish([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
  });

  test("preserves empty strings by default", () => {
    expect(filterOutNullish(["first", "", "last"])).toEqual(["first", "", "last"]);
  });

  test("preserves other falsy values", () => {
    expect(filterOutNullish([false, 0, Number.NaN, null, undefined])).toEqual([
      false,
      0,
      Number.NaN,
    ]);
  });

  test("removes empty strings when requested", () => {
    expect(filterOutNullish(["first", "", null, "last"], { outEmptyStrings: true })).toEqual([
      "first",
      "last",
    ]);
  });

  test("handles an empty array", () => {
    expect(filterOutNullish([])).toEqual([]);
  });

  test("does not mutate the source array", () => {
    const source = ["first", null, "last"];

    filterOutNullish(source);

    expect(source).toEqual(["first", null, "last"]);
  });
});
