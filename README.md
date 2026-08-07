# Retail Media Demo

A connected retail-media flow: build a sponsored-listing campaign with AI-assisted
copy, and have it immediately eligible for real-time ad serving with frequency
capping. Built to demonstrate the stack in a specific job description: Node.js/TS
microservices, Next.js (Pages Router) + Material-UI + Formik/JSON Schema, MongoDB,
Redis, Algolia, BullMQ, RabbitMQ, and a genuinely shipped AI feature.

## Why it's shaped this way

Two messaging systems, deliberately, because they solve different problems:

- **RabbitMQ** — cross-service domain events (fan-out). `campaign-api` publishes
  `campaign.created` / `campaign.status_changed` to a topic exchange once; the
  worker's consumer and (in a fuller build) any other interested service each
  bind their own queue independently. `campaign-api` never needs to know who's
  listening.
- **BullMQ (Redis-backed)** — high-volume, single-consumer background jobs.
  Every ad impression/click goes through here instead of onto the serving
  request's critical path, with retry/backoff built in.

**Frequency capping lives in Redis**, not Mongo, because it's a hot-path,
high-write-volume counter with a natural TTL (expires at UTC midnight) — exactly
what Redis is for, and exactly the kind of atomic-counter logic worth testing
against a real instance rather than a mock (see `frequencyCap.test.ts`).

**One JSON Schema, two consumers.** `packages/shared/src/schemas/campaign.schema.ts`
is the only place campaign validation rules are written down. `campaign-api`
compiles it with `ajv` before every write; the web app's Formik wizard uses the
exact same compiled validator as its `validate` prop. The form and the API can't
drift out of sync because they're not two implementations — they're one.

## Architecture

```
apps/web (Next.js Pages Router, MUI, Formik)
  │  Campaign Builder wizard ──POST /campaigns──────────┐
  │  Live Ad Preview ──GET /serve──────────────┐        │
  ▼                                             ▼        ▼
services/ad-delivery-api               services/campaign-api
  Algolia candidate lookup               MongoDB persistence
  Redis frequency cap                    AI copy suggestions (Claude)
  BullMQ event enqueue                   Algolia indexing
        │                                       │
        ▼                                       ▼
  Redis (cache + queue)          RabbitMQ topic exchange: retail_media.campaigns
        │                                       │
        └──────────────┬────────────────────────┘
                        ▼
                services/worker
        BullMQ consumer → aggregates impressions/clicks into MongoDB
        RabbitMQ consumer → reacts to campaign lifecycle events
```

## What's actually verified in this build vs. what needs live infra

Being direct about this because it matters more than it looks like it does:

| Layer | Status |
|---|---|
| Shared JSON Schema + ajv validation | **Live-tested.** Unit tests run for real. |
| `campaign-api` routes & validation | **Live-tested** with mocked Mongo/RabbitMQ/Algolia (standard practice — these are integration points, not logic under test). 8/8 passing. |
| AI copy suggestions (`aiCopy.ts`) | **Live-tested** against a mocked Anthropic client, including the case where the model returns copy that violates the schema's length limits — those get filtered server-side before they ever reach the form. Wire in a real `ANTHROPIC_API_KEY` to hit the actual API. |
| Redis frequency capping | **Live-tested against a real local Redis instance** — not a mock. This is the one piece where a fake client could hide a real bug (race conditions, TTL edge cases), so it's the one piece that gets the real thing. 5/5 passing. |
| `ad-delivery-api` serve route | **Live-tested** with mocked Algolia results, real Redis for the capping logic. 5/5 passing. |
| Next.js build | **Live-verified** — `next build` completes cleanly, all 3 pages (dashboard, wizard, live preview) generate. |
| MongoDB, RabbitMQ, Algolia as live services | **Not run end-to-end in this environment** (no network path to Atlas/CloudAMQP/Algolia from the sandbox this was built in). The integration code is real and correct against each library's documented API, but the honest status is "written and unit-tested with mocks," not "watched it work against production infra." `docker-compose.yml` gets you Mongo + Redis + RabbitMQ locally in about 30 seconds to close that gap yourself. |

## Local setup

```bash
# 1. Infra
docker compose up -d          # mongo :27017, redis :6379, rabbitmq :5672 (+ UI on :15672)

# 2. Install & build the shared schema package
npm install
npm run build:shared

# 3. Env files (copy and fill in as needed — Algolia/Anthropic keys optional
#    for campaign-api/ad-delivery-api to run, required for those features to work)
cp services/campaign-api/.env.example services/campaign-api/.env
cp services/ad-delivery-api/.env.example services/ad-delivery-api/.env
cp services/worker/.env.example services/worker/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Run everything (separate terminals)
npm run dev:campaign-api      # :4001
npm run dev:ad-delivery-api   # :4002
npm run dev:worker
npm run dev:web               # :3000
```

Without an Algolia key, `ad-delivery-api`'s candidate lookup returns nothing
and `/serve` always responds 204 — the frequency-capping and event-emission
logic underneath it still runs and is still what's tested. Without an
Anthropic key, the wizard's "Generate copy with AI" button will fail visibly
and the form still works with manually typed copy.

## Running the tests

```bash
npm run test                  # campaign-api + ad-delivery-api, mocked infra + real Redis
```

`ad-delivery-api`'s frequency-cap tests need Redis reachable at
`REDIS_URL` (default `redis://localhost:6379`) — `docker compose up -d redis`
covers that, or a local `redis-server`.

## What would change for a real deployment

- `ad-delivery-api` would want a read replica or Redis Cluster once traffic
  is real, and the Algolia lookup would move to server-side rendering or an
  edge function to shave the extra network hop.
- `campaign-api`'s AI endpoint should queue longer-running generations
  through BullMQ too, rather than block the HTTP request, once copy
  generation includes multi-turn refinement.
- The worker's RabbitMQ consumer currently just logs; in production it's
  where you'd hang cache warming, Slack notifications for high-budget
  launches, or a search-index consistency check.
