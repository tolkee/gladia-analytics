# SSR deployment mode

Read this file only when the user selected SSR and `apps/web-ssr` is the retained frontend.

Create or reconcile one Vercel project:

- name: `<slug>-web-ssr`
- GitHub repository: the confirmed fork
- root directory: `apps/web-ssr`
- framework: Vite / TanStack Start
- build command: `bun run build`
- output directory: framework-generated Vercel Build Output API directory; do not force `dist`
- Node.js runtime: the repository-supported current runtime
- production branch: the confirmed branch
- preview deployments: enabled
- affected-project deployments: enabled

Set `VITE_API_URL=https://<apiDomain>` and attach the confirmed `<frontendDomain>` to this project. Do not create or configure an SPA project.

Verification must confirm server rendering, unauthenticated redirect behavior, API connectivity, hydration, and a clean browser console.
