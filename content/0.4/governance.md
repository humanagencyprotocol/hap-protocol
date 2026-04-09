---
title: "Governance"
version: "Version 0.4"
date: "April 2026"
---

HAP is governed by invariant constraints, not institutions.

There is no central authority, no steward council, no registry, and no mandatory approval process. Compliance is enforced locally and cryptographically by any participant using the open specification.

---

## Core Laws

HAP is designed to satisfy three non-negotiable laws of globally scalable protocols:

1. Anyone can implement it
2. Anyone can verify it
3. No one can stop it

Any governance mechanism that violates these laws is invalid.

---

## Canonical HAP Invariants

A system may only claim to be HAP-compliant if all of the following invariants hold.

### Invariant 1 — No Execution Without Attestation and Receipt

A consequential action is any operation that affects external state, human wellbeing, financial position, legal standing, or reputation.

No executor (human or machine) may perform a consequential action unless preceded by:

1. A valid HAP attestation conforming to a trusted Profile
2. A valid HAP execution receipt issued by the SP for that specific action

This is the v0.4 strengthening of the v0.3 invariant. v0.3 required only the attestation. v0.4 requires both the attestation (proof of authorization) and the receipt (proof that the specific action was within bounds at the time of execution).

### Invariant 2 — Explicit Human Decision Ownership

Every attestation must reference at least one identifiable human Decision Owner. Collective, symbolic, or anonymous ownership is invalid.

### Invariant 3 — Domain-Covering Ownership

Each Decision Owner must declare a domain. In group mode, execution is invalid if the profile's required domains (as defined by the SP group configuration) are not covered by the declared domains of all Decision Owners. In personal mode, the user attests directly with no domain checks.

### Invariant 4 — Privacy Preservation

No semantic content may leave local custody by protocol design. SPs and Executors receive only:

- Bounds (in plaintext, for SP enforcement)
- Cryptographic hashes (`bounds_hash`, `context_hash`, `execution_context_hash`, `gate_content_hashes.intent`)
- Structural metadata
- Signatures
- DIDs and domain declarations

Context content, intent text, and any other narrative remain local.

### Invariant 5 — Profile Conformance

Attestations must reference a specific Profile. Validation rules are Profile-defined. Unknown or untrusted Profiles must be rejected.

### Invariant 6 — Binding Commitment

Once execution occurs, the associated commitment, ownership record, and receipt must be append-only and non-reversible. History may be appended to, but not rewritten. Revocation does not rewrite history — it only prevents new receipts from being issued against an attestation.

### Invariant 7 — Cryptographic Receipt of Execution

> New in v0.4.

Every authorized action must produce an SP-signed receipt before it executes. The receipt is the cryptographic record of execution. A system that authorizes actions without receipts is not v0.4 compliant.

---

## Profile Governance

Profiles are the mechanism for domain-specific enforcement. Profile governance follows these principles:

### Permissionless Creation

Anyone may create and publish a Profile. No approval is required.

### Versioned Evolution

Profiles version independently of HAP Core. Breaking changes require version bumps. Once published, a profile version is immutable — changes require a new version.

### Local Trust Decisions

Applications and SPs decide which Profiles to trust. There is no global Profile registry.

### Transparent Specification

Profiles must fully specify:
- Bounds schema (enforceable parameters)
- Context schema (operational scope, may be empty)
- Execution context schema (cumulative tracking)
- Required gates (`bounds`, `intent`, `commitment`, `decision_owner`)
- TTL limits (default and max)
- Retention minimum

Ambiguous Profiles are unenforceable.

Profiles MUST NOT define:
- `executionPaths` — removed in v0.4
- `requiredDomains` — moved to SP group configuration
- `gateQuestions` — the intent prompt is universal in the gateway UI

### Profile Versioning

- Profiles MUST declare a version
- Once published, profile versions are immutable
- Breaking changes MUST bump the version
- SPs MUST reject unknown profile versions
- SPs SHOULD support profile version negotiation
- Deprecated profiles SHOULD have a sunset timeline

---

## Permissionless Implementation

Any individual, team, or system may:

- Implement the HAP protocol
- Run a Service Provider
- Publish Profiles
- Enforce HAP locally
- Reject non-compliant executors

No approval is required. No registration is necessary.

---

## Cryptographic Self-Verification

Compliance is proven exclusively through:

- Correct schema usage
- Valid cryptographic signatures (on attestations and receipts)
- Invariant-preserving behavior

If an implementation satisfies the invariants, it is compliant. If it does not, it is not.

No external certification is required.

---

## Adversarial Interoperability

HAP assumes all remote parties are potentially hostile.

Local systems decide which entities to trust using:

- Public key whitelisting
- Local policy
- User-defined reputation

There is no global root of trust. There is only local sovereignty plus cryptographic proof.

---

## Forkability and Naming

Forking is a feature, not a failure.

Any community may fork:

- Profiles
- Service Provider implementations
- Gatekeeper / Gateway implementations
- UX layers
- Execution models

However:

- If core invariants are preserved, the system may call itself HAP
- If any canonical invariant is broken, the system must rename itself

This preserves interoperability without requiring permission.

---

## Reference Conformance

To support interoperability without institutional control, the HAP ecosystem maintains:

- Public invariant test vectors
- Reference bounds and context canonicalization tests
- Attestation validation test cases
- Receipt validation test cases
- Profile compliance checks

Running these tests is voluntary. Publishing results is optional.

No entity grants approval. No entity issues certification.

---

## SP Governance

Service Providers are trusted parties. Their governance must be explicit:

### SP Operators

- Who operates the SP?
- What jurisdiction?
- What liability?

### SP Accountability

- SPs MUST publish their signing public key
- SPs MUST retain a record of all attestations issued
- SPs MUST retain a record of all receipts issued (new in v0.4)
- SPs MUST retain attestation and receipt records for at least the profile-defined retention period
- Records MUST be append-only
- SPs MUST maintain a revocation list (new in v0.4)
- SPs SHOULD publish attestation and receipt counts and statistics
- SPs MUST NOT issue attestations without verifying domain authority (in group mode)
- SPs MUST NOT issue receipts for revoked or expired attestations

### SP Misbehavior

- Issuing attestations for unauthorized DIDs → SP trust revocation
- Issuing receipts that violate bounds → SP trust revocation
- Backdating timestamps → SP trust revocation
- Refusing valid requests → escalation path required

---

## Multi-SP Ecosystem

The protocol supports multiple SPs:

- Organizations choose which SP(s) to use
- Verifiers can trust multiple SPs
- Attestations and receipts reference which SP signed them
- No single SP has monopoly on trust

### Interoperability

- SPs SHOULD use compatible attestation and receipt formats
- SPs MAY federate domain authority (SP-A trusts SP-B's authority registry)
- Cross-SP verification MUST be possible if both SPs are trusted

> v0.4 does not specify cross-SP receipt federation. A single attestation lives on a single SP. Multi-SP federation for receipts is deferred to a future version.

---

## Domain Authority Governance

In v0.4, domain authority is configured per group on the SP, not in profiles.

### Within Groups

- The group admin defines `profileDomains` — which profiles are enabled and which domains must attest
- The group admin defines the authorization mapping — who holds each domain
- Authority grants SHOULD require approval from existing authority holders
- Authority SHOULD have expiration (annual renewal)

### Audit Trail

- All authority grants/revocations MUST be logged
- Logs MUST include: who granted, to whom, which domain, when, expiration

---

## Dispute Resolution

When attestation or receipt validity is disputed:

1. Verify cryptographic validity (signatures, hashes)
2. Verify domain authority at time of attestation
3. Verify SP was trusted at time of attestation
4. For receipts: verify the receipt was issued during the attestation's TTL window and before any revocation
5. If all valid → attestation and receipt stand
6. If authority was invalid → attestation is void, SP may be at fault
7. If receipt was issued for an unauthorized action → SP misbehavior

---

## TTL Enforcement

- Each Profile defines TTL limits (default and max)
- Gatekeepers MUST enforce these limits at attestation issuance
- The user selects a specific TTL within the profile's allowed range at attestation time
- This prevents time-pressure attacks on approval

### Retention Enforcement

- Each Profile defines `retention_minimum`
- Attestations MUST be retained beyond TTL expiry for audit purposes
- Receipts MUST be retained for at least `retention_minimum` from the receipt's own timestamp, independent of the parent attestation's lifecycle
- **Receipts outlive attestations**: TTL expiry and revocation of an attestation affect only the SP's willingness to issue *new* receipts against it. Previously-issued receipts remain cryptographically valid, queryable, and retained until their own retention window elapses. Destroying a receipt because its parent attestation was revoked destroys the audit trail of what actually happened and is a governance violation.
- Discarding attestations or receipts on TTL expiry destroys the audit trail

### Revocation

- v0.4 adds revocation as a first-class concept
- The SP maintains a revocation list, persisted in durable storage
- Revoked attestations remain cryptographically valid for audit, but the SP refuses to issue new receipts against them
- Revocation is faster than waiting for TTL expiry

---

## Error Transparency

- Gatekeepers and SPs SHOULD return structured error codes
- Error codes MUST NOT leak sensitive information (intent text, context content, business secrets)
- Failed validations MUST abort execution

---

## What Governance Is Not

HAP governance explicitly rejects:

- Central registries
- Steward councils
- Qualification processes
- Compliance certification bodies
- Jurisdiction-based approval

HAP governs behavior, not actors.

---

## Trust Model

Trust in HAP is constructed as:

```
Public Key + Profile + Local Policy
```

Every Service Provider, Profile, Executor, or App identifies itself via a public key. Local systems choose which keys and Profiles to trust. Unknown or untrusted keys are ignored by default.

There is no global trust anchor.

---

## Final Statement

HAP does not ask for permission. It does not seek legitimacy from institutions.

Its authority derives from invariants that cannot be bypassed without detection.

Systems that preserve those invariants interoperate. Systems that do not are ignored.

That is the entirety of governance.
