import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { Db } from "#lib/db";
import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import type {
  AnalyticsInterval,
  AnalyticsLanguageMode,
  AnalyticsResponse,
  AnalyticsTimeRange,
  CreateTranscriptionsInput,
  GetTranscriptionsQuery,
  RemoveTranscriptionsInput,
  TranscriptionCursorPayload,
  TranscriptionSource,
} from "./transcription.dto";
import { transcriptionCursorPayloadSchema } from "./transcription.dto";
import { InvalidTranscriptionCursorError, TranscriptionNotFoundError } from "./errors";
import { transcriptionsTable, type Transcription } from "./transcription.schema";

const REALTIME_HOURLY_RATE_USD = 0.2;
const ASYNC_HOURLY_RATE_USD = 0.12;
const INSERT_CHUNK_SIZE = 500;

const transcriptionListSelection = {
  id: transcriptionsTable.id,
  requestId: transcriptionsTable.requestId,
  version: transcriptionsTable.version,
  status: transcriptionsTable.status,
  createdAt: transcriptionsTable.createdAt,
  completedAt: transcriptionsTable.completedAt,
  errorCode: transcriptionsTable.errorCode,
  kind: transcriptionsTable.kind,
  fileName: transcriptionsTable.fileName,
  fileAudioDuration: transcriptionsTable.fileAudioDuration,
  model: transcriptionsTable.model,
  languages: transcriptionsTable.languages,
  billableSeconds: transcriptionsTable.billableSeconds,
};

export type TranscriptionListItem = Pick<
  Transcription,
  | "id"
  | "requestId"
  | "version"
  | "status"
  | "createdAt"
  | "completedAt"
  | "errorCode"
  | "kind"
  | "fileName"
  | "fileAudioDuration"
  | "model"
  | "languages"
  | "billableSeconds"
>;

export type PaginatedTranscriptions = {
  data: TranscriptionListItem[];
  meta: {
    current: string | null;
    next: string | null;
  };
};

export type CreateTranscriptionsResult = {
  receivedCount: number;
  upsertedCount: number;
};

export class TranscriptionService {
  constructor(
    private readonly db: Db,
    private readonly organisationService: OrganisationService,
  ) {}

  async getAnalytics(
    userId: User["id"],
    organisationId: Organisation["id"],
    timeRange: AnalyticsTimeRange,
  ): Promise<AnalyticsResponse> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const rangeFilter = and(
      eq(transcriptionsTable.organisationId, organisationId),
      gte(transcriptionsTable.createdAt, timeRange.from),
      lt(transcriptionsTable.createdAt, timeRange.to),
    );
    const costExpression = sql<number>`
      coalesce(
        sum(
          ${transcriptionsTable.billableSeconds}
          * case
              when ${transcriptionsTable.kind} = 'live' then ${REALTIME_HOURLY_RATE_USD}
              else ${ASYNC_HOURLY_RATE_USD}
            end
          / 3600.0
        ),
        0
      )::double precision
    `;

    return this.db.transaction(
      async (tx) => {
        const [totalsRow] = await tx
          .select({
            transcriptionCount: sql<number>`count(*)::int`,
            usageMinutes: sql<number>`(
              coalesce(sum(${transcriptionsTable.billableSeconds}), 0) / 60.0
            )::double precision`,
            costUsd: costExpression,
          })
          .from(transcriptionsTable)
          .where(rangeFilter);

        const intervalSql = sql.raw(`'${timeRange.interval}'`);
        const bucketStartMsExpression = sql<number>`(
          extract(
            epoch from date_trunc(
              ${intervalSql},
              timezone('UTC', ${transcriptionsTable.createdAt})
            )
          ) * 1000
        )::double precision`;
        const timelineRows = await tx
          .select({
            bucketStartMs: bucketStartMsExpression,
            transcriptionCount: sql<number>`count(*)::int`,
            usageMinutes: sql<number>`(
              coalesce(sum(${transcriptionsTable.billableSeconds}), 0) / 60.0
            )::double precision`,
            costUsd: costExpression,
            realtimeMinutes: sql<number>`(
              coalesce(
                sum(${transcriptionsTable.billableSeconds})
                  filter (where ${transcriptionsTable.kind} = 'live'),
                0
              ) / 60.0
            )::double precision`,
            asyncMinutes: sql<number>`(
              coalesce(
                sum(${transcriptionsTable.billableSeconds})
                  filter (where ${transcriptionsTable.kind} = 'pre-recorded'),
                0
              ) / 60.0
            )::double precision`,
          })
          .from(transcriptionsTable)
          .where(rangeFilter)
          .groupBy(bucketStartMsExpression)
          .orderBy(bucketStartMsExpression);

        const languageRows = await tx.execute<{
          language: string;
          transcriptionCount: number;
        }>(sql`
          select
            language_values.language as "language",
            count(*)::int as "transcriptionCount"
          from ${transcriptionsTable}
          cross join lateral unnest(${transcriptionsTable.languages})
            as language_values(language)
          where
            ${transcriptionsTable.organisationId} = ${organisationId}
            and ${transcriptionsTable.createdAt} >= ${timeRange.from}
            and ${transcriptionsTable.createdAt} < ${timeRange.to}
          group by language_values.language
          order by "transcriptionCount" desc, "language" asc
        `);

        const languageModeExpression = sql<AnalyticsLanguageMode>`case
          when cardinality(${transcriptionsTable.languages}) = 0 then 'auto-detect'
          when cardinality(${transcriptionsTable.languages}) = 1 then 'single-language'
          else 'multiple-languages'
        end`;
        const languageModeRows = await tx
          .select({
            mode: languageModeExpression,
            transcriptionCount: sql<number>`count(*)::int`,
          })
          .from(transcriptionsTable)
          .where(rangeFilter)
          .groupBy(languageModeExpression);

        const modelRows = await tx
          .select({
            model: transcriptionsTable.model,
            transcriptionCount: sql<number>`count(*)::int`,
          })
          .from(transcriptionsTable)
          .where(rangeFilter)
          .groupBy(transcriptionsTable.model)
          .orderBy(desc(sql`count(*)`), transcriptionsTable.model);

        const typeExpression = sql<"realtime" | "async">`case
          when ${transcriptionsTable.kind} = 'live' then 'realtime'
          else 'async'
        end`;
        const typeRows = await tx
          .select({
            type: typeExpression,
            transcriptionCount: sql<number>`count(*)::int`,
          })
          .from(transcriptionsTable)
          .where(rangeFilter)
          .groupBy(typeExpression);

        return {
          totals: {
            transcriptionCount: toNumber(totalsRow?.transcriptionCount),
            usageMinutes: round(toNumber(totalsRow?.usageMinutes)),
            costUsd: round(toNumber(totalsRow?.costUsd)),
          },
          timeline: fillTimeline(timeRange, timelineRows),
          languages: {
            byLanguage: languageRows.map((row) => ({
              language: row.language,
              transcriptionCount: toNumber(row.transcriptionCount),
            })),
            byMode: fillLanguageModes(languageModeRows),
          },
          models: modelRows.map((row) => ({
            model: row.model,
            transcriptionCount: toNumber(row.transcriptionCount),
          })),
          types: fillTypes(typeRows),
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  }

  async getTranscriptions(
    userId: User["id"],
    organisationId: Organisation["id"],
    query: GetTranscriptionsQuery,
  ): Promise<PaginatedTranscriptions> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorFilter = cursor
      ? or(
          lt(transcriptionsTable.createdAt, new Date(cursor.createdAt)),
          and(
            eq(transcriptionsTable.createdAt, new Date(cursor.createdAt)),
            lt(transcriptionsTable.id, cursor.id),
          ),
        )
      : undefined;

    const rows = await this.db
      .select(transcriptionListSelection)
      .from(transcriptionsTable)
      .where(and(eq(transcriptionsTable.organisationId, organisationId), cursorFilter))
      .orderBy(desc(transcriptionsTable.createdAt), desc(transcriptionsTable.id))
      .limit(query.limit + 1);

    const hasNextPage = rows.length > query.limit;
    const data = hasNextPage ? rows.slice(0, query.limit) : rows;
    const lastItem = data.at(-1);

    return {
      data,
      meta: {
        current: query.cursor ?? null,
        next:
          hasNextPage && lastItem
            ? encodeCursor({ createdAt: lastItem.createdAt.toISOString(), id: lastItem.id })
            : null,
      },
    };
  }

  async getTranscription(
    userId: User["id"],
    organisationId: Organisation["id"],
    transcriptionId: Transcription["id"],
  ): Promise<Transcription> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const [transcription] = await this.db
      .select()
      .from(transcriptionsTable)
      .where(
        and(
          eq(transcriptionsTable.organisationId, organisationId),
          eq(transcriptionsTable.id, transcriptionId),
        ),
      )
      .limit(1);

    if (!transcription) {
      throw new TranscriptionNotFoundError();
    }

    return transcription;
  }

  async createTranscriptions(
    userId: User["id"],
    organisationId: Organisation["id"],
    input: CreateTranscriptionsInput,
  ): Promise<CreateTranscriptionsResult> {
    await this.organisationService.isInOrganisation(userId, organisationId, "admin");

    const transcriptionsById = new Map(
      input.items.map((item) => [item.id, toTranscriptionInsert(organisationId, item)]),
    );
    const values = [...transcriptionsById.values()];

    if (values.length > 0) {
      await this.db.transaction(async (tx) => {
        for (let start = 0; start < values.length; start += INSERT_CHUNK_SIZE) {
          await tx
            .insert(transcriptionsTable)
            .values(values.slice(start, start + INSERT_CHUNK_SIZE))
            .onConflictDoUpdate({
              target: [transcriptionsTable.organisationId, transcriptionsTable.id],
              set: transcriptionUpsertSet,
            });
        }
      });
    }

    return {
      receivedCount: input.items.length,
      upsertedCount: values.length,
    };
  }

  async removeTranscriptions(
    userId: User["id"],
    organisationId: Organisation["id"],
    input: RemoveTranscriptionsInput,
  ): Promise<number> {
    await this.organisationService.isInOrganisation(userId, organisationId, "admin");

    if (input.ids.length === 0) return 0;

    const removed = await this.db
      .delete(transcriptionsTable)
      .where(
        and(
          eq(transcriptionsTable.organisationId, organisationId),
          inArray(transcriptionsTable.id, input.ids),
        ),
      )
      .returning({ id: transcriptionsTable.id });

    return removed.length;
  }
}

const transcriptionUpsertSet = {
  requestId: excluded("request_id"),
  version: excluded("version"),
  status: excluded("status"),
  createdAt: excluded("created_at"),
  completedAt: excluded("completed_at"),
  customMetadata: excluded("custom_metadata"),
  errorCode: excluded("error_code"),
  kind: excluded("kind"),
  fileId: excluded("file_id"),
  fileName: excluded("file_name"),
  fileSource: excluded("file_source"),
  fileAudioDuration: excluded("file_audio_duration"),
  fileNumberOfChannels: excluded("file_number_of_channels"),
  model: excluded("model"),
  detectLanguage: excluded("detect_language"),
  languages: excluded("languages"),
  codeSwitching: excluded("code_switching"),
  resultAudioDuration: excluded("result_audio_duration"),
  resultNumberOfDistinctChannels: excluded("result_number_of_distinct_channels"),
  resultBillingTime: excluded("result_billing_time"),
  resultTranscriptionTime: excluded("result_transcription_time"),
  billableSeconds: excluded("billable_seconds"),
};

function excluded(columnName: string) {
  return sql.raw(`excluded."${columnName}"`);
}

export function toTranscriptionInsert(
  organisationId: Organisation["id"],
  source: TranscriptionSource,
): typeof transcriptionsTable.$inferInsert {
  const file = source.file;
  const result = source.result?.metadata;

  return {
    organisationId,
    id: source.id,
    requestId: source.request_id,
    version: source.version,
    status: source.status,
    createdAt: new Date(source.created_at),
    completedAt: source.completed_at ? new Date(source.completed_at) : null,
    customMetadata: source.custom_metadata,
    errorCode: source.error_code,
    kind: source.kind,
    fileId: file?.id ?? null,
    fileName: file?.filename ?? null,
    fileSource: file?.source ?? null,
    fileAudioDuration: file?.audio_duration ?? null,
    fileNumberOfChannels: file?.number_of_channels ?? null,
    model: source.request_params.model,
    detectLanguage: source.request_params.detect_language ?? null,
    languages: source.request_params.language_config.languages,
    codeSwitching: source.request_params.language_config.code_switching,
    resultAudioDuration: result?.audio_duration ?? null,
    resultNumberOfDistinctChannels: result?.number_of_distinct_channels ?? null,
    resultBillingTime: result?.billing_time ?? null,
    resultTranscriptionTime: result?.transcription_time ?? null,
    billableSeconds: result?.billing_time ?? result?.audio_duration ?? file?.audio_duration ?? 0,
  };
}

export function encodeCursor(payload: TranscriptionCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): TranscriptionCursorPayload {
  try {
    const payload: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const result = transcriptionCursorPayloadSchema.safeParse(payload);

    if (!result.success) throw new InvalidTranscriptionCursorError();

    return result.data;
  } catch (error) {
    if (error instanceof InvalidTranscriptionCursorError) throw error;

    throw new InvalidTranscriptionCursorError();
  }
}

type TimelineAggregateRow = {
  bucketStartMs: number;
  transcriptionCount: number;
  usageMinutes: number;
  costUsd: number;
  realtimeMinutes: number;
  asyncMinutes: number;
};

export function fillTimeline(
  timeRange: AnalyticsTimeRange,
  rows: TimelineAggregateRow[],
): AnalyticsResponse["timeline"] {
  const rowsByStart = new Map(
    rows.map((row) => [new Date(toNumber(row.bucketStartMs)).toISOString(), row]),
  );
  const timeline: AnalyticsResponse["timeline"] = [];

  for (
    let bucketStart = floorToInterval(timeRange.from, timeRange.interval);
    bucketStart < timeRange.to;
    bucketStart = incrementInterval(bucketStart, timeRange.interval)
  ) {
    const start = bucketStart.toISOString();
    const row = rowsByStart.get(start);

    timeline.push({
      start,
      transcriptionCount: toNumber(row?.transcriptionCount),
      usageMinutes: round(toNumber(row?.usageMinutes)),
      costUsd: round(toNumber(row?.costUsd)),
      realtimeMinutes: round(toNumber(row?.realtimeMinutes)),
      asyncMinutes: round(toNumber(row?.asyncMinutes)),
    });
  }

  return timeline;
}

function fillLanguageModes(
  rows: Array<{ mode: AnalyticsLanguageMode; transcriptionCount: number }>,
): AnalyticsResponse["languages"]["byMode"] {
  const counts = new Map(rows.map((row) => [row.mode, toNumber(row.transcriptionCount)]));

  return (["auto-detect", "single-language", "multiple-languages"] as const).map((mode) => ({
    mode,
    transcriptionCount: counts.get(mode) ?? 0,
  }));
}

function fillTypes(
  rows: Array<{ type: "realtime" | "async"; transcriptionCount: number }>,
): AnalyticsResponse["types"] {
  const counts = new Map(rows.map((row) => [row.type, toNumber(row.transcriptionCount)]));

  return (["realtime", "async"] as const).map((type) => ({
    type,
    transcriptionCount: counts.get(type) ?? 0,
  }));
}

function floorToInterval(date: Date, interval: AnalyticsInterval): Date {
  const result = new Date(date);
  result.setUTCMinutes(0, 0, 0);

  if (interval === "hour") return result;

  result.setUTCHours(0, 0, 0, 0);

  if (interval === "day") return result;

  if (interval === "week") {
    const daysSinceMonday = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - daysSinceMonday);
    return result;
  }

  result.setUTCDate(1);
  return result;
}

function incrementInterval(date: Date, interval: AnalyticsInterval): Date {
  const result = new Date(date);

  if (interval === "hour") result.setUTCHours(result.getUTCHours() + 1);
  if (interval === "day") result.setUTCDate(result.getUTCDate() + 1);
  if (interval === "week") result.setUTCDate(result.getUTCDate() + 7);
  if (interval === "month") result.setUTCMonth(result.getUTCMonth() + 1);

  return result;
}

function toNumber(value: number | string | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}
