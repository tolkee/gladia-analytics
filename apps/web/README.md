# Web

The frondend of the application is an SPA built on top of:

- Tanstack router for routing coupled with Tanstack Query for data fetching
- Shadcn for UI components and tailwind for styling
- Hono RPC client for making type-safe requests to the backend
- Better-auth client for authentication
- Zod for schema validation
- HugeIcon for icons

The project is structured as follows :

- `src/features/`: each feature has it's own architecture. (`components`, `hooks`, `api`, `types` etc...) and only expose selected parts to the outside world.
- `src/components/`: common components used across the frontend.
- `src/hooks/`: common hooks used across the frontend.
- `src/lib/`: contains utility/shared code like db connection, env parse etc...
- `src/routes/`: tanstack router routes definitions.
  - `src/routes/_auth/`: authenticated routes.
- `src/router/`: tanstack router configuration.
- `src/main.tsx`: entry point of the frontend.

## The vision behind the frontend architecture

We need to keep in mind, that is project is organised like this :

- in [features folder](src/features/), we have a set of features, each owning a subject on the application, and exposing public parts (components, api queries, etc...) so that they can be used anywhere in the frontend.
- then we have consumers of those features. Like routes, other feature, etc...

This things allow us to separate the concerns of the application, and make it easier to maintain.

Each top-level subject : auth, feature 1, feature 2, etc... should have its own folder in `src/features/`.

## Writing a route

The way we try to use Tanstack Route, in this project is :

- we fetch the data needed for the route in the `loader` or `beforeLoad` function thanks to ensure `await queryClient.query(`, this way it create a suspense for this call.
- we provide a pending component to show while the data is being fetched.
- in route components, we can then use `useSuspenseQuery` to access those data who will have defined type has we know we only reach that part once loaded
- in the route components, we try to have the code page (we don't want it to be like just returning a component `<PageView>` or something like this ). Still we extract component to components root folder or component feature folder, when it's needed by design : a list of card ( => CardCompoent), a dialog ( => DialogComponent), etc....This allows to keep the strucure of the page in the page component, while extracting some logic to the feature component.

## Authentication

Every route under `/_auth` is protected, and requires authentication. (it redirect to `/login` if user/session is not in the route context)

The root layout `__root.tsx`, is getting the session from better auth, and put in the route context.

On a route, when you want to access the user or the session use :

```tsx
const { user, session } = Route.useRouteContext();
```

Under `/_auth`, user and sessions will be always define, above it can be defined or undefined.

When trying to access `user` from a component and not a route, you should import the Route depending on where you component will be used. If the component will be used anywhere, in and outside `/_auth`, you should import the Route from the `__root.tsx`:

```tsx
import { Route } from "#routes/__root";
const { user } = Route.useRouteContext(); // user: User | undefined
```

When you know your component will only be used inside `/_auth`, you should import the Route from the `_auth.tsx`:

```tsx
import { Route } from "#routes/_auth";
const { user } = Route.useRouteContext(); // user: User
```

## Queries and mutations to the API

We define queries and mutations files to interact with the API hono rpc client.

A query file should always look like this :

```ts
import { apiClient } from "#lib/api";
import {
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint = apiClient.api.todo.$get;

type GetTodoSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetTodoErrorResponse = InferErrorResponseType<typeof endpoint>;
export type Todo = GetTodoSuccessResponse[number];

const key = (userId: string) => ["todo", userId];
const options = (userId: string) =>
  queryOptions<GetTodoSuccessResponse, GetTodoErrorResponse>({
    queryKey: key(userId),
    queryFn: async () => {
      const response = await endpoint();

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      const data = await response.json();
      return data;
    },
  });

export const getTodoQuery = {
  key,
  options,
} satisfies Query;
```

and a mutation file should always look like this :

```ts
import { apiClient } from "#lib/api";
import type { Mutation } from "#lib/query";
import { mutationOptions } from "@tanstack/react-query";
import type { InferRequestType } from "hono";
import { getTodoQuery } from "./get-todo.query";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";

const endpoint = apiClient.api.todo[":id"].$patch;

type UpdateTodoSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type UpdateTodoErrorResponse = InferErrorResponseType<typeof endpoint>;
type UpdateTodoVariables = { id: string; updates: InferRequestType<typeof endpoint>["json"] };

const key = (userId: string) => ["todo", "update", userId];
const options = (userId: string) =>
  mutationOptions<
    UpdateTodoSuccessResponse,
    ApiError<UpdateTodoErrorResponse>,
    UpdateTodoVariables
  >({
    mutationKey: key(userId),
    mutationFn: async ({ id, updates }) => {
      const response = await endpoint({
        param: { id },
        json: updates,
      });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (_d, _v, _r, { client }) => {
      return client.invalidateQueries({
        queryKey: getTodoQuery.key(userId),
      });
    },
  });

export const updateTodoMutation = {
  key,
  options,
} satisfies Mutation;
```

Then you can use the query and mutation in your components/routes :

```ts
// Use the query in your loader
loader: async ({ context: { user, queryClient } }) => {
  await queryClient.query(getTodoQuery.options(user.id));
},

// Use the mutation in your component/routes
const {
  mutateAsync: createTodo,
  error,
} = useMutation(createTodoMutation.options(user.id));

// Use the mutation in your component/routes with error handling
const { mutate: updateTodo } = useMutation({
  ...updateTodoMutation.options(user.id),
  onError: (err) => {
    if (err.response.errorCode == ApiErrorCode.INVALID_REQUEST)
      toast.add({
        type: "error",
        description:
          "Failed to mark as completed this todo, please refresh the page or try again after.",
      });
  },
});
```

Notice are error are well type on onError and error thanks to the `<>ErrorResponseType` type and `jsErrorFromApiError`

## Using ui components

When doing your frontends, you should always check if what primite you are doing is not already done by [Shadcn Components](https://ui.shadcn.com/docs/components). Always check the latest list of available components.

You will either find them already installed in the `packages/ui/` directory or if not yet use shadcncn registry cli to install them. Generally, the bunx command is present on each component's documentation page. It will automatically install the component for you in the `packages/ui/` directory.

And you will be able to access it in the frontent :

```tsx
import { Button } from "@gladia-analytics/ui/components/button";
```

Never try to recreate one by your hand, always use the install with cli.

If it's not a design system ui primite, create the component either in root components folder if does not belong to a specific feature (for example layout components etc...) or in the feature's components folder if it does belong to a specific feature.

Most of the components should expose a classname prop (and use cn to compose with internal classname) so you can customize their appearance.
