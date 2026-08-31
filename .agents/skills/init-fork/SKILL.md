---
name: init-fork
description: Initialize a fork of this monorepo by choosing SPA or SSR, removing the other frontend, and changing technical package, repository, and infrastructure identity while preserving the Todo product. Use when someone forks the template or asks to rename its project namespace; do not use for product feature renaming.
---

# Init Fork

Before editing, obtain both required inputs from the user unless already supplied:

- the new project name
- the frontend mode: **SPA** (`apps/web`) or **SSR** (`apps/web-ssr`)

Normalize the project name to a lowercase npm-safe kebab-case slug. State the derived scope (`@<slug>`), selected frontend, and exact frontend directory that will be removed. Do not remove either frontend until the user has explicitly selected the mode.

After the user chooses, read [references/rename-map.md](references/rename-map.md) for shared identity changes and exactly one mode reference:

- SPA: [references/spa.md](references/spa.md)
- SSR: [references/ssr.md](references/ssr.md)

Never load or apply the unselected mode's rename flow.

## Required outcome

- Rename every retained workspace app and package from `@todo/<suffix>` to `@<slug>/<suffix>` while preserving its suffix.
- Keep the selected frontend and remove the entire unselected frontend directory.
- Set the root private package name and Railway project name to `<slug>`.
- Rename infrastructure labels derived from the template identity, including the Docker Compose project and the single future Vercel project name.
- Remove the original template repository, domain, and project identity from tracked configuration.
- Remove tracked runtime, documentation, lockfile, and deployment references to the discarded frontend. From that point onward, plan, configure, build, and verify only the selected frontend.
- Keep Todo feature names, routes, API paths, database schema, types, errors, UI copy, and documentation examples that describe the product.

Never perform a repository-wide replacement of the word `todo`.

## Workflow

1. Inspect `git status` and preserve unrelated or user-owned changes. Do not overwrite a dirty file without reviewing the overlap.
2. Re-run the tracked-file searches in the rename map. Treat the map as a baseline, not a substitute for discovery.
3. Follow the selected mode reference to retain one frontend and remove the other. This deletion is authorized only by the explicit mode choice; preserve unrelated changes elsewhere.
4. Resolve the fork's GitHub `owner/repository` from the `origin` remote or GitHub tooling. If it still points at the template and cannot be inferred, ask for it before changing Railway's GitHub source.
5. Apply the namespace and identity changes only to technical references. Update imports, dependency names, TypeScript `extends`, shadcn aliases, Docker prune targets, documentation snippets, and deployment configuration together.
6. Update Railway `TRUSTED_ORIGINS` to the single selected frontend. If production domains were not provided, use `api.<slug>.example.com` and `<slug>.example.com` placeholders and report that `$init-deploy` must replace them before release. Never retain `tolkee.dev` in a fork by default.
7. Update repository documentation to describe only the retained frontend. Do not leave setup or deployment instructions that tell later agents to configure both modes.
8. Regenerate `bun.lock` with `bun install`; do not hand-maintain workspace resolution entries when the package manager can do it.
9. Re-run the audit, excluding `.agents/skills/**` because these reusable instructions intentionally document both template modes and original markers. No other tracked technical reference to the removed frontend, `@todo/`, `ts-app-template`, `tolkee/ts-app-template`, or `*.todo.tolkee.dev` may remain. Product-side `todo` references are expected.
10. Run `bun run quality`, `bun run typecheck`, `bun run test`, and `bun run build`. Confirm Turbo no longer includes the removed workspace and report any validation that could not run.

Do not edit or commit ignored Vercel link metadata, generated build output, local environment files, or secrets.
