# Retail Media Demo

A connected retail-media flow: build a sponsored-listing campaign from catalog
products and make it eligible for real-time ad serving with frequency capping.
Built to demonstrate the stack in a specific job description: Node.js/TS
microservices, Next.js (Pages Router) + Material-UI + Formik/JSON Schema, MongoDB,
Redis, Algolia, BullMQ and RabbitMQ.

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
  Redis frequency cap                    Product catalog and search
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

# 3. Env files (copy and fill in as needed — Algolia keys optional
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
logic underneath it is covered by tests. Campaign copy can be filled from the
catalog and edited in the campaign builder.

## Import the 10,000-product sample catalog

The campaign builder can search Algolia's [Best Buy sample dataset](https://github.com/algolia/datasets/tree/master/ecommerce).
Products are stored separately from campaigns, in MongoDB's `products` collection
and the Algolia `products` index. Selecting one in **New campaign → Find a catalog
product** fills its brand, SKU, name, image, destination, categories and suggested
copy. Review the details, enter targeting, budget and dates, then launch through
the existing campaign flow. Importing products does not activate ads.

In the final **Review & create** step, choose an initial status: Draft, Active,
Paused or Ended. The final button reflects your choice, and the API saves that
status in the creation request. Active remains the wizard default; API callers
that omit status create a draft. You can change status later from its badge on
the campaign dashboard.

With MongoDB running and the existing `services/campaign-api/.env` configured:

```bash
npm run import:products -- --dry-run  # download and validate, without writes
npm run import:products              # import all 10,000 and wait for Algolia indexing
```

`ALGOLIA_APP_ID` and `ALGOLIA_ADMIN_API_KEY` are required for the normal import.
The optional `ALGOLIA_PRODUCTS_INDEX` defaults to `products`; it must differ
from `ALGOLIA_CAMPAIGNS_INDEX` (default `campaigns`). The same campaign-api env
file is used by the importer. Restart campaign-api if you change its env.

The importer upserts in batches using stable source IDs. Re-running updates the
same products without duplicating them or changing existing campaigns. If a batch
fails, the command exits with an error; re-run it to finish synchronization.
It does not remove products missing from a later source snapshot.

Optional flags:

```bash
npm run import:products -- --limit 50                    # a smaller import
npm run import:products -- --file /absolute/path/records.json
npm run import:products -- --local-only                  # MongoDB only
```

Without Algolia credentials the catalog search API uses MongoDB. With credentials
it searches the configured product index and reports outages visibly. The API is
`GET /products?q=headphones&page=1&pageSize=20` with an optional exact `category`
filter. Page size is at most 100 and pagination covers the first 10,000 results.
`GET /campaigns/categories` supplies categories from active campaigns to the live
preview, including names with spaces and punctuation.

This is historical demo data, not current inventory or an affiliate feed. Product
links and images can become unavailable; review them before launching. Stored
prices are sample USD amounts and are not used as current prices in ad copy.

## Northstar storefront and search studio

Open [the storefront](http://localhost:3000/shop) or [search studio](http://localhost:3000/studio)
after starting the demo services. The campaign console links to both.

For a fresh installation, import the catalog and initialize federated search:

```bash
npm run import:products
npm run setup:storefront
```

The setup command creates `<ALGOLIA_PRODUCTS_INDEX>_articles` with four original
shopping guides and `<ALGOLIA_PRODUCTS_INDEX>_suggestions` with eight starter
queries. It configures native custom ranking on the product index using the
sample popularity score and valid 0–5 ratings. It preserves existing relevance
configuration; later product imports also preserve searchable attribute order.
These are sample scores, not measured sales or current review data. Additional
indexes count toward the connected account's Algolia usage.

The storefront implements:

- Federated autocomplete across products, guides and suggestions, alongside
  recent searches stored in the browser. Starter suggestions and measured
  popular searches have distinct labels. Keyboard arrows, Tab, Enter and Escape
  work in the search dropdown.
- Native Algolia typo tolerance, relevance, category/brand facets, numeric price
  filters and pagination. Query parameters preserve searches and filters in URLs.
- Product detail pages, readable guide pages, a persistent browser cart and an
  idempotent **demo checkout**. The server validates quantities and uses its own
  catalog prices. No payment, fulfillment or stock verification is implemented.
- Existing ad-delivery integration for search, category and product-detail
  placements. Only matching active campaigns appear, labeled Sponsored. Ad
  impressions/clicks retain the existing Redis frequency caps and event queue.

In search studio, Overview shows persisted storefront activity for a rolling 7
or 30 days in UTC. Rates count searches with at least one attributed action,
divided by searches. Revenue/AOV use completed demo orders with sample USD prices;
category revenue/AOV include only attributed line items in that category.
Autocomplete, recommendations and studio previews do not inflate these metrics.
The panel includes no-results queries, top searches, top products, category
breakdowns and Insights delivery counts. Empty periods display zero activity.

Merchandising publishes **real Algolia Rules**: set a query, optionally filter a
category, select products and order their promotions. Enable, disable or remove
rules without importing the catalog again. Only rules prefixed `store-` are
managed here; other existing rules are preserved. Relevance changes the native
searchable attribute order and custom tie-breakers. Studio writes accept only
loopback requests from the local demo origin; add authentication before exposing
this application beyond local development.

Searches request `clickAnalytics` and send a persistent anonymous `userToken`.
The server verifies search-to-product attribution and records absolute positions
before forwarding view/click/add-to-cart/purchase events to Algolia Insights.
It saves delivery status so temporary failures are visible and can be retried in
the studio. Use a dedicated search-scoped `ALGOLIA_INSIGHTS_API_KEY` if desired;
otherwise the existing server-side key is used. No Algolia admin key reaches the
browser. Algolia searches are tagged `northstar-storefront` for its own analytics.
Popular suggestions can be synced from measured top queries in the studio.

### Native AI features: activation required

These integrations are wired; this repository does not train substitute models
or change the Algolia account's subscription:

| Feature | Required Algolia setup | Demo configuration |
|---|---|---|
| Personalization | Activate/configure brand and category affinities and event weights in the dashboard. | Set `ALGOLIA_PERSONALIZATION_ENABLED=true`, restart campaign-api. Searches send `enablePersonalization` and the same anonymous token used by events. |
| Dynamic Re-Ranking | Activate the model and collect sufficient click/conversion traffic. | Set `ALGOLIA_RERANKING_ENABLED=true`, restart campaign-api. Searches send `enableReRanking`. |
| Query Categorization | Configure category predictions plus automatic boosting/filtering in Algolia. | Native engine configuration applies automatically. Set `ALGOLIA_QUERY_CATEGORIZATION_ENABLED=true` after activation to reflect setup status in the studio. Search responses retain native prediction metadata. |
| NeuralSearch | Activate the semantic model and set the product index's native `mode` to `neuralSearch`. | The storefront follows index mode and sends natural-language queries unchanged. Until activation it uses keyword search. |

Configuration flags indicate requested integration behavior, not proof that a
model has trained or changed a particular result. Search studio labels this
explicitly. Official references: [personalization](https://www.algolia.com/doc/api-reference/api-parameters/enablePersonalization),
[Dynamic Re-Ranking](https://www.algolia.com/doc/api-reference/api-parameters/enableReRanking),
[Query Categorization](https://www.algolia.com/products/features/query-categorization),
[NeuralSearch mode](https://www.algolia.com/doc/api-reference/api-parameters/mode).

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
- The worker's RabbitMQ consumer currently just logs; in production it's
  where you'd hang cache warming, Slack notifications for high-budget
  launches, or a search-index consistency check.

### Create ads from photos in Codex

The local plugin in `plugins/retail-media` lets Codex write copy itself and save
campaigns through MCP using your existing Codex session. No separate model API
key is required in the application.

1. Start the demo services using the instructions above, including campaign-api
   on port 4001 and the website on port 3000.
2. Install the plugin dependency:
   `npm ci --prefix plugins/retail-media --ignore-scripts`.
3. Connect the local server to Codex (replace both absolute paths):

   ```sh
   codex mcp add retail-media --env RETAIL_MEDIA_UPLOAD_DIR=/absolute/path/to/photos -- node /absolute/path/to/retail-media-demo/plugins/retail-media/server/index.mjs
   ```

   The directory limits which local photos the tool can read. Choose the folder
   containing your attachments, or copy photos into a dedicated project folder.
   Optional server environment variables: `RETAIL_MEDIA_API_URL` and
   `RETAIL_MEDIA_WEB_URL` (defaults `http://localhost:4001` and
   `http://localhost:3000`). This bridge supports loopback URLs only because the
   demo API has no authentication. Keep the demo services private.
4. Use the workflow instructions in
   `plugins/retail-media/skills/create-ad/SKILL.md`, or load the full plugin from
   that directory through a local plugin marketplace. Portable `plugin.json`,
   `mcp.json` and a Codex compatibility manifest are included. The MCP-only
   connection above exposes the tools without installing the packaged skill.
5. Attach a photo and prompt Codex, for example:
   “Use the retail-media tools to create a draft ad for these trainers. Acme,
   SKU TRAIN-001, destination https://shop.example.com/trainers, premium tone,
   running category, search placement. Daily budget €10, total budget €100,
   December 1–10, 2026, frequency cap 3. Use my attached photo.”

Codex retrieves the current campaign schema, uploads the photo and saves the ad.
If an attachment has no readable local path, supply its local path. The dashboard
refreshes every five seconds and shows draft photos and copy. Ask Codex to
activate a saved ad when it should be published; active ads enter the existing
ad-delivery flow. The API validates campaign fields with the shared schema.

Images are limited to PNG, JPEG or WebP, up to 5 MiB, with signature checks.
They are stored under generated filenames in `data/assets` relative to the
campaign-api process working directory (override with `ASSET_DIRECTORY`), and
served at `/assets/...`. Preserve this directory to retain photos after restarts;
it is excluded from Git. There is no automatic image deletion or cloud storage.

Verify the bridge with `npm test --prefix plugins/retail-media`; run the API tests
with `npm test -w services/campaign-api`.

## Accessibility checks

The web app includes Playwright + axe-core regression tests covering WCAG 2 A/AA,
2.1 A/AA, 2.2 AA and axe best-practice checks. No rules in that scope are disabled and no application regions are excluded. Desktop (1440 px) and mobile (390 px) projects cover the
console, all campaign wizard steps, validation errors, the product picker,
preview, all search studio tabs, storefront search, product detail, cart and guides.
Additional assertions check keyboard navigation, skip links, focus restoration,
focus not being covered by the sticky header, readable step/placeholder contrast,
and 320 px reflow with increased text spacing.

With the campaign API, ad-delivery API and their backing services running:

```bash
npm install
npx playwright install chromium
npm run test:a11y
```

The test runner starts the web app if needed and reuses a running local server.
`PLAYWRIGHT_BASE_URL` can select another local web address. To reuse a compatible
installed Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its full
executable path. Standard Playwright browser installation is recommended for CI.

The HTML test report is saved under `apps/web/playwright-report`; screenshots,
axe JSON and failure traces are attached to test results. The current audit's
before/after screenshots and JSON are saved locally in `artifacts/accessibility`.
Generated reports are excluded from Git. Tests stop at campaign review and do
not publish campaigns or collect payments. The preview's served-ad test uses an
explicit delivery fixture; other main-flow accessibility checks use the live
catalog/API. Cart tests record normal demo cart events.

These checks prevent common regressions but do not certify complete WCAG
conformance. Screen-reader testing with assistive-technology users, browser/OS
coverage and ongoing content review remain necessary. See
[Playwright's accessibility testing guidance](https://playwright.dev/docs/accessibility-testing).
