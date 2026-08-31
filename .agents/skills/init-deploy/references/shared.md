# Shared Railway, Vercel, and GitHub deployment flow

Use these steps for either frontend mode. Read only the selected mode reference afterward.

## 1. Resolve mode and required domains

Detect the retained frontend directory:

- `apps/web` only: SPA mode
- `apps/web-ssr` only: SSR mode
- both directories: ask the user to choose; deploy only that mode and recommend `$init-fork` to remove the other
- neither directory: stop and report the invalid repository state

Explicitly ask the user to provide or confirm:

- `apiDomain`: the Railway backend hostname
- `frontendDomain`: the hostname for the selected SPA or SSR application

Use these exact confirmed values throughout the deployment. Do not configure an additional frontend hostname.

Also record the GitHub `owner/repository`, production branch, Railway workspace/project, Vercel team, and the shared cookie domain implied by the confirmed hostnames.

## 2. Preflight

- Confirm `$init-fork` removed the original package scope, repository, domains, infrastructure names, and unselected frontend.
- Confirm the intended production branch exists on GitHub and the working state is pushed.
- Run `bun install --frozen-lockfile`, `bun run quality`, `bun run typecheck`, `bun run test`, and `bun run build`.
- Confirm Turbo discovers only the retained frontend workspace.
- Confirm the GitHub app installations for Railway and Vercel can access the forked repository.

## 3. Authentication configuration

Create or obtain these values without committing them:

- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Configure the Google OAuth client with `https://<frontendDomain>` and the callback URL expected by the backend authentication routes. Take the exact callback path from the running auth configuration rather than guessing it.

The backend production environment must contain:

- `ENV=prod`
- `PORT=3000`
- `DATABASE_URL` from Railway PostgreSQL
- `BETTER_AUTH_URL=https://<apiDomain>`
- `TRUSTED_ORIGINS=https://<frontendDomain>`
- `AUTH_DOMAIN=<shared-cookie-domain>`
- the three preserved secret values above

## 4. Railway: PostgreSQL and backend

Update `.railway/railway.ts` before applying it:

- `github("owner/repository", { branch: "<production-branch>", checkSuites: true })`
- `project("<slug>")`
- production backend custom domain `<apiDomain>` on port `3000`
- auth URL, one trusted frontend origin, and cookie domain

Preserve these behaviors:

- PostgreSQL service named `Postgres`
- backend service named `backend`
- watched paths for `apps/backend`, shared packages, root `package.json`, `bun.lock`, and `turbo.json`
- start command `cd apps/backend && bun run start`
- pre-deploy migration `cd apps/backend && bun run db:migrate`
- health check `/api/health`, timeout 30 seconds
- restart on failure
- `preserve()` for secrets

Then:

1. Authenticate the Railway CLI/connector in the intended workspace.
2. Create or select the project and production environment.
3. Add secrets through provider controls.
4. Run `railway config plan`, review the exact diff, then apply it to the confirmed target.
5. Connect the service to GitHub, set the production branch, and retain check-suite integration.
6. Enable isolated/focused pull-request environments based on production and automatic cleanup when PRs close.
7. Attach `<apiDomain>` if absent and complete the DNS records Railway requests.

Do not add a public domain to PostgreSQL.

## 5. Vercel project and domain

Read and execute exactly one mode reference now: [spa.md](spa.md) or [ssr.md](ssr.md).

For the chosen project:

1. Inspect the selected Vercel team for the expected project name.
2. Create the project from the GitHub repository when it does not exist; otherwise reconcile its settings.
3. Set the production branch, enable pull-request previews, and keep affected-project deployment filtering enabled.
4. Set `VITE_API_URL=https://<apiDomain>` for production.
5. Set an intentional preview API value. Use a matching Railway PR backend when it can be mapped safely; otherwise document the preview policy.
6. Attach `<frontendDomain>` when absent. If the hostname is not registered or controlled, stop and report the required ownership or purchase action; do not purchase it without explicit authorization.
7. Complete Vercel's requested DNS verification and wait for HTTPS readiness.

Never create or configure the unselected frontend project.

## 6. GitHub integration proof

Open a small, real pull request that changes a watched backend dependency or the retained frontend. Verify against that exact commit:

- the selected Vercel project creates a successful preview check
- Railway creates an isolated PR environment when a backend watched path changes
- Railway provisions PostgreSQL, migrations finish, and backend deployment reaches `SUCCESS`
- `/api/health` returns HTTP 200
- the retained frontend renders without browser console errors
- the removed frontend has no provider project/check created by this workflow

Keep the pull request open if the user asked only for proof. Do not merge without authorization.

## 7. Production release proof

After an authorized merge or promotion:

- Railway production uses the merge commit, migrations succeed, and `https://<apiDomain>/api/health` returns 200
- the selected Vercel deployment is `READY` and corresponds to the merge commit
- `https://<frontendDomain>` resolves over HTTPS and calls the confirmed API domain
- authentication, cookies, CORS, and Google OAuth work from the single frontend origin
- provider runtime logs show no deployment, migration, authentication, CORS, or hydration failures

Report mode, project names, deployment identifiers or URLs, commit SHA, both confirmed domains, health results, preview behavior, and any remaining manual DNS/OAuth work. Never expose secret values.
