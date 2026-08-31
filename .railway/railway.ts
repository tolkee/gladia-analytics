import { defineRailway, github, group, postgres, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const production = ctx.environment === "production";
  const database = postgres("Postgres");

  const backend = service("backend", {
    source: github("tolkee/gladia-analytics", { branch: "main", checkSuites: true }),
    build: {
      watchPatterns: [
        "/apps/backend/**",
        "/packages/common/**",
        "/packages/ts-config/**",
        "/package.json",
        "/bun.lock",
        "/turbo.json",
      ],
    },
    deploy: {
      startCommand: "cd apps/backend && bun run start",
      preDeployCommand: ["cd apps/backend && bun run db:migrate"],
      healthcheckPath: "/api/health",
      healthcheckTimeout: 30,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
    },
    domains: production ? [{ domain: "api.gladia-analytics.tolkee.dev", port: 3000 }] : [],
    env: {
      ENV: "prod",
      PORT: "3000",
      DATABASE_URL: database.env.DATABASE_URL,
      BETTER_AUTH_URL: "https://api.gladia-analytics.tolkee.dev",
      TRUSTED_ORIGINS: "https://gladia-analytics.tolkee.dev",
      AUTH_DOMAIN: ".gladia-analytics.tolkee.dev",
      BETTER_AUTH_SECRET: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
    },
  });

  return project("gladia-analytics", {
    resources: [group("Backend", [backend, database])],
  });
});
