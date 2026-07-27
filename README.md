# oh-my-ai-gateway

`oh-my-ai-gateway` is a runnable local AI API gateway. It forwards native OpenAI Chat
Completions, OpenAI Responses, and Anthropic Messages requests to providers configured in PostgreSQL,
without converting protocols or rewriting model names.

The included dashboard manages providers and shows request usage and estimated provider cost. The
current implementation is intended for local development and trusted environments, not direct
production deployment.

## Current Capabilities

- Native request and response forwarding for three protocol operations, including SSE streams.
- A protocol-shaped model list assembled from enabled, configured providers.
- PostgreSQL-backed provider creation, editing, deletion, enablement, protocol endpoints, models, and
  credentials.
- Upstream model discovery, a selectable test model, and connection tests through the gateway.
- Asynchronous usage records with response status, model, protocol, stream mode, token counts,
  time to first byte, upstream errors, and timestamps.
- Provider cost estimates using repository rates, provider multipliers, model-specific overrides,
  fallback pricing, and per-request rate snapshots.
- Provider summaries and a filterable usage dashboard.

See [the as-built architecture](docs/architecture.md) for implementation details and
[the phased plan](docs/plan.md) for work that is not yet implemented.

## Gateway Endpoints

| Method | Endpoint               | Gateway authentication                  | Behavior                                                                                            |
| ------ | ---------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST` | `/v1/chat/completions` | `Authorization: Bearer <GATEWAY_TOKEN>` | Native OpenAI Chat Completions-compatible forwarding                                                |
| `POST` | `/v1/responses`        | `Authorization: Bearer <GATEWAY_TOKEN>` | Native OpenAI Responses-compatible forwarding                                                       |
| `POST` | `/v1/messages`         | `x-api-key: <GATEWAY_TOKEN>`            | Native Anthropic Messages-compatible forwarding                                                     |
| `GET`  | `/v1/models`           | Exactly one of the headers above        | Returns configured models in OpenAI or Anthropic list format according to the authentication header |

For `GET /v1/models`, a Bearer token selects the OpenAI response shape and includes models from
providers with either OpenAI protocol enabled. An `x-api-key` selects the Anthropic response shape
and includes models from Anthropic-enabled providers. Supplying both headers, or neither, is an
error.

### Routing

For generation requests, the gateway filters providers by all of the following:

1. the provider is enabled;
2. the matching protocol is enabled; and
3. the requested `model` appears in the provider's configured model list.

Providers are loaded in ascending `order`, and the first eligible provider is used as the default
route. If `x-provider-id: <uuid>` is present, that exact
provider is selected from the filtered candidates. Provider UUIDs can be copied from the Providers
dashboard. Otherwise, the first candidate is used. If no candidate matches, the gateway returns a
protocol-shaped route-not-found error. Disabled providers retain their priority position but remain
ineligible for routing. The former `x-provider-name` header is not supported.

The configured protocol endpoint overrides the adapter's default endpoint when it is non-empty.
The gateway does not translate protocols, replace model aliases, retry, fail over, or load balance.
The request body is sent upstream in its native form.

## Getting Started

Prerequisites: Bun, Docker, and the Supabase CLI installed by the project dependencies.

```bash
bun install
cp .env.example .env
```

Edit `.env` and replace the example value with a strong, private `GATEWAY_TOKEN`. Then start local
Supabase, push the Drizzle schema, and start the application:

```bash
bun run db:start
bun run db:push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/auth` with the same gateway token
to access `/dashboard`. Provider configuration is available at `/dashboard/providers`, usage at
`/dashboard/usage`, and the built-in API reference at `/dashboard/api-reference`.

The built-in API reference currently documents the generation endpoints but not `/v1/models`; the
endpoint table above is the current reference for model listing.

### Environment Variables

| Variable                 | Purpose                                                                  | Default when omitted                     |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------- |
| `GATEWAY_TOKEN`          | Shared secret for all gateway endpoints and dashboard login              | `TOKEN` (development fallback; insecure) |
| `DATABASE_URL`           | Runtime PostgreSQL connection; use the transaction pooler on Vercel      | Required                                 |
| `DATABASE_MIGRATION_URL` | Direct or session-pooled connection for schema pushes and Drizzle Studio | `DATABASE_URL`                           |
| `DATABASE_POOL_MAX`      | Maximum runtime connections per application instance                     | `1`                                      |

## Provider Cost Estimation

Cost values are provider cost estimates, not consumer bills or ledger entries. Catalog and override
rates are denominated in USD per 1,000,000 tokens. Each provider can apply a decimal multiplier and
model-specific rate overrides. When neither an override nor an exact catalog model exists, the
catalog's fallback model supplies the rates.

The gateway calculates integer microdollars from the token components it can parse and stores the
selected rates and multiplier with the usage record. The completeness state is:

- `complete`: all input, output, cache-read, and cache-write token components are known;
- `partial`: at least one, but not all, token components are known;
- `unavailable`: no token component is known; or
- `error`: cost calculation failed.

Changing provider pricing later does not rewrite existing usage snapshots. These snapshots improve
historical explainability, but they are not an immutable billing ledger.

## Project Commands

```bash
bun run dev          # Start the development server
bun run build        # Create a production build
bun run start        # Start the production server
bun run test         # Run the test suite
bun run lint         # Run Oxlint
bun run format       # Format supported project files
bun run format:check # Check formatting without changing files
bun run typecheck    # Run TypeScript without emitting files
bun run check        # Run lint, format:check, and typecheck

bun run db:start     # Start the local Supabase stack
bun run db:stop      # Stop the local Supabase stack
bun run db:push      # Push the current schema directly to PostgreSQL
bun run db:studio    # Open Drizzle Studio using the migration connection
```

### Remove the Local Database

The following cleanup is irreversible and deletes all local database data. Stop the Supabase stack
and remove its data volumes first:

```bash
supabase stop --project-id oh-my-ai-gateway --no-backup --yes
```

If Docker resources remain after Supabase stops, remove the database container and the
`supabase_db_oh-my-ai-gateway` volume explicitly:

```bash
docker rm -f supabase_db_oh-my-ai-gateway 2>/dev/null || true
docker volume rm supabase_db_oh-my-ai-gateway 2>/dev/null || true
```

Verify that the database container and persistent volume are gone:

```bash
docker ps -a --filter name=supabase_db_oh-my-ai-gateway
docker volume ls --filter name=supabase_db_oh-my-ai-gateway
```

## Limitations and Security

The current gateway has one shared token and no consumer identity or isolation. It has no gateway
key hashing, rotation, revocation, per-consumer routes, quotas, rate limiting, automatic retry or
failover, or authoritative billing ledger. The fallback gateway token is predictable when
`GATEWAY_TOKEN` is unset.

Provider API tokens are stored in plaintext in the private `gateway` PostgreSQL schema. Protect the database,
`.env`, logs, host, and backups accordingly. There is no dedicated secret-management boundary or
production backup and recovery procedure. Do not expose this application directly to untrusted
clients or treat its cost estimates as chargeable financial facts in its current form.

## Technology

- Next.js App Router and React
- TypeScript with strict type checking
- Supabase PostgreSQL, Drizzle ORM, and `postgres`
- Tailwind CSS
- Bun
- Oxlint and Oxfmt
