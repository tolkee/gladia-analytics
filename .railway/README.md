# Railway infrastructure

`railway.ts` is the source of truth for this project's Railway resources.

Before the first apply, create the `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and
`GOOGLE_CLIENT_SECRET` variables on the backend service. The IaC file preserves their values
without storing secrets in source control. For a fork, also update the GitHub repository,
production branch, project name, and domains in `railway.ts`.

Review changes before applying them:

```sh
railway config plan
railway config apply
```
