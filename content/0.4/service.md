---
title: "Service Providers"
version: "Version 0.4"
date: "April 2026"
---

A HAP Service Provider (SP) is the cryptographic authority and accountability layer of the protocol. It signs attestations that prove a human authorized a specific scope of action, and it signs receipts that prove each action stayed within those bounds.

In v0.4, the SP gains two new responsibilities beyond v0.3:

1. **Issuing execution receipts** for every authorized action
2. **Tracking cumulative state** against human-declared bounds

This makes the SP a runtime dependency for execution. v0.3 SPs were touched only at attestation time and for initial key resolution. v0.4 SPs are touched on every tool call.

SPs do not validate truth. They validate Profile compliance and bounds adherence.
SPs do not trust executors. They enable users to enforce boundaries.

Reference implementation: <a href="https://www.humanagencyprotocol.com/" target="_blank" rel="noopener noreferrer">humanagencyprotocol.com</a>

---

## Core Principles

### Profile-Centric

SPs validate requests against specific Profiles. Each v0.4 Profile defines:

- Bounds schema (enforceable parameters)
- Context schema (operational scope, may be empty)
- Execution context schema (cumulative tracking)
- Required gates (`bounds`, `intent`, `commitment`, `decision_owner`)
- TTL limits (default and max)
- Retention minimum

Profiles in v0.4 do **not** define `executionPaths`, `requiredDomains`, or `gateQuestions`. Domain requirements and execution paths are gone; gate questions are universal in the gateway UI.

### Trustless by Design

Anyone may run an SP — on a phone, server, or embedded device.
No central registry. No approval. No committee.

### Privacy-Preserving

SPs receive only the bounds (in plaintext for enforcement) and hashes for everything else:

- `bounds_hash`, `context_hash`, `execution_context_hash`
- `gate_content_hashes.intent`
- Owner DIDs and domain declarations

SPs **never** receive context content, intent text, or any other semantic content. Context content stays on the gateway, encrypted at rest.

### Per-Group Governance

In v0.4, organizational governance moves from the profile to the SP. Each group on the SP defines:

- Which profiles are enabled for the group
- For each enabled profile: which domains must attest
- Optional group-level limit ceilings that constrain what humans can authorize

This makes profiles universal — the same `charge@0.4` profile works for personal mode and for a 500-person enterprise.

---

## Service Provider Responsibilities

A v0.4 SP has five primary responsibilities:

1. **Attestation issuance** — sign authorizations after verifying profile compliance, identity, and (in group mode) domain authority
2. **Receipt issuance** — sign execution receipts after checking per-transaction bounds and cumulative limits
3. **Cumulative state tracking** — maintain running totals (daily, monthly) per attestation per action type
4. **Revocation** — maintain a revocation list and refuse to issue receipts against revoked attestations
5. **Retention** — store attestations and receipts for at least the profile-defined `retention_minimum`

---

## Attestation Issuance

### SP Request Schema

```json
{
  "profile_id": "charge@0.4",
  "bounds": {
    "profile": "charge@0.4",
    "amount_max": 100,
    "amount_daily_max": 500,
    "amount_monthly_max": 5000,
    "transaction_count_daily_max": 20
  },
  "bounds_hash": "sha256:...",
  "context_hash": "sha256:...",
  "execution_context_hash": "sha256:...",
  "domain": "finance",
  "did": "did:key:...",
  "gate_content_hashes": {
    "intent": "sha256:..."
  },
  "commitment_mode": "automatic",
  "ttl": 86400,
  "title": "Daily refund processing",
  "group_id": "acme-corp"
}
```

Context fields (`currency`, `action_type`) live in the contextSchema and are hashed into `context_hash` by the gateway. They are **not** part of the bounds sent to the SP — the SP only sees the context hash, and the Gatekeeper is the sole enforcer of context enum/subset constraints.

| Field | Description |
|-------|-------------|
| `profile_id` | The profile this authorization references |
| `bounds` | The full bounds object (sent in plaintext for SP enforcement) |
| `bounds_hash` | Hash of the canonical bounds, computed by the gateway |
| `context_hash` | Hash of the canonical context (gateway only, sha256 of empty string when context is empty) |
| `execution_context_hash` | Hash of the resolved execution context schema |
| `domain` | The domain the attester claims authority for |
| `did` | The verified DID of the attester |
| `gate_content_hashes` | At minimum: `{ "intent": "sha256:..." }` |
| `commitment_mode` | `"automatic"` or `"review"` |
| `ttl` | Requested TTL in seconds (clamped to profile max) |
| `title` | Optional human-readable label, stored as SP metadata |
| `group_id` | Group identifier (omit or `null` for personal mode) |

The SP receives the bounds in plaintext because it must enforce them at receipt time. It does **not** receive the context content — only `context_hash`.

Each attestation request covers a single domain. Multi-domain decisions require separate attestation requests — one per domain owner.

### Validation Rules

The SP MUST reject the attestation request if:

- `profile_id` is unknown or untrusted
- `bounds` is missing required fields per the profile's `boundsSchema`
- The recomputed bounds hash does not match `bounds_hash`
- `context_hash` is missing
- `execution_context_hash` is missing
- `gate_content_hashes.intent` is missing
- `commitment_mode` is not `"automatic"` or `"review"`
- The bounds violate group-level limit ceilings (group mode, if configured)
- Attester identity cannot be verified
- In group mode: the attester is not authorized for the claimed domain
- In group mode: the profile is not enabled for the group, or the domain is not configured for the profile
- Requested TTL exceeds the profile's max TTL

### SP Authorization Responsibilities

Before signing an attestation, the SP MUST:

1. **Verify identity** — Validate the attester's authentication. Resolve to a verified DID.
2. **Resolve domain requirements** — In group mode: look up `profileDomains` for the group and the requested profile.
3. **Check membership** — In group mode: verify that the authenticated DID holds the required domain in the group.
4. **Validate bounds** — Recompute `bounds_hash` from the submitted `bounds` and compare to the provided value.
5. **Validate against group limits** — In group mode: if the group has limit ceilings configured, verify the bounds do not exceed them.
6. **Reject or sign** — Only sign the attestation if all checks pass.

### Issued Attestation

On valid request, return:

```json
{
  "header": { "typ": "HAP-attestation", "alg": "EdDSA" },
  "payload": {
    "attestation_id": "uuid",
    "version": "0.4",
    "profile_id": "charge@0.4",
    "bounds_hash": "sha256:...",
    "context_hash": "sha256:...",
    "execution_context_hash": "sha256:...",
    "resolved_domains": [
      {
        "domain": "finance",
        "did": "did:key:..."
      }
    ],
    "gate_content_hashes": {
      "intent": "sha256:..."
    },
    "commitment_mode": "automatic",
    "issued_at": 1735888000,
    "expires_at": 1735974400
  },
  "signature": "base64url..."
}
```

Attestation properties:

- Short-lived (TTL bounded by profile max)
- Signed with the SP's Ed25519 private key
- The signed payload includes `commitment_mode` — changing it requires a new attestation
- **Normative**: the `title` field MUST NOT appear in the signed payload. It is SP-side metadata only and can be changed without invalidating the signature.

The SP also stores per-attestation metadata that is not part of the signed payload:

- `title` — human-readable label
- `groupId` — group context
- `createdBy` — user who created the attestation
- `deferredCommitmentDomains` — for multi-domain attestations where some domains are still pending review

---

## Receipt Issuance

> v0.4 introduces execution receipts. Every authorized action produces exactly one signed receipt before it executes.

### Receipt Request Schema

The Gatekeeper sends the following to the SP for every execution attempt:

```json
{
  "boundsHash": "sha256:...",
  "profileId": "charge@0.4",
  "action": "create_payment_link",
  "actionType": "charge",
  "executionContext": {
    "amount": 5,
    "currency": "EUR"
  }
}
```

| Field | Description |
|-------|-------------|
| `boundsHash` | The `bounds_hash` of the attestation being exercised. This is the sole lookup key for receipt requests. |
| `profileId` | The profile this attestation is bound to |
| `action` | The downstream tool/action name (audit metadata only) |
| `actionType` | The bounds-level action category — drives cumulative state partitioning and bounds dispatch |
| `executionContext` | Specific values for this call, including the fields referenced by `boundType.of` for per-transaction and cumulative_sum bounds |

The SP derives `userId` from the authenticated request context. It is not supplied in the request body.

### SP Validation for Receipt Issuance

The SP MUST reject the receipt request if:

- `boundsHash` is unknown
- The attestation has been **revoked** (return `ATTESTATION_REVOKED`)
- The attestation has **expired** (return `ATTESTATION_EXPIRED`)
- Any value in `executionContext` exceeds the per-transaction bounds in the attestation (return `BOUND_EXCEEDED`)
- Any cumulative limit (daily, monthly) would be exceeded after applying this execution (return `CUMULATIVE_LIMIT_EXCEEDED`)
- The attestation is in `review` mode and the action has not been explicitly approved by the human (return `REVIEW_PENDING`)
- The profile referenced by the attestation is unknown or untrusted (return `PROFILE_NOT_FOUND`)

### Bounds Checking

For every field in the profile's `boundsSchema.fields`, the SP looks up the field's declared `boundType` and dispatches on `boundType.kind`:

| `boundType.kind` | Check |
|---|---|
| `per_transaction` | `execution[boundType.of]` MUST be ≤ the bound value |
| `cumulative_sum` | `running_sum(boundType.of, boundType.window) + execution[boundType.of]` MUST be ≤ the bound value |
| `cumulative_count` | `running_count(boundType.window) + 1` MUST be ≤ the bound value |
| `enum` | Capability flag — the stored bound value MUST be in `boundType.values`. Enforced at attest time (the SP rejects bounds whose values are not in the allowed set). |

The SP MUST NOT attempt to enforce context constraints (enum/subset on `currency`, `allowed_recipients`, etc.). Context is hashed; the SP only sees the hash. The Gatekeeper is the sole enforcer of context constraints and MUST check them before requesting a receipt.

### Cumulative State Tracking

The SP MUST maintain cumulative state per (cumulative group, profile, actionType). The key is:

```
key: {cumGroupId}:{profileId}:{actionType}
value: {
  daily_amount: <number>,
  daily_count: <number>,
  monthly_amount: <number>,
  monthly_count: <number>,
  daily_reset: "YYYY-MM-DD",
  monthly_reset: "YYYY-MM"
}
```

`cumGroupId` is defined as:

```
cumGroupId = groupId || "personal:" + userId
```

In group mode, `cumGroupId` is the group ID. In personal mode (no group), `cumGroupId` is the string `personal:{userId}`. This keeps personal and group accounting in the same keyspace while guaranteeing they cannot collide.

**Important**: the key uses `actionType` (the semantic category — `charge`, `write`, `post`, `delete`), not `action` (the downstream tool name). Two different tools that share the same `actionType` under the same profile share a bucket; this is the intended behavior because an authorization scoped to "charges up to €500/day" should cap the total across all charge-producing tools, not give each tool its own allowance.

Cumulative state resets at calendar boundaries (daily and monthly). The SP is authoritative for cumulative state.

### Worked Example: Multi-Group + Personal

A single user (Alice) is a member of two groups (`acme-corp` as finance, `widgets-inc` as operations) and also has a personal workspace. She has three separate `charge@0.4` authorizations — one per context. Her cumulative state has three independent buckets:

| Bucket | `cumGroupId` | `profileId` | `actionType` | Semantics |
|---|---|---|---|---|
| Bucket 1 | `acme-corp` | `charge@0.4` | `charge` | Acme's finance spend against Acme limits |
| Bucket 2 | `widgets-inc` | `charge@0.4` | `charge` | Widgets' operations spend against Widgets limits |
| Bucket 3 | `personal:alice-123` | `charge@0.4` | `charge` | Alice's personal spend against her own limits |

When Alice makes a charge via her Acme authorization, only Bucket 1's counters move. Her Widgets and personal buckets are unaffected. This keeps accounting auditable per-attestation, per-group, and prevents cross-contamination.

### `action` vs `actionType` — normative rule

The receipt request carries both `action` (the downstream tool name, e.g., `create_payment_link`) and `actionType` (the semantic category, e.g., `charge`). The SP MUST:

1. Partition cumulative state by `actionType`, not by `action`.
2. Dispatch bounds enforcement by looking up `boundType` entries in the profile's `boundsSchema.fields` — the `boundType.kind` and any `boundType.of`/`boundType.window` fields determine how each bound is checked. `actionType` is not a dispatch key; it is a cumulative-bucket key.
3. Record `action` in the receipt for audit purposes. `action` MUST NOT affect cumulative state partitioning or bounds dispatch.

### Issued Receipt

On valid request, return a signed receipt:

```json
{
  "id": "uuid",
  "groupId": "acme-corp",
  "userId": "user-123",
  "boundsHash": "sha256:...",
  "profileId": "charge@0.4",
  "action": "create_payment_link",
  "actionType": "charge",
  "executionContext": { "amount": 5, "currency": "EUR" },
  "cumulativeState": {
    "daily":   { "amount": 45,  "count": 8 },
    "monthly": { "amount": 320, "count": 47 }
  },
  "limits": {
    "amount_max": 100,
    "amount_daily_max": 500,
    "amount_monthly_max": 5000,
    "transaction_count_daily_max": 20
  },
  "timestamp": 1735888050,
  "signature": "base64url..."
}
```

The `limits` object is a snapshot of the effective numeric bounds in force at receipt issuance time: the lesser of (the attestation's bounds, the group ceiling if configured). It is included in the receipt so auditors can reconstruct exactly which limits were being enforced without having to re-fetch the attestation and the group configuration.

The signature is over the canonical JSON serialization of the receipt body (excluding the `signature` field itself). See "Receipt Canonicalization" in `protocol.md` for the canonical serialization rules.

### Error Response

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

### Receipt Error Codes

Error codes are canonical across `protocol.md`, `service.md`, and `gatekeeper.md`. See the Error Codes section in `protocol.md` for the single authoritative list. Codes that may be returned from a receipt request include:

| Code | Meaning |
|------|---------|
| `ATTESTATION_NOT_FOUND` | Unknown `boundsHash` |
| `ATTESTATION_EXPIRED` | Attestation TTL has elapsed |
| `ATTESTATION_REVOKED` | Attestation has been revoked |
| `BOUND_EXCEEDED` | Per-transaction bound violated |
| `CUMULATIVE_LIMIT_EXCEEDED` | Cumulative limit would be exceeded |
| `PROFILE_NOT_FOUND` | Referenced profile unknown |
| `PROPOSAL_REQUIRED` | Attestation is in review mode and no matching `proposalId` was supplied |
| `PROPOSAL_NOT_APPROVED` | The named proposal has not been committed yet |
| `PROPOSAL_REJECTED` | The named proposal was rejected |
| `PROPOSAL_MISMATCH` | The receipt request does not match the stored proposal (tool, args, or context differ) |
| `PROPOSAL_ALREADY_EXECUTED` | A receipt has already been issued for this proposal |

---

## Revocation

The SP maintains a revocation list. Revocation can be initiated at any time after attestation, before TTL expiry.

### Revocation Operations

The SP MUST support:

- **Revoke an attestation** — mark an attestation as revoked. Future receipt requests will fail with `ATTESTATION_REVOKED`.
- **Query revocation status** — check if an attestation is revoked.
- **List revoked attestations** — for audit and UI display.

### Revocation Authorization

By default, the SP MUST allow revocation by:

- The original attester
- A group admin (in group mode)

The SP MAY define additional revocation policies (time windows, multi-party revocation, etc.).

### Revocation and Audit

Revocation does not invalidate the attestation cryptographically. The attestation's signature remains valid for audit purposes. Revocation only affects the SP's willingness to issue **new** receipts. Existing receipts (issued before revocation) remain valid proof of past executions.

---

## Group Configuration

In v0.4, organizational governance lives on the SP, configured per group.

### Profile Domains

For each group, the admin defines which profiles are enabled and which domains must attest:

```json
{
  "group": "acme-corp",
  "profileDomains": {
    "charge@0.4": ["finance"],
    "purchase@0.4": ["finance", "compliance"],
    "publish@0.4": ["marketing", "legal"]
  }
}
```

The profile defines *what* bounds exist. The group config defines *who* must attest.

**Normative rules:**

1. A profile with no domain configuration is **not available** to that group.
2. The group admin MUST assign at least one domain to each profile they enable.
3. Personal users (no group) bypass `profileDomains` entirely.

### Group Limit Ceilings

Optionally, the group admin MAY define ceiling limits that constrain what humans in the group can authorize:

```json
{
  "group": "acme-corp",
  "limits": {
    "charge@0.4": {
      "amount_max_ceiling": 1000,
      "amount_daily_max_ceiling": 5000
    }
  }
}
```

If a user attempts to attest with bounds that exceed a group ceiling, the SP MUST reject the attestation request.

Group ceilings constrain what humans can authorize — they do not override human decisions within those constraints.

---

## Personal Mode vs Group Mode

### Personal Mode

A user with no group is in personal mode. Characteristics:

- All profiles are available
- No domain requirements — the user attests directly
- The SP skips domain authority checks
- The attestation's `resolved_domains` records the user's self-claimed domain (typically `owner`)
- Cumulative tracking uses a `personal:{userId}` key

### Group Mode

A user attesting through a group operates in group mode. Characteristics:

- Only profiles in the group's `profileDomains` are available
- Domain authority is checked against the group's domain assignments
- Cumulative tracking uses the group ID as the key
- Group limit ceilings apply if configured

The same SP runs both modes. The same profile schemas apply to both modes. The difference is purely in the SP's enforcement of group governance.

---

## Retention

The SP MUST retain attestations and receipts for at least the profile-defined `retention_minimum`. Records MUST be:

- Append-only
- Available for audit verification
- Queryable by `boundsHash`, receipt ID, and time range
- Exportable in a standard format

Storage mechanism is implementation-specific (the reference implementation uses Redis with optional persistent backups).

### Receipts Outlive Attestations

Receipts remain cryptographically valid and retrievable after their parent attestation has expired or been revoked. The attestation's TTL and revocation status affect only the SP's willingness to issue **new** receipts against that attestation — they do not affect previously-issued receipts.

Concretely:

- When an attestation expires (TTL elapses), the SP MUST refuse new receipt requests against it (return `ATTESTATION_EXPIRED`). Previously-issued receipts remain valid and queryable.
- When an attestation is revoked, the SP MUST refuse new receipt requests against it (return `ATTESTATION_REVOKED`). Previously-issued receipts remain valid and queryable.
- In both cases, receipts MUST continue to be retrievable until at least `retention_minimum` has elapsed from the receipt's own timestamp, independent of the attestation's lifecycle.

The receipt is a permanent record of what happened under a specific authorization at a specific time. Expiring or revoking the authorization does not erase that history.

---

## Public Key Publication

SP identity = its public key (e.g., `did:key:z6Mk...`).

Applications and gateways whitelist SP keys they trust. There is no global trust anchor.

The SP MUST publish:

- Its current Ed25519 public key
- Key rotation history (if any)
- Optional: a verification endpoint that returns the public key by DID

---

## SP Workflow in Practice

```
Human (in gateway UI)
  | (defines bounds, writes intent, picks commitment mode, signs)
  v
Gateway (Local App)
  | (sends attestation request to SP)
  v
Service Provider
  | - validates profile compliance
  | - verifies identity and (in group mode) domain authority
  | - validates bounds against group limits
  | - signs and returns attestation
  v
Gateway
  | (caches attestation, stores context content locally)
  v
Agent calls tool
  v
Gateway
  | - verifies attestation locally (signature, TTL, hashes)
  | - requests execution receipt from SP
  v
Service Provider
  | - validates attestation is current and not revoked
  | - checks per-transaction bounds and cumulative limits
  | - records execution and signs receipt
  v
Gateway
  | (stores receipt locally, executes the tool call)
  v
Tool runs
```

---

## What SPs Are NOT

| Misconception | Reality |
|---------------|---------|
| Ethics enforcer | SPs validate structure and bounds — not morality or legality |
| Global authority | No SP can block others. No hierarchy exists |
| Content inspector | SPs never see semantic content (intent, context content, problem narratives) |
| Stateless oracle | v0.4 SPs maintain cumulative state and a revocation list. They are stateful by design. |

---

## Security Guarantees

### Fraud Prevention

- Fake attestations and receipts fail signature validation
- Stolen keys are mitigated by short TTL + user-controlled SP whitelists
- Revocation provides a fast stop before TTL expiry

### Privacy by Construction

SPs receive only:
- Bounds (in plaintext, for enforcement)
- `bounds_hash`, `context_hash`, `execution_context_hash`
- `gate_content_hashes.intent`
- Profile ID
- Owner DIDs
- Domain declarations
- `commitment_mode`
- Optional `title` (SP metadata, not signed)

SPs never receive:
- Context content (operational details — only the hash)
- Intent text (only the hash)
- Any narrative reasoning, problem statements, or rendered previews

### Profile Isolation

A compromised personal SP cannot issue attestations for profiles it doesn't support. Each Profile defines its own validation rules.

### No Executor Trust

Executors are not required to "do the right thing."
If an executor ignores the receipt requirement, it acts outside HAP — and is liable.

---

## Implementation Checklist

- [ ] Support Profile lookup by `profile_id`
- [ ] Validate bounds schema compliance and recompute `bounds_hash`
- [ ] Verify `gate_content_hashes.intent` is present
- [ ] Verify attester identity before signing
- [ ] In group mode: verify attester domain authority
- [ ] In group mode: enforce group limit ceilings
- [ ] Sign attestations with Ed25519, including `commitment_mode` in the payload
- [ ] Store attestation metadata (title, group, deferred commitment) separately from the signed payload
- [ ] Enforce Profile TTL limits at issuance
- [ ] Issue execution receipts with cumulative state and signature
- [ ] Track cumulative state (daily, monthly) per attestation per action
- [ ] Maintain a revocation list and check it before issuing receipts
- [ ] In `review` mode: refuse to issue receipts until the action is explicitly approved
- [ ] Retain attestations and receipts per profile `retention_minimum`
- [ ] Publish public key for verification

---

## Example: Multi-Domain Attestation

**Profile:** `purchase@0.4` (group `acme-corp` requires `finance` + `compliance`)

1. The user starts an authorization for `purchase@0.4` in the gateway.
2. The gateway sends the attestation request to the SP. The SP checks `profileDomains` and sees `purchase@0.4` requires both `finance` and `compliance`.
3. The Finance Manager attests via SP — SP verifies their identity and domain authority, then signs an attestation with `resolved_domains: [{domain: "finance", did: ...}]`.
4. The Compliance Officer attests via SP — SP signs a second attestation with `resolved_domains: [{domain: "compliance", did: ...}]`.
5. Both attestations share the same `bounds_hash`, `context_hash`, and `gate_content_hashes.intent`.
6. The Gatekeeper requests a receipt from the SP. The SP validates that the union of attested domains covers the required set, then issues the receipt.
7. The agent executes the tool call.

If any required domain attestation is missing → the SP refuses to issue receipts → the agent cannot act.

---

## Summary

Service Providers in HAP v0.4:

- Validate requests against **Profile** specifications
- Verify attester identity and (in group mode) domain authority
- Issue short-lived cryptographic attestations
- **Issue execution receipts for every authorized action** (new in v0.4)
- **Track cumulative consumption against bounds** (new in v0.4)
- **Maintain revocation lists** (new in v0.4)
- Retain records of all attestations and receipts
- Never see or store semantic content
- Enable permissionless, decentralized enforcement

HAP's power isn't in its providers — it's in its proof.
Run your own SP. Trust your own keys. Own your direction.

No receipt, no execution.
