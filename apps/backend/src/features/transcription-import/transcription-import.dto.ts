import * as z from "zod";

export const MAX_TRANSCRIPTION_IMPORT_SIZE_BYTES = 25 * 1024 * 1024;
export const TRANSCRIPTION_IMPORT_CONTENT_TYPE = "application/json";

export const createTranscriptionImportSchema = z.object({
  filename: z
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
    ),
  contentType: z.literal(TRANSCRIPTION_IMPORT_CONTENT_TYPE),
  sizeBytes: z.number().int().positive().max(MAX_TRANSCRIPTION_IMPORT_SIZE_BYTES),
});

export type CreateTranscriptionImportInput = z.infer<typeof createTranscriptionImportSchema>;

export const transcriptionImportParamsSchema = z.object({
  organisationId: z.uuid(),
  importId: z.uuid(),
});
