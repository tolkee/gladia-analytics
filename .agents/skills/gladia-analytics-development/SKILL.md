---
name: gladia-analytics-development
description: Develop and maintain the Gladia Analytics monorepo, including its shared TypeScript conventions and the backend or web application architecture. Use for any code task in this repository.
---

# gladia-analytics

This is the TypeScript monorepo for the Gladia analytics case-study application:

- Monorepo capabilities are done using [Turborepo](https://turborepo.dev/).
- We use [Bun](https://bun.com/) as the runtime and package manager, and use native tsc for type checking (v7 using tsgo).
- We use [Oxc suite](https://oxc.rs/) for formating (Oxfmt) and linting (Oxlint).

The monorepo is split into few main folder following Turborepo conventions:

- `apps/`:
  - [backend/](./apps/backend/): contains the backend application code
  - [web/](./apps/web/): contains the Vite SPA frontend
- `packages/`:
  - [common/](./packages/common/): common utility code
  - [ui/](./packages/ui/): common ui components
  - [ts-config/](./packages/ts-config/): shared tsconfig configuration

Each folder has its own README.md file with more details on their implementation.

## Barrel files

We only use barrel files in one case, features/services architecture.

In that architecture, each feature has its own folder,and an `index.ts` barrel file exporting all the feature's non-internal code. (Be careful, we should not just expose everything, but think to what the feature needs to expose to the outside world)

```ts
// src/features/todo/index.ts
export { TodoService } from "./todo.service.ts";
export type { Todo } from "./todo.schema.ts";
export * from "./todo.dto.ts";
export * from "./errors.ts";
```

## Path aliases

We do not use path aliases from the `tsconfig.json` in this repo.
We use import aliases in `package.json`:

```json
  "imports": {
    "#features/*": "./src/features/*/index.ts",
    "#lib/*": "./src/lib/*.ts"
  }
```

```ts
import { env } from "#lib/env";
import { db } from "#lib/db";

import { TodoService, type Todo, TodoNotFoundError } from "#features/todo";
```

We use two pattern for import aliases:

- `<alias> :"./src/<path>/*/index.ts"`: this mean using this alias, you will only be able to import what is exposed in the index file and not from all individual files. A good example of usage is features/services type architecture, where from outside of the current feature/service folder, you only want to able what is exposed in the index file and not from all individual files of the feature/service. It allows to hide the internal implementation and only expose what is needed outside.
- `<alias>: "./src/<path>/*/*.ts"`: this mean using this alias, you will be able to import any individual files that from this path. (basically, this is the default way to use aliases when not in features/services architecture folder)

One of the main justification of using `package.json` imports alias over `tsconfig.json` aliases is that they are native for any node project and does not require any additional configuration/setup like tsconfig ones needs.

## Using packages in the monorepo

To use a package, add the dependcy to the `package.json` on the project your want to use it:

```json
{
  "dependencies": {
    "@gladia-analytics/common": "workspace:*"
  }
}
```

and just import it like any other package:

```ts
import {} from "@gladia-analytics/common";
```

## Quality tools

As mention above, we are using the [Oxc suite](https://oxc.rs/) for formatting and linting. The twick is that we dont use them as turborepo projects tasks but as root level tasks. This due to the unbelievable performace of oxc. They are running so fast that it doesn't make sense to run them by projects.

We have a set of script at the root `package.json` that you can use to run the quality tools:

```bash
bun run format # check the code formatting
bun run format:fix # fix the code formatting
bun run lint # check the code linting
bun run lint:fix # fix the code linting
bun run quality # check the code quality
bun run quality:fix # fix the code quality
```

## Schema validation

Across the monorepo, all projects use [Zod](https://zod.dev/) for schema validation. We use zod inference to generate types from the schema definitions to not maintain manually the corresponding type.

```ts
import * as z from "zod";

const schema = z.object({});
type Schema = z.infer<typeof schema>;
```

## Env parsing

Each apps should not use directly the `process.env` object to access environment variables as it's not type-safe. Instead, each have a `lib/env.ts` file that exports a `env` object with the environment variables parsed and validated, using `parseEnv` from `@gladia-analytics/common`.

```ts
// lib/env.ts
import { parseEnv } from "@gladia-analytics/common/env";
import * as z from "zod";

const envSchema = z.object({
  ENV: z.enum(["dev", "prod"]),
  ...
});
export type Env = z.infer<typeof envSchema>;
export const env = parseEnv(envSchema, process.env);

// Usage
import { env } from "#lib/env";
console.log(env.ENV);
```

# Deployment to cloud

The repository includes deployment configuration for the complete stack:

- [`.railway/railway.ts`](./.railway/railway.ts) declares the Railway backend,
  PostgreSQL database, health check, environment-variable references, and production domain.
- [`apps/web/vercel.json`](./apps/web/vercel.json) configures the Vite SPA and its history fallback.

Railway and Vercel are connected directly to GitHub. Pull requests targeting the repository's
default branch create preview deployments, and merges to the default branch deploy production.
The Railway source points to `tolkee/gladia-analytics` and serves the API at
`api.gladia-analytics.tolkee.dev`. The Vercel project `gladia-analytics-web` uses `apps/web` as its
root directory and serves the SPA at `gladia-analytics.tolkee.dev`.

## Application instructions

Before developing in the backend, read [references/backend.md](references/backend.md).

Before developing in the web application, read [references/web.md](references/web.md).
