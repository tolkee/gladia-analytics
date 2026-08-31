# Gladia Case

## Context

At Gladia, we build a multi-lingual speech-to-text platform used by 300,000+ developers worldwide. Our customers include voice agents, meeting assistants, CCaS platforms, financial institutions, and more.

You would join the **Application team,** the team that owns everything customer-facing: API, web app, database, billing, authentication, SDKs.

This exercise reflects the kind of problems you’d work on with us: product-oriented, customer-centric, and pragmatic, with **real backend ownership**, not a UI glued to a mock.

## Objective

Build a **mini multi-tenant SaaS** that demonstrates:

- Your ability to design and ship a coherent **API + UI**
- Multi-tenant **organization / data isolation**
- Auth that protects **both** the UI and the API
- Thoughtful trade-offs under time pressure
- A **result-driven** approach: something a customer could actually use

This is **not** about pixel-perfect design or over-engineering. This is about shipping a usable product within the time budget.

## The Problem

Create the **Analytics** area of a Gladia-like application, backed by **your own API and datastore**.

Customers (scoped to an **organization**) should be able to:

- **Analytics page:** Understand and visualize usage for different time periods, including:
  - Usage (in minutes)
  - Type (Async / Real-time)
  - Cost (in $) — assume **$0.20/h Real-time**, **$0.12/h Async**
  - Languages repartition
  - Model repartition
- **“Debugging” view:** A **paginated** list of transcriptions, with the ability to open one transcription. Detail content beyond what exists in the source JSON can be a simple placeholder UI — but it must be loaded via **your API** (`GET` by id), not hard-coded in the client.

These user stories are vaguely specified on purpose. We want to see how **you** answer customer needs and how far you get. There is no single right answer.

### Multi-tenancy (required)

At minimum:

- An **Organization** (tenant) owns transcription/analytics data
- Authenticated users belong to an organization
- All reads/writes are **scoped to the current organization** — no cross-tenant leakage

How onboarding works (auto-create org on first login, create-org flow, invite, etc.) is up to you — document the model and the trade-offs.

Stretch (nice if time allows): invite a second user, switch org, or role-based access. Do **not** burn the whole budget on this.

## Functional Requirements

Your solution should:

- **Real Google sign-in** (OAuth). Mock/dev-only login is not acceptable as the primary path.
- Protect **UI routes and API routes** with auth (unauthenticated calls must fail)
- Be usable on desktop (mobile is a plus)
- Handle loading, empty, and error states on the client
- Expose a proper **HTTP API** that the UI consumes (no “parse the JSON only in the browser and skip the server”)
- **Upload** a custom analytics / transcriptions JSON file through the API; persist it server-side (DB and/or object storage)
- Compute **aggregations server-side** (usage, cost, language/model repartition, filters by period as you define them)
- Validate uploaded payloads (schema validation strongly expected)
- Be **deployed on the internet** (FE + API + persistence) — deployment is part of the exercise, not optional
- Be runnable locally for reviewers (README must cover both local and deployed)

Time periods for analytics may stay product-vague: choose a coherent UX (presets, custom range, etc.) and document assumptions.

## Technical Constraints

Mandatory:

- **React** + **TypeScript** on the front-end
- A **real backend** with a **real database**
- **Deployed** end-to-end system

Strongly preferred (bonus — this is close to Gladia’s Application stack):

- TypeScript backend (e.g. NestJS, Remix/React Router resource routes, Hono, Fastify, etc.)
- **PostgreSQL**
- **S3-compatible** object storage for uploaded files (AWS S3, Cloudflare R2, MinIO, Supabase Storage, etc.)

Everything else (styling, state management, ORM, hosting) is up to you. Avoid unnecessary complexity.

For transparency, Gladia’s Application-relevant stack today looks roughly like:

- React, React Router Framework, Remix-auth, XState, Zod, React Aria, Tailwind, Vite, Vitest, Lingui, Storybook
- NestJS (TS), PostgreSQL + Drizzle, Redis, S3-compatible storage, Kubernetes

You do **not** need to mirror this. Prefer tools you can ship confidently in the time budget.

### Source data example

A different file will be uploaded when we test. Shape is Gladia-like transcription list JSON:

```json
{
  "items": [
    {
      "id": "87af7340-99d7-403b-8acb-696ed3b91009",
      "request_id": "G-87af7340",
      "version": 2,
      "status": "done",
      "created_at": "2026-01-20T15:45:09.791Z",
      "completed_at": "2026-01-20T15:45:54.524Z",
      "custom_metadata": null,
      "error_code": null,
      "kind": "live",
      "file": {
        "id": "87af7340-99d7-403b-8acb-696ed3b91009",
        "filename": "87af7340-99d7-403b-8acb-696ed3b91009.wav",
        "source": null,
        "audio_duration": 13,
        "number_of_channels": 1
      },
      "request_params": {
        "model": "solaria-1",
        "language_config": {
          "languages": [],
          "code_switching": true
        }
      },
      "result": {
        "metadata": {
          "audio_duration": 13,
          "number_of_distinct_channels": 1,
          "billing_time": 13,
          "transcription_time": 44.733
        }
      }
    },
    {
      "id": "729c2416-8fca-4f24-ac23-f43cbf6a5f4e",
      "request_id": "G-729c2416",
      "version": 2,
      "status": "done",
      "created_at": "2025-11-02T09:46:17.865Z",
      "completed_at": "2025-11-02T09:46:23.439Z",
      "custom_metadata": null,
      "error_code": null,
      "kind": "pre-recorded",
      "file": {
        "id": "fc3a610a-9766-46d0-952e-9e4ff27e30f8",
        "filename": "recording-1762076767110.mp3",
        "source": null,
        "audio_duration": 5.69,
        "number_of_channels": 2
      },
      "request_params": {
        "model": "solaria-1",
        "detect_language": true,
        "language_config": {
          "languages": ["en"],
          "code_switching": true
        }
      },
      "result": {
        "metadata": {
          "audio_duration": 5.69,
          "number_of_distinct_channels": 1,
          "billing_time": 5.69,
          "transcription_time": 5.574
        }
      }
    }
  ],
  "first": "<https://api.gladia.io/v2/transcription?offset=0&limit=50>",
  "current": "<https://api.gladia.io/v2/transcription?offset=0&limit=50>",
  "next": "<https://api.gladia.io/v2/transcription?offset=50&limit=50>"
}
```

Notes for implementers:

- `kind: "live"` → Real-time; `kind: "pre-recorded"` → Async (document if you map differently)
- Prefer `result.metadata.billing_time` (seconds) for usage/cost when present
- Languages may be empty (auto-detect / code-switching) — decide how you report that in repartition
- Uploaded files in review may be larger / messier than this sample — validate and fail clearly

## What We’re Evaluating

Weighted roughly **60% backend / 40% front-end**.

**Backend (primary):**

- **API design**: clear resources, pagination, auth, errors
- **Multi-tenancy**: org model and isolation you can explain and defend
- **Data modeling & persistence**: PG (preferred), upload storage, idempotency / replace strategy
- **Server-side aggregations**: correct-enough metering/cost logic, documented assumptions
- **Robustness**: validation, empty/error paths, no silent cross-tenant bugs
- **Deployment**: real env, secrets handling, migrations story

**Front-end (secondary but real):**

- Did you understand / research customer needs despite a vague brief?
- UI quality and Gladia-aware branding (not pixel-perfect)
- UX coherence (nav, states, why this component)
- Clarity of client architecture consuming your API

Also:

- **Decision-making / trade-offs** under a 4–8h budget
- **Code structure & readability**
- Technique comes second to judgment — but a thin “backend” that only stores a blob and dumps it to the client will score poorly on the backend axis

### AI usage

AI tools are allowed if:

- You are transparent about where you used them
- You can explain and justify architecture and code choices
- The more AI you used, the more achievement we expect — AI is a multiplier, not a substitute for ownership

## Deliverables

1. A **Git repository** (GitHub, GitLab, etc.)
2. A **README** including:
   - How to run locally (FE, API, DB, storage)
   - How auth is configured (Google OAuth setup steps)
   - **API overview** (main endpoints, auth scheme, org scoping)
   - Key technical decisions and trade-offs
   - Assumptions (billing, languages, multi-tenant onboarding, replace-on-upload vs append, etc.)
   - What you’d improve with more time
3. A **deployed** URL (and how to log in / which Google account or invite flow to use for review)

Optional but appreciated: short architecture diagram, OpenAPI/Swagger, basic tests on critical paths (validation, tenant isolation).

## Time Expectation

- **Target**: ~**4–5 hours**
- **Hard ceiling**: **6–8 hours** — stop and write down what you’d do next

We value **focus and clarity** over completeness. A deployed, multi-tenant, authenticated vertical slice beats an unfinished cathedral.

## Questions

If anything is unclear, ask — or make reasonable assumptions and **document them**.
