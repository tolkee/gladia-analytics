import * as z from "zod";

export const TRANSCRIPTION_UPLOAD_CONTENT_TYPE = "application/json";

const transcriptionUploadFilenameSchema = z
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

export const createTranscriptionUploadQuerySchema = z.object({
  filename: transcriptionUploadFilenameSchema,
});

export const createTranscriptionUploadHeadersSchema = z.object({
  "content-type": z
    .string()
    .transform((contentType) => contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "")
    .pipe(z.literal(TRANSCRIPTION_UPLOAD_CONTENT_TYPE)),
});

export type CreateTranscriptionUploadInput = z.infer<typeof createTranscriptionUploadQuerySchema>;

export const transcriptionUploadParamsSchema = z.object({
  organisationId: z.uuid(),
  uploadId: z.uuid(),
});
