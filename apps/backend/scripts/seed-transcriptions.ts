import { createHash } from "node:crypto";
import { db } from "#lib/db";
import { env } from "#lib/env";
import { organisationsTable } from "#schemas/organisation";
import { transcriptionsTable } from "#schemas/transcription";
import { and, eq, inArray } from "drizzle-orm";

const DEFAULT_COUNT = 180;
const MINIMUM_COUNT = 50;
const MAXIMUM_COUNT = 5_000;
const INSERT_CHUNK_SIZE = 500;
const DEFAULT_RANDOM_SEED = "gladia-analytics-dev-v1";
const UUID_NAMESPACE = "gladia-analytics-dev-transcription";

type TranscriptionInsert = typeof transcriptionsTable.$inferInsert;

type SeedOptions = {
  organisationId?: string;
  count: number;
  randomSeed: string;
  anchor: Date;
};

type Random = () => number;

type WeightedValue<T> = {
  value: T;
  weight: number;
};

const STATUS_VALUES = [
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "done",
  "error",
  "cancelled",
  "processing",
  "queued",
] as const;

const MODELS: WeightedValue<string>[] = [
  { value: "solaria-1", weight: 48 },
  { value: "solaria-1-mini", weight: 24 },
  { value: "whisper-large-v3", weight: 17 },
  { value: "enhanced-general", weight: 11 },
];

const LANGUAGE_SETS: WeightedValue<string[]>[] = [
  { value: [], weight: 22 },
  { value: ["en"], weight: 28 },
  { value: ["fr"], weight: 13 },
  { value: ["es"], weight: 8 },
  { value: ["de"], weight: 5 },
  { value: ["pt"], weight: 4 },
  { value: ["it"], weight: 3 },
  { value: ["ja"], weight: 2 },
  { value: ["en", "fr"], weight: 7 },
  { value: ["en", "es"], weight: 4 },
  { value: ["de", "en"], weight: 2 },
  { value: ["fr", "es", "pt"], weight: 2 },
];

const FILE_STEMS = [
  "customer-interview",
  "support-call",
  "weekly-team-sync",
  "product-demo",
  "research-session",
  "podcast-episode",
  "sales-discovery",
  "voice-note",
  "conference-keynote",
  "quarterly-business-review",
] as const;

const ERROR_CODES = [
  "audio_too_short",
  "invalid_audio",
  "processing_timeout",
  "unsupported_format",
  "internal_error",
] as const;

function printUsage() {
  console.log(`Seed varied development transcriptions.

Usage:
  bun run db:seed:transcriptions [options]

Options:
  --organisation-id <uuid>  Seed one organisation (defaults to every organisation)
  --count <number>          Rows per organisation (${MINIMUM_COUNT}-${MAXIMUM_COUNT}, default ${DEFAULT_COUNT})
  --seed <text>             Reproducible value variation (default ${DEFAULT_RANDOM_SEED})
  --anchor <ISO datetime>   Most recent point in the generated date range (default now)
  --help                    Show this help`);
}

function parseArguments(arguments_: string[]): SeedOptions {
  const options: SeedOptions = {
    count: DEFAULT_COUNT,
    randomSeed: DEFAULT_RANDOM_SEED,
    anchor: new Date(),
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--help") {
      printUsage();
      process.exit(0);
    }

    const [name, inlineValue] = argument?.split("=", 2) ?? [];
    const value = inlineValue ?? arguments_[index + 1];

    if (!name?.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    if (!inlineValue) index += 1;
    if (!value) throw new Error(`Missing value for ${name}`);

    if (name === "--organisation-id") options.organisationId = value;
    else if (name === "--count") options.count = Number(value);
    else if (name === "--seed") options.randomSeed = value;
    else if (name === "--anchor") options.anchor = new Date(value);
    else throw new Error(`Unknown option: ${name}`);
  }

  if (!Number.isInteger(options.count) || options.count < MINIMUM_COUNT) {
    throw new Error(`--count must be an integer of at least ${MINIMUM_COUNT}`);
  }

  if (options.count > MAXIMUM_COUNT) {
    throw new Error(`--count cannot exceed ${MAXIMUM_COUNT}`);
  }

  if (Number.isNaN(options.anchor.getTime())) {
    throw new Error("--anchor must be a valid ISO datetime");
  }

  return options;
}

function createRandom(randomSeed: string): Random {
  let state = Number.parseInt(
    createHash("sha256").update(randomSeed).digest("hex").slice(0, 8),
    16,
  );

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function deterministicUuid(value: string): string {
  const hash = createHash("sha256").update(value).digest("hex");
  const variant = ((Number.parseInt(hash[16] ?? "0", 16) & 0x3) | 0x8).toString(16);

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function pick<T>(random: Random, values: readonly T[]): T {
  const value = values[Math.floor(random() * values.length)];
  if (value === undefined) throw new Error("Cannot pick from an empty collection");
  return value;
}

function pickWeighted<T>(random: Random, values: WeightedValue<T>[]): T {
  const totalWeight = values.reduce((total, item) => total + item.weight, 0);
  let position = random() * totalWeight;

  for (const item of values) {
    position -= item.weight;
    if (position < 0) return item.value;
  }

  const fallback = values.at(-1);
  if (!fallback) throw new Error("Cannot pick from an empty collection");
  return fallback.value;
}

function randomBetween(random: Random, minimum: number, maximum: number): number {
  return minimum + random() * (maximum - minimum);
}

function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function getAgeMilliseconds(index: number, count: number, random: Random): number {
  const recentCount = Math.floor(count * 0.4);
  const mediumCount = Math.floor(count * 0.4);
  const hour = 60 * 60 * 1_000;
  const day = 24 * hour;

  if (index < recentCount) {
    return (index * (72 / recentCount) + randomBetween(random, 0.05, 0.85)) * hour;
  }

  if (index < recentCount + mediumCount) {
    const position = (index - recentCount) / mediumCount;
    return (3 + position * 87 + randomBetween(random, 0, 1)) * day;
  }

  const olderCount = count - recentCount - mediumCount;
  const position = (index - recentCount - mediumCount) / olderCount;
  return (91 + position * 274 + randomBetween(random, 0, 2)) * day;
}

function getAudioDuration(random: Random, kind: "live" | "pre-recorded"): number {
  const durationBand = random();

  if (durationBand < 0.55) return round(randomBetween(random, 4, 120));
  if (durationBand < 0.88) return round(randomBetween(random, 120, 1_200));
  return round(randomBetween(random, kind === "live" ? 1_200 : 1_800, 7_200));
}

function createRows(
  organisationId: string,
  count: number,
  randomSeed: string,
  anchor: Date,
): TranscriptionInsert[] {
  const random = createRandom(`${randomSeed}:${organisationId}`);

  return Array.from({ length: count }, (_, index) => {
    const id = deterministicUuid(`${UUID_NAMESPACE}:${organisationId}:${index}`);
    const kind = random() < 0.44 ? "live" : "pre-recorded";
    const status = STATUS_VALUES[index % STATUS_VALUES.length] ?? "done";
    const languages = [...pickWeighted(random, LANGUAGE_SETS)];
    const model = pickWeighted(random, MODELS);
    const audioDuration = getAudioDuration(random, kind);
    const createdAt = new Date(anchor.getTime() - getAgeMilliseconds(index, count, random));
    const isDone = status === "done";
    const isTerminal = isDone || status === "error" || status === "cancelled";
    const processingSeconds =
      kind === "live"
        ? audioDuration + randomBetween(random, 1, 45)
        : Math.max(1.5, audioDuration * randomBetween(random, 0.08, 0.72));
    const completedAt = isTerminal
      ? new Date(createdAt.getTime() + processingSeconds * 1_000)
      : null;
    const hasFile = random() > 0.04;
    const numberOfChannels = random() < 0.72 ? 1 : 2;
    const extension = kind === "live" ? "wav" : pick(random, ["mp3", "m4a", "wav", "flac"]);
    const fileStem = pick(random, FILE_STEMS);
    const billingTime = isDone
      ? kind === "live"
        ? Math.ceil(audioDuration)
        : audioDuration
      : status === "error"
        ? round(Math.min(audioDuration, randomBetween(random, 0, 18)))
        : 0;
    const errorCode =
      status === "error"
        ? pick(random, ERROR_CODES)
        : status === "cancelled"
          ? "cancelled_by_user"
          : null;

    return {
      organisationId,
      id,
      requestId: `G-${id.slice(0, 8).toUpperCase()}`,
      version: random() < 0.82 ? 2 : random() < 0.7 ? 1 : 3,
      status,
      createdAt,
      completedAt,
      customMetadata:
        random() < 0.34
          ? null
          : {
              environment: pick(random, ["development", "staging", "sandbox"]),
              team: pick(random, ["support", "sales", "research", "product"]),
              source: "dev-transcription-seed",
            },
      errorCode,
      kind,
      fileId: hasFile
        ? deterministicUuid(`${UUID_NAMESPACE}:file:${organisationId}:${index}`)
        : null,
      fileName: hasFile ? `${fileStem}-${String(index + 1).padStart(3, "0")}.${extension}` : null,
      fileSource: hasFile && random() < 0.3 ? pick(random, ["upload", "api", "s3"]) : null,
      fileAudioDuration: hasFile ? audioDuration : null,
      fileNumberOfChannels: hasFile ? numberOfChannels : null,
      model,
      detectLanguage: languages.length === 0 ? true : random() < 0.18,
      languages,
      codeSwitching: languages.length > 1 || random() < 0.2,
      resultAudioDuration: isDone ? audioDuration : null,
      resultNumberOfDistinctChannels: isDone
        ? numberOfChannels === 2 && random() < 0.22
          ? 1
          : numberOfChannels
        : null,
      resultBillingTime: isDone ? billingTime : null,
      resultTranscriptionTime: isDone ? round(processingSeconds) : null,
      billableSeconds: billingTime,
    };
  });
}

function summarise(rows: TranscriptionInsert[]) {
  const countBy = <T extends string>(getValue: (row: TranscriptionInsert) => T) =>
    Object.fromEntries(
      [...new Set(rows.map(getValue))].map((value) => [
        value,
        rows.filter((row) => getValue(row) === value).length,
      ]),
    );

  return {
    statuses: countBy((row) => row.status),
    kinds: countBy((row) => row.kind),
    models: countBy((row) => row.model),
    languageModes: countBy((row) =>
      row.languages.length === 0
        ? "auto-detect"
        : row.languages.length === 1
          ? "single-language"
          : "multiple-languages",
    ),
  };
}

async function runSeed() {
  const options = parseArguments(process.argv.slice(2));

  if (env.ENV !== "dev") {
    throw new Error("Transcription seeding is restricted to ENV=dev");
  }

  const organisations = await db
    .select({ id: organisationsTable.id, name: organisationsTable.name })
    .from(organisationsTable)
    .where(options.organisationId ? eq(organisationsTable.id, options.organisationId) : undefined);

  if (organisations.length === 0) {
    throw new Error(
      options.organisationId
        ? `Organisation ${options.organisationId} does not exist`
        : "No organisations exist. Create an organisation before running this seed.",
    );
  }

  for (const organisation of organisations) {
    const rows = createRows(organisation.id, options.count, options.randomSeed, options.anchor);

    await db.transaction(async (transaction) => {
      for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(start, start + INSERT_CHUNK_SIZE);
        const ids = chunk.map((row) => row.id);

        await transaction
          .delete(transcriptionsTable)
          .where(
            and(
              eq(transcriptionsTable.organisationId, organisation.id),
              inArray(transcriptionsTable.id, ids),
            ),
          );
        await transaction.insert(transcriptionsTable).values(chunk);
      }
    });

    const oldestCreatedAt = rows.reduce(
      (oldest, row) => (row.createdAt < oldest ? row.createdAt : oldest),
      rows[0]?.createdAt ?? options.anchor,
    );
    const newestCreatedAt = rows.reduce(
      (newest, row) => (row.createdAt > newest ? row.createdAt : newest),
      rows[0]?.createdAt ?? options.anchor,
    );

    console.log(
      JSON.stringify(
        {
          organisation: organisation.name,
          organisationId: organisation.id,
          seededRows: rows.length,
          dateRange: {
            from: oldestCreatedAt.toISOString(),
            to: newestCreatedAt.toISOString(),
          },
          ...summarise(rows),
        },
        null,
        2,
      ),
    );
  }
}

await runSeed();
