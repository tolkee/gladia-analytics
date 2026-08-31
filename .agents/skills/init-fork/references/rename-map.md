# Fork rename map

This inventory reflects the tracked repository at the time the skill was created. Always re-run discovery because the template can evolve.

## Discovery commands

Search tracked text rather than generated or ignored artifacts:

```sh
git grep -n -I '@todo/' -- . ':(exclude).agents/skills/**'
git grep -n -I -E 'ts-app-template|tolkee/ts-app-template|docker compose -p todo|api\.todo\.tolkee\.dev|ssr\.todo\.tolkee\.dev|todo\.tolkee\.dev|\.todo\.tolkee\.dev' -- . ':(exclude).agents/skills/**'
git ls-files | sort
```

After renaming, repeat the first two searches. Investigate every remaining result rather than blindly replacing it. The skill files are excluded because they intentionally retain the original markers as reusable discovery documentation; they are not runtime identity or deployment configuration.

## Technical identity to rename

| Current identity                       | Fork identity                                                         |
| -------------------------------------- | --------------------------------------------------------------------- |
| Workspace scope `@todo`                | `@<slug>`                                                             |
| Root package/project `ts-app-template` | `<slug>`                                                              |
| GitHub source `tolkee/ts-app-template` | fork's `owner/repository`                                             |
| Docker Compose project `todo`          | `<slug>`                                                              |
| Railway project `ts-app-template`      | `<slug>`                                                              |
| Selected Vercel project                | `<slug>-web` for SPA or `<slug>-web-ssr`                              |
| Template production domains            | user-provided domains, or temporary `<slug>.example.com` placeholders |

The root `package.json` remains an unscoped private monorepo name. Retained app and package manifests keep their suffixes: `@<slug>/backend`, either `@<slug>/web` or `@<slug>/web-ssr`, `@<slug>/common`, `@<slug>/ts-config`, and `@<slug>/ui`.

## Frontend selection

| User choice | Keep           | Remove         | Vercel project   |
| ----------- | -------------- | -------------- | ---------------- |
| SPA         | `apps/web`     | `apps/web-ssr` | `<slug>-web`     |
| SSR         | `apps/web-ssr` | `apps/web`     | `<slug>-web-ssr` |

After the user chooses, read exactly one frontend reference: [spa.md](spa.md) or [ssr.md](ssr.md). It contains the selected app's tracked namespace inventory and removal checks. Do not read or apply the other frontend reference.

## Current tracked `@todo/*` locations

### Manifests, lockfile, documentation, and build configuration

- `bun.lock` (regenerate after manifest changes)
- `README.md` technical namespace examples
- `apps/backend/package.json`
- `apps/backend/Dockerfile`
- `apps/backend/tsconfig.json`
- `packages/common/package.json`
- `packages/common/tsconfig.json`
- `packages/ts-config/package.json`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`

### Backend source imports

- `apps/backend/src/api/index.ts`
- `apps/backend/src/api/middlewares/auth-guard.ts`
- `apps/backend/src/api/middlewares/request-validator.ts`
- `apps/backend/src/api/todo.routes.ts`
- `apps/backend/src/lib/env.ts`
- `apps/backend/src/lib/errors.ts`

## Current infrastructure identity locations

- `.railway/railway.ts`
  - GitHub repository and production branch
  - Railway project name
  - API custom domain
  - `BETTER_AUTH_URL`
  - the selected frontend `TRUSTED_ORIGINS`
  - shared `AUTH_DOMAIN`
- `apps/backend/package.json`
  - four `docker compose -p todo` scripts
- `README.md`
  - template title and technical namespace examples
- `package.json`
  - root project name

The Vercel project name is provider state, not tracked source. Derive the single selected project during `$init-deploy`. Local `.vercel/project.json` files and `.vercel/*.json` helper files are ignored artifacts and must not be committed as identity sources.

## Product-side Todo references to preserve

Keep all of these unless the user separately requests a product rewrite:

- `features/todo` directories, imports, services, queries, and mutations
- route groups named `(todo)` and generated route-tree identifiers
- `/api/todo` endpoints and cache keys
- `Todo` types, components, functions, DTOs, and error names such as `TODO_NOT_FOUND`
- database tables, migrations, indexes, and constraints for `todos`
- UI titles and messages such as `Todo app`
- README examples that teach the feature/service architecture using Todo code

Also ignore `.git`, `node_modules`, `.turbo`, `dist`, `.output`, `.vercel/output`, local `.env*` files, and other generated artifacts during discovery and replacement.
