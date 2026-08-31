---
name: init-deploy
description: Prepare and release this template fork through Railway, Vercel, and GitHub using the single selected SPA or SSR frontend, including PostgreSQL, custom domains, pull-request previews, and production verification. Use for deployment setup or readiness audits of this repository.
---

# Init Deploy

Read [references/shared.md](references/shared.md) before planning or changing provider state. Then read exactly one mode reference:

- SPA: [references/spa.md](references/spa.md)
- SSR: [references/ssr.md](references/ssr.md)

Never load or apply the unselected mode's deployment flow.

## Inputs

Detect the frontend mode from the repository: `apps/web` means SPA and `apps/web-ssr` means SSR. If both exist, ask the user which one to deploy and recommend completing `$init-fork`; deploy only the selected mode.

Before changing provider state, explicitly ask the user to provide or confirm both deployment domains, even when placeholders or existing provider values are discoverable:

- the API domain for Railway, such as `api.example.com`
- the one frontend domain for the selected SPA or SSR app, such as `example.com`

Also discover these from the repository and provider accounts when possible; otherwise ask for the missing values together:

- GitHub `owner/repository` and production branch
- Railway workspace/project target
- Vercel team target
- the shared cookie domain implied by the confirmed API and frontend hostnames

Google OAuth credentials and authentication secrets must be entered through provider secret controls or environment tooling. Never ask the user to paste secrets into source files or commit them.

## Modes

- For a readiness or checklist request, inspect and report only; do not create or mutate provider resources.
- For an explicit setup/deploy request, carry the checklist through to observable verification. Creating provider projects, changing DNS, or connecting GitHub are external mutations and must remain within the user's stated scope.

## Deployment invariants

- Railway hosts one backend service and one PostgreSQL service from `.railway/railway.ts`.
- Backend deploys run database migrations before startup and must pass `GET /api/health`.
- Railway production follows the selected GitHub branch; pull requests get isolated/focused environments containing backend and PostgreSQL when watched paths change.
- Vercel uses exactly one project from the same repository: `apps/web` for SPA mode or `apps/web-ssr` for SSR mode.
- The selected Vercel project deploys production from the selected branch and previews from pull requests. Affected-project deployment filtering remains enabled.
- The selected frontend receives `VITE_API_URL` for preview and production. Preview values must reach an appropriate backend; do not silently point untrusted previews at production if the user requires isolation.
- The backend's auth URL, single trusted origin, cookie domain, Google OAuth configuration, API domain, and selected frontend domain agree.
- No provider IDs, account names, domains, repository names, or secrets from the original template owner are reused implicitly.

Prefer provider connectors or supported CLIs for state inspection and changes. Keep `.railway/railway.ts` as Railway's source of truth, and never commit `.vercel/project.json`, pulled `.env*` files, access tokens, or generated build output.

Create the selected Vercel project if it does not exist, attach the confirmed frontend domain if absent, and complete or report the required DNS validation. Attach the confirmed API domain to Railway. Do not create, link, configure, or verify a Vercel project for the unselected frontend.

For setup or preview-pipeline work, finish when local checks and a pull request prove the Railway backend plus the one selected Vercel frontend, then report that production still awaits an authorized merge. For an explicitly authorized full release, continue until production deployments are healthy and the two confirmed hostnames serve the intended applications. In either mode, report preview URLs, health results, and any manual DNS/OAuth action still outstanding.
