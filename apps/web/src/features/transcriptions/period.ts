import * as z from "zod";

export const periods = ["24h", "7d", "30d", "90d", "12m"] as const;
export type Period = (typeof periods)[number];
export const defaultPeriod = "30d" satisfies Period;

export const periodSearchSchema = z
  .object({
    period: z.enum(periods).optional().catch(undefined),
    from: z.iso.date().optional().catch(undefined),
    to: z.iso.date().optional().catch(undefined),
  })
  .transform(({ period, from, to }) => {
    if (from && to && from <= to) {
      return { from, to };
    }

    return period ? { period } : {};
  });

export type PeriodSelection =
  | { type: "preset"; period: Period }
  | { type: "custom"; from: string; to: string };

export type PeriodRange = {
  from: string;
  to: string;
};

export function periodSelectionFromSearch(search: {
  period?: Period;
  from?: string;
  to?: string;
}): PeriodSelection {
  if (search.from && search.to && search.from <= search.to) {
    return { type: "custom", from: search.from, to: search.to };
  }

  return { type: "preset", period: search.period ?? defaultPeriod };
}

export function getPeriodRange(selection: PeriodSelection): PeriodRange {
  if (selection.type === "custom") {
    const from = dateFromCalendarValue(selection.from);
    const to = dateFromCalendarValue(selection.to);
    to.setDate(to.getDate() + 1);

    return { from: from.toISOString(), to: to.toISOString() };
  }

  const to = new Date();
  const from = new Date(to);

  if (selection.period === "24h") from.setUTCHours(from.getUTCHours() - 24);
  if (selection.period === "7d") from.setUTCDate(from.getUTCDate() - 7);
  if (selection.period === "30d") from.setUTCDate(from.getUTCDate() - 30);
  if (selection.period === "90d") from.setUTCDate(from.getUTCDate() - 90);
  if (selection.period === "12m") from.setUTCMonth(from.getUTCMonth() - 12);

  return { from: from.toISOString(), to: to.toISOString() };
}

function dateFromCalendarValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}
