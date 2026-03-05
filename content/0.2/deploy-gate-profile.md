---
title: "Deploy Gate Profile"
version: "Version 0.2"
date: "January 2026"
---

The Deploy Gate Profile is the first concrete HAP Profile, demonstrating how the protocol becomes enforceable in a real, high-risk domain: software deployment.

---

## Profile Identity

| Field | Value |
|-------|-------|
| **Profile ID** | `deploy-gate` |
| **Profile Version** | `0.2` |
| **Domain** | Software deployment |
| **Purpose** | Prevent unauthorized or drifted production deploys |

---

## Required Frame Keys

The Deploy Gate Profile defines a fixed canonical order for frame keys:

1. `repo`
2. `sha`
3. `env`
4. `profile`
5. `path`
6. `disclosure_hash`

### Canonical Frame String

```
repo=<repo_slug>
sha=<commit_sha>
env=prod
profile=deploy-gate@0.2
path=<execution_path>
disclosure_hash=<sha256:...>
```

The frame hash is computed as:

```
frame_hash = sha256(frame_string)
```

### Field Formats

To ensure deterministic hashing across implementations, all frame field values MUST conform to these formats:

| Field | Format | Example |
|-------|--------|---------|
| `repo` | `[a-z0-9_.-]+/[a-z0-9_.-]+` (lowercase, no leading/trailing slash) | `acme-corp/api-service` |
| `sha` | Exactly 40 lowercase hexadecimal characters | `a1b2c3d4e5f6...` (40 chars) |
| `env` | Enum: `prod`, `staging` | `prod` |
| `profile` | `<profile_id>@<version>` | `deploy-gate@0.2` |
| `path` | Enum from profile's execution paths | `deploy-prod-canary` |
| `disclosure_hash` | `sha256:` + 64 lowercase hex characters | `sha256:a1b2c3...` (71 chars total) |

**Validation rules:**

- Values containing characters outside the allowed set MUST be rejected
- Uppercase characters in `repo` or `sha` MUST be rejected (not normalized)
- Unknown `env` or `path` values MUST be rejected

---

## Execution Paths and Approval Scopes

### Execution Paths

| Path | Description |
|------|-------------|
| `deploy-prod-canary` | Canary deployment to production |
| `deploy-prod-full` | Full production deployment |

### Required Decision Owner Scopes

**deploy-prod-canary**

At least one Decision Owner with:
- `domain = engineering`
- `env = prod`

**deploy-prod-full**

At least one Decision Owner with:
- `domain = engineering`
- `env = prod`

AND at least one Decision Owner with:
- `domain = release_management` (or `security`)
- `env = prod`

---

## Disclosure

Disclosure represents what the human reviewed before approving.

### Example Disclosure Object

```json
{
  "repo": "org/service",
  "sha": "abc123",
  "changed_paths": ["infra/", "service/"],
  "risk_flags": ["db-migration"]
}
```

### Disclosure Canonicalization

- UTF-8 encoding
- JSON objects with lexicographically sorted keys
- No insignificant whitespace
- Arrays preserve order by default

**Set-typed fields**

Fields representing unordered sets (where element order is not semantically meaningful) MUST be sorted lexicographically before serialization. Profiles MUST explicitly declare which fields are set-typed in their disclosure schema.

For this profile, the following fields are set-typed:

- `changed_paths`
- `risk_flags`

### String and Path Normalization

To ensure consistent hashing:

- **Strings**: Exact byte equality. No Unicode normalization (NFC/NFD) is applied.
- **Paths**: Must be canonicalized before inclusion:
  - No `./` prefix
  - No `..` components
  - No trailing slash (use `infra` not `infra/`)
  - No duplicate slashes

**Example canonicalization:**

| Input | Canonical Form |
|-------|----------------|
| `./src/` | `src` |
| `infra//config` | `infra/config` |
| `../outside` | (reject—escapes repo root) |

The disclosure hash is computed as:

```
disclosure_hash = sha256(canonical_json_bytes)
```

The `disclosure_hash` MUST be included in the Frame.

---

## Attestation Requirements

The Service Provider MUST verify:

- frame schema correctness
- valid disclosure hash
- required gates
- required Decision Owner scopes for the execution path

The Service Provider MUST NOT issue attestations without verifying Decision Owner identity through an authenticated session (e.g., OAuth, WebAuthn). The specific authentication mechanism is implementation-defined.

---

## Executor Proxy Rules

The Executor Proxy MUST:

- require authentication (e.g., bearer token)
- recompute the canonical frame from request parameters
- recompute `frame_hash`
- verify attestation signature (pinned SP public key)
- verify TTL validity
- verify execution path matches attestation
- validate `template_id` against profile-defined allowlist

Failure MUST abort execution.

### Template Allowlist

For this profile, the following `template_id` values are permitted:

| template_id | Allowed Paths |
|-------------|---------------|
| `deploy-prod-v1` | `deploy-prod-canary`, `deploy-prod-full` |

The `template_id` MUST be included in the execution request payload. Requests with unknown or disallowed templates MUST be rejected.

### Key Management

For demo/reference implementations, a single pinned SP public key is acceptable.

Production deployments SHOULD support keyset rotation:

- SP includes `kid` (key ID) in attestation header
- Proxy trusts a keyset `{kid: public_key}` rather than single key
- Operators can rotate keys without downtime by adding new keys before retiring old ones

### TTL Policy

| Setting | Value |
|---------|-------|
| `ttl_seconds_default` | 1200 (20 minutes) |
| `ttl_seconds_max` | 3600 (60 minutes) |

### Error Responses

When validation fails, the Executor Proxy MUST reject the request and SHOULD return a structured error indicating the failure reason. Error responses MUST NOT leak sensitive information (e.g., expected hash values, internal state).

**Recommended error codes:**

| Code | Meaning |
|------|---------|
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `EXPIRED` | Attestation TTL exceeded |
| `FRAME_MISMATCH` | Recomputed frame_hash does not match attestation |
| `PATH_MISMATCH` | Requested execution path does not match attestation |
| `SCOPE_INSUFFICIENT` | Decision Owner scopes do not satisfy path requirements |
| `MALFORMED_ATTESTATION` | Attestation structure is invalid |

---

## Security Guarantees

This profile guarantees:

- No deploy without explicit human approval
- No deploy of a different repo, SHA, or path than reviewed
- No executor trust requirement

It does **not** guarantee:

- UI integrity
- Full blind-signing prevention (addressed partially in v0.3 without semantic disclosure)

### Known Limitations (v0.2)

**Replay within TTL**: A valid attestation can be replayed within its TTL window if an attacker obtains the attestation blob and bearer token. Mitigations:

- Short TTL (demo uses 120s)
- Bearer token rotation
- Network-level controls

**v0.3 mitigation**: One-time-use enforcement via `attestation_id` tracking. The Proxy will store used attestation IDs and reject subsequent uses with `ALREADY_USED` error.

---

## Live Demo

The Deploy Gate Profile is demonstrated in a live GitHub App integration:

**https://deploy-demo.humanagencyprotocol.org/**

This demo uses the shared HAP Service Provider at **https://www.humanagencyprotocol.com/** for attestation signing and verification. Install the GitHub App on a repository, open a pull request, and the demo walks through the full attestation flow: gate resolution, domain owner attestation, and gatekeeper verification before deployment.

---

## Demo Wire Contract

For reference implementations, the attestation is embedded in PR comments:

```
---BEGIN HAP_ATTESTATION v=1---
profile=deploy-gate@0.2
env=prod
path=deploy-prod-canary
sha=<HEAD_SHA>
frame_hash=<sha256:...>
disclosure_hash=<sha256:...>
blob=<BASE64URL_ATTESTATION>
---END HAP_ATTESTATION---
```

### Parsing Rules

To ensure consistent parsing across implementations:

| Rule | Specification |
|------|---------------|
| **Line endings** | `\n` only (LF, not CRLF) |
| **Blob encoding** | Base64url without padding |
| **Duplicate keys** | Reject (parser MUST fail) |
| **Multiple blocks** | Reject (only one attestation block per comment) |
| **Key format** | `key=value` with no whitespace around `=` |
| **Block matching** | First valid block in comment wins |

Parsers MUST reject malformed blocks rather than attempting recovery.

---

## Implementation Checklist

### Service Provider

- [ ] Validate frame schema against profile definition
- [ ] Verify disclosure hash matches frame
- [ ] Check all required gates are resolved
- [ ] Verify Decision Owner scopes satisfy path requirements
- [ ] Sign attestation with Ed25519 key
- [ ] Enforce TTL limits

### Executor Proxy

- [ ] Require authentication on all requests
- [ ] Recompute frame from request parameters
- [ ] Verify attestation signature against pinned public key
- [ ] Check TTL validity
- [ ] Match execution path to attestation
- [ ] Only forward approved deployment templates
- [ ] Return structured errors on validation failure

### Local App

- [ ] Construct canonical frame string
- [ ] Compute disclosure hash from review data
- [ ] Present all gate information to Decision Owner
- [ ] Collect explicit approval (Commitment gate)
- [ ] Include attestation in deployment request
