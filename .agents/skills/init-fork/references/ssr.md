# SSR fork mode

Read this file only after the user explicitly selects SSR.

## Retain and rename

Keep `apps/web-ssr` and rename its package from `@todo/web-ssr` to `@<slug>/web-ssr`. Update every `@todo/*` dependency, import, TypeScript `extends`, and shadcn alias in these current tracked locations:

- `apps/web-ssr/package.json`
- `apps/web-ssr/tsconfig.json`
- `apps/web-ssr/components.json`
- `apps/web-ssr/src/components/site-header.tsx`
- `apps/web-ssr/src/components/theme-switcher.tsx`
- `apps/web-ssr/src/features/todo/components/create-todo-dialog.tsx`
- `apps/web-ssr/src/features/todo/components/todo-card.tsx`
- `apps/web-ssr/src/lib/api.ts`
- `apps/web-ssr/src/lib/env.ts`
- `apps/web-ssr/src/lib/errors.ts`
- `apps/web-ssr/src/routes/__root.tsx`
- `apps/web-ssr/src/routes/login.tsx`

## Remove and clean up

Remove the entire `apps/web` directory. Then:

- update `README.md` to describe only `apps/web-ssr`
- configure Railway `TRUSTED_ORIGINS` with only the SSR domain
- derive the one Vercel project name as `<slug>-web-ssr`
- regenerate `bun.lock` so `@todo/web`, `@<slug>/web`, and `workspace:apps/web` are absent
- search tracked runtime/configuration files outside `.agents/skills/**` for `apps/web`, `/web`, and package names ending in `/web`; resolve only references to the removed SPA, not `web-ssr`

Do not create, configure, build, or verify an SPA deployment.
