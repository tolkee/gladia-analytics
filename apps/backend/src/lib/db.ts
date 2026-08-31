import { drizzle } from "drizzle-orm/bun-sql";
import { env } from "./env";

const client = new Bun.SQL({
  url: env.DATABASE_URL,
});

export const db = drizzle({ client });
export type Db = typeof db;
