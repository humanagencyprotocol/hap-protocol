---
title: "Gatekeeper"
version: "Version 0.4"
date: "April 2026"
---

The Gatekeeper is the enforcement point between human-attested authorization and machine execution. It verifies attestations locally, requests execution receipts from the SP for every action, and blocks execution if any check fails.

The Gatekeeper is not a prescribed component or deployment topology — it is the guarantee that attestation verification AND receipt issuance have occurred before any consequential action proceeds.

In v0.4, the Gatekeeper has a new responsibility: **obtain a valid execution receipt from the SP before allowing any tool call**. This is the most significant change from v0.3, in which the Gatekeeper was stateless and only contacted the SP for initial key resolution.

Reference implementation: <a href="https://github.com/humanagencyprotocol/hap-gateway" target="_blank" rel="noopener noreferrer">HAP Agent Gateway</a>

---

## Gatekeeper Obligation

Every execution environment MUST satisfy the Gatekeeper obligation before proceeding with an attested action.

> **Normative:** Every execution MUST be preceded by:
> 1. Local verification of the attestation (signature, TTL, bounds_hash, context_hash)
> 2. Issuance of an execution receipt by the Service Provider
>
> An implementation that stores or transmits attestations but does not verify them, or that verifies attestations but skips receipt issuance, is non-compliant.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — `verify()` + `requestReceipt()` calls in application code before execution
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint

All three are equally valid. The protocol makes no architectural preference. What matters is that the verification steps execute completely, a valid receipt is obtained, and execution is blocked on a negative result from either step.

A system that has attestations but skips verification or receipt issuance is in violation — the attestation alone is not proof of compliance; verified attestation + valid receipt is.

---

## Execution Request

The agent submits the bounds, context, attestation, and execution values. The Gatekeeper only accepts data that is attested — every field in the bounds and context must be verifiable against `bounds_hash` and `context_hash` in the attestation.

```json
{
  "bounds": {
    "profile": "charge@0.4",
    "amount_max": 100,
    "amount_daily_max": 500,
    "amount_monthly_max": 5000,
    "transaction_count_daily_max": 20
  },
  "context": {
    "currency": "USD",
    "action_type": "charge"
  },
  "attestations": [
    "base64-attestation-blob..."
  ],
  "execution": {
    "amount": 5,
    "currency": "USD",
    "action_type": "charge"
  }
}
```

The bounds and context fields are profile-specific. The Gatekeeper reconstructs `bounds_hash` and `context_hash` from these fields and verifies they match the attestation. No unattested parameters are accepted.

---

## Validation Steps

The Gatekeeper performs validation in two phases: **local verification** and **SP receipt issuance**.

### Phase 1: Local Verification

1. **Reconstruct canonical bounds** from the submitted bounds object
2. **Compute `bounds_hash`** and verify it matches the attestation
3. **Reconstruct canonical context** from the submitted context object (or use the empty hash if context is empty)
4. **Compute `context_hash`** and verify it matches the attestation
5. **Fetch Profile** for the referenced `profile_id`
6. **For each attestation:**
   - Fetch SP public key (cached or on-demand)
   - Verify Ed25519 signature against the canonical attestation payload
   - Verify TTL not expired
   - Verify `commitment_mode` matches what the gateway expects (or pass through if neutral)
7. **Verify domain coverage** against the SP's group config (in group mode) or skip (in personal mode)
8. **Check per-transaction bounds** — for every bounds field where `boundType.kind === "per_transaction"`, verify that `execution[boundType.of] <= boundValue`.
9. **Check context constraints** — for every context field with an `enum`, `subset`, or `pattern` constraint, verify that the corresponding value in the execution request satisfies the constraint. This check is **required** locally because the SP only holds `context_hash` and cannot enforce context constraints at receipt time. A non-conforming execution context MUST be rejected here before any SP call.

If any local check fails → reject with a structured error before contacting the SP.

### Phase 2: SP Receipt Issuance

If Phase 1 passes, the Gatekeeper requests an execution receipt from the SP. See "Receipt Request" below.

The SP performs cumulative limit checks (daily, monthly) and revocation checks. If the SP returns a receipt, execution proceeds. If the SP returns an error, execution is blocked.

---

## Receipt Request

For every authorized execution, the Gatekeeper sends a receipt request to the SP:

```json
{
  "boundsHash": "sha256:...",
  "profileId": "charge@0.4",
  "action": "create_payment_link",
  "actionType": "charge",
  "executionContext": {
    "amount": 5,
    "currency": "USD"
  }
}
```

The SP responds with either:

**Success:**
```json
{
  "approved": true,
  "receipt": {
    "id": "uuid",
    "boundsHash": "sha256:...",
    "actionType": "charge",
    "cumulativeState": {
      "daily":   { "amount": 50, "count": 6 },
      "monthly": { "amount": 320, "count": 47 }
    },
    "signature": "base64url..."
  }
}
```

**Failure:**
```json
{
  "approved": false,
  "errors": [
    {
      "code": "CUMULATIVE_LIMIT_EXCEEDED",
      "field": "amount_daily",
      "message": "Daily spend would exceed the limit"
    }
  ]
}
```

On failure, the Gatekeeper MUST block execution and surface the error to the agent and (if applicable) to the human.

### Pre-execution, Not Post-execution

The receipt is issued **before** the tool call executes. The flow is:

```
verify locally -> request receipt -> receipt approved -> execute -> store receipt
```

Not:

```
execute -> request receipt
```

This is critical: the SP authorizes the action *before* it happens, not after. The receipt is proof of authorization, not proof of completion.

---

## SP Public Key Resolution

The Gatekeeper MUST obtain the SP's public key via a trusted distribution mechanism. Examples include API endpoint, DNS record, DID resolution, or static configuration.

The Gatekeeper SHOULD cache SP public keys to minimize network calls. The SP is a runtime dependency for receipt issuance, but signature verification can run locally once the public key is cached.

---

## State Model

> v0.4 changes the Gatekeeper's state model from v0.3.

In v0.3, the Gatekeeper was stateless: all proof was received in the request, validated locally, and the decision was returned. The Gatekeeper held no state and made no network calls beyond initial key resolution.

In v0.4, the Gatekeeper is **partially stateful**:

- **Local cache** — attestations, profiles, SP public keys, receipts
- **Runtime SP dependency** — every execution requires a fresh receipt from the SP

The Gatekeeper may cache attestations and profiles for performance, but MUST always request a fresh receipt for each execution. Cached receipts MUST NOT be reused for subsequent executions.

**Normative:** TTL governs whether the Gatekeeper accepts an attestation for execution — not whether the attestation continues to exist. Attestations and receipts MUST remain available for post-hoc verification (audit, dispute resolution) beyond TTL expiry. How and where they are stored is an integration concern; that they are retained is a protocol requirement.

**Normative:** The Gatekeeper MUST NOT have a "bypass" mode. If attestations and receipts are required, they must be obtained. Development/testing environments MAY use test attestations with test SP keys, but the verification logic and receipt issuance MUST still execute.

---

## Connector Model

A **connector** is an environment-specific implementation of the Gatekeeper verification obligation. It adapts the standard verification interface to a particular execution environment — agent runtime, CI/CD pipeline, API gateway, etc.

**Connectors ARE Gatekeeper implementations**, not clients of a separate Gatekeeper service. Each connector embeds the full verification logic AND the receipt request logic.

### Standard Interface

Every connector MUST implement the `verifyAndExecute` operation (or equivalent split):

**Request:**

```json
{
  "bounds": { "profile": "charge@0.4", "amount_max": 100, ... },
  "context": {},
  "attestations": ["base64-attestation-blob..."],
  "execution": { "amount": 5, "currency": "USD", "action_type": "charge" }
}
```

**Success response:**

```json
{
  "approved": true,
  "bounds_hash": "sha256:...",
  "context_hash": "sha256:...",
  "verified_domains": ["finance"],
  "profile": "charge@0.4",
  "receipt": {
    "id": "uuid",
    "signature": "base64url..."
  }
}
```

**Failure response:**

```json
{
  "approved": false,
  "errors": [
    {
      "code": "BOUND_EXCEEDED",
      "field": "amount",
      "message": "Execution value 120 exceeds authorization bound max: 100",
      "bound": 100,
      "actual": 120
    }
  ]
}
```

### Error Codes

#### Local Verification Errors

| Code | Meaning |
|------|---------|
| `BOUNDS_HASH_MISMATCH` | Recomputed `bounds_hash` does not match attestation |
| `CONTEXT_HASH_MISMATCH` | Recomputed `context_hash` does not match attestation |
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `DOMAIN_NOT_COVERED` | Required domain has no valid attestation |
| `TTL_EXPIRED` | Attestation has exceeded its time-to-live |
| `PROFILE_NOT_FOUND` | Referenced profile could not be resolved |
| `BOUND_EXCEEDED` | Execution value exceeds authorization bound |
| `MALFORMED_ATTESTATION` | Attestation structure is invalid |

#### Receipt Errors (from SP)

See the Error Codes section in `protocol.md` for the authoritative list. Codes that may surface from a receipt request include:

| Code | Meaning |
|------|---------|
| `ATTESTATION_NOT_FOUND` | SP does not know this `boundsHash` |
| `ATTESTATION_REVOKED` | Attestation has been revoked |
| `ATTESTATION_EXPIRED` | TTL has elapsed |
| `CUMULATIVE_LIMIT_EXCEEDED` | Cumulative limit would be exceeded |
| `PROPOSAL_REQUIRED` | Attestation is in review mode and no matching `proposalId` was supplied |
| `PROPOSAL_NOT_APPROVED` | The named proposal has not been committed yet |
| `PROPOSAL_REJECTED` | The named proposal was rejected |
| `PROPOSAL_MISMATCH` | The receipt request does not match the stored proposal |
| `PROPOSAL_ALREADY_EXECUTED` | A receipt has already been issued for this proposal |

### Bound Exceeded Response Example

```json
{
  "approved": false,
  "errors": [
    {
      "code": "BOUND_EXCEEDED",
      "field": "amount",
      "message": "Execution value 120 exceeds authorization bound max: 100",
      "bound": 100,
      "actual": 120
    }
  ]
}
```

### Cumulative Limit Exceeded Example

```json
{
  "approved": false,
  "errors": [
    {
      "code": "CUMULATIVE_LIMIT_EXCEEDED",
      "field": "amount_daily",
      "message": "Daily spend would be 95, exceeding limit of 80",
      "limit": 80,
      "current": 40,
      "requested": 55
    }
  ]
}
```

### Proposal Required Example

```json
{
  "approved": false,
  "errors": [
    {
      "code": "PROPOSAL_REQUIRED",
      "message": "This authorization is in review mode. Submit a proposal and obtain human approval before requesting a receipt.",
      "proposalId": "uuid-assigned-by-sp"
    }
  ]
}
```

In `review` mode, the Gatekeeper does not block on `PROPOSAL_REQUIRED` as a hard error — it surfaces the proposal to the user and waits for approval. Once the user approves, the Gatekeeper re-issues the receipt request with the `proposalId`, the SP atomically transitions the proposal from `committed` to `executed`, and the receipt is returned.

### Connector Examples

| Connector | Where it runs | How it gates |
|-----------|---------------|--------------|
| **Agent runtime** (primary v0.4 use case) | Pre-tool-call hook | Wraps every MCP tool call: verify locally + request receipt + execute |
| **CI/CD** | Pipeline step | Blocks deployment job until verify + receipt return success |
| **API Gateway** | Request middleware | Intercepts requests, extracts attestation from headers, verifies + receipts before forwarding |
| **Webhook** | Incoming handler | Verifies attestation + obtains receipt before processing |
| **Infrastructure** | Admission controller | Kubernetes admission webhook or Terraform sentinel |

### SP Key Resolution

Connectors MUST obtain the SP's public key via a trusted distribution mechanism (API endpoint, DNS record, DID resolution, or static configuration).

Connectors SHOULD cache public keys with a TTL.

### Normative Rules

1. Every connector MUST implement the full verification logic AND the receipt request flow.
2. A connector MUST NOT partially verify (e.g., check signatures but skip receipt issuance).
3. A connector MUST reject execution if either local verification or receipt issuance fails — no "warn and proceed" mode in production.
4. Connectors MUST return structured error responses using the error codes above.
5. Connectors SHOULD cache SP public keys to minimize network calls.
6. Cached receipts MUST NOT be reused for subsequent executions.

---

## Bounded Execution

For agent workflows, the Gatekeeper performs three distinct verifications: **authorization verification**, **bounds verification**, and **receipt issuance**.

### Bounds, Context, and Execution

The **bounds** are what the human attests to as enforceable constraints. They define the boundaries within which an agent may act. Bounds are hashed into `bounds_hash` and signed.

The **context** is the human's operational scope (e.g., target environment, customer segment). Context is hashed into `context_hash` and signed but stays local.

The **execution** is what the agent submits when it wants to act. It contains the specific values for a single action within the attested bounds.

```
BOUNDS (human attests, sent to SP)

  "I authorize payments up to 80 EUR per transaction,
   max 200 EUR per day, max 10 transactions per day."

  amount_max: 80
  amount_daily_max: 200
  transaction_count_daily_max: 10
  currency: ["EUR"]
  action_type: ["charge"]

  -> hashed into bounds_hash, signed

CONTEXT (human attests, stays local)

  {} (empty for charge profile)

  -> hashed into context_hash (sha256 of empty string), signed

                                   |
                                   v

EXECUTION REQUEST (agent submits)

  amount: 5                         -> 5 ≤ 80 ✓
  currency: "EUR"                   -> in ["EUR"] ✓
  action_type: "charge"             -> in ["charge"] ✓

  -> Gatekeeper verifies locally
  -> Gatekeeper requests receipt from SP
  -> SP checks cumulative limits (e.g., daily total + 5 ≤ 200)
  -> SP issues receipt → execution proceeds
```

### Gatekeeper Validation for Bounded Execution

The Gatekeeper performs:

1. **Verify authorization (local)** — Phase 1 of Validation Steps. The attestation is validly signed, all hashes match, TTL not expired, domains covered.
2. **Verify bounds (local)** — for each constrained field in the bounds, verify the execution value satisfies the per-transaction bound.
3. **Request receipt (SP)** — Phase 2. The SP checks cumulative limits and revocation status, then issues a signed receipt.
4. **If all valid** → execute the tool call and store the receipt locally.

The Gatekeeper MUST verify the authorization (steps 1–2) before contacting the SP for a receipt. If any local check fails, reject without making the SP call.

### Normative Rules

1. The Gatekeeper MUST verify local authorization (signature, hashes, TTL, per-tx bounds, context constraints) before requesting a receipt.
2. The Gatekeeper MUST request a receipt from the SP for every execution.
3. The Gatekeeper MUST block execution if the receipt request fails.
4. A single attestation MAY be used for multiple executions, as long as TTL has not expired, cumulative limits are not exhausted, and the attestation has not been revoked.
5. Per-transaction bounds (`boundType.kind === "per_transaction"`) are enforced locally by the Gatekeeper AND by the SP. Cumulative bounds (`cumulative_sum`, `cumulative_count`) are enforced solely by the SP because the Gatekeeper has no receipt history. Context constraints (enum/subset/pattern) are enforced **solely by the Gatekeeper** because the SP only holds `context_hash` and cannot inspect plaintext context values.
6. The Gatekeeper MUST NOT cache receipts and reuse them for new executions. Each execution requires a fresh receipt.
7. If the SP is unreachable or unresponsive when a receipt is requested, the Gatekeeper MUST block execution. Implementations MUST NOT use a cached prior receipt as a fallback. Implementations MUST NOT have a "warn and proceed" or "degraded" mode for production use.

---

## Combined SP+Gatekeeper Deployment

For personal, team, or institutional use, the SP and Gatekeeper logic typically run as separate services. The reference implementation runs them in two processes:

```
User
  | (defines bounds, intent, commitment mode)
  v
Gateway UI (Local App)
  | (sends attestation request via control-plane)
  v
Service Provider (cloud)
  |-- validates profile, identity, group governance
  '-- signs attestation (returns to gateway)
  v
Gateway (caches attestation, stores context locally)
  v
Agent calls tool via MCP
  v
Gateway MCP Server (Gatekeeper)
  |-- verifies attestation locally
  |-- requests receipt from SP
  v
Service Provider
  |-- checks bounds, cumulative limits, revocation
  '-- signs receipt (returns to gateway)
  v
Gateway
  | (forwards tool call to executor)
  v
Executor
  | (executes without discretion)
```

Logical separation of attestation logic, gatekeeper logic, and execution logic MUST be maintained.

---

## Implementation Checklist

- [ ] Reconstruct `bounds_hash` from request parameters
- [ ] Reconstruct `context_hash` from request parameters (or empty hash)
- [ ] Verify attestation signature against trusted SP key
- [ ] Verify both `bounds_hash` and `context_hash` match the attestation
- [ ] Check TTL validity
- [ ] Verify all required domains have valid attestations
- [ ] Verify per-transaction bounds against execution values
- [ ] Request execution receipt from SP for every action
- [ ] Block execution if receipt issuance fails
- [ ] Store receipts locally for operational use
- [ ] Honor `commitment_mode` — in `review` mode, do not request receipts until the human approves
- [ ] Return structured errors with the v0.4 error codes
- [ ] Forward only minimal, non-semantic commands to the executor
- [ ] No bypass mode in production

---

## Summary

The Gatekeeper in HAP v0.4:

- Enforces attestation verification before every consequential action
- Reconstructs `bounds_hash` and `context_hash` and verifies cryptographic signatures
- Checks domain coverage, TTL validity, and per-transaction bounds locally
- **Requests an execution receipt from the SP for every action** (new in v0.4)
- Blocks execution if either local verification or receipt issuance fails
- Honors `commitment_mode` — `automatic` proceeds with receipt; `review` waits for human approval
- Implements via connectors adapted to each execution environment
- The SP is a runtime dependency by design — every execution carries a signed receipt

The SP issues proof. The Gatekeeper enforces it. The receipt seals it.

**No receipt, no execution.**
