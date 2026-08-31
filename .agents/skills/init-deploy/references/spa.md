# SPA deployment mode

Read this file only when the user selected SPA and `apps/web` is the retained frontend.

Create or reconcile one Vercel project:

- name: `<slug>-web`
- GitHub repository: the confirmed fork
- root directory: `apps/web`
- framework: Vite
- build command: `bun run build`
- output directory: `dist`
- Node.js runtime: the repository-supported current runtime
- production branch: the confirmed branch
- preview deployments: enabled
- affected-project deployments: enabled

Set `VITE_API_URL=https://<apiDomain>` and attach the confirmed `<frontendDomain>` to this project. Do not create or configure an SSR project.

Verification must load the SPA directly and through a client-side route, confirm the history fallback works, exercise its API connection, and check the browser console.
