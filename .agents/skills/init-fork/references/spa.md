# SPA fork mode

Read this file only after the user explicitly selects SPA.

## Retain and rename

Keep `apps/web` and rename its package from `@todo/web` to `@<slug>/web`. Update every `@todo/*` dependency, import, TypeScript `extends`, and shadcn alias in these current tracked locations:

- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/components.json`
- `apps/web/src/components/site-header.tsx`
- `apps/web/src/components/theme-switcher.tsx`
- `apps/web/src/features/todo/components/create-todo-dialog.tsx`
- `apps/web/src/features/todo/components/todo-card.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/env.ts`
- `apps/web/src/lib/errors.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/routes/_auth/(todo)/index.tsx`
- `apps/web/src/routes/login.tsx`

## Remove and clean up

Remove the entire `apps/web-ssr` directory. Then:

- update `README.md` to describe only `apps/web`
- configure Railway `TRUSTED_ORIGINS` with only the SPA domain
- derive the one Vercel project name as `<slug>-web`
- regenerate `bun.lock` so `@todo/web-ssr`, `@<slug>/web-ssr`, and `workspace:apps/web-ssr` are absent
- search tracked runtime/configuration files outside `.agents/skills/**` for `apps/web-ssr`, `/web-ssr`, and `web-ssr`; resolve every remaining reference

Do not create, configure, build, or verify an SSR deployment.
