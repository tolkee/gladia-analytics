import * as z from "zod";

/**
 * Parses the environment variables using the provided zod schema and returns the validated typed data.
 * @param envSchema - The zod schema to use for parsing.
 * @param env - The environment variables to parse.
 * @returns The parsed environment variables.
 *
 * @throws {Error} If the environment variables are invalid or missing.
 *
 */
export function parseEnv<Schema extends z.ZodObject>(
  envSchema: Schema,
  env: Readonly<Record<string, string | undefined>>,
): z.output<Schema> {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const tree = z.treeifyError(result.error);

    throw new Error(
      `Invalid or missing environment variables: ${Object.keys(tree.properties ?? {}).join(", ")}`,
    );
  }

  return result.data;
}
