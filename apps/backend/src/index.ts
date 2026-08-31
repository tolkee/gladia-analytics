import { createApi } from "./api";
import { createServices } from "#lib/services";
import { env } from "#lib/env";
import { db } from "#lib/db";

const services = createServices(db);
const api = createApi(services);

Bun.serve({
  port: env.PORT,
  fetch: api.fetch,
});
