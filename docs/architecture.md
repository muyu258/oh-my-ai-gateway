# AI API Gateway Architecture

## 1. Status and Purpose

This document defines the target architecture for `oh-my-ai-gateway`. It is a design document,
not a description of functionality that already exists.

The repository currently contains a Next.js application scaffold. Gateway endpoints, provider
integrations, persistence, authentication, metering, billing, and operational tooling have not yet
been implemented.

The initial product is a native-protocol AI API gateway that:

- exposes familiar protocol-native HTTP endpoints;
- authenticates callers with gateway-owned API keys;
- routes requests to configured upstream provider bindings;
- forwards request and response payloads without protocol conversion;
- observes normal and streaming responses for operational statistics and provider-reported usage;
- normalizes usage for cross-provider accounting;
- calculates charges from versioned rates and multipliers; and
- keeps financial records separate from rebuildable analytics.

The implementation will start inside the existing Next.js application, but the data-plane core must
remain independent from Next.js so it can be moved to a dedicated runtime later if traffic or
streaming requirements demand it.

## 2. Initial Scope

### 2.1 Goals

The initial architecture must support:

1. Native protocol endpoints on one gateway host.
2. Consumer attribution through gateway-owned API keys.
3. Deterministic routing by consumer, inbound protocol, and requested model.
4. Multiple protocol bindings for one provider.
5. Transparent request and response payload forwarding.
6. Non-streaming JSON and streaming SSE responses.
7. Request status, latency, byte-count, error, and usage statistics.
8. Protocol-neutral normalized usage records.
9. Versioned component-based prices and multipliers.
10. Idempotent, immutable charge records.
11. Separate data-plane, control-plane, analytics, and ledger responsibilities.
12. Framework-neutral domain and application boundaries.

### 2.2 Non-goals

The following are intentionally outside the first implementation stages:

- protocol conversion between OpenAI, Anthropic, Gemini, or other formats;
- a synthetic universal request or response schema at the public gateway edge;
- automatic provider failover or retries for generation requests;
- weighted load balancing or health-based route selection;
- automatic provider model catalog synchronization;
- complete support for every endpoint in a provider API;
- file, batch, fine-tuning, or administrative provider APIs;
- a complete user-management or role-based access-control system;
- balance reservation, quotas, and rate limiting in the first vertical slice;
- using analytics aggregates as the source of truth for billing; and
- storing complete prompts or responses by default.

These capabilities may be added later, but they must not be hidden inside the initial forwarding or
routing abstractions.

## 3. Architectural Invariants

The following decisions are constraints, not implementation suggestions.

1. **Inbound and outbound protocol identities must match.** A request received as
   `anthropic.messages` may only route to a binding that supports `anthropic.messages`.
2. **Protocol handlers are code; provider bindings are configuration.** Database records may refer
   to built-in protocol identifiers, but may not inject arbitrary protocol behavior.
3. **A provider is independent from its protocols.** One provider may expose any number of protocol
   bindings, each with its own endpoint and credential strategy.
4. **The client payload remains native.** The gateway may inspect a body for routing and usage
   metadata, but it does not reshape the request or response.
5. **Streaming is part of the primary contract.** Usage collection may not require buffering a full
   response or delaying client-visible tokens.
6. **Missing usage is not zero usage.** Unknown, partial, and parse-failed usage are explicit states.
7. **Billing uses immutable snapshots.** Later changes to a rate or multiplier may not rewrite a
   historical charge.
8. **Analytics is derived; the ledger is authoritative.** Analytics can be rebuilt. Financial facts
   are immutable and corrected with adjustments.
9. **Provider credentials are injected only at the upstream boundary.** Gateway keys and client
   authorization values never reach an upstream provider.
10. **Next.js is a host adapter.** Protocol selection, route resolution, metering, and billing rules
    do not live directly in Route Handlers.

## 4. Terminology and Domain Model

### 4.1 Consumer

A consumer is the entity using the gateway. It may initially represent a person, team, service, or
project. The gateway attributes routing decisions, usage, and charges to a consumer.

### 4.2 Gateway API Key

A gateway API key authenticates a consumer. It is owned and validated by this gateway, not by an
upstream provider.

The stored representation should include a non-secret key identifier and a secure hash of the
secret. Raw gateway keys must not be stored or logged.

### 4.3 Protocol Handler

A protocol handler is a built-in code module for one independently observable native API operation.
It knows how to:

- match an HTTP method and path;
- inspect a request without changing its payload;
- extract the requested model and streaming mode;
- construct the protocol-specific upstream URL;
- apply protocol-specific safe header rules;
- observe normal and streaming responses; and
- normalize provider-reported usage and errors.

A handler is an adapter to native wire semantics, not a protocol converter.

The first planned handlers are:

| Protocol handler          | Native endpoint             | Initial responsibility                                     |
| ------------------------- | --------------------------- | ---------------------------------------------------------- |
| `openai.chat-completions` | `POST /v1/chat/completions` | OpenAI Chat Completions-compatible requests and SSE events |
| `openai.responses`        | `POST /v1/responses`        | OpenAI Responses-compatible requests and events            |
| `anthropic.messages`      | `POST /v1/messages`         | Anthropic Messages-compatible requests and SSE events      |

These identifiers are intentionally more specific than a provider brand. A provider that supports
Chat Completions does not automatically support Responses.

### 4.4 Provider

A provider is a logical upstream vendor or service, such as a first-party model vendor, an
aggregator, or a self-hosted inference service. It is primarily an organizational and control-plane
object.

A provider does not have one protocol column.

### 4.5 Provider Connection

A provider connection represents a concrete upstream account or connection boundary. It may define:

- a credential reference;
- region or environment;
- connection-level timeouts;
- enabled or disabled state; and
- operational metadata.

One provider can have multiple connections, such as production and development accounts or
regional endpoints.

### 4.6 Protocol Binding

A protocol binding declares that one provider connection supports one built-in protocol handler.
It contains the protocol-specific upstream configuration:

- provider connection identity;
- protocol handler identifier;
- base URL or endpoint prefix;
- authentication strategy;
- credential reference;
- fixed protocol or provider headers;
- enabled state; and
- optionally supported operations or capabilities.

The relationship is:

```text
Provider
  └── Provider Connection
        ├── Protocol Binding: openai.chat-completions
        ├── Protocol Binding: openai.responses
        └── Protocol Binding: anthropic.messages
```

Different bindings under one provider may use different base URLs, authentication headers, or
credentials.

### 4.7 Model Deployment

A model deployment is an upstream model identifier reachable through a protocol binding. It is the
combination of:

- protocol binding;
- upstream model identifier;
- enabled state; and
- optional model-specific metadata.

The first persistence model may store `upstreamModel` directly on a route. Model deployments remain
a distinct domain concept so they can be separated when model catalogs and richer policies are
introduced.

### 4.8 Gateway Route

A gateway route maps an inbound request to a model deployment or an equivalent binding/model pair.
The initial route key is:

```text
consumer + inbound protocol + requested model
```

The route result contains:

```text
protocol binding + upstream model + billing profile
```

A route may implement a public model alias. For example, a client may request `claude-default` while
the selected upstream model is a concrete provider-specific identifier.

Model substitution must always be an explicit route configuration. The gateway may not silently
change an unsupported model.

### 4.9 Gateway Request

A gateway request represents one client-visible call. It records attribution, routing, lifecycle,
status, timing, bytes, and the final metering and billing outcome.

### 4.10 Upstream Attempt

An upstream attempt represents one actual call from the gateway to an upstream binding.

The initial implementation has one attempt per gateway request. The distinction is retained so
future retries or failover can be represented without rewriting the request, usage, and billing
models.

### 4.11 Normalized Usage Record

A normalized usage record captures provider-reported consumption in a protocol-neutral shape while
retaining protocol and provider provenance.

### 4.12 Billing Profile

A billing profile is a versioned set of usage-component rates, multipliers, units, and rounding
rules. A route selects the billing profile used for a request.

### 4.13 Charge Record

A charge record is an immutable, idempotently created financial or credit-accounting fact derived
from a usage record and an exact billing-profile version.

### 4.14 Analytics Projection

An analytics projection is rebuildable reporting data derived from gateway requests, attempts,
usage records, and charge records. It is optimized for dashboards and operational queries and is not
the billing authority.

## 5. System Context

The logical system flow is:

```text
Client
  │ native request + gateway API key
  ▼
Ingress Host Adapter
  ▼
Protocol Registry ── identifies the native handler
  ▼
Consumer Authentication
  ▼
Route Resolver ── consumer + protocol + requested model
  ▼
Provider Protocol Binding
  ▼
HTTP Forwarder ── safe headers + original payload
  ▼
Upstream Provider
  │
  ├── native response sent to the client
  └── passive response observer
          ▼
      Normalized Usage
          ├── Billing Profile → Immutable Charge Ledger
          └── Rebuildable Analytics Projections
```

The response observer is not a protocol conversion step and must not become a blocking dependency
for client delivery.

## 6. Request Lifecycle

### 6.1 Processing Sequence

A request follows this sequence:

1. Match the HTTP method and path to a built-in protocol handler.
2. Authenticate the gateway API key and resolve the consumer.
3. Read the raw request body once and inspect a copy for minimal metadata.
4. Extract the requested model and streaming mode through the protocol handler.
5. Resolve an enabled route for the consumer, protocol, and requested model.
6. Verify that the selected protocol binding has the same protocol identity as the inbound handler.
7. Resolve and snapshot the billing-profile version associated with the route.
8. Create a gateway request and its first upstream attempt.
9. Build the upstream URL and headers while retaining the raw request body.
10. Start the upstream request and propagate the client cancellation signal.
11. Return the upstream status, safe headers, and native response body to the client.
12. Observe the response for timing, bytes, errors, and provider-reported usage.
13. Finalize the upstream attempt and gateway request.
14. Write normalized usage and create an idempotent charge when policy permits.
15. Publish or update analytics projections independently from ledger finalization.

### 6.2 Request State

The request lifecycle should distinguish at least:

```text
received
  → routed
  → upstream_started
  → streaming
  → succeeded | failed | cancelled
```

Not every request will enter `streaming`. State transitions must be monotonic and observable.

### 6.3 Billing State

Billing state is separate from HTTP lifecycle state:

```text
pending
  → finalized
  → usage_missing
  → usage_partial
  → usage_parse_failed
  → not_billable
```

A successful HTTP response does not imply successful billing, and a failed or cancelled request does
not prove that the provider consumed no billable resources.

## 7. Native Protocol Handling

### 7.1 Handler Responsibilities

A protocol handler conceptually implements operations equivalent to:

```ts
interface ProtocolHandler {
  readonly id: ProtocolId;

  matches(method: string, pathname: string): boolean;

  inspectRequest(input: { rawBody: Uint8Array; headers: Headers; url: URL }): RequestMetadata;

  buildUpstreamRequest(input: {
    rawBody: Uint8Array;
    inboundHeaders: Headers;
    metadata: RequestMetadata;
    binding: ProtocolBinding;
  }): UpstreamRequest;

  observeResponse(input: { response: Response; metadata: RequestMetadata }): ObservedResponse;
}
```

The exact TypeScript interface will be finalized during implementation. The design requirement is
that routing and billing consume protocol-neutral metadata and do not inspect provider-specific JSON
directly.

### 7.2 Compile-time Registry

Supported handlers are registered in code using stable identifiers. Persistent configuration refers
to those identifiers.

Adding a protocol therefore requires:

1. adding a handler implementation;
2. registering its identifier;
3. adding protocol conformance and streaming tests; and
4. configuring provider bindings that opt into the handler.

A database row alone cannot create a new wire protocol implementation.

### 7.3 Same-protocol Eligibility

A route candidate is eligible only when:

```text
inbound protocol handler ID = provider protocol binding handler ID
```

Cross-protocol fallback is not eligible. If future conversion is introduced, it must be represented
as a separate, explicit conversion capability with its own tests and accounting behavior.

## 8. Routing

### 8.1 Initial Lookup Inputs

The initial route resolver uses:

- authenticated consumer ID;
- inbound protocol handler ID; and
- requested model or gateway model alias.

Future route policy may also consider region, consumer entitlement, provider health, capacity,
priority, or cost. Those dimensions should extend the resolver input rather than bypass it.

### 8.2 Deterministic Resolution

The initial resolver should follow this order:

1. reject a missing, invalid, expired, or disabled gateway key;
2. reject a disabled consumer;
3. identify the protocol from the ingress endpoint;
4. extract the requested model with the matching protocol handler;
5. find enabled route candidates for the consumer, protocol, and model;
6. remove candidates whose provider, connection, binding, or deployment is disabled;
7. select the configured deterministic candidate; and
8. return its binding, upstream model, and billing profile.

A missing route, unsupported protocol, disabled binding, or unavailable model returns a gateway
error before an upstream attempt is made.

The initial implementation does not silently:

- change the requested model;
- use a route belonging to another consumer;
- fall back to another protocol; or
- retry against another provider.

### 8.3 Future Selection Policy

Priority, weighted selection, health checks, and failover may be introduced after request and charge
idempotency are stable. The route resolver should eventually return both the selected route and a
structured decision trace suitable for diagnostics.

## 9. Transparent Forwarding

### 9.1 Transparency Definition

The gateway provides **payload-semantic transparency**, not unrestricted byte-for-byte proxying.
Some transport changes are necessary for security and correct HTTP behavior.

The gateway must:

- forward the original request body without reshaping its JSON;
- preserve supported query parameters;
- preserve native response bodies and SSE event formats;
- preserve the upstream HTTP status where safe;
- avoid translating provider errors into another provider's schema; and
- avoid inserting request fields merely to improve statistics unless such behavior is explicitly
  configured and documented later.

### 9.2 Request Header Policy

The forwarding boundary must:

- remove gateway API keys and client authorization values;
- inject only the selected provider credential;
- replace or allow the HTTP client to derive `Host`;
- remove hop-by-hop headers, including `Connection`, `Keep-Alive`, `Transfer-Encoding`, `Upgrade`,
  `Proxy-Authorization`, `Proxy-Authenticate`, and `Trailer`;
- recompute or remove `Content-Length` when necessary;
- preserve protocol-required version and feature headers according to explicit allow rules;
- preserve safe tracing metadata or create a gateway correlation ID; and
- never accept an arbitrary client-provided upstream credential in the MVP.

Provider-specific fixed headers belong to the protocol binding, not to the consumer request.

### 9.3 Response Header Policy

The response boundary should:

- preserve safe content type, cache, request-ID, and provider rate-limit metadata;
- remove hop-by-hop response headers;
- remove provider cookies and sensitive internal headers;
- avoid claiming that a gateway correlation ID is a provider-native request ID; and
- keep the gateway and provider request IDs as separate fields internally.

### 9.4 Cancellation and Timeouts

A client disconnect should propagate cancellation to the upstream request where the runtime permits
it. The gateway must mark the request as cancelled rather than successful.

Cancellation does not imply zero usage. If terminal provider usage is unavailable, the usage state is
unknown or partial and must be reconciled according to billing policy.

The MVP uses explicit upstream connection and response timeouts but does not automatically replay a
generation request after an ambiguous timeout.

## 10. Streaming and Response Observation

### 10.1 Streaming Contract

For streaming endpoints, upstream bytes must flow to the client with minimal buffering. The observer
may incrementally parse a copy or branch of the stream but may not:

- buffer the complete response;
- reorder frames;
- rewrite event names or payloads;
- wait for usage parsing before forwarding a chunk; or
- fail the client stream only because metering parsing failed.

Conceptually:

```text
Upstream SSE
  ├── immediate native stream → client
  └── passive protocol observer → timing, bytes, errors, usage
```

### 10.2 Observation Outcomes

The response observer reports one of:

- complete provider-reported usage;
- partial provider-reported usage;
- no provider-reported usage;
- usage parse failure;
- upstream error before usage; or
- client cancellation before terminal usage.

Parsing failures are internal observability events. If the upstream stream itself remains valid, the
client response continues unchanged.

### 10.3 Strict Pass-through and Usage Availability

Some OpenAI-compatible streaming APIs report usage only when a request includes an opt-in field. The
initial strict pass-through mode does not inject that field.

Therefore:

- provider-reported usage is recorded when present;
- missing usage is represented as missing;
- locally estimated usage is not presented as provider-reported usage; and
- estimated usage may not drive financial charges unless a billing profile explicitly permits an
  estimation policy in a later phase.

## 11. Metering and Normalized Usage

### 11.1 Normalized Usage Shape

The normalized usage model should support at least:

```ts
type NormalizedUsage = {
  inputTokens?: bigint;
  outputTokens?: bigint;
  cacheReadInputTokens?: bigint;
  cacheWriteInputTokens?: bigint;
  reasoningTokens?: bigint;
};
```

Optional values are intentional:

- `0` means that the provider explicitly reported zero;
- an absent value means that the provider did not report the component or the gateway could not
  determine it.

Additional usage components such as image, audio, search, request, or tool-call units can be added as
new typed components without changing native protocol payloads.

### 11.2 Usage Record Metadata

A durable usage record should include:

- gateway request ID;
- upstream attempt ID;
- consumer and gateway-key identity;
- inbound protocol ID;
- provider and protocol-binding identity;
- requested model and resolved upstream model;
- request, first-byte, and completion timestamps;
- terminal request and attempt status;
- normalized usage components;
- usage completeness state;
- usage source, such as `provider_reported`, `gateway_estimated`, or `unavailable`;
- protocol parser version; and
- a redacted provider-specific raw usage snapshot or reference when appropriate.

The raw usage snapshot is limited to the provider's usage metadata. It is not the complete prompt or
response.

### 11.3 Request and Attempt Statistics

Operational statistics should include:

- request count by consumer, protocol, model, route, provider, and binding;
- HTTP and internal error categories;
- client cancellation;
- total latency;
- upstream latency;
- time to first byte;
- request and response byte counts; and
- usage completeness and parse-failure rates.

## 12. Billing and Multipliers

### 12.1 Separation of Concerns

Billing has four distinct concepts:

1. **Usage record:** what the provider reported or what the gateway explicitly classified as
   unavailable.
2. **Billing profile:** the versioned prices, multipliers, units, and rounding rules.
3. **Charge record:** the immutable calculation result for one request or adjustment.
4. **Analytics projection:** derived summaries of usage, cost, and revenue.

### 12.2 Component-based Profiles

A single global multiplier is insufficient for the long-term model because input, output, cache,
and other components commonly have different values.

A billing profile should contain items such as:

```text
input:
  unit price
  multiplier

output:
  unit price
  multiplier

cache read:
  unit price
  multiplier

cache write:
  unit price
  multiplier
```

A profile may represent either:

- credit accounting, where quantity multiplied by a component multiplier produces billable units;
- currency accounting, where quantity, unit price, and multiplier produce an amount; or
- provider cost and consumer price as separate calculations.

The exact product semantics remain an open decision, but the storage model must preserve component
values and calculation provenance.

### 12.3 Calculation Model

A generic component calculation is:

```text
component amount = quantity × unit price × multiplier
final amount = rounded sum of component amounts
```

For credit-only accounting, `unit price` can be represented by the base unit conversion defined by
the profile rather than by an implicit floating-point constant.

### 12.4 Fixed Precision

Money, credits, token quantities, rates, and multipliers must not depend on JavaScript binary
floating-point arithmetic.

The implementation should use:

- integer token and unit quantities;
- database decimal or application decimal values for rates and multipliers; and
- integer minor or micro currency units for finalized amounts where practical.

The billing profile must define the rounding mode and the stage at which rounding occurs.

### 12.5 Versioning and Snapshots

At charge time, the gateway resolves one exact billing-profile version. The charge stores a snapshot
of all values required to reproduce the calculation:

- profile and version identifiers;
- usage record identity;
- usage quantities;
- component rates;
- component multipliers;
- rounding policy;
- currency or credit unit; and
- final amount.

Editing a profile creates a new version for future charges. Historical charges remain unchanged.

### 12.6 Idempotency and Adjustments

Charge creation must be idempotent. Reprocessing a finalize operation may not post the same charge
twice.

A uniqueness boundary should include the gateway request or usage record and a charge type. The exact
key will be finalized with the persistence design.

Charge records are immutable. Corrections create compensating adjustment records that reference the
original charge and explain the reason.

## 13. Ledger and Analytics Boundaries

### 13.1 Ledger

The ledger is responsible for:

- immutable charge and adjustment facts;
- idempotency;
- reconciliation;
- invoicing or credit deduction inputs; and
- auditability.

It is the financial source of truth.

### 13.2 Analytics

Analytics is responsible for:

- dashboard aggregates;
- usage and spend trends;
- provider and route performance;
- latency and error reporting;
- operational investigation; and
- denormalized query models.

Analytics data may be deleted and rebuilt from authoritative source events and ledger records.
Rebuilding analytics must not change a charge.

## 14. Logical Persistence Model

The target conceptual model includes:

```text
consumers
api_keys
providers
provider_connections
protocol_bindings
model_deployments
gateway_routes
billing_profiles
billing_profile_items
gateway_requests
upstream_attempts
usage_records
charge_records
```

The first durable schema may combine provider connections with protocol bindings and may store the
upstream model directly on a route. Such physical simplifications must preserve the conceptual
boundaries described here.

A minimal early schema may use:

```text
providers
provider_protocols
routes
billing_profiles
billing_profile_items
gateway_requests
upstream_attempts
usage_records
charge_records
```

The persistence technology and transaction strategy are intentionally not selected in this
document.

## 15. Data Plane and Control Plane

### 15.1 Data Plane

The data plane is the latency-sensitive request path:

- protocol ingress;
- gateway-key authentication;
- route resolution;
- upstream credential injection;
- HTTP and SSE forwarding;
- timing and usage observation;
- request finalization; and
- metering and charge posting.

### 15.2 Control Plane

The control plane manages lower-frequency configuration and inspection:

- consumers and gateway keys;
- providers and connections;
- protocol bindings;
- model routes;
- billing profiles;
- request and charge inspection; and
- analytics views.

The MVP may host both planes in one Next.js application, but their modules and dependencies remain
separate.

## 16. Target Code Boundaries

A possible future source layout is:

```text
src/
├── app/
│   ├── (gateway)/
│   │   └── v1/
│   │       ├── chat/completions/route.ts
│   │       ├── responses/route.ts
│   │       └── messages/route.ts
│   └── (console)/
│       └── ...
└── gateway/
    ├── domain/
    │   ├── protocol.ts
    │   ├── provider.ts
    │   ├── routing.ts
    │   ├── request.ts
    │   ├── usage.ts
    │   └── billing.ts
    ├── application/
    │   ├── handle-gateway-request.ts
    │   ├── resolve-route.ts
    │   └── finalize-request.ts
    ├── protocols/
    │   ├── registry.ts
    │   ├── openai-chat-completions.ts
    │   ├── openai-responses.ts
    │   └── anthropic-messages.ts
    └── infrastructure/
        ├── http/
        ├── persistence/
        ├── credentials/
        └── observability/
```

This is a target layout, not the current repository structure.

Next.js Route Handlers should only:

1. adapt the Web `Request` and runtime context to the gateway application interface;
2. call the shared gateway request handler; and
3. return the resulting Web `Response`.

They should not contain route lookup rules, provider selection branches, usage formulas, or billing
calculations.

## 17. Security Principles

1. Store gateway API keys as identifiers plus secure hashes, not plaintext.
2. Store provider credentials through a dedicated secret boundary and refer to them by opaque
   identifiers in normal domain configuration.
3. Never forward a gateway key or arbitrary client authorization value upstream.
4. Never include secrets in structured logs, traces, usage snapshots, or error messages.
5. Do not persist raw prompts or responses by default.
6. Redact sensitive headers and provider error details before internal persistence.
7. Scope consumers to explicit routes and provider resources.
8. Use stable gateway correlation IDs and retain provider request IDs separately.
9. Validate all protocol and route identifiers against built-in registries.
10. Treat usage and charge idempotency as security and financial-integrity boundaries.
11. Apply request size, concurrency, timeout, and backpressure limits before production traffic.
12. Audit key creation, rotation, revocation, provider configuration changes, and billing-profile
    version changes when the durable control plane is introduced.

## 18. Failure Semantics

The gateway must distinguish:

- client authentication failures;
- unsupported protocol endpoints;
- malformed native requests;
- missing model routes;
- disabled consumer, route, provider, connection, or binding;
- upstream connection failures;
- upstream HTTP errors;
- stream interruption;
- client cancellation;
- usage parsing failure;
- missing or partial usage; and
- charge finalization failure.

An upstream HTTP error should remain in its native response format when it is safe to return. Gateway
errors generated before an upstream attempt may use a gateway-owned error envelope, but they may not
pretend to be provider responses.

The initial gateway does not automatically retry generation requests. Retrying after an ambiguous
connection failure or after streaming begins can duplicate provider work and charges. Retry and
failover semantics are deferred until attempt and ledger idempotency are implemented and verified.

## 19. Operational Principles

- Every gateway request receives one correlation ID.
- Gateway request ID, upstream attempt ID, and provider request ID are distinct.
- Logs contain structured metadata but not secrets or full payloads.
- Usage observation failure must be measurable independently from forwarding success.
- Billing finalization failure must be recoverable without repeating the upstream request.
- Analytics updates may be asynchronous and replayed.
- Ledger posting must be idempotent and durable.
- Production deployment must be validated for long-lived SSE connections, cancellation propagation,
  body streaming, connection reuse, and maximum execution duration.

## 20. Open Decisions

The following choices are intentionally deferred and should be resolved in the phase where they
become necessary:

1. Persistence database and migration tooling.
2. Transaction, outbox, and asynchronous event strategy.
3. Exact gateway API-key format, hashing algorithm, rotation window, and revocation behavior.
4. Provider credential storage and rotation mechanism.
5. Whether the first billing product is credit-based, currency-based, or records both provider cost
   and consumer price.
6. Currency, decimal precision, and final rounding rules.
7. Policy for incomplete, missing, estimated, and provider-reconciled usage.
8. Request and metadata retention periods.
9. Production runtime and deployment platform for long-lived streams.
10. Provider health, priority, weighted routing, retry, and failover policy.
11. Internal control-plane management surface: protected routes, CLI, seeded configuration, or UI.
12. Whether strict pass-through remains the only mode or whether explicit usage-enrichment options
    are later introduced for compatible protocols.

Implementation sequencing and acceptance criteria are defined in [the phased plan](./plan.md).
