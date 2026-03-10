---
title: "Governance"
version: "Version 0.3"
date: "March 2026"
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

### Invariant 1 — No Execution Without Attestation

A consequential action is any operation that affects external state, human wellbeing, financial position, legal standing, or reputation.

No executor (human or machine) may perform a consequential action unless presented with a valid HAP attestation conforming to a trusted Profile.

### Invariant 2 — Explicit Human Decision Ownership

Every attestation must reference at least one identifiable human Decision Owner. Collective, symbolic, or anonymous ownership is invalid.

### Invariant 3 — Domain-Covering Ownership

Each Decision Owner must declare a domain. Execution is invalid if the decision's required domains (as defined by the execution path) are not covered by the declared domains of all Decision Owners.

### Invariant 4 — Privacy Preservation

No semantic content may leave local custody by protocol design. SPs and Executors receive only cryptographic hashes, structural metadata, and signatures.

### Invariant 5 — Profile Conformance

Attestations must reference a specific Profile. Validation rules are Profile-defined. Unknown or untrusted Profiles must be rejected.

### Invariant 6 — Binding Commitment

Once execution occurs, the associated commitment and ownership record must be append-only and non-reversible. History may be appended to, but not rewritten.

---

## Profile Governance

Profiles are the mechanism for domain-specific enforcement. Profile governance follows these principles:

### Permissionless Creation

Anyone may create and publish a Profile. No approval is required.

### Versioned Evolution

Profiles version independently of HAP Core. Breaking changes require version bumps.

### Local Trust Decisions

Applications and SPs decide which Profiles to trust. There is no global Profile registry.

### Transparent Specification

Profiles must fully specify:
- Required frame keys
- Gate requirements
- Required domains per execution path
- Execution context schema
- Field constraints (if any)
- TTL limits
- Retention minimum

Ambiguous Profiles are unenforceable.

### Profile Versioning

- Profiles MUST declare a version
- Breaking changes MUST bump the version
- SPs MUST reject unknown Profile versions
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
- Valid cryptographic signatures
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
- Reference Frame canonicalization tests
- Attestation validation test cases
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
- SPs MUST retain attestation records for at least the profile-defined retention period
- Attestation records MUST be append-only
- SPs SHOULD publish attestation counts and statistics
- SPs MUST NOT issue attestations without verifying domain authority

### SP Misbehavior

- Issuing attestations for unauthorized DIDs → SP trust revocation
- Backdating timestamps → SP trust revocation
- Refusing valid requests → escalation path required

---

## Multi-SP Ecosystem

The protocol supports multiple SPs:

- Organizations choose which SP(s) to use
- Verifiers can trust multiple SPs
- Attestations reference which SP signed them
- No single SP has monopoly on trust

### Interoperability

- SPs SHOULD use compatible attestation formats
- SPs MAY federate domain authority (SP-A trusts SP-B's authority registry)
- Cross-SP verification MUST be possible if both SPs are trusted

---

## Domain Authority Governance

### Within Organizations

- Organization defines who grants domain authority
- Authority grants SHOULD require approval from existing authority holder
- Authority SHOULD have expiration (annual renewal)

### Audit Trail

- All authority grants/revocations MUST be logged
- Logs MUST include: who granted, to whom, which domain, when, expiration

---

## Dispute Resolution

When attestation validity is disputed:

1. Verify cryptographic validity (signature, hashes)
2. Verify domain authority at time of attestation
3. Verify SP was trusted at time of attestation
4. If all valid → attestation stands
5. If authority was invalid → attestation is void, SP may be at fault

---

## TTL Enforcement

- Each Profile defines TTL limits
- Gatekeepers MUST enforce these limits
- This prevents time-pressure attacks on approval

### Retention Enforcement

- Each Profile defines `retention_minimum`
- Attestations MUST be retained beyond TTL expiry for audit purposes
- Discarding attestations on TTL expiry destroys the audit trail

---

## Error Transparency

- Gatekeepers SHOULD return structured error codes
- Error codes MUST NOT leak sensitive information
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
