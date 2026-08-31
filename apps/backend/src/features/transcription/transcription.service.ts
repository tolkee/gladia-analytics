import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { Db } from "#lib/db";
import {
  decodePaginationCursor,
  encodePaginationCursor,
  type CursorPaginationQuery,
  type Paginated,
} from "#lib/pagination";
import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import * as z from "zod";
import type {
  AnalyticsLanguageMode,
  AnalyticsResponse,
  AnalyticsTimeRange,
  CreateTranscriptionsInput,
  RemoveTranscriptionsInput,
} from "./transcription.dto";
import { TranscriptionNotFoundError } from "./errors";
import {
  ASYNC_HOURLY_RATE_USD,
  fillLanguageModes,
  fillTimeline,
  fillTypes,
  INSERT_CHUNK_SIZE,
  REALTIME_HOURLY_RATE_USD,
  round,
  toNumber,
  toTranscriptionInsert,
  transcriptionListSelection,
  transcriptionUpsertSet,
} from "./transcription.helpers";
import { transcriptionsTable, type Transcription } from "./transcription.schema";

const transcriptionCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

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
    query: CursorPaginationQuery,
  ): Promise<Paginated<TranscriptionListItem>> {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const cursor = query.cursor
      ? decodePaginationCursor(query.cursor, transcriptionCursorSchema)
      : null;
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
            ? encodePaginationCursor({
                createdAt: lastItem.createdAt.toISOString(),
                id: lastItem.id,
              })
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
