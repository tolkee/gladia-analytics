import type { User } from "#features/auth";
import type { Organisation, OrganisationService } from "#features/organisation";
import type { Db } from "#lib/db";
import { decodePaginationCursor, encodePaginationCursor } from "#lib/pagination";
import { and, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import type {
  AnalyticsLanguageMode,
  AnalyticsTimeRange,
  TranscriptionsQuery,
  TranscriptionSource,
} from "./transcription.dto";
import { transcriptionCursorSchema } from "./transcription.dto";
import { TranscriptionNotFoundError } from "./errors";
import { ASYNC_HOURLY_RATE_USD, INSERT_CHUNK_SIZE, REALTIME_HOURLY_RATE_USD } from "./constants";
import {
  excluded,
  fillLanguageModes,
  fillTimeline,
  fillTypes,
  round,
  toNumber,
  toTranscriptionInsert,
} from "./utils";
import {
  stagedTranscriptionsTable,
  transcriptionsTable,
  type StagedTranscription,
  type Transcription,
} from "./transcription.schema";

const transcriptionConflictUpdateSet = {
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

export class TranscriptionService {
  constructor(
    private readonly db: Db,
    private readonly organisationService: OrganisationService,
  ) {}

  async getAnalytics(
    userId: User["id"],
    organisationId: Organisation["id"],
    timeRange: AnalyticsTimeRange,
  ) {
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
    query: TranscriptionsQuery,
  ) {
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
      .select({
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
      })
      .from(transcriptionsTable)
      .where(
        and(
          eq(transcriptionsTable.organisationId, organisationId),
          gte(transcriptionsTable.createdAt, query.from),
          lt(transcriptionsTable.createdAt, query.to),
          cursorFilter,
        ),
      )
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
  ) {
    await this.organisationService.isInOrganisation(userId, organisationId, "viewer");

    const [transcription] = await this.db
      .select({
        organisationId: transcriptionsTable.organisationId,
        id: transcriptionsTable.id,
        requestId: transcriptionsTable.requestId,
        version: transcriptionsTable.version,
        status: transcriptionsTable.status,
        createdAt: transcriptionsTable.createdAt,
        completedAt: transcriptionsTable.completedAt,
        customMetadata: transcriptionsTable.customMetadata,
        errorCode: transcriptionsTable.errorCode,
        kind: transcriptionsTable.kind,
        fileId: transcriptionsTable.fileId,
        fileName: transcriptionsTable.fileName,
        fileSource: transcriptionsTable.fileSource,
        fileAudioDuration: transcriptionsTable.fileAudioDuration,
        fileNumberOfChannels: transcriptionsTable.fileNumberOfChannels,
        model: transcriptionsTable.model,
        detectLanguage: transcriptionsTable.detectLanguage,
        languages: transcriptionsTable.languages,
        codeSwitching: transcriptionsTable.codeSwitching,
        resultAudioDuration: transcriptionsTable.resultAudioDuration,
        resultNumberOfDistinctChannels: transcriptionsTable.resultNumberOfDistinctChannels,
        resultBillingTime: transcriptionsTable.resultBillingTime,
        resultTranscriptionTime: transcriptionsTable.resultTranscriptionTime,
        billableSeconds: transcriptionsTable.billableSeconds,
      })
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

  async addStagedTranscriptions(
    uploadId: StagedTranscription["uploadId"],
    organisationId: Organisation["id"],
    items: TranscriptionSource[],
  ) {
    const transcriptionsById = new Map<
      Transcription["id"],
      typeof stagedTranscriptionsTable.$inferInsert
    >();

    for (const item of items) {
      const transcription = { uploadId, ...toTranscriptionInsert(organisationId, item) };
      const current = transcriptionsById.get(item.id);

      if (!current || current.version <= transcription.version) {
        transcriptionsById.set(item.id, transcription);
      }
    }

    const values = [...transcriptionsById.values()];

    if (values.length > 0) {
      await this.db.transaction(async (tx) => {
        for (let start = 0; start < values.length; start += INSERT_CHUNK_SIZE) {
          await tx
            .insert(stagedTranscriptionsTable)
            .values(values.slice(start, start + INSERT_CHUNK_SIZE))
            .onConflictDoUpdate({
              target: [
                stagedTranscriptionsTable.uploadId,
                stagedTranscriptionsTable.organisationId,
                stagedTranscriptionsTable.id,
              ],
              set: transcriptionConflictUpdateSet,
              setWhere: lte(stagedTranscriptionsTable.version, excluded("version")),
            });
        }
      });
    }
  }

  async removeStagedTranscriptions(
    uploadId: StagedTranscription["uploadId"],
    organisationId: Organisation["id"],
  ) {
    await this.db
      .delete(stagedTranscriptionsTable)
      .where(
        and(
          eq(stagedTranscriptionsTable.uploadId, uploadId),
          eq(stagedTranscriptionsTable.organisationId, organisationId),
        ),
      );
  }

  async mergeStagedTranscriptions(
    uploadId: StagedTranscription["uploadId"],
    organisationId: Organisation["id"],
  ) {
    return this.db.transaction(async (tx) => {
      const stagedTranscriptions = tx
        .select({
          organisationId: stagedTranscriptionsTable.organisationId,
          id: stagedTranscriptionsTable.id,
          requestId: stagedTranscriptionsTable.requestId,
          version: stagedTranscriptionsTable.version,
          status: stagedTranscriptionsTable.status,
          createdAt: stagedTranscriptionsTable.createdAt,
          completedAt: stagedTranscriptionsTable.completedAt,
          customMetadata: stagedTranscriptionsTable.customMetadata,
          errorCode: stagedTranscriptionsTable.errorCode,
          kind: stagedTranscriptionsTable.kind,
          fileId: stagedTranscriptionsTable.fileId,
          fileName: stagedTranscriptionsTable.fileName,
          fileSource: stagedTranscriptionsTable.fileSource,
          fileAudioDuration: stagedTranscriptionsTable.fileAudioDuration,
          fileNumberOfChannels: stagedTranscriptionsTable.fileNumberOfChannels,
          model: stagedTranscriptionsTable.model,
          detectLanguage: stagedTranscriptionsTable.detectLanguage,
          languages: stagedTranscriptionsTable.languages,
          codeSwitching: stagedTranscriptionsTable.codeSwitching,
          resultAudioDuration: stagedTranscriptionsTable.resultAudioDuration,
          resultNumberOfDistinctChannels: stagedTranscriptionsTable.resultNumberOfDistinctChannels,
          resultBillingTime: stagedTranscriptionsTable.resultBillingTime,
          resultTranscriptionTime: stagedTranscriptionsTable.resultTranscriptionTime,
          billableSeconds: stagedTranscriptionsTable.billableSeconds,
        })
        .from(stagedTranscriptionsTable)
        .where(
          and(
            eq(stagedTranscriptionsTable.uploadId, uploadId),
            eq(stagedTranscriptionsTable.organisationId, organisationId),
          ),
        );

      await tx
        .insert(transcriptionsTable)
        .select(stagedTranscriptions)
        .onConflictDoUpdate({
          target: [transcriptionsTable.organisationId, transcriptionsTable.id],
          set: transcriptionConflictUpdateSet,
          setWhere: lte(transcriptionsTable.version, excluded("version")),
        });

      await tx
        .delete(stagedTranscriptionsTable)
        .where(
          and(
            eq(stagedTranscriptionsTable.uploadId, uploadId),
            eq(stagedTranscriptionsTable.organisationId, organisationId),
          ),
        );
    });
  }
}
