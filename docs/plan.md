# Phased Implementation Plan

## 1. Purpose

This document is the executable delivery plan for `oh-my-ai-gateway`. The project will advance one
bounded phase at a time. A phase is complete only when its acceptance criteria have been verified and
its known limitations are documented.

The architecture and domain terminology used here are defined in
[AI API Gateway Architecture](./architecture.md).

## 2. Current Status

The repository currently contains a Next.js application scaffold and project documentation. It does
not yet contain gateway runtime behavior.

| Phase | Milestone                                   | Status      |
| ----- | ------------------------------------------- | ----------- |
| 0     | Architecture baseline                       | In progress |
| 1     | Native forwarding vertical slice            | Planned     |
| 2     | Multi-protocol binding support              | Planned     |
| 3     | Durable consumer and routing control plane  | Planned     |
| 4     | Usage metering and immutable billing ledger | Planned     |
| 5     | Analytics and operational visibility        | Planned     |
| 6     | Production hardening                        | Planned     |

Status values are:

- **Planned:** work has not started.
- **In progress:** the phase is the active delivery boundary.
- **Blocked:** a named external decision or dependency prevents completion.
- **Complete:** all acceptance criteria have been verified.

## 3. Definition of Independently Complete

Each phase must leave a coherent system that can be demonstrated and verified without relying on
unfinished behavior from the next phase.

A phase is independently complete when:

1. its bounded outcome works end to end;
2. automated and manual verification for that outcome passes;
3. failure behavior inside the phase boundary is deterministic;
4. secrets and sensitive payloads are not exposed;
5. limitations and exclusions are documented;
6. architecture documentation reflects any approved decision changes; and
7. no essential correctness task is deferred under the label of a later phase.

A phase does not need every future production capability. It must be safe and honest about what it
can and cannot do.

## 4. Dependency Sequence

```text
Phase 0: Architecture baseline
  ▼
Phase 1: One native protocol vertical slice
  ▼
Phase 2: Multiple protocol handlers and bindings
  ▼
Phase 3: Durable consumers, keys, providers, bindings, and routes
  ▼
Phase 4: Durable usage and immutable billing ledger
  ▼
Phase 5: Rebuildable analytics and operational visibility
  ▼
Phase 6: Production reliability and security controls
```

The dependency rules are:

- Phase 1 establishes the framework-independent data-plane boundary.
- Phase 2 extends the Phase 1 forwarding path instead of replacing it.
- Phases 1 and 2 may use development configuration so persistence is not selected prematurely.
- Phase 3 makes configuration durable without claiming metering or billing completeness.
- Phase 4 depends on stable request IDs, route identities, and durable configuration from Phase 3.
- Phase 5 reads authoritative request, usage, and ledger records but never becomes the billing source
  of truth.
- Phase 6 introduces retry and failover only after attempt and charge idempotency are defined.

## 5. Phase 0 — Architecture Baseline

### Outcome

The product boundaries, terminology, architecture, and incremental delivery plan are versioned in
the repository and can guide implementation without relying on conversation history.

### Dependencies

None.

### Scope

- Project purpose and current status.
- Initial goals and explicit non-goals.
- Native protocol forwarding with no conversion.
- Domain model and terminology.
- Request lifecycle and streaming behavior.
- Provider and multi-protocol binding model.
- Consumer API-key attribution and deterministic routing inputs.
- Usage normalization and completeness states.
- Versioned rates and multipliers.
- Immutable charge records and separate analytics.
- Data-plane and control-plane boundaries.
- English phased implementation plan.

### Deliverables

- Updated `README.md`.
- `docs/architecture.md`.
- `docs/plan.md`.

### Exclusions

- Runtime gateway endpoints.
- Provider connectivity.
- Persistence.
- Authentication implementation.
- Automated gateway tests.
- Control-plane UI.

### Acceptance Criteria

- [ ] The README accurately describes the repository as an AI API gateway project and states that
      runtime gateway behavior is not yet implemented.
- [ ] The README links to the architecture and implementation plan.
- [ ] The architecture defines every core domain term in one authoritative location.
- [ ] The no-conversion and same-protocol routing invariants are explicit.
- [ ] Transparent forwarding and safe header rewriting are defined.
- [ ] Streaming usage observation does not require full response buffering.
- [ ] Missing usage is distinguished from zero usage.
- [ ] Billing profile versioning, immutable charges, idempotency, and adjustments are defined.
- [ ] Analytics and ledger responsibilities are clearly separated.
- [ ] Every implementation phase has bounded scope, exclusions, and verifiable acceptance criteria.
- [ ] Repository formatting and quality checks pass.

### System Capability at Completion

The repository contains an agreed and reviewable design baseline. It still does not forward API
traffic.

## 6. Phase 1 — Native Forwarding Vertical Slice

### Outcome

One OpenAI Chat Completions-compatible request can authenticate a consumer, resolve one deterministic
route, and transparently proxy both non-streaming and streaming responses to one configured upstream
binding.

### Dependencies

Phase 0 complete.

### Scope

- Built-in `openai.chat-completions` protocol handler.
- Native `POST /v1/chat/completions` ingress endpoint.
- A minimal gateway API-key mechanism for one or more development consumers.
- Development configuration for one provider protocol binding and model route.
- Route lookup by consumer, protocol, and requested model.
- Raw request-body forwarding without payload conversion.
- Safe request and response header policies.
- Non-streaming response forwarding.
- SSE response forwarding with minimal buffering.
- Client cancellation propagation.
- Gateway correlation ID and secret-safe structured request logging.
- Framework-neutral gateway application boundary with a thin Next.js host adapter.

Development configuration may be static or in memory. Durability is intentionally deferred.

### Primary Deliverables

- Framework-neutral protocol, routing, forwarding, and request-lifecycle contracts.
- OpenAI Chat Completions protocol handler.
- Protocol registry containing one handler.
- Thin Next.js Route Handler for `/v1/chat/completions`.
- Development consumer, provider binding, and route configuration.
- Unit tests for request inspection, routing, and header filtering.
- Integration test upstream that can return normal JSON, SSE, and native errors.
- End-to-end verification for authorized, unauthorized, missing-route, normal, streaming, failure,
  and cancellation flows.

### Explicit Exclusions

- OpenAI Responses and Anthropic Messages.
- Protocol conversion.
- Durable configuration or usage storage.
- Billing and balance deduction.
- Analytics dashboards.
- Rate limiting and quotas.
- Automatic retries or provider failover.
- Polished management UI.

### Acceptance Criteria

- [ ] An authorized request to `POST /v1/chat/completions` reaches exactly one configured
      `openai.chat-completions` binding.
- [ ] The requested model is extracted without mutating the original request body.
- [ ] Route lookup uses consumer, protocol, and requested model.
- [ ] A missing or disabled route fails before any upstream request is made.
- [ ] Gateway authorization is removed and the selected provider credential is injected upstream.
- [ ] The gateway key and client authorization value never reach the upstream server.
- [ ] Hop-by-hop headers are removed in both directions.
- [ ] Normal JSON status, safe headers, and body are returned without schema conversion.
- [ ] Native upstream errors are preserved when safe.
- [ ] SSE event order and payloads are preserved without buffering the full stream.
- [ ] Client cancellation aborts the upstream request where the runtime supports it.
- [ ] Each request receives a gateway correlation ID distinct from any provider request ID.
- [ ] Logs contain no gateway key, provider credential, full prompt, or full response.
- [ ] Domain and application tests do not require a Next.js runtime.
- [ ] The affected flow is verified end to end against the integration upstream.
- [ ] Repository checks pass.

### System Capability at Completion

The gateway can safely proxy one native protocol through development configuration. Configuration,
usage, and billing are not durable.

## 7. Phase 2 — Multi-Protocol Binding Support

### Outcome

The gateway supports the three initial native protocol handlers, and one provider can expose
multiple independent protocol bindings without any protocol conversion.

### Dependencies

Phase 1 complete.

### Scope

- Add `openai.responses` for `POST /v1/responses`.
- Add `anthropic.messages` for `POST /v1/messages`.
- Generalize the protocol registry and handler contracts using the Phase 1 boundary.
- Protocol-specific request metadata extraction.
- Protocol-specific request and response header policies.
- Protocol-specific non-streaming and SSE observers.
- Provider configuration with multiple bindings under one provider.
- Strict same-protocol route eligibility.
- Usage observations may be emitted in memory for verification, but durable metering remains Phase 4.

### Primary Deliverables

- OpenAI Responses handler and tests.
- Anthropic Messages handler and tests.
- Shared protocol conformance test suite.
- Multi-binding provider development configuration.
- Native endpoint integration tests for all three handlers.
- Tests proving that cross-protocol bindings are ineligible.

### Explicit Exclusions

- OpenAI-to-Anthropic or Anthropic-to-OpenAI conversion.
- Cross-protocol fallback.
- Generic arbitrary-path reverse proxying.
- Durable control-plane storage.
- Durable usage or billing records.
- Automatic provider model discovery.

### Acceptance Criteria

- [ ] The gateway exposes all three native endpoints.
- [ ] Each endpoint selects its built-in protocol handler by method and path.
- [ ] One provider can be configured with multiple protocol bindings using independent endpoints and
      credential/header strategies.
- [ ] A handler forwards only to bindings with the same protocol identifier.
- [ ] No handler transforms an OpenAI payload into an Anthropic payload or the reverse.
- [ ] Requested model extraction is correct for every supported protocol.
- [ ] Safe header behavior is tested independently for every protocol.
- [ ] Normal and streaming responses preserve each protocol's native semantics.
- [ ] Observer parsing failure does not break an otherwise valid client stream.
- [ ] Existing Phase 1 behavior remains compatible.
- [ ] Protocol conformance and end-to-end tests pass.
- [ ] Repository checks pass.

### System Capability at Completion

The gateway can proxy all initial native protocols and represent multiple protocol bindings per
provider through development configuration. Configuration, usage, and billing are still not durable.

## 8. Phase 3 — Durable Consumer and Routing Control Plane

### Outcome

Consumers, gateway keys, providers, protocol bindings, model routes, and enabled states survive
process restarts and can be managed through a minimal protected internal interface.

### Dependencies

Phase 2 complete.

### Decision Gate

Before implementation, select and document:

- database and migration tooling;
- transaction strategy;
- provider secret-storage boundary;
- gateway key format and hashing algorithm; and
- minimal management surface: protected API, CLI, seed workflow, or an intentionally small UI.

### Scope

- Durable consumers.
- Hashed gateway API keys with identifiers, enabled state, expiry, rotation, and revocation.
- Durable providers and provider connections or equivalent physical model.
- Durable protocol bindings referencing built-in protocol identifiers.
- Durable model deployments or route-level upstream model mappings.
- Durable gateway routes and deterministic priority.
- Billing-profile references on routes, even if billing execution remains Phase 4.
- Framework-neutral repository ports used by gateway application services.
- Minimal protected management path.
- Configuration audit metadata.

### Primary Deliverables

- Database schema and migrations.
- Repository interfaces and production adapters.
- Consumer and API-key management.
- Provider, binding, and route management.
- Seed or migration path from Phase 2 development configuration.
- Integration tests against the selected database.
- Operational documentation for setup, rotation, and revocation.

### Explicit Exclusions

- Charging or balance deduction.
- Usage-derived analytics.
- Advanced RBAC.
- Full public administration product.
- Health-aware routing and provider failover.
- Quotas and rate limits.

### Acceptance Criteria

- [ ] Restarting the application does not lose consumers, keys, providers, bindings, or routes.
- [ ] Raw gateway key secrets are never stored and are returned only at creation time.
- [ ] A disabled, expired, revoked, or invalid key is rejected before routing.
- [ ] A disabled consumer, provider, connection, binding, deployment, or route is rejected before
      forwarding.
- [ ] Key rotation supports a documented overlap window and independent revocation.
- [ ] Provider credentials are referenced through the chosen secret boundary and do not appear in
      ordinary configuration records or logs.
- [ ] Routing is deterministic for consumer + protocol + requested model.
- [ ] Persistent protocol identifiers are validated against the built-in registry.
- [ ] Database-specific types do not leak into protocol handler or route resolver contracts.
- [ ] Configuration changes retain actor, timestamp, and changed-resource metadata.
- [ ] Database migrations and integration tests pass from a clean database.
- [ ] The affected runtime flow is verified end to end after a process restart.
- [ ] Repository checks pass.

### System Capability at Completion

The gateway supports durable consumer authentication and routing configuration. It can be operated
without rebuilding or restarting to change ordinary configuration, subject to the selected minimal
management surface. It does not yet provide durable billing.

## 9. Phase 4 — Usage Metering and Immutable Billing Ledger

### Outcome

Gateway requests produce durable normalized usage and idempotent immutable charges using an exact
versioned billing profile, without delaying or changing native response delivery.

### Dependencies

Phase 3 complete.

### Decision Gate

Before implementation, select and document:

- credit-based, currency-based, or dual provider-cost/consumer-price semantics;
- supported currency or credit units;
- decimal precision and rounding rules;
- billing components for each initial protocol;
- policy for missing, partial, estimated, and later provider-reconciled usage; and
- transaction/outbox strategy for request finalization and ledger posting.

### Scope

- Durable gateway requests and upstream attempts.
- Stable lifecycle and terminal statuses.
- Non-streaming and streaming usage observers.
- Protocol-neutral normalized usage records.
- Usage source, completeness, parser version, and redacted raw usage provenance.
- Versioned billing profiles and component items.
- Fixed-precision billing calculations.
- Idempotent immutable charge records.
- Compensating adjustment records.
- Recovery for charge finalization failure without repeating the upstream request.
- Essential reconciliation queries and operational commands.

### Primary Deliverables

- Request, attempt, usage, billing-profile, charge, and adjustment persistence.
- Protocol usage parsers with captured fixtures.
- Billing calculation domain service and precision tests.
- Idempotent finalization application service.
- Recovery worker or command for pending finalization.
- Reconciliation tests for duplicates, missing usage, partial streams, cancellation, and adjustments.

### Explicit Exclusions

- Rich analytics dashboards.
- Analytics as billing authority.
- Automatic estimated charging unless explicitly approved by the decision gate.
- Full balance reservation or prepaid wallet semantics.
- Automatic retry and failover.

### Acceptance Criteria

- [ ] A completed non-streaming request produces normalized usage when the provider reports it.
- [ ] A completed stream produces equivalent normalized usage without delaying, reordering, or
      rewriting client-visible events.
- [ ] Provider-reported zero and unavailable usage remain distinguishable.
- [ ] Usage records retain protocol, provider, binding, requested model, resolved model, source,
      completeness, and parser version.
- [ ] Reprocessing the same request or finalization event does not create a duplicate charge.
- [ ] Every charge references one usage record and one exact billing-profile version.
- [ ] Charge calculations use fixed precision and the documented rounding policy.
- [ ] Updating a billing profile affects only future charges.
- [ ] Existing charge records cannot be edited.
- [ ] Corrections create linked compensating adjustments.
- [ ] Unknown, partial, and parse-failed usage follows an explicit policy and is never silently
      converted to zero.
- [ ] A ledger failure can be retried without replaying the provider request.
- [ ] Client cancellation and ambiguous upstream termination do not claim zero provider usage.
- [ ] Metering, idempotency, recovery, and end-to-end streaming tests pass.
- [ ] Repository checks pass.

### System Capability at Completion

The gateway has durable, auditable metering and billing for supported provider-reported usage. Rich
reporting is still limited to reconciliation and operational queries.

## 10. Phase 5 — Analytics and Operational Visibility

### Outcome

Operators can understand traffic, routing, latency, errors, usage completeness, provider cost, and
consumer charges through rebuildable projections while tracing any request back to authoritative
records.

### Dependencies

Phase 4 complete.

### Scope

- Rebuildable analytics projections.
- Consumer, provider, protocol, model, and route aggregates.
- Latency, TTFT, byte-count, success, error, cancellation, and metering-gap metrics.
- Usage, provider cost, consumer charge, and adjustment reporting.
- Correlation-ID request diagnostics.
- Route-decision and upstream-attempt diagnostics.
- Ledger-to-usage and analytics-to-ledger reconciliation views.
- Redacted operational UI or internal reporting endpoints.
- Basic health signals and alerts for routing and finalization failures.

### Primary Deliverables

- Projection/event consumers or equivalent scheduled aggregation mechanism.
- Rebuild command and checkpoint strategy.
- Request diagnostics view.
- Aggregate reporting interfaces.
- Reconciliation views and discrepancy alerts.
- Data retention and redaction documentation.

### Explicit Exclusions

- Analytics records as editable billing records.
- Direct charge mutation from a dashboard.
- Production retry/failover policy.
- Complete quota and abuse-prevention system.

### Acceptance Criteria

- [ ] Analytics projections can be deleted and rebuilt from authoritative source records.
- [ ] Rebuilding analytics does not add, remove, or modify charge and adjustment records.
- [ ] Operators can trace a correlation ID to consumer, route decision, provider binding, upstream
      attempt, usage outcome, billing profile, and charge status.
- [ ] Reports distinguish provider failures, client errors, gateway errors, route misses,
      cancellations, missing usage, and parsing failures.
- [ ] Usage and charge aggregates can be reconciled to source records.
- [ ] Provider cost and consumer charge are labelled and reported separately when both exist.
- [ ] Sensitive headers, credentials, prompts, and responses are absent from ordinary analytics.
- [ ] Projection rebuild, reconciliation, redaction, and end-to-end diagnostics tests pass.
- [ ] Repository checks pass.

### System Capability at Completion

The gateway is operationally inspectable and financially reconcilable. Analytics remains derived and
cannot alter ledger facts.

## 11. Phase 6 — Production Hardening

### Outcome

The gateway is ready for controlled production traffic with documented reliability, security,
capacity, recovery, and incident-response behavior.

### Dependencies

Phase 5 complete.

### Decision Gate

Before implementation, select and validate:

- production runtime and deployment topology;
- database, connection-pool, and queue capacity;
- request, connection, and stream duration limits;
- consumer quota and rate-limit semantics;
- retryable failure classes;
- health, circuit-breaker, priority, and failover policy;
- secret rotation and audit-retention requirements; and
- service-level objectives and alert thresholds.

### Scope

- Request-size, concurrency, timeout, and backpressure limits.
- Consumer quotas and rate limits before upstream forwarding.
- Provider health tracking and circuit breaking.
- Explicit retry and failover policy with attempt records.
- Prevention of duplicate usage and charges across retries.
- Secret rotation procedures.
- Key and configuration audit retention.
- Stream behavior validation through the production proxy/runtime path.
- Capacity and load testing.
- Alerting and incident runbooks.
- Backup, restore, projection rebuild, and ledger reconciliation procedures.
- Security review and abuse controls.

### Primary Deliverables

- Production deployment configuration and runbooks.
- Load and soak test harnesses for normal and SSE traffic.
- Rate-limit, quota, backpressure, retry, circuit-breaker, and failover components.
- Alerts for routing failures, provider availability, metering gaps, ledger failures, and capacity.
- Secret and gateway-key rotation runbooks.
- Backup, restore, reconciliation, and incident-response exercises.

### Explicit Exclusions

Any feature not approved through the production decision gate. Production hardening is not a license
to add protocol conversion, arbitrary proxying, or unbounded provider retries.

### Acceptance Criteria

- [ ] Gateway failures cannot expose gateway keys, provider credentials, or raw sensitive payloads.
- [ ] Quotas and rate limits reject traffic before provider forwarding.
- [ ] Concurrency and backpressure prevent unbounded memory and connection growth.
- [ ] Retry and failover execute only for documented failure classes.
- [ ] A retry or failover cannot create duplicate usage records or consumer charges.
- [ ] No failover occurs after client-visible streaming has begun unless a separately documented
      native protocol contract makes it safe.
- [ ] Provider circuit breakers recover according to tested state transitions.
- [ ] Long-lived SSE behavior, cancellation, connection reuse, and maximum duration are validated in
      the selected production runtime.
- [ ] Load and soak tests meet the documented service-level objectives.
- [ ] Secret and gateway-key rotation have been exercised without traffic interruption beyond the
      documented window.
- [ ] Backup and restore have been exercised.
- [ ] Analytics can be rebuilt and ledger reconciliation can be run after recovery.
- [ ] Alerts and incident runbooks have been tested with representative failures.
- [ ] A security review finds no unresolved release-blocking issue.
- [ ] Repository and end-to-end production-path checks pass.

### System Capability at Completion

The gateway is ready for controlled production use within documented capacity, protocol, provider,
and billing boundaries.

## 12. Phase Execution Workflow

For every phase:

1. Confirm the phase scope and resolve its decision gate.
2. Update the phase status to **In progress**.
3. Write or update an implementation-specific plan before significant code changes.
4. Implement the smallest end-to-end slice that satisfies the phase outcome.
5. Add automated tests at the domain, integration, and affected runtime boundaries.
6. Exercise the affected flow end to end, including streaming where applicable.
7. Review security, secret redaction, cancellation, and failure behavior.
8. Update architecture documentation for approved changes.
9. Record known limitations and operational instructions.
10. Verify every acceptance criterion.
11. Update the phase status to **Complete** only after verification passes.
12. Begin the next phase in a separate scoped change.

A phase with failing tests, incomplete runtime verification, unresolved data-integrity behavior, or an
unresolved release-blocking security issue remains **In progress** or **Blocked**.

## 13. Change Control

Architecture invariants may change only through an explicit documented decision. In particular,
implementation convenience must not silently introduce:

- protocol conversion;
- arbitrary upstream URLs supplied by consumers;
- forwarding client credentials to providers;
- full-payload logging;
- estimated usage represented as provider-reported usage;
- mutable historical charges;
- analytics aggregates used as ledger facts; or
- retries without attempt and charge idempotency.

When an approved decision changes an invariant or phase boundary, update
[`docs/architecture.md`](./architecture.md) and this document in the same change.
