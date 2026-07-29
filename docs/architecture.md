# AI API Gateway As-Built Architecture

## 1. Scope and Status

This document describes the implementation present in the repository as of **2026-07-27**. It is
an as-built reference, not a target design. Consumer-specific keys and routes, request/attempt
lifecycle records, an immutable billing ledger, rebuildable analytics projections, and production
hardening are future work tracked in [the phased implementation plan](./plan.md).

The deployed unit is a Next.js application containing both the gateway data plane and its local
control-plane dashboard. PostgreSQL stores provider configuration and observed usage. The gateway
supports native forwarding for three protocol operations and intentionally performs no protocol
conversion or model alias substitution. Docker Compose can run PostgreSQL 17 and the
production-mode application as a complete local stack; schema changes are always explicit.

## 2. Runtime Components

```text
Client
  | native request + shared GATEWAY_TOKEN
  v
Next.js /v1 Route Handler
  | selects a built-in protocol adapter
  v
Shared-token authentication
  | reads model and protocol identity
  v
Provider repository cache
  | enabled + protocol + exact model + optional x-provider-id
  v
Protocol adapter -> upstream fetch
  | native response returned immediately
  +--------------------------+
                             v
                    asynchronous usage tracker
                             |
                             v
                  PostgreSQL usage table
                             |
                             v
                    dashboard queries
```

The main responsibilities are:

- **Next.js Route Handlers:** bind public paths to adapters and return protocol-shaped errors.
- **Protocol adapters:** extract authentication and model metadata, build the upstream URL and
  authentication header, forward the native payload, parse usage, and shape model/error responses.
- **Authentication:** compare every gateway credential to one configured shared token.
- **Provider repository:** load priority-sorted provider rows into a process-local cache and refresh it
  after dashboard mutations.
- **Forwarder:** use the selected provider's base URL, protocol endpoint, and API token for `fetch`.
- **Usage tracker:** observe a cloned response asynchronously and persist usage and estimated cost.
- **Dashboard:** manage provider records and directly query provider summaries and usage rows.

## 3. Public Protocol Surface

| Adapter identity   | Public operation            | Gateway authentication | Default upstream base URL   | Default endpoint       |
| ------------------ | --------------------------- | ---------------------- | --------------------------- | ---------------------- |
| `openaiCompatible` | `POST /v1/chat/completions` | Bearer token           | `https://api.openai.com`    | `/v1/chat/completions` |
| `openaiResponse`   | `POST /v1/responses`        | Bearer token           | `https://api.openai.com`    | `/v1/responses`        |
| `anthropic`        | `POST /v1/messages`         | `x-api-key`            | `https://api.anthropic.com` | `/v1/messages`         |

`GET /v1/models` also requires the shared token. Exactly one protocol authentication header must
be present. A Bearer token produces an OpenAI-compatible model list using enabled providers that
support either OpenAI adapter. An `x-api-key` produces an Anthropic-shaped list using enabled
Anthropic providers. Models are deduplicated and sorted. This endpoint does not apply
`x-provider-id` or filter by an individual requested model.

### 3.1 Native Forwarding

Adapters clone the request only where inspection or tracking needs an independent body stream. The
original JSON or SSE protocol is not converted. The request's `model` value is used for selection
and is not changed before forwarding.

Before the upstream request, the adapter removes these inbound headers:

- `authorization`
- `x-api-key`
- `x-provider-id`
- `x-provider-name`
- `connection`
- `host`
- `transfer-encoding`

It then injects the configured provider token as `Authorization: Bearer ...` for both OpenAI
adapters or `x-api-key: ...` for Anthropic. Other request headers are retained; there is not yet a
complete allowlist policy for all hop-by-hop, forwarding, or provider-specific headers.

The gateway returns the upstream status, status text, headers, and body. Because the Fetch runtime
may decode the body, it removes `content-encoding`, `content-length`, and `transfer-encoding` from
the response. Other upstream response headers are retained. Streaming responses remain streaming;
usage observation consumes a clone and does not require buffering the client-facing body.

## 4. Authentication and Routing

`GATEWAY_TOKEN` is the sole gateway credential. If it is absent, authentication falls back to the
literal value `TOKEN`. Dashboard login stores the same token in an HTTP-only cookie; `/v1` requests
use their protocol-specific header and bypass the dashboard cookie middleware.

There is no consumer, gateway-key, route, model-deployment, provider-connection, or independent
protocol-binding entity. A single `provider` row combines all upstream configuration.

For a generation request, routing proceeds as follows:

1. The adapter authenticates the protocol-specific header against the shared token.
2. It reads the `model` field from the native JSON request.
3. The provider repository returns its cached rows, loaded from PostgreSQL in ascending provider
   `order`.
4. The handler filters for provider enabled, exact protocol enabled, and exact model membership.
5. If `x-provider-id` is supplied, it selects that exact UUID among the filtered candidates.
6. Otherwise it selects the first filtered candidate.
7. The provider's non-empty protocol endpoint is used, or the adapter default otherwise.

A miss returns a protocol-shaped route-not-found response. There are no model aliases, weights,
health scores, retries, automatic failover, or consumer-specific policies. Provider order is thus
deterministic for a stable database configuration but is not a traffic-management policy.

## 5. Control Plane

The authenticated dashboard provides the current local control plane. Operators can:

- create, update, delete, enable, and disable providers;
- configure the provider base URL, API token, model list, test model, and website URL;
- enable protocols independently and set each protocol's upstream endpoint;
- configure a cost multiplier and model-specific pricing overrides;
- discover models through an upstream `/v1/models` request;
- send a non-streaming test request through a provider selected by UUID; and
- view provider statistics over `30m`, `1h`, `6h`, `24h`, `7d`, `30d`, or all time.

Model discovery uses the provider credential directly and expects a `{ data: [{ id }] }` response.
Connection tests use the shared gateway token and `x-provider-id`, so they exercise routing and
forwarding as well as upstream access. Discovery has a 15-second timeout and connection tests have
a 30-second timeout; ordinary gateway generation requests have no explicit application timeout.

The usage page reads persisted rows with model, client user-agent, protocol, stream, status, and
time-period filters. Its periods are `24h`, `7d`, `30d`, and all time.

## 6. Persistence Boundary

PostgreSQL is accessed through Drizzle ORM and `postgres-js`. `DATABASE_URL` is required and is used
by both the application and Drizzle tooling. The two domain tables live in the `gateway` schema.
Host development connects to the published PostgreSQL port; Compose services use the internal `db`
hostname. Schema management uses `drizzle-kit push` rather than versioned migrations.
Compose lifecycle commands do not apply schema changes. Both initialization and later schema pushes
target `DATABASE_URL`; `bun run db:reset` immediately drops and recreates the `gateway` schema in a
transaction before rebuilding it with Drizzle. The reset leaves other schemas intact, although
`CASCADE` can remove objects elsewhere that depend on `gateway` objects.

### 6.1 `provider`

The `provider` table stores:

- provider name and enablement;
- unique routing priority (`order`), retained even while the provider is disabled;
- model list and selected test model;
- per-protocol endpoint and enablement configuration;
- optional base URL and website URL;
- plaintext upstream API token;
- provider cost multiplier and model-specific pricing overrides; and
- creation and update timestamps.

The provider UUID is the primary key and the editable provider name remains unique. Provider
records use Next.js Cache Components with the `providers` tag; dashboard Server Actions invalidate
that tag after successful mutations. Creation and priority moves use PostgreSQL transactions and a
transaction-scoped advisory lock to serialize order allocation across application instances.

### 6.2 `usage`

The `usage` table stores one row for each successfully initiated request that receives an upstream
response and reaches tracking. It contains:

- generated ID, nullable provider UUID, requested model, client user-agent, and protocol type;
- upstream HTTP status, stream flag, parsed upstream or observer error;
- input, output, cache-creation, and cache-read token components;
- integer estimated cost in microdollars, cost completeness status, and a rate snapshot; and
- start time, time to first byte, and end time.

Usage references provider UUID with `ON DELETE SET NULL`. Queries join the current provider name, so
renames appear immediately in historical detail while deletion preserves usage with no provider
name. Stored cost snapshots are not recalculated.

There are no separate gateway request, upstream attempt, normalized usage event, billing profile,
charge, adjustment, or ledger tables.

## 7. Usage and Provider Cost Estimation

Once an upstream response is available, the handler clones the request and response for tracking,
returns the client-facing response, and schedules persistence with Next.js `after`. Tracking failure
is logged and does not change the response already sent to the client.

For successful JSON responses, each adapter parses its native usage object. For SSE responses, it
consumes JSON events from the clone and retains the relevant final or accumulated usage fields.
Non-success responses store a parsed JSON error body when possible. Parser failures are stored as
the usage error. Requests rejected before an upstream response, and network failures before a
response exists, do not currently produce usage rows.

The four normalized token components are:

- non-cached input tokens;
- output tokens;
- cache-creation input tokens; and
- cache-read input tokens.

OpenAI-reported total input is reduced by reported cached input. Anthropic cache fields are retained
directly. Missing usage remains `null`; it is not treated as zero when deciding completeness.

### 7.1 Pricing

The repository pricing catalog declares USD rates per 1,000,000 tokens. Resolution order is:

1. a provider's override for the exact model;
2. the repository catalog entry for the exact model; or
3. the catalog's configured fallback model.

Applicable tier rates are selected when all input components are known. The provider multiplier is
then applied. Calculation uses scaled integers and rounds the final result to the nearest integer
microdollar. The stored snapshot contains the exact rates and multiplier selected for that request.

Cost status is `complete` when all four components are known, `partial` when some are known,
`unavailable` when none are known, and `error` when calculation itself fails. Provider statistics
sum available cost values and separately flag whether every included usage row is complete.

Historical snapshots are stable when catalog, override, or multiplier configuration changes. They
are provider cost estimates only. They do not establish a consumer price, billing obligation,
immutable accounting fact, or idempotent ledger entry.

## 8. Analytics and Operations

The dashboard queries the `usage` table directly. Provider summaries are SQL aggregates over the
same rows; the usage view is a paginated direct query. There is no event stream, projection store,
materialized analytics model, projection version, rebuild process, or reconciliation workflow.

Current observability is limited to application logs and stored usage fields. There is no shared
correlation ID spanning the client request, route decision, upstream request, and usage row, and no
request/attempt trace for failures that occur before tracking.

## 9. Security, Deployment, and Scale Limits

The current trust boundary is suitable for a local gateway used by trusted callers:

- one shared gateway token authenticates every API caller and dashboard operator;
- the development fallback token is predictable if configuration is missing;
- provider tokens are stored in plaintext in the private PostgreSQL schema;
- no consumer isolation, hashed API keys, rotation, revocation, RBAC, audit trail, quota, or rate
  limit exists;
- request headers do not use a comprehensive allowlist and ordinary upstream requests have no
  explicit timeout policy;
- no retry, failover, health-based routing, or circuit breaker exists;
- no documented production backup, restore, migration rollback, or disaster-recovery process
  exists; and
- the Next.js cache handler and provider-tag invalidation are not coordinated across application
  processes.

Do not expose the current application directly to untrusted traffic or use estimated provider cost
as authoritative consumer billing. Production deployment requires the controls and data-model
boundaries described in [Phase 3 onward of the plan](./plan.md).
