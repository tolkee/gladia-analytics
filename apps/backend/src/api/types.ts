import type { AuthUser, AuthSession } from "#features/auth";
import type { Logger } from "pino";

export type ApiEnv = {
  Variables: {
    logger: Logger;
    requestId: string;
    user: AuthUser | null;
    session: AuthSession | null;
  };
};

export type AuthedApiEnv = ApiEnv & {
  Variables: {
    user: AuthUser;
    session: AuthSession;
  };
};
