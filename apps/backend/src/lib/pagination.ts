import * as z from "zod";

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).max(1_024).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export type Paginated<TData> = {
  data: TData[];
  meta: {
    current: string | null;
    next: string | null;
  };
};

export class InvalidPaginationCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "InvalidPaginationCursorError";
  }
}

export function encodePaginationCursor<TPayload>(payload: TPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodePaginationCursor<TSchema extends z.ZodType>(
  cursor: string,
  schema: TSchema,
): z.infer<TSchema> {
  try {
    const payload: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const result = schema.safeParse(payload);

    if (!result.success) throw new InvalidPaginationCursorError();

    return result.data;
  } catch (error) {
    if (error instanceof InvalidPaginationCursorError) throw error;

    throw new InvalidPaginationCursorError();
  }
}
