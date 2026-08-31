import { parseEnv } from "@gladia-analytics/common/env";
import { filterOutNullish } from "@gladia-analytics/common/utils";
import * as z from "zod";

const envSchema = z.object({
  ENV: z.enum(["dev", "prod"]),
  PORT: z.coerce.number().int().positive().optional().default(3001),
  DATABASE_URL: z.url(),
  TRUSTED_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      filterOutNullish(
        value.split(",").map((item) => item.trim()),
        { outEmptyStrings: true },
      ),
    )
    .pipe(z.array(z.string()).min(1)),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  AUTH_DOMAIN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});
export type Env = z.infer<typeof envSchema>;

export const env = parseEnv(envSchema, process.env);
