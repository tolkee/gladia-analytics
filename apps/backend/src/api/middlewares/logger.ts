import { createMiddleware } from "hono/factory";
import { pino } from "pino";

const baseLogger = pino();

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  const requestId = c.var.requestId;

  const logger = baseLogger.child({ requestId });
  c.set("logger", logger);

  await next();

  const status = c.res.status;
  const payload = {
    method: c.req.method,
    path: c.req.path,
    duration: Date.now() - start,
    status,
  };

  if (status >= 500) logger.error(payload, "request completed");
  else if (status >= 400) logger.warn(payload, "request completed");
  else logger.info(payload, "request completed");
});
