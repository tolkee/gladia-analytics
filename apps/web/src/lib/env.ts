import { parseEnv } from "@gladia-analytics/common/env";
import * as z from "zod";

const publicEnvSchema = z.object({
  VITE_API_URL: z.url(),
});
export const publicEnv = parseEnv(publicEnvSchema, import.meta.env);
