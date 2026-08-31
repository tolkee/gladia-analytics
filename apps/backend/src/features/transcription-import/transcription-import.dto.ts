import * as z from "zod";

export const TRANSCRIPTION_IMPORT_CONTENT_TYPE = "application/json";

const transcriptionImportFilenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (filename) =>
      Array.from(filename).every((character) => {
        const codePoint = character.codePointAt(0);
        return codePoint !== undefined && codePoint >= 32 && codePoint !== 127;
      }),
    { message: "Filename must not contain control characters" },
  );

export const createTranscriptionImportQuerySchema = z.object({
  filename: transcriptionImportFilenameSchema,
});

export const createTranscriptionImportHeadersSchema = z.object({
  "content-type": z
    .string()
    .transform((contentType) => contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "")
    .pipe(z.literal(TRANSCRIPTION_IMPORT_CONTENT_TYPE)),
});

export type CreateTranscriptionImportInput = z.infer<typeof createTranscriptionImportQuerySchema>;

export const transcriptionImportParamsSchema = z.object({
  organisationId: z.uuid(),
  importId: z.uuid(),
});
