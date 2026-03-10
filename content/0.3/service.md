---
title: "Service Providers"
version: "Version 0.3"
date: "March 2026"
---

A HAP Service Provider (SP) is an attester that cryptographically verifies whether a proposed action satisfies the structural requirements of a HAP Profile.

SPs do not validate truth. They validate Profile compliance.
SPs do not trust executors. They enable users to enforce boundaries.

Reference implementation: <a href="https://www.humanagencyprotocol.com/" target="_blank" rel="noopener noreferrer">humanagencyprotocol.com</a> (<a href="https://github.com/humanagencyprotocol/hap-sp" target="_blank" rel="noopener noreferrer">source</a>)

---

## Core Principles

### Profile-Centric

SPs validate requests against specific Profiles. Each Profile defines:

- Required frame keys and ordering
- Required gates
- Required domains per execution path
- Execution context schema
- TTL limits
- Retention minimum

### Trustless by Design

Anyone may run an SP—on a phone, server, or embedded device.
No central registry. No approval. No committee.

### Privacy-Preserving

SPs never receive semantic content.
Only structural signals and cryptographic hashes are processed.

---

## Service Provider (Attestation Issuance)

An SP is any system that implements the HAP SP Protocol to:

1. Receive a gate closure request (structural only)
2. Validate it against a Profile's rule set
3. Verify attester identity and domain authority
4. Issue a signed attestation if valid—or reject with a structured error

### SP Request Schema

```json
{
  "profile_id": "deploy-gate@0.3",
  "path": "deploy-prod-user-facing",
  "frame_hash": "sha256:...",
  "execution_context_hash": "sha256:...",
  "domain": "engineering",
  "did": "did:key:...",
  "gate_content_hashes": {
    "problem": "sha256:...",
    "objective": "sha256:...",
    "tradeoffs": "sha256:..."
  }
}
```

Each attestation request covers a single domain. Multi-domain decisions require separate attestation requests — one per domain owner.

### Validation Rules

The SP MUST reject if:

- `profile_id` is unknown or untrusted
- `path` does not match a defined execution path in the Profile
- `frame_hash` is missing or malformed
- Any gate required by the Profile is not satisfied (structural gates by request presence, semantic gates by `gate_content_hashes`)
- Attester identity cannot be verified
- Attester is not authorized for the claimed domain (see Identity & Authorization in Protocol)
- `domain` is not required by the execution path
- `execution_context_hash` is missing
- Request timestamp exceeds Profile's max TTL

---

## SP Responsibilities

### 1. Validate Profile Compliance

For each request:

1. Look up Profile by `profile_id`
2. Verify all required gates are satisfied
3. Check domain authority against execution path requirements
4. Validate structural integrity

### 2. Verify Identity and Authorization

Before signing an attestation, the SP MUST:

1. **Verify identity** — Validate the attester's authentication token against the identity provider. Resolve to a verified DID.
2. **Resolve authorization** — Fetch the domain→owners mapping from the configured authorization source.
3. **Check membership** — Verify that the authenticated DID is in the authorized list for the claimed domain.
4. **Reject or sign** — Only sign the attestation if both identity and authorization checks pass.

### 3. Issue Attestations

On valid request, return:

```json
{
  "header": { "typ": "HAP-attestation", "alg": "EdDSA" },
  "payload": {
    "attestation_id": "uuid",
    "version": "0.3",
    "profile_id": "deploy-gate@0.3",
    "frame_hash": "sha256:...",
    "execution_context_hash": "sha256:...",
    "resolved_domains": [
      {
        "domain": "engineering",
        "did": "did:key:..."
      }
    ],
    "gate_content_hashes": {
      "problem": "sha256:...",
      "objective": "sha256:...",
      "tradeoffs": "sha256:..."
    },
    "issued_at": 1735888000,
    "expires_at": 1735888120
  },
  "signature": "base64url..."
}
```

Attestation properties:

- Short-lived (TTL defined by Profile)
- Signed with SP's Ed25519 private key

### 4. Retain Attestation Records

SPs MUST retain a record of all attestations issued. Records MUST be:

- Append-only
- Retained for at least the profile-defined retention period
- Available for audit verification

The storage mechanism is implementation-specific.

### 5. Publish Public Key

SP identity = its public key (e.g., `did:key:z6Mk...`)

Applications whitelist SP keys they trust. There is no global trust anchor.

---

## SP Workflow in Practice

```
Human
  | (resolves 6 gates LOCALLY in app)
  v
Local App
  | (sends STRUCTURAL request to SP of choice)
  v
Service Provider (any type, any location)
  | (validates against Profile rules, verifies identity -> signs attestation)
  v
Local App
  | (sends attestation + execution payload to Gatekeeper)
  v
Gatekeeper
  | (verifies attestation -> authorizes or rejects)
  v
Executor (AGI, human, CI/CD, etc.)
  | (EXECUTES or FAILS)
```

The executor never sees the Frame text, tradeoffs, or reasoning.
It only obeys the attestation.

---

## What SPs Are NOT

| Misconception | Reality |
|---------------|---------|
| Ethics enforcer | SPs validate structure only—not morality or legality |
| Global authority | No SP can block others. No hierarchy exists |
| Content inspector | SPs never see semantic content |

---

## Security Guarantees

### Fraud Prevention

- Fake attestations fail signature validation
- Stolen keys are mitigated by short TTL + user-controlled whitelists

### Privacy by Construction

SPs receive only:
- Profile ID
- Frame hash
- Execution context hash
- Gate content hashes
- Gate list
- Owner DIDs
- Domain declarations

No IPs, no user IDs, no behavioral data, no semantic content.

### Profile Isolation

A compromised personal SP cannot issue attestations for profiles it doesn't support. Each Profile defines its own validation rules.

### No Executor Trust

Executors are not required to "do the right thing."
If an executor ignores the attestation, it acts outside HAP—and is liable.

---

## Implementation Checklist

- [ ] Support Profile lookup by `profile_id`
- [ ] Validate all Profile-required gates
- [ ] Verify attester identity before signing
- [ ] Verify attester domain authority before signing
- [ ] Verify required domains per execution path
- [ ] Sign attestations with Ed25519
- [ ] Enforce Profile TTL limits
- [ ] Retain records of all attestations issued (append-only)
- [ ] Retain attestation records per profile retention_minimum
- [ ] Publish public key for verification

---

## Example: Multi-Domain Attestation

**Profile:** `deploy-gate@0.3`, path `deploy-prod-full` requiring `engineering` + `release_management`

1. Engineer and Release Manager each attest via SP (one attestation per domain)
2. SP verifies identity, domain authority, and profile compliance before signing each attestation
3. Gatekeeper receives both attestations, verifies signatures, frame hash match, domain coverage, and TTL
4. All domains covered → execution authorized

If any required domain attestation is missing or invalid → Gatekeeper rejects.

---

## Summary

Service Providers in HAP v0.3:

- Validate requests against **Profile** specifications
- Verify attester identity and domain authority
- Issue short-lived cryptographic attestations
- Retain records of all attestations issued
- Never see or store semantic content
- Enable permissionless, decentralized enforcement

HAP's power isn't in its providers—it's in its proof.
Run your own SP. Trust your own keys. Own your direction.
