---
title: "Gatekeeper"
version: "Version 0.3"
date: "March 2026"
---

The Gatekeeper is the enforcement point between human-attested authorization and machine execution. It verifies attestations and blocks execution if validation fails.

The Gatekeeper is not a prescribed component or deployment topology — it is the guarantee that attestation verification has occurred before any consequential action proceeds.

Reference implementation: <a href="https://github.com/humanagencyprotocol/hap-gateway" target="_blank" rel="noopener noreferrer">HAP Agent Gateway</a>

---

## Gatekeeper Obligation

Every execution environment MUST satisfy the Gatekeeper obligation before proceeding with an attested action.

> **Normative:** Every execution MUST be preceded by attestation verification as defined in this section. An implementation that stores or transmits attestations but does not verify them before execution is non-compliant.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — a `verify()` call in application code before execution proceeds
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint

All three are equally valid. The protocol makes no architectural preference. What matters is that the verification steps execute completely and that execution is blocked on a negative result.

A system that has attestations but skips verification is in violation — the attestation alone is not proof of compliance; verified attestation is.

---

## Execution Request

The client submits the frame fields and attestations. The Gatekeeper only accepts data that is attested — every field in the request must be verifiable against `frame_hash` in the attestations.

```json
{
  "frame": {
    "repo": "https://github.com/owner/repo",
    "sha": "a1b2c3...",
    "profile": "ship@0.3",
    "path": "deploy-prod-user-facing"
  },
  "attestations": [
    "base64-attestation-blob-domain-1...",
    "base64-attestation-blob-domain-2..."
  ]
}
```

The frame fields are profile-specific. For ship, they are `repo`, `sha`, `profile`, and `path`. The Gatekeeper reconstructs `frame_hash` from these fields and verifies it matches every attestation. No unattested parameters are accepted.

---

## Validation Steps

The Gatekeeper performs:

1. **Reconstruct frame** from action params
2. **Compute frame_hash**
3. **Fetch Profile** for the referenced profile
4. **Look up execution path** → get `requiredDomains`
5. **For each required domain:**
   - Find attestation covering that domain
   - Fetch SP public key (cached or on-demand)
   - Verify signature
   - Verify `frame_hash` matches
   - Verify TTL not expired
   - Verify scope is sufficient (`domain`)
6. **If any required domain missing or invalid** → reject with structured error
7. **If all valid** → authorize execution

---

## SP Public Key Resolution

The Gatekeeper MUST obtain the SP's public key via a trusted distribution mechanism. Examples include API endpoint, DNS record, DID resolution, or static configuration.

All validation logic runs locally. The SP is not a runtime dependency for verification — only for initial key resolution (which SHOULD be cached).

---

## Stateless Design

The Gatekeeper:

- Does not store attestations
- Does not query attestation registries
- Receives all proof in the request
- Validates and decides

Where attestations are stored (PR comments, database, registry) is an integration concern, not a protocol concern.

**Normative:** TTL governs whether the Gatekeeper accepts an attestation for execution — not whether the attestation continues to exist. Attestations MUST remain available for post-hoc verification (audit, dispute resolution, output provenance) beyond TTL expiry. How and where they are stored is an integration concern; that they are retained is a protocol requirement.

**Normative:** The Gatekeeper MUST NOT have a "bypass" mode. If attestations are required by the profile, they must be verified. Development/testing environments MAY use test attestations with test keys, but the verification logic itself must still execute.

---

## Connector Model

A **connector** is an environment-specific implementation of the Gatekeeper verification obligation. It adapts the standard verification interface to a particular execution environment — CI/CD pipeline, API gateway, agent runtime, etc.

**Connectors ARE Gatekeeper implementations**, not clients of a separate Gatekeeper service. Each connector embeds the full verification logic. There is no separate "Gatekeeper server" that connectors call — the verification runs within the connector itself.

### Standard Interface

Every connector MUST implement the `verify` operation:

**Request:**

```json
{
  "frame": {
    "repo": "https://github.com/owner/repo",
    "sha": "a1b2c3...",
    "profile": "ship@0.3",
    "path": "deploy-prod-user-facing"
  },
  "attestations": [
    "base64-attestation-blob..."
  ]
}
```

Frame fields are profile-specific. The fields above are for `ship`. Other profiles define their own frame fields.

**Success response:**

```json
{
  "approved": true,
  "frame_hash": "sha256-hex...",
  "verified_domains": ["engineering", "marketing"],
  "profile": "ship@0.3"
}
```

**Failure response:**

```json
{
  "approved": false,
  "errors": [
    {
      "code": "DOMAIN_NOT_COVERED",
      "domain": "marketing",
      "message": "No valid attestation covers the marketing domain"
    },
    {
      "code": "INVALID_SIGNATURE",
      "domain": "engineering",
      "message": "Attestation signature verification failed"
    }
  ]
}
```

**Error codes:**

| Code | Meaning |
|------|---------|
| `FRAME_HASH_MISMATCH` | Recomputed frame_hash does not match attestation |
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `DOMAIN_NOT_COVERED` | Required domain has no valid attestation |
| `TTL_EXPIRED` | Attestation has exceeded its time-to-live |
| `PROFILE_NOT_FOUND` | Referenced profile could not be resolved |
| `SCOPE_INSUFFICIENT` | Attestation scope does not cover the required domain |
| `BOUND_EXCEEDED` | Execution request value exceeds authorization frame bound |

**Bound exceeded response example:**

```json
{
  "approved": false,
  "errors": [
    {
      "code": "BOUND_EXCEEDED",
      "field": "amount",
      "message": "Execution value 120 exceeds authorization bound max: 80",
      "bound": { "max": 80 },
      "actual": 120
    }
  ]
}
```

Connectors MAY additionally provide:

| Operation | Purpose |
|-----------|---------|
| `verifyAndExecute` | Verify then trigger execution if approved |
| `middleware` | Framework-specific request interceptor |

### Connector Examples

| Connector | Where it runs | How it gates |
|-----------|---------------|--------------|
| **CI/CD** | Pipeline step | Blocks deployment job until `verify` returns `approved: true` |
| **API Gateway** | Request middleware | Intercepts requests, extracts attestations from headers, verifies before forwarding |
| **Webhook** | Incoming handler | Verifies attestations in webhook payload before processing |
| **Infrastructure** | Admission controller | Kubernetes admission webhook or Terraform sentinel that calls `verify` |
| **Agent runtime** | Pre-execution hook | Wraps tool execution in agent frameworks — `verify` before every tool call |

### SP Key Resolution

Connectors MUST obtain the SP's public key via a trusted distribution mechanism (API endpoint, DNS record, DID resolution, or static configuration).

Connectors SHOULD cache public keys with a TTL. The SP is not a runtime dependency for verification — only for initial key resolution.

### Normative Rules

1. Every connector MUST implement the full verification logic defined in the Validation Steps.
2. A connector MUST NOT partially verify (e.g., check signatures but skip domain coverage).
3. A connector MUST reject execution if verification fails — no "warn and proceed" mode in production.
4. Connectors MUST return structured error responses using the error codes above.
5. Connectors SHOULD cache SP public keys to minimize network calls.
6. Connectors MUST be stateless — all proof is received in the request.

---

## Bounded Execution

For profiles that support agent execution, the Gatekeeper performs two distinct verifications: **authorization verification** and **bounds verification**.

### Authorization Frame vs. Execution Request

The **authorization frame** is what the human attests to. It defines the bounds — the boundaries within which an agent may act. The authorization frame is hashed into `frame_hash` and signed in the attestation.

The **execution request** is what the agent submits when it wants to act. It contains the specific values for a single action within the attested bounds.

```
AUTHORIZATION FRAME (human attests)

  "I authorize payments up to 80 EUR to approved recipients"

  amount: { max: 80 }
  currency: { enum: ["EUR"] }
  target_env: { enum: ["production"] }

  -> hashed into frame_hash, signed by domain owners

                                   |
                                   v

EXECUTION REQUEST (agent submits)

  amount: 5                          -> 5 <= 80
  currency: "EUR"                    -> in ["EUR"]
  target_env: "production"           -> in ["production"]

  -> Gatekeeper checks values against authorization frame bounds
```

### Gatekeeper Validation for Bounded Execution

The Gatekeeper performs:

1. **Verify authorization** (Validation Steps 1–7) — the authorization frame is validly attested, all domains covered, signatures valid, TTL not expired
2. **Verify bounds** — for each constrained field in the authorization frame:
   - Read the bound value from the authorization frame
   - Read the actual value from the execution request
   - Verify the actual value satisfies the bound
   - If any bound is violated → reject with `BOUND_EXCEEDED`
3. **If all valid** → authorize execution

### Execution Request Structure

```json
{
  "frame": {
    "amount_max": 80,
    "currency": "EUR",
    "target_env": "production",
    "profile": "spend@0.3",
    "path": "spend-routine"
  },
  "attestations": [
    "base64-attestation-blob..."
  ],
  "execution": {
    "amount": 5,
    "currency": "EUR",
    "target_env": "production",
    "recipient": "supplier-x"
  }
}
```

This is the same shape as the exact-match Execution Request, with an additional `execution` block. The `frame` and `attestations` are verified via `frame_hash` as in the Validation Steps. The `execution` block contains the agent's specific action values — verified against the frame's bounds.

### Normative Rules

1. Bounded execution does not replace exact-match verification. Profiles declare which mode applies. Profiles that do not define constraint types use exact-match verification only.
2. The authorization frame defines the outer boundary. The agent's execution request MUST fall within it.
3. A single authorization frame MAY be used for multiple execution requests, as long as TTL has not expired and each request falls within bounds.
4. The Gatekeeper MUST verify the authorization (step 1) before checking bounds (step 2). Invalid attestations are rejected regardless of whether bounds are satisfied.
5. Bounds are enforced on the values declared in the profile's constraint types. Fields without constraint types are not bounds-checked.

---

## Combined SP+Gatekeeper Deployment

For personal, team, or institutional use, SP and Gatekeeper can be combined:

```
User
  | (resolves gates locally)
  v
Local App
  | (sends structural request)
  v
HAP Gateway (SP + Gatekeeper)
  |-- [SP Module] Validates Profile -> Issues Attestation
  '-- [Gatekeeper Module] Validates Attestation -> Forwards Command
  v
Executor
  | (executes without discretion)
```

Logical separation of attestation and execution logic MUST be maintained.

---

## Implementation Checklist

- [ ] Reconstruct frame_hash from request parameters
- [ ] Verify attestation signature against trusted SP key
- [ ] Check TTL validity
- [ ] Verify all required domains have valid attestations
- [ ] Match execution path to attestation
- [ ] Return structured errors without leaking internals
- [ ] Forward only minimal, non-semantic commands
- [ ] No bypass mode in production
- [ ] Support bounded execution if profile defines constraints

---

## Summary

The Gatekeeper in HAP v0.3:

- Enforces attestation verification before every consequential action
- Reconstructs frame hashes and verifies cryptographic signatures
- Checks domain coverage, TTL validity, and scope sufficiency
- Enforces bounded execution for agent workflows
- Runs locally — stateless, no runtime SP dependency
- Implements via connectors adapted to each execution environment

The SP issues proof. The Gatekeeper enforces it.
No attestation, no execution.
