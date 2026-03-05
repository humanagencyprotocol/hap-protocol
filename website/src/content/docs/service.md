---
title: "Service Providers"
version: "Version 0.2"
date: "January 2026"
---

A HAP Service Provider (SP) is a stateless attester that cryptographically verifies whether a proposed action satisfies the structural requirements of a HAP Profile.

SPs do not validate truth. They validate Profile compliance.
SPs do not trust executors. They enable users to enforce boundaries.

---

## Core Principles

### Profile-Centric

SPs validate requests against specific Profiles. Each Profile defines:

- Required frame keys and ordering
- Required gates
- Decision Owner scope requirements
- TTL limits
- Disclosure schema

### Trustless by Design

Anyone may run an SP—on a phone, server, or embedded device.
No central registry. No approval. No committee.

### Privacy-Preserving

SPs never receive semantic content.
Only structural signals and cryptographic hashes are processed.

---

## What Is a Service Provider?

An SP is any system that implements the HAP SP Protocol to:

1. Receive a gate closure request (structural only)
2. Validate it against a Profile's rule set
3. Issue a signed attestation if valid—or reject with a structured error

### SP Request Schema

```json
{
  "profile_id": "deploy-gate@0.2",
  "frame_hash": "sha256:...",
  "resolved_gates": ["frame", "problem", "objective", "tradeoff", "commitment", "decision_owner"],
  "decision_owners": ["did:key:..."],
  "decision_owner_scopes": [
    {
      "did": "did:key:...",
      "domain": "engineering",
      "env": "prod"
    }
  ]
}
```

### Validation Rules

The SP MUST reject if:

- `profile_id` is unknown or untrusted
- `frame_hash` is missing or malformed
- Any gate required by the Profile is not in `resolved_gates`
- `decision_owners` is empty
- `decision_owner_scopes` do not satisfy the Profile's path requirements
- Request timestamp exceeds Profile's max TTL

---

## SP Responsibilities

### 1. Validate Profile Compliance

For each request:

1. Look up Profile by `profile_id`
2. Verify all required gates are resolved
3. Check Decision Owner scopes against execution path requirements
4. Validate structural integrity

### 2. Issue Attestations

On valid request, return:

```json
{
  "header": { "typ": "HAP-attestation", "alg": "EdDSA" },
  "payload": {
    "attestation_id": "uuid",
    "version": "0.2",
    "profile_id": "deploy-gate@0.2",
    "frame_hash": "sha256:...",
    "resolved_gates": ["frame", "problem", "objective", "tradeoff", "commitment", "decision_owner"],
    "decision_owners": ["did:key:..."],
    "decision_owner_scopes": [...],
    "issued_at": 1735888000,
    "expires_at": 1735888120
  },
  "signature": "base64url..."
}
```

Attestation properties:

- Short-lived (TTL defined by Profile)
- Signed with SP's Ed25519 private key
- Never stored or logged by the SP

### 3. Publish Public Key

SP identity = its public key (e.g., `did:key:z6Mk...`)

Applications whitelist SP keys they trust. There is no global trust anchor.

---

## Executor Proxy

A Service Provider may also act as an Executor Proxy—validating attestations before forwarding commands to executors.

### Proxy Responsibilities

1. Receive attestation + execution request
2. Recompute frame_hash from request parameters
3. Verify attestation signature against pinned SP public key
4. Check TTL validity
5. Verify frame_hash matches attestation
6. Verify execution path matches attestation
7. Only if all valid, forward minimal command to executor

### Error Responses

| Code | Meaning |
|------|---------|
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `EXPIRED` | Attestation TTL exceeded |
| `FRAME_MISMATCH` | Recomputed frame_hash does not match attestation |
| `PATH_MISMATCH` | Requested execution path does not match attestation |
| `SCOPE_INSUFFICIENT` | Decision Owner scopes do not satisfy path requirements |
| `MALFORMED_ATTESTATION` | Attestation structure is invalid |

Error responses MUST NOT leak sensitive information (e.g., expected hash values).

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
  | (validates against Profile rules -> signs attestation)
  v
Local App
  | (sends attestation + execution payload to EXECUTOR)
  v
Executor (AGI, human, CI/CD, etc.)
  | (verifies attestation -> EXECUTES or FAILS)
```

The executor never sees the Frame text, tradeoffs, or reasoning.
It only obeys the attestation.

---

## Combined SP+Proxy Deployment

For personal, team, or institutional use, SP and Proxy can be combined:

```
User
  | (resolves gates locally)
  v
Local App
  | (sends structural request)
  v
HAP Gateway (SP + Proxy)
  |-- [SP Module] Validates Profile -> Issues Attestation
  '-- [Proxy Module] Validates Attestation -> Forwards Command
  v
Executor
  | (executes without discretion)
```

Logical separation of attestation and execution logic MUST be maintained.

---

## What SPs Are NOT

| Misconception | Reality |
|---------------|---------|
| Data sink | SPs never store, log, or analyze requests |
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
- Gate list
- Owner DIDs
- Scope declarations

No IPs, no user IDs, no behavioral data, no semantic content.

### Profile Isolation

A compromised personal SP cannot issue attestations for profiles it doesn't support. Each Profile defines its own validation rules.

### No Executor Trust

Executors are not required to "do the right thing."
If an executor ignores the attestation, it acts outside HAP—and is liable.

---

## Implementation Checklist

### Service Provider

- [ ] Support Profile lookup by `profile_id`
- [ ] Validate all Profile-required gates
- [ ] Verify Decision Owner scopes against path requirements
- [ ] Sign attestations with Ed25519
- [ ] Enforce Profile TTL limits
- [ ] Never log or store requests
- [ ] Publish public key for verification

### Executor Proxy

- [ ] Require authentication on all requests
- [ ] Recompute frame_hash from request parameters
- [ ] Verify attestation signature against pinned key
- [ ] Check TTL validity
- [ ] Match execution path to attestation
- [ ] Return structured errors without leaking internals
- [ ] Forward only minimal, non-semantic commands

---

## Example: Collaborative Project

**Frame:** "Deploy Feature X to production"
**Profile:** deploy-gate@0.2 (requires all 6 gates + engineering + release_management scopes)

1. You (Backend Engineer) resolve gates locally → send structural request to team SP
2. Alex (Release Manager) does the same
3. Team SP validates:
   - All required Decision Owners present
   - All gates resolved
   - Frame hash matches
   - Scopes satisfy `deploy-prod-full` path requirements
4. SP issues attestation
5. CI/CD system receives attestation → deploys code

If Alex's scope was missing → no attestation → no deploy.

---

## Live Reference Implementation

A public reference Service Provider is available at:

**https://www.humanagencyprotocol.com/**

This SP serves two live demo applications:

| Demo | URL | Profile |
|------|-----|---------|
| **Agent Demo** | https://agent-demo.humanagencyprotocol.org/ | `comms-send@0.3`, `payment-gate@0.3` |
| **Deploy Gate Demo** | https://deploy-demo.humanagencyprotocol.org/ | `deploy-gate@0.3` |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sp/pubkey` | GET | SP Ed25519 public key |
| `/api/sp/attest` | POST | Sign and issue attestation (API key required) |
| `/api/sp/verify` | POST | Verify attestation blob |
| `/api/profiles` | GET | List supported profiles and execution paths |
| `/api/users` | GET | List demo users and their domains |
| `/api/attestations` | GET | Query stored attestations |

The reference SP demonstrates a shared, multi-profile Service Provider that issues attestations for multiple demo applications using a single Ed25519 keypair.

---

## Summary

Service Providers in HAP v0.2:

- Validate requests against **Profile** specifications
- Issue short-lived cryptographic attestations
- Never see or store semantic content
- Enable permissionless, decentralized enforcement

HAP's power isn't in its providers—it's in its proof.
Run your own SP. Trust your own keys. Own your direction.
