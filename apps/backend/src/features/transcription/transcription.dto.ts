import * as z from "zod";

const durationSchema = z.number().finite().nonnegative();
const channelCountSchema = z.number().int().nonnegative();
const sourceTimestampSchema = z.iso.datetime({ offset: true });

const transcriptionFileSchema = z.object({
  id: z.uuid(),
  filename: z.string().trim().min(1).max(1_024),
  source: z.string().max(2_048).nullable(),
  audio_duration: durationSchema,
  number_of_channels: channelCountSchema,
});

const transcriptionResultSchema = z.object({
  metadata: z.object({
    audio_duration: durationSchema.nullish(),
    number_of_distinct_channels: channelCountSchema.nullish(),
    billing_time: durationSchema.nullish(),
    transcription_time: durationSchema.nullish(),
  }),
});

export const transcriptionSourceSchema = z.object({
  id: z.uuid(),
  request_id: z.string().trim().min(1).max(255),
  version: z.number().int().nonnegative(),
  status: z.string().trim().min(1).max(100),
  created_at: sourceTimestampSchema,
  completed_at: sourceTimestampSchema.nullable(),
  custom_metadata: z.record(z.string(), z.unknown()).nullable(),
  error_code: z.string().max(255).nullable(),
  kind: z.enum(["live", "pre-recorded"]),
  file: transcriptionFileSchema.nullable(),
  request_params: z.object({
    model: z.string().trim().min(1).max(255),
    detect_language: z.boolean().optional(),
    language_config: z.object({
      languages: z
        .array(z.string().trim().min(1).max(35))
        .max(100)
        .transform((languages) => [
          ...new Set(languages.map((language) => language.toLowerCase())),
        ]),
      code_switching: z.boolean(),
    }),
  }),
  result: transcriptionResultSchema.nullable(),
});

export type TranscriptionSource = z.infer<typeof transcriptionSourceSchema>;

export const createTranscriptionsSchema = z.object({
  items: z.array(transcriptionSourceSchema).max(50_000),
});

export type CreateTranscriptionsInput = z.infer<typeof createTranscriptionsSchema>;

export const analyticsIntervals = ["hour", "day", "week", "month"] as const;
export const analyticsIntervalSchema = z.enum(analyticsIntervals);
export type AnalyticsInterval = z.infer<typeof analyticsIntervalSchema>;

export const analyticsTimeRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    interval: analyticsIntervalSchema.default("day"),
  })
  .superRefine((timeRange, ctx) => {
    if (timeRange.from >= timeRange.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end of the analytics range must be after its start.",
      });
      return;
    }

    if (estimateBucketCount(timeRange) > 1_000) {
      ctx.addIssue({
        code: "custom",
        path: ["interval"],
        message: "The selected interval would return more than 1,000 timeline points.",
      });
    }
  });

export type AnalyticsTimeRange = z.infer<typeof analyticsTimeRangeSchema>;

export const getTranscriptionsQuerySchema = z.object({
  cursor: z.string().min(1).max(1_024).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type GetTranscriptionsQuery = z.infer<typeof getTranscriptionsQuerySchema>;

export const transcriptionParamsSchema = z.object({
  organisationId: z.uuid(),
  transcriptionId: z.uuid(),
});

export const removeTranscriptionsSchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(1_000)
    .transform((ids) => [...new Set(ids)]),
});

export type RemoveTranscriptionsInput = z.infer<typeof removeTranscriptionsSchema>;

export const transcriptionCursorPayloadSchema = z.object({
  createdAt: sourceTimestampSchema,
  id: z.uuid(),
});

export type TranscriptionCursorPayload = z.infer<typeof transcriptionCursorPayloadSchema>;

export type AnalyticsLanguageMode = "auto-detect" | "single-language" | "multiple-languages";

export type AnalyticsResponse = {
  totals: {
    transcriptionCount: number;
    usageMinutes: number;
    costUsd: number;
  };
  timeline: Array<{
    start: string;
    transcriptionCount: number;
    usageMinutes: number;
    costUsd: number;
    realtimeMinutes: number;
    asyncMinutes: number;
  }>;
  languages: {
    byLanguage: Array<{
      language: string;
      transcriptionCount: number;
    }>;
    byMode: Array<{
      mode: AnalyticsLanguageMode;
      transcriptionCount: number;
    }>;
  };
  models: Array<{
    model: string;
    transcriptionCount: number;
  }>;
  types: Array<{
    type: "realtime" | "async";
    transcriptionCount: number;
  }>;
};

function estimateBucketCount({
  from,
  to,
  interval,
}: {
  from: Date;
  to: Date;
  interval: AnalyticsInterval;
}): number {
  if (interval === "month") {
    return (
      (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1
    );
  }

  const millisecondsPerInterval = {
    hour: 60 * 60 * 1_000,
    day: 24 * 60 * 60 * 1_000,
    week: 7 * 24 * 60 * 60 * 1_000,
  }[interval];

  return Math.ceil((to.getTime() - from.getTime()) / millisecondsPerInterval) + 1;
}
