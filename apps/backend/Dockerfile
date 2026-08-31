# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS base
WORKDIR /app

FROM base AS pruner
COPY . .
RUN bunx turbo@2.10.8 prune @gladia-analytics/backend --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ ./
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./

FROM base AS runner
ENV NODE_ENV=production

COPY --from=installer --chown=bun:bun /app /app

USER bun
WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["bun", "run", "start"]
