import {
  bucket,
  defineRailway,
  github,
  group,
  postgres,
  preserve,
  project,
  ref,
  service,
} from "railway/iac";

export default defineRailway((ctx) => {
  const production = ctx.environment === "production";
  const database = postgres("Postgres");
  const uploadsBucket = bucket("transcription-uploads", { region: "ams" });

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
      S3_ENDPOINT: ref(uploadsBucket, "ENDPOINT"),
      S3_REGION: ref(uploadsBucket, "REGION"),
      S3_BUCKET: ref(uploadsBucket, "BUCKET"),
      S3_ACCESS_KEY_ID: ref(uploadsBucket, "ACCESS_KEY_ID"),
      S3_SECRET_ACCESS_KEY: ref(uploadsBucket, "SECRET_ACCESS_KEY"),
    },
  });

  return project("gladia-analytics", {
    resources: [group("Backend", [backend, database, uploadsBucket])],
  });
});
