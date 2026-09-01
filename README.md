# Gladia Analytics Tech Case

Time spent: Between 6/7 hours

## Running the project locally

To run the project locally, you will need to have installed [Docker](https://www.docker.com/) and [Bun](https://bun.sh/) on your machine.

Then clone the repository and run the following commands:

```bash
git clone https://github.com/gladia-ai/gladia-analytics.git
cd gladia-analytics

bun install

cd apps/backend
bun run infra:up:d
bun run db:migrate
```

You can then create a `.env` files `apps/web`:

```bash
# public env (carreful exposed in website)
VITE_API_URL=http://localhost:3000
```

and create a `.env` files `apps/backend` (copy the google credentials from the 1password link given in the mail):

```bash
ENV=dev

PORT=3000x
DATABASE_URL=postgresql://todo:todo@localhost:5432/todo

# Auth (Don't worry, these are local dev credentials)
BETTER_AUTH_SECRET=imMUGBXXtUILVAcguKxLV4AIhU5kidtE
BETTER_AUTH_URL=http://localhost:${PORT}
TRUSTED_ORIGINS=http://localhost:${PORT},http://localhost:5173,http://localhost:5174

# Socials (Google) (Use the one given in the 1password link)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# S3-compatible file storage (local defaults target compose MinIO)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=gladia-analytics
S3_ACCESS_KEY_ID=gladia
S3_SECRET_ACCESS_KEY=gladia-local-secret
TRANSCRIPTION_UPLOAD_WORKER_POLL_INTERVAL_MS=1000
```

and finally, you can run the development server (at root of the project):

```bash
bun run dev
```

Accessible at `http://localhost:5173`.

## Auth

We are using [Better Auth](https://better-auth.com) to handle Auth in the the whole stack.

Backend side : It creates our auth drizzle schemas (user, account, session, etc.), provide route handlers directly in our hono api, and expose in our Router context when available session and user thanks to our [custom auth middleware](apps/backend/src/api/middlewares/auth-context.ts), that we can then use either inside our route handlers or other middleware and allows us to easily support auth providers/methods. (like google in our case taht we configured thx to google client and secret from environment variables)
We use another custom middleware [auth guard middleware](apps/backend/src/api/middlewares/auth-guard.ts) to protect our routes with auth.

Frontend side : We use better auth client, that allow us to get session info, sign in, sign out etc... Inside our tanstack router, we have a whole section put under a [authed guard](apps/web/src/routes/_auth.tsx) (most of our app routes are protected by this guard)

## Api

Our api is composed by multiple routers, each one handling a subject/feature, that use shared dependencies like services, db, etc.

- [Main router](apps/backend/src/api/index.ts): it use the different middlewares, and expose the different routers and auth routes.
- [Organisation router](apps/backend/src/api/organisation.routes.ts): it handles organisation/menbers related routes, mainly crud operations using [Organisation service](apps/backend/src/features/organisation/organisation.service.ts). It exposes mainly crud routes to interact with organisations and members.
- [Transcription router](apps/backend/src/api/transcription.routes.ts): it handles transcription related routes using [Transcription service](apps/backend/src/features/transcription/transcription.service.ts). It exposes analytics route and transcription getter routes.
- [Transcription upload router](apps/backend/src/api/transcription-upload.routes.ts): it handles transcription upload related routes using [Transcription upload service](apps/backend/src/features/transcription-upload/transcription-upload.service.ts). It exposes upload/download routes and crud to interact with transcription uploads objects.

## Handling multi tenant in Database

There was two choice to handle multi tenant in the db:

- separate schema per tenant
- shared schema with tenant id

We went for the shared schema with tenant id. Separate schema i think is the more "secured" but also the more complex to setup in a project and db. Given the time and that shared schema is still a good choice, we chose it. So basically, all our tables contains an `organization_id`, used always in the primary key.

This works well but demands more attention and consistency across the codebase separeted schema.

## Handling tenant scoping in backend

Here again there was 3 main ways we saw to handle tenant scoping in the backend:

- add a middleware to each route depending on a tenant, checking in database user membership (and maybe role)
- check membership directly in the service layer (on each function)
  - use postgres rls (row level security) to handle tenant scoping at the database level (setting an `organization_id` before doing anything in the route)

We chose the service level approach. First why not the other ?

postgres rls (row level security) is a good choice for tenant scoping at the database level, but it requires more setup and is not always so obvious when reading a the implementation. ( the rules is applied at the database level, not in the application code)

middleware is a good choice but what made me choose the service level approach is that it means every consumer of the service (api route, other services, and if we have other type of client like sdk or mcp etc...) will be validating without needing each one to implement it themselves.

Yet service level approach requires more attention and consistency across the services implementations. But middleware ask it at the route level, so we guessed both approaches have their pros and cons.

## Transcriptions File Processing/uploading

To handle uploading of transcriptions files, we use an s3 compatible storage solution. (minio in local, railway solution in production) and we store in a [Postgres schema](apps/backend/src/features/transcription-upload/transcription-upload.schema.ts) info about the file.

To upload a file to the bucket, the user will go through our upload endpoint, which will do some validation and then upload the file to the bucket and make it available for processing.
We could have have directly upload the file to the bucket from the bucket, it's even more costless in railway terms (we dont pay traffic to bucket), but we hit a limit with that approach cause it prevent us to do some validation before uploading (for example for the size) and also prevent us to do some post upload task, like creating the processing job.

We chose a size limit of [128 MiB](/Users/guillaumelacoste/dev/gladia-analytics/packages/common/src/constants.ts) (shared to frontend and backend for consistency in size validation) which is bun default max body size. It can be update in the common package.

Once uploaded, the file is made available for processing by a flag on his object.

Then a ["worker"](/Users/guillaumelacoste/dev/gladia-analytics/apps/backend/src/workers/transcription-upload.worker.ts) will process the file with streaming and batch processing.

### Processing

We wanted/assumed few things during the processing:

- each transcription from the file should be parsed and schema validated before being inserted in the database
- if a transcription of the file is invalid, the worker should stop the processing, give an error with the reason, and NOT insert the already parsed transcription from the file. It's file is either fully processed or not processed at all, there's no partial insertion.

We chose this approach having in mind that for processing very large files as a client and having the observality of what is happening, it will be harder to have an intermediate state where the file is partially processed but not fully processed yet.

To achieve this no partial insertion, given we where in stream/batch mode to be able to process very large files, we used staging tables strategy, that mimic the Transcription main table but add an uploadId column to link each row to an upload. So during processing, each row is inserted in the staging table and only when the file is fully processed, the staging table is merged into the main table. (if it fails we vacum the table)

### Rules for the conflict resolution

When processing a new file, nothing tell us that it was already added by another file. So here we need to define the rules for the conflict resolution in Postgres.
The way we handle it is : if a transcription with the same id and organisationId already exists, we check both version field (we ASSUMED that the version field is incremented with each update of the transcription), and if the version in the staging table is higher or equal, we update update with the new transcription values we just processed.

## Onboarding

Goal for the onboading given the time was to make on simplified. The rule is simple, if user try to access the app but doesn't belong to any organisation, they are redirected to the onboarding page.

On the onboarding page, the user can create a new organisation and "join" it as the owner.
Then he is redirected to the organisation dashboard.

This minified onboarding has a limitation:

- if the user is already part of another organisation (cause they have been invited), they currently have no app path to create their own organisation. (as the app will not redirect them to the onboarding page). This could be fixed by an option in the organisation selector to allow the user to create a new organisation if he is an owner of another organisation.

## Billing/Languages

We decided to calculate the billing time on the server this formula per transcription:
`billableSeconds: result?.billing_time ?? result?.audio_duration ?? file?.audio_duration ?? 0,`

For languages, we assume that when the array is empty, that mean the auto-select mode is enabled.

## What next steps (if more time available)

---

One of the most important things to better implement would be the worker part. This was purely by time constraints missing that we didn't use a more robust worker system. Cause currently this mimified worker, cannot handle basic queue management (e.g. retries, dead-letter queues, etc.).
Here if the vps crash the transcription upload will be blocked in processing mode, without worker to picking it up. We could have at least implement this part on the miniefied system but it would not make sense, we should use a real worker/queue system like BullMQ with a Redis. As it gives everything we want: reliability, retries, dead-letter queues, etc.

Even with BullMQ, if we wanted the upload to be indepotent (can be stop, retried as much as needed),
a good idea would be to store current item index being processed in the queue, so that if the worker is stopped or restarted, it can pick up where it left off.

---

Another improvement would be to add caching on endpoints, more importantly on the analytics endpoints that can be heavy in computation. This would make also a lot of sence cause there are no user specific data endpoint, like every user from an organization see and fetch the same data on the app. (given still pagination, and filtering) We could use Redis which super easy to setup and use. (even more if we already use an instance for the queue)

---

Improve product scope/capabilities:

- We chose to only implement one filter in the transcription data table view, to showcase the capability to do it, but in reality we should have way more filters available for them to be actionable. The system is present to add them but we just miss information of the format of the transcription data. What are the possible for a finite value field , if not known values then compute (on the fly through a db query or in precompute in tables ) references data.
- Improve analytics data possibilities. Currently the analytics data are not flexible, and we only compute a known set of metrics bringing a fixed set of charts. But we could add more flexibility and aggregation capabilities so that user could create his own custom charts.

---

Error handling on frontend: thanks to the rpc types of Hono and the way we define the queries and mutations in tanstack ([example](apps/web/src/features/organisations/api/list-user-organisations.query.ts) for example), we have all the real error types PER query. Meaning that the error type of the list user organisations query will only matche error types return by the the corresponding api routes. So we have all those errors but we didn't had the time to well handle them on the frontend and give the user actionable feedback.
