---
title: "Gatekeeper"
version: "Version 0.5"
date: "May 2026"
---

The Gatekeeper is the enforcement point between human-attested authorization and machine execution. It verifies attestations locally, requests execution receipts from the AS for every action, and blocks execution if any check fails.

The Gatekeeper is not a prescribed component or deployment topology — it is the guarantee that attestation verification AND receipt issuance have occurred before any consequential action proceeds.

In v0.4, the Gatekeeper gained a new responsibility: **obtain a valid execution receipt from the AS before allowing any tool call**. v0.5 keeps that surface and adds:

- **Two-phase factoring is blessed.** The Gatekeeper obligation MAY be split across two software layers — one for local verification, one for receipt issuance — provided both run on every consequential action. This documents what the v0.4 reference implementation does in practice.
- **The tool-gating manifest is now part of the protocol surface.** The contract that turns "an MCP tool was called with these args" into "an execution context the AS can enforce against bounds" lives in `core.md` § "Tool-Gating Manifest" and is referenced from here.
- **Local execution logs are display-only.** AS cumulative state is the single source of truth for cumulative limits; the Gatekeeper MUST NOT use a local log as a second-pass enforcement layer.
- **`review_above_cap` proposal routing.** When the AS returns `APPROVAL_REQUIRED`, the Gatekeeper converts the call into a proposal addressed to the AS-supplied approvers and waits.

Reference implementation: <a href="https://github.com/humanagencyprotocol/hap-gateway" target="_blank" rel="noopener noreferrer">HAP Agent Gateway</a>

---

## Gatekeeper Obligation

Every execution environment MUST satisfy the Gatekeeper obligation before proceeding with an attested action.

> **Normative:** Every execution MUST be preceded by:
> 1. Local verification of the attestation (signature, TTL, bounds_hash, context_hash)
> 2. Issuance of an execution receipt by the Authority Server
>
> An implementation that stores or transmits attestations but does not verify them, or that verifies attestations but skips receipt issuance, is non-compliant.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — `verify()` + `requestReceipt()` calls in application code before execution
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint
- **Two cooperating layers** — one library performs local verification (Phase 1) and a second layer requests the receipt and blocks execution on the result (Phase 2). The reference implementation factors the obligation this way: `hap-core`'s `verify()` covers Phase 1 and the gateway's tool proxy covers Phase 2.

All four are equally valid. The protocol makes no architectural preference between monolithic and two-phase factoring. What matters is that the verification steps execute completely, a valid receipt is obtained, and execution is blocked on a negative result from either phase.

When the obligation is split across layers, the layer running Phase 2 is the conformant Gatekeeper and is responsible for ensuring Phase 1 ran. A library that exposes only Phase 1 (e.g., `verify()`-style local checks) MUST be documented as a partial implementation — it is not by itself a Gatekeeper.

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

The Gatekeeper performs validation in two phases: **local verification** and **AS receipt issuance**.

### Phase 1: Local Verification

1. **Reconstruct canonical bounds** from the submitted bounds object (apply v0.5 escape rules: reject newlines, percent-encode `=`/`%`/non-printable ASCII)
2. **Compute `bounds_hash`** and verify it matches the attestation
3. **Reconstruct canonical context** from the submitted context object (always compute the hash; use the well-known empty hash if context is empty)
4. **Compute `context_hash`** and verify it matches the attestation
5. **Fetch Profile** for the referenced `profile_id`
6. **For each attestation:**
   - Fetch AS public key (cached or on-demand)
   - Verify Ed25519 signature (base64url-decoded) against the canonical attestation payload
   - Verify TTL not expired
   - Verify `commitment_mode` matches what the gateway expects (or pass through if neutral)
7. **Verify domain coverage** against the AS's group config (in group mode) or skip (in personal mode)
8. **Check per-transaction bounds** — for every bounds field where `boundType.kind === "per_transaction"`, verify that `execution[boundType.of] <= boundValue`.
9. **Validate `actionType`** — verify the resolved `actionType` (from the tool-gating manifest's `staticExecution.action_type`) is a member of the profile's `boundsSchema.actionTypes`.
10. **Check context constraints** — for every context field with an `enum`, `subset`, or `pattern` constraint, verify that the corresponding value in the execution request satisfies the constraint. This check is **required** locally because the AS only holds `context_hash` and cannot enforce context constraints at receipt time. A non-conforming execution context MUST be rejected here before any AS call.

If any local check fails → reject with a structured error before contacting the AS.

### Phase 2: AS Receipt Issuance

If Phase 1 passes, the Gatekeeper requests an execution receipt from the AS. See "Receipt Request" below.

The AS performs cumulative limit checks (daily, monthly) and revocation checks. If the AS returns a receipt, execution proceeds. If the AS returns an error, execution is blocked.

---

## Receipt Request

For every authorized execution, the Gatekeeper sends a receipt request to the AS:

```json
{
  "boundsHash": "sha256:...",
  "profileId": "charge@0.5",
  "action": "stripe__create_payment_link",
  "actionType": "charge",
  "executionContext": {
    "amount": 5,
    "currency": "USD"
  },
  "idempotencyKey": "9f1c…"
}
```

The request body MUST NOT include `path`, `attestationHash`, `frame_hash`, or any other v0.3/v0.4-era identifier. v0.5 ASs MUST reject these. `actionType` MUST be in the profile's `boundsSchema.actionTypes` registry; the Gatekeeper SHOULD validate locally before round-tripping.

**Idempotency (exactly-once).** On the synchronous path (`automatic` mode), the Gatekeeper MUST generate one `idempotencyKey` per tool invocation and reuse it **unchanged** on every retry of that invocation's receipt request. The key MUST be unique per logical execution and MUST NOT be derived from the action's content — two intentionally identical actions are distinct executions and each must be counted. Retrying a receipt request is only safe (and only permitted) when the key is present: a transient failure that hides the AS response *after* it committed is recovered by the retry, which the AS dedups to the original receipt instead of double-counting. The Gatekeeper MUST NOT retry past a **definitive** AS rejection — `BOUND_EXCEEDED`, `CUMULATIVE_LIMIT_EXCEEDED`, `APPROVAL_REQUIRED`, `INVALID_ACTION_TYPE`, `ATTESTATION_REVOKED`, `ATTESTATION_EXPIRED`, `IDEMPOTENCY_MISMATCH` — which fail closed on the first response. Review-mode commits carry a `proposalId` instead and omit the key (the proposal CAS is their replay protection).

The AS responds with either:

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

This is critical: the AS authorizes the action *before* it happens, not after. The receipt is proof of authorization, not proof of completion.

---

## AS Public Key Resolution

The Gatekeeper MUST obtain the AS's public key via a trusted distribution mechanism. Examples include API endpoint, DNS record, DID resolution, or static configuration.

The Gatekeeper SHOULD cache AS public keys to minimize network calls. The AS is a runtime dependency for receipt issuance, but signature verification can run locally once the public key is cached.

---

## State Model

> v0.4 changes the Gatekeeper's state model from v0.3.

In v0.3, the Gatekeeper was stateless: all proof was received in the request, validated locally, and the decision was returned. The Gatekeeper held no state and made no network calls beyond initial key resolution.

In v0.4+, the Gatekeeper is **partially stateful**:

- **Local cache** — attestations, profiles, AS public keys, receipts
- **Runtime AS dependency** — every execution requires a fresh receipt from the AS

The Gatekeeper may cache attestations and profiles for performance, but MUST always request a fresh receipt for each execution. Cached receipts MUST NOT be reused for subsequent executions.

**Local execution logs are display-only (v0.5).** A Gatekeeper MAY maintain a local record of executions for UI rendering (consumption progress bars, history views, audit replays). It MUST NOT use that record as a second-pass cumulative enforcement layer. The AS's cumulative state is authoritative; running a parallel cumulative check on the Gatekeeper duplicates the source of truth and risks drift between the two. v0.4 reference implementations that re-checked cumulative bounds locally before calling the AS MUST drop the local check by v0.5; per-transaction bounds enforcement on the Gatekeeper remains correct and is unaffected.

**Normative:** TTL governs whether the Gatekeeper accepts an attestation for execution — not whether the attestation continues to exist. Attestations and receipts MUST remain available for post-hoc verification (audit, dispute resolution) beyond TTL expiry. How and where they are stored is an integration concern; that they are retained is a protocol requirement.

**Normative:** The Gatekeeper MUST NOT have a "bypass" mode. If attestations and receipts are required, they must be obtained. Development/testing environments MAY use test attestations with test AS keys, but the verification logic and receipt issuance MUST still execute.

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

#### Receipt Errors (from AS)

See the Error Codes section in `core.md` for the authoritative list. Codes that may surface from a receipt request include:

| Code | Meaning |
|------|---------|
| `ATTESTATION_NOT_FOUND` | AS does not know this `boundsHash` |
| `ATTESTATION_REVOKED` | Attestation has been revoked |
| `ATTESTATION_EXPIRED` | TTL has elapsed |
| `CUMULATIVE_LIMIT_EXCEEDED` | Cumulative limit would be exceeded |
| `PROPOSAL_REQUIRED` | Attestation is in review mode and no matching `proposalId` was supplied |
| `PROPOSAL_NOT_APPROVED` | The named proposal has not been committed yet |
| `PROPOSAL_REJECTED` | The named proposal was rejected |
| `PROPOSAL_MISMATCH` | The receipt request does not match the stored proposal |
| `PROPOSAL_ALREADY_EXECUTED` | A receipt has already been issued for this proposal |
| `MALFORMED_RECEIPT_REQUEST` | Request carried a retired identifier (`attestationHash`/`frame_hash`/`path`) — bug in the Gatekeeper; send bare `boundsHash` |
| `IDEMPOTENCY_KEY_REQUIRED` | Synchronous (`automatic`, no `proposalId`) request omitted the required `idempotencyKey` — bug in the Gatekeeper |
| `IDEMPOTENCY_MISMATCH` | `idempotencyKey` reused for a different execution — do not retry |

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

In `review` mode, the Gatekeeper does not block on `PROPOSAL_REQUIRED` as a hard error — it surfaces the proposal to the user and waits for approval. Once the user approves, the Gatekeeper re-issues the receipt request with the `proposalId`, the AS atomically transitions the proposal from `committed` to `executed`, and the receipt is returned.

### Connector Examples

| Connector | Where it runs | How it gates |
|-----------|---------------|--------------|
| **Agent runtime** (primary v0.4 use case) | Pre-tool-call hook | Wraps every MCP tool call: verify locally + request receipt + execute |
| **CI/CD** | Pipeline step | Blocks deployment job until verify + receipt return success |
| **API Gateway** | Request middleware | Intercepts requests, extracts attestation from headers, verifies + receipts before forwarding |
| **Webhook** | Incoming handler | Verifies attestation + obtains receipt before processing |
| **Infrastructure** | Admission controller | Kubernetes admission webhook or Terraform sentinel |

### AS Key Resolution

Connectors MUST obtain the AS's public key via a trusted distribution mechanism (API endpoint, DNS record, DID resolution, or static configuration).

Connectors SHOULD cache public keys with a TTL.

### Normative Rules

1. Every connector MUST implement the full verification logic AND the receipt request flow.
2. A connector MUST NOT partially verify (e.g., check signatures but skip receipt issuance).
3. A connector MUST reject execution if either local verification or receipt issuance fails — no "warn and proceed" mode in production.
4. Connectors MUST return structured error responses using the error codes above.
5. Connectors SHOULD cache AS public keys to minimize network calls.
6. Cached receipts MUST NOT be reused for subsequent executions.

---

## Tool-Gating Manifests

> Cross-reference: see `core.md` § "Tool-Gating Manifest" for the canonical schema.

A Gatekeeper that fronts MCP tool calls (the primary v0.5 use case) consumes a tool-gating manifest per integration. The manifest answers two questions the protocol previously left implicit:

1. **Which profile authorizes this tool?** — the manifest's `profile` field.
2. **How does a tool call's arguments produce an `executionContext`?** — the manifest's `tools.<name>.executionMapping` and `staticExecution`.

The Gatekeeper MUST refuse any tool that is not described in a loaded manifest. There is no "permissive default" — read-only tools also require an entry (with `category: "read"`).

### Resolving `actionType`

`actionType` MUST come from the manifest's `staticExecution.action_type`. The Gatekeeper:

1. Loads the manifest entry for the called tool.
2. Reads `staticExecution.action_type`.
3. Validates that the value is a member of the profile's `boundsSchema.actionTypes`.
4. Sends it to the AS unchanged.

A Gatekeeper that derives `actionType` from the tool name (e.g., by splitting on `__` and reading a prefix) is non-conformant. Tool name → action type is a manifest-author decision, not a runtime inference.

### Read vs Write Categorization

| Manifest `category` | Gatekeeper behavior |
|---|---|
| `read` | Verify a matching authorization exists for the manifest's profile. Skip executionContext construction and bounds verification. Do not request a receipt. (Read calls do not consume cumulative state.) |
| `write` | Run the full Phase 1 + Phase 2 flow. Build `executionContext` from `staticExecution` + `executionMapping`. Verify per-transaction bounds locally, request a receipt, block on negative results. |

Read-only tools still require authorization. The protocol forbids ungated read access — the read/write distinction is about *what* is enforced, not *whether* enforcement happens.

### Argument Coercion

When applying `executionMapping` transforms:

- Numeric arguments stay numeric; non-numeric arguments are stringified.
- Array arguments with `transform: "join_domains"` MUST be reduced via: lowercase → extract domain (suffix after `@`) → deduplicate → sort ascending → join with comma. This produces a deterministic canonical form for `subset` checks.
- Reserved keys whose names start with `_` (e.g., `_imagePreview`) MUST NOT flow into `executionContext`. They are advisory metadata for proposal previews.
- When an argument is an object with an `email` property (e.g., a calendar attendee `{ email, displayName }`), implementations SHOULD coerce to the `email` value before applying string transforms.

### `review_above_cap` Routing

When the AS returns `APPROVAL_REQUIRED`, the Gatekeeper:

1. Reads the `approvers` array from the AS error body.
2. Falls back to the signed attestation's `above_cap_approvers` if the AS did not provide approvers.
3. Submits a proposal to the AS with `pendingApprovers` set to the merged approver list.
4. Returns control to the agent with a tracking token (proposal ID).
5. On approval, replays the receipt request with the `proposalId` (the AS atomically transitions the proposal `committed → executed` and signs the receipt).
6. On rejection, returns the rejection to the agent and does not retry.

The signed `above_cap_approvers` is the source of truth; AS-supplied approvers are an operational hint. A compromised AS that omits or shrinks the approver list MUST NOT be trusted to widen the action — the Gatekeeper enforces against the signed list.

---

## Bounded Execution

For agent workflows, the Gatekeeper performs three distinct verifications: **authorization verification**, **bounds verification**, and **receipt issuance**.

### Bounds, Context, and Execution

The **bounds** are what the human attests to as enforceable constraints. They define the boundaries within which an agent may act. Bounds are hashed into `bounds_hash` and signed.

The **context** is the human's operational scope (e.g., target environment, customer segment). Context is hashed into `context_hash` and signed but stays local.

The **execution** is what the agent submits when it wants to act. It contains the specific values for a single action within the attested bounds.

```
BOUNDS (human attests, sent to AS)

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
  -> Gatekeeper requests receipt from AS
  -> AS checks cumulative limits (e.g., daily total + 5 ≤ 200)
  -> AS issues receipt → execution proceeds
```

### Gatekeeper Validation for Bounded Execution

The Gatekeeper performs:

1. **Verify authorization (local)** — Phase 1 of Validation Steps. The attestation is validly signed, all hashes match, TTL not expired, domains covered.
2. **Verify bounds (local)** — for each constrained field in the bounds, verify the execution value satisfies the per-transaction bound.
3. **Request receipt (AS)** — Phase 2. The AS checks cumulative limits and revocation status, then issues a signed receipt.
4. **If all valid** → execute the tool call and store the receipt locally.

The Gatekeeper MUST verify the authorization (steps 1–2) before contacting the AS for a receipt. If any local check fails, reject without making the AS call.

### Normative Rules

1. The Gatekeeper MUST verify local authorization (signature, hashes, TTL, per-tx bounds, context constraints, `actionType` registry membership) before requesting a receipt.
2. The Gatekeeper MUST request a receipt from the AS for every write execution.
3. The Gatekeeper MUST block execution if the receipt request fails.
4. A single attestation MAY be used for multiple executions, as long as TTL has not expired, cumulative limits are not exhausted, and the attestation has not been revoked.
5. Per-transaction bounds (`boundType.kind === "per_transaction"`) are enforced locally by the Gatekeeper AND by the AS. Cumulative bounds (`cumulative_sum`, `cumulative_count`) are enforced solely by the AS because the Gatekeeper has no receipt history. Context constraints (enum/subset/pattern) are enforced **solely by the Gatekeeper** because the AS only holds `context_hash` and cannot inspect plaintext context values.
6. The Gatekeeper MUST NOT cache receipts and reuse them for new executions. Each execution requires a fresh receipt.
7. If the AS is unreachable or unresponsive when a receipt is requested, the Gatekeeper MUST block execution. Implementations MUST NOT use a cached prior receipt as a fallback. Implementations MUST NOT have a "warn and proceed" or "degraded" mode for production use.
8. The Gatekeeper MAY maintain a local execution log for display purposes only. It MUST NOT use that log to re-validate cumulative bounds — the AS is authoritative.
9. The Gatekeeper MUST resolve `actionType` from the tool-gating manifest. It MUST NOT derive `actionType` from string manipulation of the tool name.

---

## Combined AS+Gatekeeper Deployment

For personal, team, or institutional use, the AS and Gatekeeper logic typically run as separate services. The reference implementation runs them in two processes:

```
User
  | (defines bounds, intent, commitment mode)
  v
Gateway UI (Local App)
  | (sends attestation request via control-plane)
  v
Authority Server (cloud)
  |-- validates profile, identity, group governance
  '-- signs attestation (returns to gateway)
  v
Gateway (caches attestation, stores context locally)
  v
Agent calls tool via MCP
  v
Gateway MCP Server (Gatekeeper)
  |-- verifies attestation locally
  |-- requests receipt from AS
  v
Authority Server
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
- [ ] Reconstruct `context_hash` from request parameters (always include the empty hash if context is empty)
- [ ] Reject malformed inputs (newlines, non-percent-encoded `=`) before hashing
- [ ] Verify attestation signature against trusted AS key (base64url decoding)
- [ ] Verify both `bounds_hash` and `context_hash` match the attestation
- [ ] Check TTL validity
- [ ] Verify all required domains have valid attestations
- [ ] Verify per-transaction bounds against execution values (locally; the AS also verifies)
- [ ] Verify context constraints (enum, subset, pattern) locally — the AS cannot
- [ ] Validate `actionType` against the profile's `boundsSchema.actionTypes` registry locally
- [ ] Resolve `actionType` from the tool-gating manifest's `staticExecution.action_type` — never from tool-name parsing
- [ ] Refuse any MCP tool that has no entry in a loaded tool-gating manifest
- [ ] Request execution receipt from AS for every write action
- [ ] Block execution if receipt issuance fails
- [ ] Store receipts locally for operational use; treat the local store as display-only (do NOT use it for cumulative enforcement)
- [ ] Honor `commitment_mode` — `automatic` requests receipt directly, `review` waits for approval, `review_above_cap` routes `APPROVAL_REQUIRED` errors into proposals
- [ ] Return structured errors with the canonical v0.5 error codes
- [ ] Forward only minimal, non-semantic commands to the executor
- [ ] No bypass mode in production

---

## Summary

The Gatekeeper in HAP v0.4:

- Enforces attestation verification before every consequential action
- Reconstructs `bounds_hash` and `context_hash` and verifies cryptographic signatures
- Checks domain coverage, TTL validity, and per-transaction bounds locally
- **Requests an execution receipt from the AS for every action** (new in v0.4)
- Blocks execution if either local verification or receipt issuance fails
- Honors `commitment_mode` — `automatic` proceeds with receipt; `review` waits for human approval
- Implements via connectors adapted to each execution environment
- The AS is a runtime dependency by design — every execution carries a signed receipt

The AS issues proof. The Gatekeeper enforces it. The receipt seals it.

**No receipt, no execution.**
