import type { AuthUser, AuthSession } from "#features/auth";

export type ApiEnv = {
  Variables: {
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
