# Phased Implementation Plan

## 1. Purpose and Baseline

This plan starts from the repository implementation present on **2026-07-26**. The gateway is no
longer a scaffold: it already provides a usable local, shared-token, multi-protocol forwarding path,
PostgreSQL provider management, usage capture, provider cost estimation, and dashboards.

[The architecture document](./architecture.md) describes only what exists. This plan preserves the
larger consumer routing, authoritative metering, ledger, analytics, and production goals as future
milestones without presenting them as current behavior.

Status values used here are deliberately limited to:

- **Implemented:** the bounded outcome exists and its listed acceptance criteria are satisfied.
- **Partially implemented:** useful capability exists, but required correctness or operational work
  remains.
- **Not implemented:** the milestone's defining capability does not exist.

| Phase | Milestone                                                  | Status                |
| ----- | ---------------------------------------------------------- | --------------------- |
| 1     | Local single-token, multi-protocol gateway baseline        | Implemented           |
| 2     | Data-plane correctness and integration coverage            | Partially implemented |
| 3     | Consumer, API key, and deterministic routing control plane | Not implemented       |
| 4     | Authoritative request metering and provider cost           | Partially implemented |
| 5     | Immutable consumer billing ledger                          | Not implemented       |
| 6     | Rebuildable analytics and operational diagnostics          | Partially implemented |
| 7     | Production hardening                                       | Not implemented       |

Terminology is strict throughout this plan:

- **Provider cost** is the current estimate of upstream cost from provider-reported usage.
- **Consumer billing** is a future authoritative charge to a gateway consumer.
- A current usage cost snapshot is not a charge or ledger fact.

## 2. Phase 1: Local Single-Token, Multi-Protocol Gateway Baseline

**Status:** Implemented

### Outcome

A trusted local caller can use one shared token to send native requests through any of the three
supported protocol operations to an enabled, model-matching PostgreSQL provider and inspect resulting
usage in the dashboard.

### Current Evidence

- Next.js Route Handlers expose Chat Completions, Responses, Messages, and model listing.
- Built-in adapters preserve each native payload and support JSON and SSE usage parsing.
- Protocol-specific gateway and provider authentication headers are applied.
- PostgreSQL schema management, provider CRUD, enablement, protocol configuration, model discovery, connection
  testing, and usage views are present.
- Provider selection filters enabled records by exact protocol and model, with an optional
  `x-provider-id` constraint.
- Unit tests cover pricing validation and cost calculation, adapter parsing and header rewriting,
  response forwarding, model discovery, and provider connection requests.

### Remaining Work

No work remains inside this deliberately local and trusted baseline. Its security and scale limits
are inputs to later phases, not hidden acceptance criteria for this phase.

### Acceptance Criteria

- [x] All three native generation endpoints authenticate and route without protocol conversion.
- [x] `/v1/models` returns configured models in the inferred OpenAI or Anthropic shape.
- [x] Provider configuration and usage survive application restarts in PostgreSQL.
- [x] Operators can configure, discover, test, enable, disable, and delete providers.
- [x] The dashboard displays provider summaries and filterable usage records.
- [x] Local database initialization is documented and reproducible from the committed schema.

## 3. Phase 2: Data-Plane Correctness and Integration Coverage

**Status:** Partially implemented

### Outcome

Native forwarding behaves predictably across success, streaming, cancellation, timeout, malformed
input, upstream failure, and client disconnect scenarios, with traceable lifecycle evidence.

### Current Evidence

- Request payloads and client-facing streams remain native.
- Routing failures are normalized to protocol-shaped responses.
- Request authentication and upstream credentials are separated by adapter header rewriting.
- Response headers affected by runtime decoding are removed.
- Adapter and helper tests exercise JSON and streaming usage parsers and selected header behavior.

### Remaining Work

- Introduce a correlation/request ID at ingress and propagate it through logs, responses, upstream
  attempts, and usage.
- Specify and test client cancellation propagation, upstream timeouts, and disconnect behavior.
- Replace the partial header removal rules with a documented end-to-end request and response header
  policy, including hop-by-hop and forwarding headers.
- Add full Route Handler integration tests using representative OpenAI and Anthropic upstreams.
- Verify streaming end to end for delivery timing, backpressure, early termination, malformed SSE,
  and usage events that arrive late or not at all.
- Define maximum request/body/header sizes and deterministic invalid-payload behavior.

### Acceptance Criteria

- [ ] Every accepted request has a correlation ID visible to the caller and operator.
- [ ] Client cancellation and configured upstream timeout terminate work and produce a defined final
      lifecycle state.
- [ ] The header policy is documented and covered by integration tests for all protocols.
- [ ] Streaming integration tests prove that usage observation does not buffer or delay delivery.
- [ ] Network, upstream HTTP, malformed response, and parser failures have deterministic outcomes.
- [ ] Request limits are enforced before unbounded resource use.

## 4. Phase 3: Consumer, API Key, and Deterministic Routing Control Plane

**Status:** Not implemented

### Outcome

Each caller authenticates as a durable consumer and resolves an explicit, deterministic route from
consumer, inbound protocol, and requested public model to an enabled provider connection and
upstream model.

### Current Evidence

- Provider records and per-protocol configuration are durable.
- Current priority-ordered selection and `x-provider-id` provide a small local routing mechanism.
- Protocol identities are explicit in code and provider configuration.

### Remaining Work

- Add consumers and gateway API keys with non-secret identifiers and strong one-way secret hashes.
- Define creation, scoped display, rotation, revocation, expiration, and audit behavior for keys.
- Separate providers, provider connections, protocol bindings, model deployments, and gateway
  routes instead of storing them in one provider row.
- Add consumer-specific route management and explicit public-model-to-upstream-model mapping.
- Define deterministic conflict handling, route precedence, enablement checks, and transactional
  configuration changes.
- Move provider credentials behind an encryption or external secret-management boundary.
- Remove the insecure default gateway token after a migration path for local users is defined.

### Acceptance Criteria

- [ ] Raw gateway API-key secrets are never stored and cannot be recovered from the database.
- [ ] Key rotation and revocation take effect predictably and are audited.
- [ ] A disabled consumer, key, route, provider, connection, binding, or deployment is rejected
      before upstream work begins.
- [ ] Routing is deterministic for consumer + protocol + requested public model.
- [ ] Model substitution occurs only through an explicit configured mapping.
- [ ] Provider credentials are exposed only at the upstream request boundary.
- [ ] Concurrent control-plane updates cannot leave partially valid routing configuration.

## 5. Phase 4: Authoritative Request Metering and Provider Cost

**Status:** Partially implemented

### Outcome

Every accepted gateway request and every upstream attempt has a durable, idempotently finalized
lifecycle, normalized usage provenance, and an explainable provider cost outcome.

### Current Evidence

- Successful upstream starts that receive a response produce asynchronous PostgreSQL usage rows.
- JSON and SSE parsers normalize input, output, cache-read, and cache-creation token components.
- Missing usage is represented explicitly and yields `partial` or `unavailable` cost states.
- Model overrides, catalog fallback pricing, provider multipliers, integer microdollar calculations,
  and per-request rate snapshots exist.
- Historical usage snapshots are not recalculated when current pricing changes.

### Remaining Work

- Add separate gateway-request and upstream-attempt records with monotonic lifecycle transitions.
- Create the request record before routing/upstream work so authentication, routing, network,
  timeout, cancellation, and persistence failures can be represented according to retention policy.
- Define idempotency keys and transaction/outbox behavior for finalization and retries.
- Record usage source (`provider`, `estimated`, or other explicit provenance), raw protocol fields
  needed for audit, and parser/schema version.
- Version the pricing catalog and calculation algorithm in each cost result, not only selected rates
  and multiplier.
- Define reconciliation for missing, partial, contradictory, late, and parse-failed usage.
- Decide retention and redaction rules for errors and provider payload fragments.

### Acceptance Criteria

- [ ] Every accepted request has one durable request record and at least one explicit attempt
      outcome, including failures before an upstream response.
- [ ] Retrying persistence or finalization cannot duplicate request, attempt, usage, or provider-cost
      facts.
- [ ] Usage records identify their source, protocol parser version, and upstream attempt.
- [ ] Missing, partial, late, and parse-failed usage remain distinct and reconcilable.
- [ ] Provider cost records identify catalog version, algorithm version, exact rates, multiplier,
      currency, units, and rounding rule.
- [ ] Provider cost finalization never delays or changes native response delivery.

## 6. Phase 5: Immutable Consumer Billing Ledger

**Status:** Not implemented

### Outcome

Consumer billing is a separate, auditable accounting system that converts eligible authoritative
usage into idempotent immutable charges and uses compensating adjustments for corrections.

### Current Evidence

- Provider cost snapshots demonstrate fixed-precision arithmetic and historical rate capture that
  can inform the future implementation.
- No current table or workflow constitutes consumer billing.

### Remaining Work

- Define consumer billing semantics: currency, credits, or both; billable usage sources; treatment
  of partial usage; minimums; multipliers; tiering; and rounding.
- Add independently versioned billing profiles and profile items, separate from provider cost
  configuration.
- Add immutable charge and adjustment records with stable idempotency keys.
- Define transaction/outbox boundaries between metering finalization and ledger posting.
- Implement recovery, replay, reconciliation, and audit workflows without replaying provider calls.
- Add authorization boundaries for billing configuration and adjustments.

### Acceptance Criteria

- [ ] Each charge references one eligible usage fact and one exact billing-profile version.
- [ ] Charge creation is idempotent under retries and concurrent workers.
- [ ] Updating a billing profile affects future charges only.
- [ ] Corrections use linked compensating adjustments; posted facts are never edited or deleted.
- [ ] Ledger recovery can resume independently from provider request execution.
- [ ] Provider cost and consumer billing remain separately named, calculated, stored, and reported.

## 7. Phase 6: Rebuildable Analytics and Operational Diagnostics

**Status:** Partially implemented

### Outcome

Operators can trace request behavior and analyze traffic, reliability, usage, provider cost, and
consumer billing through versioned projections that can be rebuilt and reconciled from
authoritative records.

### Current Evidence

- The provider dashboard aggregates time to first byte, tokens, and estimated cost by provider and
  selectable period.
- The usage dashboard supports pagination and filters for model, client user-agent, protocol,
  streaming mode, response status, and time period.
- Both views query the current usage table directly.

### Remaining Work

- Establish correlation across ingress request, route decision, provider connection, upstream
  attempt, usage, provider cost, and eventual consumer charge.
- Define versioned analytics events or another authoritative projection input.
- Build disposable projections with checkpoints, replay, schema/version migration, and validation.
- Add request and error-rate views, latency distributions, streaming completion outcomes, metering
  gaps, cost completeness, and provider health diagnostics.
- Add usage-to-provider-cost, usage-to-ledger, and projection-to-source reconciliation.
- Define metric labels and retention to prevent unbounded cardinality and sensitive-data leakage.

### Acceptance Criteria

- [ ] An operator can trace one correlation ID across all implemented lifecycle records.
- [ ] Analytics projections can be deleted and rebuilt without changing authoritative records.
- [ ] Rebuilds are resumable, versioned, and produce reconciliation totals.
- [ ] Dashboards clearly distinguish provider cost, consumer billing, missing usage, and incomplete
      calculations.
- [ ] Operational views expose routing, upstream, streaming, parser, metering, and ledger failures.
- [ ] Analytics aggregates are never used as billing authority.

## 8. Phase 7: Production Hardening

**Status:** Not implemented

### Outcome

The gateway can operate under untrusted production traffic with explicit security, reliability,
capacity, observability, backup, and recovery guarantees.

### Current Evidence

- PostgreSQL schema management, strict TypeScript, linting, formatting checks, and unit tests
  provide an engineering baseline.
- Model discovery and dashboard connection tests have explicit timeouts.
- Current limitations are documented in the README and architecture.

### Remaining Work

- Add per-consumer and global rate limits, quotas, concurrency controls, and overload behavior.
- Define safe retry, failover, health checking, circuit breaking, and attempt/charge idempotency.
- Encrypt or externalize provider secrets and establish rotation and access-audit procedures.
- Add structured logs, metrics, traces, service-level objectives, alerts, and sensitive-data
  redaction.
- Validate capacity for large bodies, long streams, slow clients, database contention, and
  multi-process deployment.
- Establish migration rollout/rollback, backups, restore drills, retention, and disaster recovery.
- Perform threat modeling and security testing for SSRF, header injection, credential leakage,
  denial of service, dashboard authorization, and supply-chain risks.

### Acceptance Criteria

- [ ] Rate, quota, concurrency, payload, and timeout limits are enforced and observable.
- [ ] Retry or failover cannot duplicate usage, provider-cost facts, or consumer charges.
- [ ] Secrets are encrypted or externally managed, rotatable, access-controlled, and audited.
- [ ] Load and failure tests validate documented capacity and degradation behavior.
- [ ] Backup restoration and analytics rebuild are exercised in a clean environment.
- [ ] Alerts cover authentication, routing, upstream availability, metering gaps, ledger failures,
      persistence pressure, and capacity.
- [ ] A production security review has no unresolved critical findings.

## 9. Cross-Phase Rules

The following constraints apply to all future phases:

1. Native protocol identity is preserved unless a separately designed conversion product is added.
2. Model substitution is explicit configuration, never an implicit fallback.
3. Missing usage is not zero usage.
4. Client response delivery does not wait for analytics or consumer billing.
5. Provider cost and consumer billing remain separate concepts and records.
6. Posted consumer charges are immutable; corrections are adjustments.
7. Analytics is rebuildable and never the accounting source of truth.
8. Provider credentials and gateway credentials are never forwarded across the wrong trust
   boundary.
9. Retry and failover require durable attempts and idempotent downstream effects first.
10. Sensitive prompts and responses are not persisted by default.
