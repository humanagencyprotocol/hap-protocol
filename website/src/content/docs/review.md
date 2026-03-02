---
title: "v0.3 Review"
version: "Draft"
date: "January 2026"
status: "Proposal"
---

# Human Agency Protocol — v0.3 Proposal

## Multi-Domain Ownership & Execution Context Binding

**Status:** Draft / Under Review
**Goal:** Ensure the *right* humans commit, to a shared and verifiable execution context, without breaking privacy or auditability.

---

## 1. Motivation

### What v0.2 guarantees

- A human committed
- Gates were closed
- Ownership exists
- Execution context was committed to (single hash)

### What v0.2 does not guarantee

- The *right* humans committed (domain accountability)
- Each owner committed to *relevant* execution constraints (scoped, not global)
- Independent auditability per domain

### The gap

An engineer approving a marketing-impacting change without marketing involvement is a governance failure that v0.2 permits. v0.3 closes this gap by:

1. Making domain requirements explicit per execution path
2. Requiring the right domain owners to attest
3. Binding each domain's attestation to the same shared execution context

---

## 2. Core Principle

> Profiles define what authority exists.
> Developers propose which authority is needed.
> Domain owners validate and accept that proposal.

---

## 3. Protocol Scope

### 3.1 What the Protocol Verifies

The protocol verifies:

- A human committed (cryptographic signature)
- To a specific action (frame hash)
- Under specific constraints (execution context hash)
- At a specific time (SP timestamp)
- With declared authority (domain ownership)

### 3.2 What the Protocol Does NOT Verify

The protocol does NOT verify:

- Understanding
- Informed consent
- Quality of reasoning
- Whether the human read anything
- Whether AI contributed to the decision

**The protocol verifies commitment, not comprehension.**

### 3.3 Execution Context, Not Disclosure

Execution context represents the structured constraints binding an executor. It is NOT:

- Evidence of understanding
- Proof of review quality
- Record of what was "seen"
- Informed consent documentation

Any semantic content used to reach a decision (AI analysis, deliberation, reasoning) remains local and out of protocol scope.

### 3.4 Terminology Changes

#### Executor Proxy → Gatekeeper

The v0.2 role "Executor Proxy" is renamed to **Gatekeeper** in v0.3. The old name implied transparent forwarding; the actual role is enforcement — it verifies attestations and blocks execution if validation fails. "Gatekeeper" describes what it does: it guards the gate between human-attested direction and machine execution. The Gatekeeper is a mandatory protocol component — every attested action MUST pass through attestation verification before execution proceeds. See section 8 for requirements.

#### Action vs. Execution

The protocol uses two related but distinct terms:

| Term | Meaning | Attested via |
|------|---------|-------------|
| **Action** | WHAT is being authorized | Frame fields (profile-specific, e.g. `repo` + `sha`) |
| **Execution** | HOW it is carried out, under what constraints | `execution_path`, `execution_context_hash` |

**Action** is the thing being authorized — deploy SHA X to environment Y. The action is identified by the frame fields, which are hashed into `frame_hash` and signed in the attestation.

**Execution** is the carrying out of that action under specific constraints — which governance path, what domains must approve, what context each domain commits to.

The Gatekeeper receives the frame fields and attestations, reconstructs `frame_hash`, and validates that every attestation matches. Only attested data is trusted — the Gatekeeper never accepts unattested parameters.

### 3.5 Protocol vs. Profile Layering

The protocol defines abstract concepts. Profiles define concrete implementations.

| Layer | Defines | Example |
|-------|---------|---------|
| **Protocol** | Execution context structure, frame binding, attestation format | "Execution context must be immutably bound to the action" |
| **Profile** | How binding works in a specific context | "For GitHub PRs, declared fields live in `.hap/binding.json` in the commit" |

**Why this matters:**

HAP governs any context where humans authorize actions:

- Code deployment (git repositories)
- Document approval (markdown files, wikis)
- Infrastructure changes (Terraform, Ansible)
- AI agent workflows (human attests to bounds, agent executes within)
- Policy decisions
- Contract signing

The protocol must remain abstract. Context-specific bindings belong in profiles.

---

## 4. Profile Extensions

v0.3 extends the Profile with one new section and modifies execution paths.

### 4.1 Execution Paths with Required Domains

Required domains are defined per execution path — not through conditions.

```json
{
  "executionPaths": {
    "deploy-prod-canary": {
      "description": "Canary deployment (limited rollout)",
      "requiredDomains": ["engineering"]
    },
    "deploy-prod-full": {
      "description": "Full deployment (immediate rollout)",
      "requiredDomains": ["engineering", "release_management"]
    },
    "deploy-prod-user-facing": {
      "description": "User-facing feature deployment",
      "requiredDomains": ["engineering", "marketing"]
    },
    "deploy-prod-security": {
      "description": "Security-sensitive deployment",
      "requiredDomains": ["engineering", "security"]
    }
  }
}
```

**Normative rules:**

1. Each execution path explicitly lists its required domains.
2. The person selecting the execution path commits to that governance level.
3. Choosing a less restrictive path for a change that warrants more oversight is auditable misbehavior.
4. No conditions, no magic — explicit human choice of governance scope.

### 4.2 Execution Context Schema

The **profile defines the execution context schema**. Each profile specifies:
- What fields exist in the execution context
- How each field is resolved (declared vs computed)
- Which fields are required

```json
{
  "executionContextSchema": {
    "fields": {
      "execution_path": {
        "source": "declared",
        "description": "Governance level chosen by developer",
        "required": true
      },
      "repo": {
        "source": "action",
        "description": "Repository identifier",
        "required": true
      },
      "sha": {
        "source": "action",
        "description": "Commit SHA being authorized",
        "required": true
      },
      "changed_paths": {
        "source": "computed",
        "method": "git_diff",
        "description": "Files changed in this action"
      },
      "diff_url": {
        "source": "computed",
        "method": "constructed",
        "description": "Persistent link to the diff"
      },
      "preview_ref": {
        "source": "declared",
        "description": "URL where the staged output can be reviewed before attestation",
        "required": false
      },
      "output_ref": {
        "source": "declared",
        "description": "Reference to where the output of this action will be accessible",
        "required": false
      }
    }
  }
}
```

**Field sources:**

| Source | Meaning | Example |
|--------|---------|---------|
| `declared` | Developer specifies in committed file | `execution_path` |
| `action` | Derived from the action being authorized | `repo`, `sha` |
| `computed` | System computes from deterministic sources | `changed_paths`, `diff_url` |

#### 4.2.1 Field Constraints

The profile defines the **constraint types** that fields support. Constraint types declare what kinds of boundaries a human can set on a field — not the boundary values themselves. The human sets the specific values in the authorization frame (see section 8.6).

```json
{
  "executionContextSchema": {
    "fields": {
      "amount": {
        "source": "declared",
        "description": "Maximum transaction amount",
        "required": true,
        "constraint": {
          "type": "number",
          "enforceable": ["max", "min"]
        }
      },
      "currency": {
        "source": "declared",
        "description": "Permitted currency",
        "required": true,
        "constraint": {
          "type": "string",
          "enforceable": ["enum"]
        }
      },
      "target_env": {
        "source": "declared",
        "description": "Target environment for execution",
        "required": true,
        "constraint": {
          "type": "string",
          "enforceable": ["enum"]
        }
      }
    }
  }
}
```

**Constraint types:**

| Type | Supported enforceable constraints | Meaning |
|------|----------------------------------|---------|
| `number` | `min`, `max` | Numeric boundaries |
| `string` | `enum`, `pattern` | Allowed values or patterns |
| `boolean` | (value itself) | Explicit true/false |
| `array` | `maxItems`, `itemConstraints` | Collection boundaries |

The profile defines the *shape* of constraints. The human sets the *values* in the authorization frame. The agent operates within those values.

**Normative rules for field constraints:**

1. Constraint types are a protocol-level concept. The specific constraint types available per field are defined by profiles.
2. The profile defines what *can* be constrained. The authorization frame defines what *is* constrained.
3. Constraint types are immutable for a given profile version. Changing constraint types requires a new profile version.
4. Constraint types are publicly inspectable — any party can read the profile and know what kinds of boundaries are possible.

**Normative rules:**

1. Execution context MUST consist of deterministic, verifiable, and persistent values — either as direct content or as references to persistent sources.
2. All domain owners see the same execution context.
3. The execution context is hashed and included in the attestation.
4. Semantic content (problem, objective, tradeoffs) is entered by humans in gates, not in the execution context.
5. The `profile` field bootstraps everything — it determines which schema applies.

---

## 5. Execution Context

### 5.1 Definition

The **execution context** captures everything needed to authorize an action:

- **Governance choices** — declared by the developer (profile, execution_path)
- **Action facts** — derived from the action itself (repo, sha, changed_paths, diff_url)

The `profile` field is the bootstrap — it determines which schema defines the rest.

The specific fields depend on the profile's execution context schema. Governance choices are common to all profiles; action facts are profile-specific.

**Example (deploy-gate profile for git-based workflows):**

```json
{
  "profile": "deploy-gate@0.3",
  "execution_path": "deploy-prod-canary",

  "repo": "https://github.com/owner/repo",
  "sha": "abc123def456...",
  "changed_paths": ["src/api/auth.ts", "src/lib/crypto.ts"],
  "diff_url": "https://github.com/owner/repo/compare/base...head",
  "preview_ref": "https://staging.myapp.com",
  "output_ref": "https://myapp.com"
}
```

### 5.1.1 Two Parts, One Context

| Part | Source | Example Fields |
|------|--------|----------------|
| **Governance choices** | Declared by proposer (profile-specific mechanism) | `profile`, `execution_path` |
| **Action facts** | Resolved by system | Profile-specific (e.g., `repo`, `sha`, `changed_paths`) |

Both parts are deterministic, verifiable, and persistent. Together they form the complete execution context that gets hashed and attested to.

### 5.1.2 Why This Structure?

**Problem with semantic content in files:**
- Developers forget to update it → stale content
- Descriptions are unverifiable → trust issues

**Solution:**
- Declared fields = governance choices only (profile, execution_path)
- Resolved fields = computed from deterministic sources (git, action)
- Attestation captures the complete execution context (auditable record)

### 5.2 Binding Requirements

The execution context MUST be:

**Immutable** — The declared fields are committed with the action. The resolved fields are deterministic for a given action state.

**Bound to action** — How binding works is profile-specific. For deploy-gate, declared fields live in `.hap/binding.json` in the commit.

**Verifiable** — Anyone can re-resolve the execution context and compare to the attested hash.

### 5.3 Proposal Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. PROPOSER declares governance choices                                │
│     • Declares profile + execution_path                                 │
│     • Binds to action through profile-specific mechanism                │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  2. SYSTEM resolves execution context                                   │
│     • Reads declared fields from bound declaration                      │
│     • Computes action facts from deterministic sources                  │
│     • Presents complete execution context to domain owners              │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  3. DOMAIN OWNERS review execution context                              │
│     • See complete context (governance choices + action facts)          │
│     • Validate: Is this the right governance level?                     │
│     • If they agree → attest                                            │
│     • If they disagree → don't attest, request changes                  │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  4. ALL REQUIRED DOMAINS attest to the same frame                       │
│     • Frame derived from action + execution context                     │
│     • All attestations share same frame_hash                            │
│     • Attestation includes execution_context_hash                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Disagreement Handling

If a domain owner disagrees with the proposal:

1. **Wrong execution path** — Domain owner refuses to attest. Proposer must update the declared execution context with the corrected path. New frame, new attestation cycle.

2. **Incomplete execution context** — Domain owner refuses to attest. Proposer must update the declared execution context with complete constraints.

3. **Inaccurate execution context** — Domain owner refuses to attest. Proposer must fix the issue and update the declared fields.

**No one can unilaterally override** — All required domains must attest to the same frame.

---

## 6. Frame Changes

### 6.1 Frame Derivation

A frame uniquely identifies an action and its governance context. The frame fields are profile-specific — each profile defines which fields identify the action. All frame fields MUST be attested (included in `frame_hash`).

| Field | Source |
|-------|--------|
| Profile-specific action fields | From the action itself (e.g. `repo`, `sha` for deploy-gate) |
| `profile` | From execution context |
| `path` | From execution context |

**v0.3 Frame structure (abstract):**

```
<profile-specific-fields>=<values>
profile=<profile-id>
path=<execution-path>
```

The frame MUST be deterministically derivable from the action and execution context. If the declared execution context changes, the frame changes.

### 6.2 Remove `execution_context_hash` from Frame

**Rationale:** The frame identifies the action. The execution context captures what was shown and resolved. Separating them keeps the frame stable (it only changes when the action changes) while the execution context hash captures the full deterministic context.

`execution_context_hash` moves to the attestation as a top-level field. All domain owners attest to the same shared context.

### 6.3 No Condition Fields

v0.3 does **not** add condition fields to the frame.

**Rationale:** Self-declared conditions (e.g., "is this security-relevant?") are meaningless — the person who might want to skip oversight decides whether oversight is required. This is circular.

Instead, required domains are determined by **execution path** in the execution context — an explicit proposal validated by domain owners.

---

## 7. Attestation Changes

### 7.1 Attestation Structure

Each attestation includes the shared execution context hash and the domains it covers.

```json
{
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
  "issued_at": 1735888000,
  "expires_at": 1735891600
}
```

**Normative rules:**

1. The `execution_context_hash` is computed from the shared execution context (all domains see the same context).
2. For every domain this attestation covers, include: `domain`, `did`.
3. One attestation typically covers one domain (one person, one scope).
4. Multi-domain decisions require multiple attestations from different owners.

### 7.2 Auditability Guarantee

Each domain owner can independently prove:

- "I attested to frame X" → `frame_hash` in attestation
- "I committed to context Y" → `execution_context_hash` in attestation
- "I articulated my reasoning" → `gate_content_hashes` in attestation
- "For domain Z" → `resolved_domains` in attestation

---

## 8. Gatekeeper

### 8.0 Role

The Gatekeeper is the verification obligation that every execution environment MUST satisfy before proceeding with an attested action. It is not a prescribed component or deployment topology — it is the guarantee that attestation verification has occurred.

> **Normative:** Every execution MUST be preceded by attestation verification as defined in section 8.2. An implementation that stores or transmits attestations but does not verify them before execution is non-compliant.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — a `verify()` call in application code before execution proceeds
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint

All three are equally valid. The protocol makes no architectural preference. What matters is that the verification steps in section 8.2 execute completely and that execution is blocked on a negative result.

A system that has attestations but skips verification is in violation — the attestation alone is not proof of compliance; verified attestation is.

### 8.1 Execution Request

The client submits the frame fields and attestations. The Gatekeeper only accepts data that is attested — every field in the request must be verifiable against `frame_hash` in the attestations.

```json
{
  "frame": {
    "repo": "https://github.com/owner/repo",
    "sha": "a1b2c3...",
    "profile": "deploy-gate@0.3",
    "path": "deploy-prod-user-facing"
  },
  "attestations": [
    "base64-attestation-blob-domain-1...",
    "base64-attestation-blob-domain-2..."
  ]
}
```

The frame fields are profile-specific. For deploy-gate, they are `repo`, `sha`, `profile`, and `path`. The Gatekeeper reconstructs `frame_hash` from these fields and verifies it matches every attestation. No unattested parameters are accepted.

### 8.2 Validation Steps

The Gatekeeper performs:

1. **Reconstruct frame** from action params
2. **Compute frame_hash**
3. **Fetch Profile** for `deploy-gate@0.3`
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

### 8.3 SP Consultation

The Gatekeeper consults the Service Provider only to fetch the public key for signature verification:

```
GET /api/sp/pubkey → { "public_key": "hex..." }
```

All validation logic runs locally. The SP is not a runtime dependency for validation — only for key retrieval (which can be cached).

### 8.4 Stateless Design

The Gatekeeper:

- Does not store attestations
- Does not query attestation registries
- Receives all proof in the request
- Validates and decides

Where attestations are stored (PR comments, database, registry) is an integration concern, not a protocol concern.

**Normative:** TTL governs whether the Gatekeeper accepts an attestation for execution — not whether the attestation continues to exist. Attestations MUST remain available for post-hoc verification (audit, dispute resolution, output provenance) beyond TTL expiry. How and where they are stored is an integration concern; that they are retained is a protocol requirement.

**Normative:** The Gatekeeper MUST NOT have a "bypass" mode. If attestations are required by the profile, they must be verified. Development/testing environments MAY use test attestations with test keys, but the verification logic itself must still execute.

### 8.5 Connector Model

A **connector** is an environment-specific implementation of the Gatekeeper verification obligation. It adapts the standard verification interface (section 8.5.1) to a particular execution environment — CI/CD pipeline, API gateway, agent runtime, etc.

**Connectors ARE Gatekeeper implementations**, not clients of a separate Gatekeeper service. Each connector embeds the full verification logic from section 8.2. There is no separate "Gatekeeper server" that connectors call — the verification runs within the connector itself.

#### 8.5.1 Standard Interface

Every connector MUST implement the `verify` operation:

**Request:**

```json
{
  "frame": {
    "repo": "https://github.com/owner/repo",
    "sha": "a1b2c3...",
    "profile": "deploy-gate@0.3",
    "path": "deploy-prod-user-facing"
  },
  "attestations": [
    "base64-attestation-blob..."
  ]
}
```

Frame fields are profile-specific. The fields above are for `deploy-gate`. Other profiles define their own frame fields.

**Success response:**

```json
{
  "valid": true,
  "frame_hash": "sha256-hex...",
  "verified_domains": ["technical-review", "security-review"],
  "profile": "deploy-gate@0.3"
}
```

**Failure response:**

```json
{
  "valid": false,
  "errors": [
    {
      "code": "DOMAIN_NOT_COVERED",
      "domain": "security-review",
      "message": "No valid attestation covers the security-review domain"
    },
    {
      "code": "SIGNATURE_INVALID",
      "domain": "technical-review",
      "message": "Attestation signature verification failed"
    }
  ]
}
```

**Error codes** (see also section 11):

| Code | Meaning |
|------|---------|
| `FRAME_HASH_MISMATCH` | Recomputed frame_hash does not match attestation |
| `SIGNATURE_INVALID` | Attestation signature verification failed |
| `DOMAIN_NOT_COVERED` | Required domain has no valid attestation |
| `TTL_EXPIRED` | Attestation has exceeded its time-to-live |
| `PROFILE_NOT_FOUND` | Referenced profile could not be resolved |
| `SCOPE_INSUFFICIENT` | Attestation scope does not cover the required domain |
| `BOUND_EXCEEDED` | Execution request value exceeds authorization frame bound |

**Bound exceeded response example:**

```json
{
  "valid": false,
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
| `verifyAndExecute` | Verify then trigger execution if valid |
| `middleware` | Framework-specific request interceptor |

#### 8.5.2 Connector Examples

| Connector | Where it runs | How it gates |
|-----------|---------------|--------------|
| **CI/CD** | Pipeline step | Blocks deployment job until `verify` returns `valid: true` |
| **API Gateway** | Request middleware | Intercepts requests, extracts attestations from headers, verifies before forwarding |
| **Webhook** | Incoming handler | Verifies attestations in webhook payload before processing |
| **Infrastructure** | Admission controller | Kubernetes admission webhook or Terraform sentinel that calls `verify` |
| **Agent runtime** | Pre-execution hook | Wraps tool execution in agent frameworks — `verify` before every tool call |

#### 8.5.3 SP Key Resolution

Connectors retrieve SP public keys for signature verification:

```
GET {sp_endpoint}/api/sp/pubkey → { "public_key": "hex..." }
```

Connectors SHOULD cache public keys with a TTL. The SP is not a runtime dependency for verification — only for initial key retrieval.

#### 8.5.4 Normative Rules

1. Every connector MUST implement the full verification logic defined in section 8.2.
2. A connector MUST NOT partially verify (e.g., check signatures but skip domain coverage).
3. A connector MUST reject execution if verification fails — no "warn and proceed" mode in production.
4. Connectors MUST return structured error responses using the error codes above.
5. Connectors SHOULD cache SP public keys to minimize network calls.
6. Connectors MUST be stateless — all proof is received in the request (see section 8.4).

### 8.6 Bounded Execution

For profiles that support agent execution, the Gatekeeper performs two distinct verifications: **authorization verification** and **bounds verification**.

#### 8.6.1 Authorization Frame vs. Execution Request

The **authorization frame** is what the human attests to. It defines the bounds — the boundaries within which an agent may act. The authorization frame is hashed into `frame_hash` and signed in the attestation.

The **execution request** is what the agent submits when it wants to act. It contains the specific values for a single action within the attested bounds.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTHORIZATION FRAME (human attests)                                    │
│                                                                         │
│  "I authorize payments up to 80 EUR to approved recipients"             │
│                                                                         │
│  amount: { max: 80 }                                                    │
│  currency: { enum: ["EUR"] }                                            │
│  target_env: { enum: ["production"] }                                   │
│                                                                         │
│  → hashed into frame_hash, signed by domain owners                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  EXECUTION REQUEST (agent submits)                                      │
│                                                                         │
│  amount: 5                          → 5 ≤ 80 ✓                          │
│  currency: "EUR"                    → in ["EUR"] ✓                      │
│  target_env: "production"           → in ["production"] ✓               │
│                                                                         │
│  → Gatekeeper checks values against authorization frame bounds          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 8.6.2 Gatekeeper Validation for Bounded Execution

The Gatekeeper performs:

1. **Verify authorization** (section 8.2 steps 1–7) — the authorization frame is validly attested, all domains covered, signatures valid, TTL not expired
2. **Verify bounds** — for each constrained field in the authorization frame:
   - Read the bound value from the authorization frame
   - Read the actual value from the execution request
   - Verify the actual value satisfies the bound
   - If any bound is violated → reject with `BOUND_EXCEEDED`
3. **If all valid** → authorize execution

#### 8.6.3 Execution Request Structure

```json
{
  "authorization": {
    "frame": {
      "amount_max": 80,
      "currency": "EUR",
      "target_env": "production",
      "profile": "payment-gate@0.3",
      "path": "payment-routine"
    },
    "attestations": [
      "base64-attestation-blob..."
    ]
  },
  "execution": {
    "amount": 5,
    "currency": "EUR",
    "target_env": "production",
    "recipient": "supplier-x"
  }
}
```

The `authorization` block contains the attested frame and attestations — verified via `frame_hash` as in section 8.2. The `execution` block contains the agent's specific action values — verified against the authorization frame's bounds.

#### 8.6.4 Normative Rules

1. Bounded execution does not replace exact-match verification. Profiles declare which mode applies. Profiles that do not define constraint types use exact-match verification only (section 8.2).
2. The authorization frame defines the outer boundary. The agent's execution request MUST fall within it.
3. A single authorization frame MAY be used for multiple execution requests, as long as TTL has not expired and each request falls within bounds.
4. The Gatekeeper MUST verify the authorization (step 1) before checking bounds (step 2). Invalid attestations are rejected regardless of whether bounds are satisfied.
5. Bounds are enforced on the values declared in the profile's constraint types. Fields without constraint types are not bounds-checked.

---

## 9. Execution Context Resolution

### 9.1 Resolution Flow

The execution context is **computed at processing time**, not stored in the declaration. This ensures determinism and traceability.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. PROPOSER declares governance choices (minimal)                      │
│     • profile + execution_path                                          │
│     • Bound to action through profile-specific mechanism                │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  2. SYSTEM receives action event                                        │
│     • Reads declared fields from bound declaration                      │
│     • Computes action facts from deterministic sources                  │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  3. SYSTEM presents complete execution context to domain owners         │
│     • Governance choices + action facts = complete context              │
│     • All domain owners see the same context                            │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  4. ATTESTATION captures resolved values                                │
│     • frame_hash: commits to action identity                            │
│     • execution_context_hash: commits to resolved context               │
│     • This IS the auditable record                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 What Gets Resolved

Each field in the execution context has a source type:

| Source | Resolved By | Deterministic? | Example |
|--------|-------------|----------------|---------|
| `declared` | Proposer (bound to action) | ✓ Yes | `profile`, `execution_path` |
| `action` | Derived from the action itself | ✓ Yes | Action identifier (e.g., `repo`, `sha`) |
| `computed` | System computes from deterministic inputs | ✓ Yes | Derived data, constructed references |

All resolved values MUST be deterministic — given the same action state, the system always computes the same values. The specific fields and resolution methods are defined by the profile's execution context schema (see section 4.2).

### 9.3 Resolved Execution Context Structure

The resolved execution context contains all declared and computed fields. The specific fields are profile-dependent.

**Example (deploy-gate profile):**

```json
{
  "profile": "deploy-gate@0.3",
  "execution_path": "deploy-prod-canary",
  "repo": "https://github.com/owner/repo",
  "sha": "abc123def456...",
  "base_sha": "def456abc123...",
  "diff_url": "https://github.com/owner/repo/compare/def456...abc123",
  "changed_paths": ["src/api/auth.ts", "src/lib/crypto.ts"],
  "preview_ref": "https://staging.myapp.com",
  "output_ref": "https://myapp.com"
}
```

This resolved context is:
- Presented to domain owners (all see the same context)
- Hashed and included in the attestation
- Fully re-derivable: given the same action state, anyone can recompute the resolved context

### 9.4 Execution Context Hash

The `execution_context_hash` in the attestation commits to the resolved context:

```
execution_context_hash = sha256(canonicalize(resolved_context))
```

The canonicalization ensures consistent hashing regardless of field ordering.

### 9.5 Traceability

The attestation IS the audit record. It contains:

- `frame_hash` → commits to what action was authorized
- `execution_context_hash` → commits to what context was shown/resolved
- `gate_content_hashes` → commits to what the human articulated (problem/objective/tradeoffs)

Anyone can verify: "This attestation commits to this exact context, derived from this exact action state."

**Normative:** Because the attestation IS the audit record, implementations MUST retain signed attestations beyond TTL expiry for at least the profile-defined minimum retention period. An attestation that is discarded on expiry destroys the audit trail.

#### 9.5.1 TTL vs Retention

TTL and retention serve different purposes and operate on different timescales:

| Concept | Controls | Who enforces | Duration |
|---------|----------|-------------|----------|
| **TTL** | Whether Gatekeeper accepts for execution | Gatekeeper | Minutes–hours |
| **Retention** | How long the attestation remains verifiable | Integration | Months–years |

- TTL expiry means the Gatekeeper MUST reject the attestation for new executions
- TTL expiry does NOT mean the attestation should be discarded
- Expired attestations retain full cryptographic validity — signatures, hashes, and bindings remain verifiable indefinitely
- Profiles MUST define `retention_minimum` alongside TTL

### 9.6 Output Provenance

#### 9.6.1 Problem

The attestation proves a human committed to an action. But after execution, how does anyone verify that an observable output was produced by an attested action? Without a binding between attestation and output, any system could claim a `frame_hash` it did not earn.

#### 9.6.2 Output Reference

Profiles MAY define an `output_ref` field in the execution context schema. When present, it declares where the output of this action will be accessible.

`output_ref` is:
- **Declared** — the proposer specifies the output target
- **Included in `execution_context_hash`** — domain owners attest to it
- **Profile-defined format** — a URL for web deployments, an API endpoint for system actions, or a structured reference for multi-endpoint outputs

Because `output_ref` is part of the execution context, it is hashed and signed. This creates a cryptographic binding between the attestation and the output location.

#### 9.6.3 Output Provenance Metadata

After execution, outputs MAY carry provenance metadata that references the attestation(s) that authorized them.

**MUST include:**
- `frame_hash` — the unifying identifier across all attestations for one action

**MAY include:**
- Full frame fields (profile-specific)
- SP endpoint for attestation lookup
- Attestation identifiers

How provenance metadata is exposed is profile-specific:
- Web deployment: `/.well-known/hap` endpoint or HTTP header
- API service: response header or metadata endpoint
- Agent: action log entries
- System change: audit log entries

#### 9.6.4 Verification Flow

Given an observable output:

1. Read `frame_hash` from the output's provenance metadata
2. Fetch attestation(s) for that frame_hash from the SP
3. Verify attestation signatures
4. Verify `output_ref` in the attested execution context matches the output's actual location
5. If match — the output is cryptographically bound to the attested action

Step 4 is the critical binding. Without it, a `frame_hash` on an output is just a claim. With it, the claim is verified against what domain owners actually attested to.

#### 9.6.5 Normative Rules

1. Profiles MAY define `output_ref` in the execution context schema.
2. When `output_ref` is present, it MUST be included in the execution context hash.
3. Outputs MAY carry `frame_hash` as provenance metadata.
4. Verifiers MUST check that the output's location matches the `output_ref` in the attested execution context.
5. The format of `output_ref` and the method of exposing provenance metadata are profile-specific.

---

## 10. Identity & Authorization

### 10.1 Principle

> Profiles define what authority is required. Authorization sources define who holds that authority. The SP verifies both before signing.

The protocol separates three concerns:

| Concern | Defines | Example |
|---------|---------|---------|
| **Profile** | What domains are required | `engineering`, `release_management` |
| **Authorization source** | Who can attest for each domain | `did:github:alice` → `engineering` |
| **SP** | Verifies identity and authorization before signing | Checks token, checks mapping, signs or rejects |

### 10.2 Authentication

Consistent with v0.2, **authentication is out of HAP Core scope**. Implementations MUST establish identity through external mechanisms (e.g., OAuth, WebAuthn, hardware tokens, passkeys).

The protocol uses **Decentralized Identifiers (DIDs)** for platform-agnostic identity:

- `did:github:alice` — GitHub identity
- `did:gitlab:bob` — GitLab identity
- `did:okta:carol` — Okta identity
- `did:email:dave@company.com` — Email-based identity

The verified DID is included in the attestation's `did` field. The SP MUST NOT issue attestations without verifying the attester's identity through a trusted authentication channel.

### 10.3 Authorization Mapping

The **authorization mapping** defines who is authorized to attest for each domain. The format is:

```json
{
  "domains": {
    "engineering": ["did:github:alice", "did:github:bob"],
    "release_management": ["did:okta:carol"]
  }
}
```

The profile defines WHAT domains are required for an execution path. The authorization mapping defines WHO can fulfill each domain. These are separate concerns:

- Changing the profile (adding a domain) is a **governance structure change**
- Changing the authorization mapping (adding a person) is a **personnel change**

### 10.4 Immutability Rule

> The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.

This is the key security property. Without it, an attester could add themselves to the authorized list and approve their own action in a single step.

How immutability is enforced depends on the environment:

| Environment | Authorization Source | Immutability Guarantee |
|---|---|---|
| Version-controlled repo | Config file on target/base branch | Cannot modify target branch without going through attestation |
| Planning / no repo | Org-level registry (API, database) | Only admins can modify |
| Enterprise | External identity system (Okta groups, LDAP, AD) | Managed by IT, not by the attester |
| Small team | SP configuration | SP admin controls it |

The protocol does not prescribe where the authorization source lives — only that it cannot be self-modified by the attester in the same action.

**Exception — first adoption:** When no authorization source exists yet (e.g., a repository adopting HAP for the first time), the authorization source MAY be introduced alongside the action. This is safe because there is no prior authorization to bypass. Once established, the immutability rule applies to all subsequent actions.

### 10.5 SP Authorization Responsibilities

Before signing an attestation, the SP MUST:

1. **Verify identity** — Validate the attester's authentication token against the identity provider. Resolve to a verified DID.
2. **Resolve authorization** — Fetch the domain→owners mapping from the configured authorization source.
3. **Check membership** — Verify that the authenticated DID is in the authorized list for the claimed domain.
4. **Reject or sign** — Only sign the attestation if both identity and authorization checks pass.

### 10.6 Normative Rules

1. The SP MUST verify attester identity before signing an attestation.
2. The SP MUST verify the attester is authorized for the claimed domain before signing.
3. The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.
4. Changes to the authorization source MUST be made by an authorized party and MUST be auditable. The authorization governance model is organization-specific — it may be peer-governed (existing owners approve changes), hierarchical (supervisors assign authority), or system-managed (identity provider controls role membership). The protocol does not prescribe which model to use. What it requires is that no one can authorize themselves for the same action, and all changes are traceable.
5. The authorization source SHOULD be auditable — it must be possible to determine who was authorized at a given point in time.
6. The verified DID MUST be included in the attestation's `did` field.

---

## 11. Error Codes

New error codes for v0.3:

| Code | Description |
|------|-------------|
| `MISSING_REQUIRED_DOMAIN` | A required domain has no valid attestation |
| `DOMAIN_SCOPE_MISMATCH` | Attestation domain doesn't match requirement |
| `EXECUTION_CONTEXT_VIOLATION` | Execution context missing required fields |
| `BINDING_FILE_MISSING` | Action has no bound execution context declaration |
| `BINDING_FILE_INVALID` | Declared execution context malformed or missing required fields |

---

## 12. Backward Compatibility

### What changes

- "Executor Proxy" renamed to **Gatekeeper** — reflects its actual role as enforcement point
- Gatekeeper is now a **mandatory** protocol component — every execution must pass through attestation verification (section 8)
- Frame no longer includes `execution_context_hash`
- Attestations include `execution_context_hash` at top level (shared context, not per-domain)
- Attestations include `resolved_domains` for domain authority (domain, did)
- Execution paths explicitly define `requiredDomains`
- Execution context declared in committed file, resolved by system (binding is profile-specific)
- Profiles MAY define field-level constraint types on execution context fields (section 4.2.1)
- New Gatekeeper verification mode: bounded execution — authorization frame defines bounds, execution requests are checked against them (section 8.6)
- A single authorization frame MAY be used for multiple agent execution requests within TTL
- New error code: `BOUND_EXCEEDED`
- Profiles without constraint types continue to use exact-match verification only

### Migration path

- v0.2 attestations remain valid for v0.2 profiles
- v0.3 profiles require v0.3 attestations
- Gatekeeper checks `version` field and applies appropriate validation
- v0.3 requires declared execution context bound to action

---

## 13. Deploy-Gate Profile Binding

This section defines how the deploy-gate profile binds abstract protocol concepts to git-based workflows.

### 13.1 Execution Context Binding

For deploy-gate, the declared execution context is stored as `.hap/binding.json` in the commit:

- **Location:** `.hap/binding.json` in repository root
- **Content:** Governance choices only (profile, execution_path, and optional preview_ref / output_ref)
- **Binding:** Included in commit SHA (immutable)
- **Retrieval:** Via git or GitHub API

```json
{
  "profile": "deploy-gate@0.3",
  "execution_path": "deploy-prod-canary",
  "preview_ref": "https://staging.myapp.com",
  "output_ref": "https://myapp.com"
}
```

### 13.2 Context Resolution by GitHub App

The GitHub App resolves all deterministic values when processing the PR:

| Value | Resolution Method |
|-------|-------------------|
| `repo` | Full URL from webhook payload (`repository.html_url`) |
| `sha` | From webhook payload (`pull_request.head.sha`) |
| `base_sha` | From webhook payload (`pull_request.base.sha`) |
| `changed_paths` | GitHub API: `GET /repos/{owner}/{repo}/pulls/{number}/files` |
| `diff_url` | Constructed: `https://github.com/{owner}/{repo}/compare/{base}...{head}` |
| `profile` | From `.hap/binding.json` in commit |
| `execution_path` | From `.hap/binding.json` in commit |
| `preview_ref` | From `.hap/binding.json` in commit |
| `output_ref` | From `.hap/binding.json` in commit |

### 13.3 Frame Binding

For deploy-gate, the frame maps to git concepts:

| Frame Field | Deploy-Gate Binding |
|-------------|---------------------|
| `repo` | Repository URL from webhook payload |
| `sha` | Commit SHA from webhook payload |
| `profile` | From `.hap/binding.json` |
| `path` | From `.hap/binding.json` |

Frame structure:
```
repo=https://github.com/owner/repo
sha=abc123def456...
profile=deploy-gate@0.3
path=deploy-prod-user-facing
```

### 13.4 Demo Implementation Steps

**Step 1: Update Profile with execution paths**

- `deploy-prod-canary` → engineering only
- `deploy-prod-full` → engineering + release_management
- `deploy-prod-user-facing` → engineering + marketing

**Step 2: Declare execution context**

Developer adds `.hap/binding.json` to their commit with governance choices:
```json
{
  "profile": "deploy-gate@0.3",
  "execution_path": "deploy-prod-canary",
  "preview_ref": "https://staging.myapp.com",
  "output_ref": "https://myapp.com"
}
```

**Step 3: System resolves execution context**

On PR webhook:
1. Read declared fields from `.hap/binding.json`
2. Compute `changed_paths` from PR diff
3. Construct `diff_url` from base/head SHAs
4. Build complete execution context (declared + resolved)
5. Present to domain owners for attestation

**Step 4: Update Frame Gate UI**

- Show resolved execution context (computed by system)
- Display: changed files, diff link, execution path
- Show: "This path requires: Engineering" (from profile)
- Domain owners see the same information

**Step 5: Attestation captures resolved values**

1. Hash the resolved execution context
2. Include `execution_context_hash` in attestation
3. Attestation becomes the auditable record

**Step 6: Verification**

Anyone can verify:
1. Fetch `.hap/binding.json` from the commit
2. Re-compute the resolved context from git
3. Hash and compare to `execution_context_hash` in attestation
4. Match = attestation is valid for this exact PR state

### 13.5 Authorization Binding

For deploy-gate, the authorization source (see section 10) is a file in the repository:

- **Location:** `.hap/owners.json` in repository root
- **Read from:** The **base branch** (target branch), NOT the PR branch
- **Format:** Matches the protocol-level authorization mapping

```json
{
  "domains": {
    "engineering": ["did:github:alice", "did:github:bob"],
    "release_management": ["did:github:carol"]
  }
}
```

**Why base branch?** This enforces the immutability rule (section 10.4). The PR cannot modify the authorization rules that apply to itself. To change who can attest, a separate PR must first be merged — subject to attestation by existing authorized owners.

**Bootstrap exception:** When a repository first adopts HAP, `.hap/owners.json` does not yet exist on the base branch. In this case, the system falls back to reading from the head (PR) branch. This is the only way HAP can be introduced into an existing repository. Once the initial PR merges, all subsequent PRs read from the base branch as normal. This exception is safe because no prior authorization exists to bypass — the file is being created, not modified.

**Lifecycle:**
- **First adoption:** The initial `.hap/owners.json` is introduced via PR. Since no prior authorization exists, the file is read from the PR branch.
- Adding a new authorized owner requires a PR that modifies `.hap/owners.json`, attested by existing owners
- Removing an owner follows the same process
- The file is version-controlled, providing full audit history of authorization changes

### 13.6 Git-Specific Context Resolution

The abstract resolution flow (section 9.1) maps to git as follows:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. DEVELOPER commits .hap/binding.json (minimal)                      │
│     • profile: "deploy-gate@0.3"                                        │
│     • execution_path: "deploy-prod-canary"                              │
│     • preview_ref: "https://staging.myapp.com" (optional)               │
│     • output_ref: "https://myapp.com" (optional)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  2. GITHUB APP receives webhook (PR created/updated)                    │
│     • Knows: owner, repo, base_sha, head_sha, PR number                │
│     • Reads .hap/owners.json from base branch                           │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  3. SYSTEM resolves execution context                                   │
│     • changed_paths: computed from git diff                             │
│     • diff_url: constructed from base/head SHAs                         │
│     • sha: head commit                                                  │
│     • repo: from webhook context                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  4. ATTESTATION with identity & authorization check                     │
│     • SP verifies attester identity (GitHub OAuth)                      │
│     • SP checks attester DID against .hap/owners.json (base branch)     │
│     • If authorized → sign attestation                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Field resolution methods:**

| Field | Resolution Method |
|-------|-------------------|
| `repo` | Full URL from webhook payload (`repository.html_url`) |
| `sha` | From webhook payload (`pull_request.head.sha`) |
| `base_sha` | From webhook payload (`pull_request.base.sha`) |
| `changed_paths` | GitHub API: `GET /repos/{owner}/{repo}/pulls/{number}/files` |
| `diff_url` | Constructed: `https://github.com/{owner}/{repo}/compare/{base}...{head}` |
| `profile` | From `.hap/binding.json` in commit |
| `execution_path` | From `.hap/binding.json` in commit |
| `preview_ref` | From `.hap/binding.json` in commit |
| `output_ref` | From `.hap/binding.json` in commit |

All resolved values are deterministic — given the same PR state, the system always computes the same values.

### 13.7 Output Provenance for Deploy-Gate

For deploy-gate, the output provenance metadata is exposed at a well-known endpoint on the deployed service:

```
GET /.well-known/hap

{
  "frame_hash": "sha256:..."
}
```

Alternatively, the service MAY expose provenance via HTTP response header:

```
X-HAP-Frame-Hash: sha256:...
```

**Verification:**

1. Fetch `/.well-known/hap` from the deployed service
2. Read `frame_hash` from the response
3. Fetch attestation(s) for that `frame_hash` from the SP
4. Verify `output_ref` in the attested execution context matches the service URL
5. If match — the deployed service is cryptographically bound to the attested action

---

## 14. Summary

| Aspect | v0.2 | v0.3 |
|--------|------|------|
| Declared content | Execution context with semantic fields | Governance choices only (profile + execution_path + optional preview_ref / output_ref) |
| Execution context source | Entered in UI | Declared + system-resolved from action |
| Execution path selection | First attestor chooses | Proposer declares in committed file |
| Execution context hash | Single, in frame | Complete resolved context hash in attestation |
| Condition evaluation | N/A | None (explicit path choice) |
| Auditability | "Someone approved" | Attestation = auditable record with resolved context |
| Accountability | First attestor | Proposer declares, domains validate |
| Output provenance | Not addressed | Optional `preview_ref` + `output_ref` in context, `frame_hash` on outputs |
| Enforcement | Not specified | Gatekeeper is mandatory — every execution passes through attestation verification |
| Resource identification | Platform-specific | Platform-agnostic full URLs |

---

## 15. Design Decisions

### Why proposer declares in committed file?

If the first attestor chooses the execution path:

- They have disproportionate power over governance level
- Other domain owners must follow or refuse entirely
- No clear accountability for path selection

With proposer declaration:

- Proposer explicitly declares governance scope
- All domain owners validate the same proposal
- Clear accountability: proposer declares, domains validate
- Immutable binding to action

### Why system-resolved execution context?

Semantic content in declared files creates problems:

- Developers forget to update it → stale content
- Semantic descriptions are unverifiable → trust issues
- Content duplicates what's already in the PR → redundancy

With system-resolved execution context:

- Always deterministic — computed from action at processing time
- Always accurate — derived from the actual action state
- Fully verifiable — anyone can re-compute and compare
- Attestation captures the resolved values → immutable audit record

The declared file stays minimal (profile + execution_path). The system resolves all deterministic values. The attestation commits to the complete resolved context.

### Why no conditional domains?

Self-declared conditions (e.g., `security_relevant: true/false`) are meaningless:

- The person who might want to skip oversight decides whether oversight is required
- This is circular and easily gamed

Instead, governance scope is determined by **execution path** in the execution context:

- Explicit proposer declaration
- Validated by domain owners
- Clear accountability for choosing the wrong path

### Why shared execution context (all domains see the same)?

With per-domain execution context:

- Who decides what each domain sees? → governance problem
- Different views of the same change → confusion
- Content filtering is a form of interpretation → unverifiable

With shared, resolved execution context:

- All domain owners see the same deterministic data
- No content filtering or domain-specific views
- Each domain owner attests to the same frame + execution context
- Their gate content (problem/objective/tradeoffs) is domain-specific, but the context is shared

---

## 16. Gate Content Verifiability

### 16.1 Problem

The protocol requires human articulation at gates 3-5 (Problem, Objective, Tradeoffs). But if that content is never hashed or published, the requirement is unenforceable after the fact. The attestation says "I committed" but not "here's what I committed to."

### 16.2 Principle

> The protocol guarantees verifiability, not publication.
> The decision to publish is the owner's.

Gate content is private by default. But if the owner chooses to publish, anyone can verify it is the authentic content that was attested to.

### 16.3 Gate Content Is Commitment, Not Comprehension

Gate content (problem, objective, tradeoffs) represents what the human committed to articulating. It does NOT prove:

- They understood the implications
- They thought carefully
- They wrote it themselves (vs. AI-assisted)
- The content is correct or complete

The protocol hashes what was committed. Publication makes that commitment visible. Neither guarantees quality of thought.

### 16.4 Gate Content Hashes in Attestation

At attestation time, the content of each gate is hashed and included in the attestation:

```json
{
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
  "expires_at": 1735891600
}
```

This happens automatically at attestation time. The owner does not need to opt in — the hashes are always computed and included.

### 16.5 Publication is Optional

After attestation, the owner may choose to publish the actual gate content:

- As a PR comment
- In a decision log
- In an internal wiki or audit trail
- Not at all

The protocol does not require publication. The hashes in the attestation are sufficient to prove that content existed and was committed to.

### 16.6 Verification Flow

If gate content is published, anyone can verify it:

1. Hash the published content for each gate
2. Compare against `gate_content_hashes` in the attestation
3. Match = verified authentic content
4. Mismatch = content was tampered with after attestation

### 16.7 Properties

| Property | Guarantee |
|----------|-----------|
| **Private by default** | Gate content stays with the owner unless they choose to share |
| **Verifiable on demand** | If published, hashes prove authenticity |
| **Tamper-evident** | Cannot publish different content than what was hashed |
| **Non-repudiable** | Owner cannot deny what they wrote — the hash is in their signed attestation |

### 16.8 Normative Rules

1. The Local App MUST compute `gate_content_hashes` at attestation time.
2. The hash for each gate MUST be computed from the exact text the owner entered.
3. `gate_content_hashes` MUST be included in the signed attestation payload.
4. The protocol MUST NOT require publication of gate content.
5. If gate content is published, verifiers MUST be able to independently compute the hash and compare.

---

## 17. AI Constraints & Gate Resolution

### 17.1 Enforceable Constraints

The protocol enforces only what it can guarantee:

1. **Protocol does not supply content** — The Local App MUST NOT auto-generate or prefill gate fields. What the user brings from outside (including AI-assisted content) is their responsibility.

2. **Commitment requires explicit action** — A human must explicitly trigger gate closure and attestation. No automation.

3. **Gate resolution = presence only** — A gate closes when its field is non-empty. The protocol does not evaluate origin, adequacy, or correctness.

**What the protocol guarantees:** A human took responsibility by signing.

**What the protocol does not guarantee:** How they arrived at the content.

### 17.2 Gate Questions in Profile

Predefined gate questions move from SDGs to the Profile:

```json
{
  "gateQuestions": {
    "problem": { "question": "What problem are you solving?", "required": true },
    "objective": { "question": "What outcome do you want?", "required": true },
    "tradeoffs": { "question": "What are you willing to sacrifice?", "required": true }
  }
}
```

Questions are used as textarea placeholders — guidance, not enforcement.

### 17.3 Simplified SDGs

SDGs are reduced to structural checks only:

- `deploy/missing_decision_owner@1.0` — Hard stop
- `deploy/commitment_mismatch@1.0` — Hard stop
- `deploy/tradeoff_execution_mismatch@1.0` — Hard stop
- `deploy/objective_diff_mismatch@1.0` — Warning only

No SDG evaluates free-form text for correctness. Semantic rules (`always`, `semantic_mismatch`) are removed.

See [v0.3 AI Constraints Proposal](/doc/v0.3-ai-constraints.md) for full details.

---

## 18. Decision Streams

### 18.1 Motivation

Individual attestations are snapshots. They prove "someone decided X" but don't show how a project evolved through decisions. For public accountability and project history, we need to link attestations into a verifiable chain.

### 18.2 Stream Structure

Each attestation can optionally belong to a decision stream:

```json
{
  "stream": {
    "project_id": "hap-protocol",
    "sequence": 12,
    "previous_attestation_hash": "sha256:..."
  }
}
```

| Field | Purpose |
|-------|---------|
| `project_id` | Groups attestations into a project |
| `sequence` | Order within the stream (starts at 1) |
| `previous_attestation_hash` | Links to prior attestation (null for first) |

### 18.3 SP-Provided Timestamps

Timestamps come from the Service Provider, not the signer. This prevents backdating.

**Signer submits:** Attestation with no timestamp

**SP registers and returns:**

```json
{
  "attestation": { ... },
  "registered_at": 1735888005,
  "sp_signature": "..."
}
```

The SP certifies when it received the attestation. The signer cannot control this.

### 18.4 Ordering

Two ordering mechanisms:

1. **Sequence** — Logical order within a stream. Decision 3 came after decision 2.
2. **registered_at** — Wall-clock time from SP. When the attestation was actually registered.

Sequence is authoritative for chain order. Timestamp is authoritative for real-world time.

### 18.5 Normative Rules

1. `project_id` MUST be consistent across all attestations in a stream.
2. `sequence` MUST increment by 1 for each attestation in a stream.
3. `previous_attestation_hash` MUST reference the immediately prior attestation (or null for sequence 1).
4. The SP MUST set `registered_at` when receiving an attestation.
5. The SP MUST sign the registration to certify the timestamp.
6. Signers MUST NOT set timestamps — only the SP provides authoritative time.

### 18.6 Chain Verification

Anyone can verify a decision stream:

1. Fetch all attestations for a `project_id`
2. Order by `sequence`
3. Verify each `previous_attestation_hash` matches the prior attestation's hash
4. Verify SP signatures on registrations
5. If all checks pass → chain is valid and unbroken

### 18.7 Genesis Attestation

The first attestation in a stream:

- `sequence`: 1
- `previous_attestation_hash`: null

This is the genesis. All subsequent attestations link back to it.

---

## 19. SP Registration Requirements

### 19.1 SP Registries

The Service Provider MUST maintain:

**Profile Registry**
- Valid profiles and their versions
- Execution paths per profile
- Required domains per execution path
- Execution context schemas per domain

**Domain Authority Registry**
- Organizations registered with the SP
- Domain owners per organization (DID → domain mapping)
- Authority grant/revoke timestamps

The Domain Authority Registry is the SP-level complement to project-level authorization sources (see section 10). The SP registry tracks organizational registrations; project-level authorization sources define per-project personnel.

### 19.2 Organization Onboarding

Before any attestation can be issued, an organization MUST:

1. Register with at least one SP
2. Declare which profiles they will use
3. Register domain owners with their authorized domains

### 19.3 SP Validation Rules

The SP MUST reject attestation requests when:

- Profile is not registered
- Requesting DID has no authority for claimed domain (see section 10.5)
- Domain is not required by the execution path
- Organization is not registered

### 19.4 Domain Authority Lifecycle

| Event | Action |
|-------|--------|
| New domain owner | Organization registers DID + domain with SP |
| Role change | Organization updates domain mapping |
| Departure | Organization revokes authority |
| Audit | SP provides authority history per DID |

---

## 20. Governance

### 20.1 SP Governance

Service Providers are trusted parties. Their governance must be explicit:

**SP Operators**
- Who operates the SP?
- What jurisdiction?
- What liability?

**SP Accountability**
- SPs MUST publish their signing public key
- SPs MUST log all attestations issued
- SPs MUST retain attestation logs for at least the profile-defined retention period
- Attestation logs MUST be append-only
- SPs SHOULD publish attestation counts and statistics
- SPs MUST NOT issue attestations without verifying domain authority

**SP Misbehavior**
- Issuing attestations for unauthorized DIDs → SP trust revocation
- Backdating timestamps → SP trust revocation
- Refusing valid requests → escalation path required

### 20.2 Multi-SP Ecosystem

The protocol supports multiple SPs:

- Organizations choose which SP(s) to use
- Verifiers can trust multiple SPs
- Attestations reference which SP signed them
- No single SP has monopoly on trust

**Interoperability:**
- SPs SHOULD use compatible attestation formats
- SPs MAY federate domain authority (SP-A trusts SP-B's authority registry)
- Cross-SP verification MUST be possible if both SPs are trusted

### 20.3 Profile Governance

**Profile Creation**
- Anyone can propose a profile
- Profiles SHOULD be reviewed before adoption
- Organizations decide which profiles to trust

**Profile Versioning**
- Breaking changes MUST bump major version
- SPs MUST support profile version negotiation
- Deprecated profiles SHOULD have sunset timeline

### 20.4 Domain Authority Governance

**Within Organizations:**
- Organization defines who grants domain authority
- Authority grants SHOULD require approval from existing authority holder
- Authority SHOULD have expiration (annual renewal)

**Audit Trail:**
- All authority grants/revocations MUST be logged
- Logs MUST include: who granted, to whom, which domain, when, expiration

### 20.5 Dispute Resolution

When attestation validity is disputed:

1. Verify cryptographic validity (signature, hashes)
2. Verify domain authority at time of attestation
3. Verify SP was trusted at time of attestation
4. If all valid → attestation stands
5. If authority was invalid → attestation is void, SP may be at fault

---

## 21. Open Questions

1. **Domain inheritance** — Can a domain "include" another domain's required fields?

2. **Attestation aggregation** — Should there be a way to combine multiple domain attestations into one signed bundle?

3. **Binding file validation** — Should the Local App validate the binding file against a JSON schema before allowing attestation?

4. **SP federation** — How do multiple SPs coordinate? Should there be a root trust anchor?

5. **Authority delegation** — Can a domain owner delegate authority temporarily? (e.g., vacation coverage)

6. **Cross-organization decisions** — How do multi-org projects handle domain authority?

7. **Authorization source federation** — How do authorization sources compose across repos/projects in the same organization? Can an org-level authorization source delegate to per-project overrides?

---

## 22. Scope, Agents, and Future Work

### 22.1 The Core Principle

> Bounds flow down, never up. The root is always human.

HAP governs **human-defined bounds**. Agents execute within those bounds. The chain of authority always traces back to human attestation.

```
Human attests to bounds
    └── Agent executes within bounds
            └── Sub-agent executes within narrower sub-bounds
                    └── ...
```

Agents can narrow bounds (delegate with tighter constraints). Agents cannot widen bounds (grant themselves more authority).

**Field-level constraints make bounds enforceable.** The profile defines what *kinds* of bounds can exist (constraint types, section 4.2.1). The human sets the *specific* bounds in the authorization frame. The Gatekeeper verifies that every agent execution request falls within those bounds (section 8.6).

Without constraints, "bounds" is a narrative claim — the attestation proves a human committed, but nothing prevents execution outside what was committed to. With constraints, the Gatekeeper enforces the actual boundary values the human set.

### 22.2 Agent Workflows in v0.3

HAP supports agent workflows through bounded execution (section 8.6):

| Component | Role |
|-----------|------|
| **Profile** | Defines constraint types — what kinds of bounds can exist |
| **Human** | Sets bound values in the authorization frame and attests |
| **Agent** | Submits execution requests within those bounds |
| **Gatekeeper** | Verifies attestation validity AND that execution falls within bounds |

The authorization frame IS the pre-authorization. The agent is bound by the values the human committed to. The Gatekeeper enforces both.

**Example:**
```
Profile (payment-gate@0.3) defines:
  amount: number, enforceable: [max]
  currency: string, enforceable: [enum]

Human attests (authorization frame):
  amount_max: 80
  currency: ["EUR"]
  path: "payment-routine"
  → frame_hash signed by finance domain owner

Agent executes freely within bounds:
  Request 1: amount: 5, currency: "EUR"    → ✓ within bounds
  Request 2: amount: 30, currency: "EUR"   → ✓ within bounds
  Request 3: amount: 120, currency: "EUR"  → ✗ BOUND_EXCEEDED
  Request 4: amount: 50, currency: "USD"   → ✗ BOUND_EXCEEDED

No human involvement for requests 1 and 2.
Requests 3 and 4 are blocked by the Gatekeeper.
```

### 22.3 What v0.3 Does Not Address

**High-frequency re-attestation**
- Real-time constraint updates at machine speed
- Batch attestation for thousands of micro-decisions

**Regulated Industry Requirements**
- Mandatory retention periods
- Informed consent verification
- Jurisdiction and data residency
- Industry-specific audit formats

**Advanced Multi-SP Scenarios**
- SP federation and trust anchors
- Cross-SP conflict resolution
- Decentralized trust models

### 22.4 Guidance for Regulated Industries

Organizations in regulated industries (healthcare, finance, safety-critical) should layer additional controls on top of HAP:

- **Retention:** The protocol defines baseline retention via profile `retention_minimum`. Regulated industries may require longer periods. Organizations SHOULD configure retention to meet their regulatory obligations
- **Disclosure:** If mandatory disclosure is required, do not rely on optional publication
- **Training:** Document that signers received appropriate training (outside HAP scope)
- **AI disclosure:** If regulations require AI involvement disclosure, track this separately

HAP provides accountability infrastructure. Compliance requires additional organizational controls.

### 22.5 Future Considerations (v0.4+)

| Topic | Description |
|-------|-------------|
| **Delegation model** | Human pre-authorizes AI/agent to act within bounds |
| **Batch attestation** | Attest to a class of actions, not each individual action |
| **Machine-readable schemas** | Formal JSON Schema for execution context validation |
| **Standing authority** | Long-lived attestations for repeated decision types |
| **SP federation** | Multiple SPs coordinating trust and authority |
| **Cross-org decisions** | Multi-organization projects with shared domains |

---

## 23. Next Steps

1. Review this proposal
2. ~~Implement in demo (deploy-gate profile)~~ — Live at https://deploy-demo.humanagencyprotocol.org/
3. Validate with real multi-domain scenario
4. Finalize for v0.3 specification

### Live Reference Implementations

The v0.3 execution context model is implemented in two live demos sharing a single Service Provider:

- **Service Provider:** https://service.humanagencyprotocol.org/
- **Deploy Gate Demo:** https://deploy-demo.humanagencyprotocol.org/ — GitHub App integration for deployment attestation
- **Agent Demo:** https://agent-demo.humanagencyprotocol.org/ — Agent authorization with `comms-send` and `payment-gate` profiles
