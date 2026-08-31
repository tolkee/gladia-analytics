# Backend

The backend of the application uses:

- [Hono](https://hono.dev/) for the api server. It's lightweight, fast, has rpc support out of the box, and is at same level as Express.js. It's backed by cloudlfare (as they use it for their serverless platform) and is growing very fast.
- [Drizzle](https://orm.drizzle.team/) for the database schema definitions, migrations, and type-safe query building.
- [Better Auth](https://better-auth.com/) for the auth. It's well integrated with drizzle (adapter that generates the auth schemas) and hono where u can just use the auth routes.
- [Pino](https://github.com/pinojs/pino) as fast, lightweight logger.

The project is structured as follows:

- `src/features/`: each feature has it's own architecture. (eg. `<feature>.service.ts`, `index.ts`, `<feature>.schema.ts` etc...) and only expose selected parts to the outside world.
- `src/api/`: this contains the main hono router (`src/api/index.ts`) and subrouters (`src/api/<subrouter>.routes.ts`) per feature/subject. Each subrouter exporte a function to create itself, taking parameters as db connection, service dependencies etc.. The main router does the same, but also create each subrouter and expose their routes on a path.
  - `src/api/middlewares/`: this contains the middleware for the api server.
    - [authContextMiddleware](src/api/middlewares/auth-context.ts): attaches the better auth context (user/session) to the request, so it can be used in the routes. (used in the main router)
    - [authGuardMiddleware](src/api/middlewares/auth-guard.ts): protects a route by requiring the user to be authenticated.
    - [loggerMiddleware](src/api/middlewares/logger.ts): logs the request/response info using pino.
- `src/lib/`: contains utility/shared code like db connection, env parse etc...
- `src/index.ts`: the backend's main entry point, where dependencies are instantiated and application services—such as the HTTP server (hono main)-are started.

## The vision behind the backend architecture

We need to keep in mind, that is project is organised like this :

- in [features folder](src/features/), we have a set of features, each owning a subject on the application, and exposing public parts (service, schema, types...) so that they can be used anywhere in the backend.
- at the top level, we have consumers of those features. In this example, we only have one consumer, the [api server](src/api/). But we could imagine having other consumers, like CronJobs, BackgroundWorkers etc...

This things allow us to separate the concerns of the application, and make it easier to maintain. Consumers only consume interfaces exposed by the features, and does not have access to the internal implementation details.

## A Feature folder overview

> Taking as example the [`todo`](src/features/todo/) feature folder.

A feature folder has it's own sub architecure. It can basically contains anything but generally have one/many of those files:

- `src/features/todo/todo.service.ts`: the main service of the feature.
- `src/features/todo/todo.schema.ts`: the drizzle schemas definition.
- `src/features/todo/todo.dto.ts`: this contains dtos zod schemas/types used by the feature service methods. They can be used in consumers to validate/parse input data like request bodies in the api.
- `src/features/todo/todo.index.ts`: barrel file exporting the public parts of the feature.

## Errors in backend

In the backend project, we have two types of errors:

The internal errors, that are JavaScript errors thrown by the different parts of the application (services, repositories etc...). When developing your should make sure to be aware of those errors and handle them appropriately.

The api errors, that are public facing errors returned by the api layer. Those errors are send directly by the controllers, or onError, using the [`apiError`](src/lib/errors.ts) function and declaring a new error code in shared [`ApiErrorCode`](../../packages/common/src/errors.ts) enum.
For example :

```ts
try {
  const todo = await todoService.updateTodo(userId, id, body);
  return ctx.json(todo, 200);
} catch (err) {
  if (err instanceof TodoNotFoundError) {
    return apiError(ctx, 404, ApiErrorCode.TODO_NOT_FOUND, "Todo not found");
  }

  throw err;
}
```

You should make sure that those errors are ones actionnable by the api caller, and not some internal errors. Every internal errors not handle in the api routers, will be caught by the global error handler in [`main hono router`](src/api/index.ts)

Once returned, those api errors will be infered in the response type of the endpoint through the rpc client, allowing the client to know which errors are expected and handle them accordingly.

## Request Validation

To validate the incoming requests, we use a custom validator [request-validator](src/api/middleware/request-validator.ts) based on Standard Schema hono validator, but with some custom formatting to throw validation errors matching our api error format.

Then in api endpoints, we use the validator middleware to validate the incoming requests (body, search etc...) thanks to a zod schema. (Advantage is that with Standard Schema, we could swap the schema lib we use)

```ts
.patch("/:id", authGuardMiddleware, requestValidator("json", updateTodoSchema), async (ctx) => {
```

## Dependency injection

In backend, most of router and services depends on external dependencies like database connection, and other services. To be able to test and maintain easily those parts, we do not use singleton, but instead use dependency injection.

We use a simple implementation of it, where each of those either take the external dependencies as constructor parameters, or function parameters. Then, our [main backend entry point](src/index.ts) instantiates those dependencies and passes them to the different parts of the application.

This allow us to easily swap out dependencies in tests, and to rely on only contracts/interfaces, on each consumers of those dependencies.

# Bun as runtime

We use Bun as runtime to run this backend, so we basically don't need to build it. We can just run it directly with run the index.ts file. Simplifying the development workflow and the way we run it in his [docker container](./Dockerfile).

## Running the infra locally

This backend needs to run alongside a database and maybe other infra services like an s3 like storage, a redis cache, etc.
We do have a [docker compose file](./compose.yaml) that can be used to run this infra locally.

You can interact with this local infra with the scripts from the [package.json](./package.json) :

```bash
bun run infra:up # starts the infra locally
bun run infra:up:d # starts the infra locally in detached mode
bun run infra:down # stops the infra locally
bun run infra:logs # shows the logs of the infra
```

Be sure also to run the migrations to create the database schema :

```bash
bun run db:migrate
```

The compose stack also starts a local MinIO S3-compatible server on port `9000`, with its console
on port `9001`. The `minio-init` service creates the private `gladia-analytics` bucket and configures
CORS for the Vite development server.

Then update the `.env` file to match the local infrastructure configuration.

```bash
DATABASE_URL=postgresql://todo:todo@localhost:5432/todo
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=gladia-analytics
S3_ACCESS_KEY_ID=gladia
S3_SECRET_ACCESS_KEY=gladia-local-secret
```

## Development transcription seed

Populate existing organisations with varied transcription data for the infinite table and analytics
charts. The command defaults to 180 rows per organisation, spans the previous year, and can only run
when `ENV=dev`.

```bash
bun run db:seed:transcriptions
```

Target one organisation or change the reproducible variation and row count:

```bash
bun run db:seed:transcriptions --organisation-id <uuid> --count 250 --seed demo-2
```

Run `bun run db:seed:transcriptions --help` for all options. Re-running the command replaces its
deterministic seed rows without touching other transcriptions.

## Transcription imports

Transcription JSON files are uploaded directly to S3-compatible storage through a presigned URL:

1. `POST /api/organisations/:organisationId/transcription-imports` creates an import and returns a
   presigned `PUT` request.
2. The client uploads the file using the returned method and headers.
3. `POST /api/organisations/:organisationId/transcription-imports/:importId/complete` verifies the
   stored object and queues the import.
4. The in-process worker claims queued imports. Processing is currently a stub until the
   transcription schema is introduced.

Imports are organisation-scoped. Organisation admins may create and complete uploads, while all
organisation members may inspect an import and request a download URL.
