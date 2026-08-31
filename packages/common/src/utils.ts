/**
 * Filters null and undefined values from an array.
 *
 * @param arr - The array to filter.
 * @param options - Optional filtering configuration.
 * @param options.outEmptyStrings - Also removes `""`. Defaults to `false`.
 *
 * @returns The filtered array.
 */
export function filterOutNullish<T>(
  arr: T[],
  { outEmptyStrings = false }: { outEmptyStrings?: boolean } = {},
): Exclude<T, null | undefined>[] {
  return arr.filter(
    (item): item is Exclude<T, null | undefined> =>
      item !== null && item !== undefined && (!outEmptyStrings || item !== ""),
  );
}
