---
title: "Protocol"
version: "Version 0.3"
date: "March 2026"
---

**HAP defines cryptographic pre-authorization of bounded execution — whether by AI agents, CI/CD pipelines, or automated systems.**

AI systems increasingly execute tasks, call tools, and trigger irreversible actions.
The central risk is not only misalignment, but execution without valid human authorization and direction drift inside authorized bounds.

HAP solves this by defining how humans cryptographically authorize consequential actions and how implementations preserve human-defined direction during execution.

The protocol distinguishes between:

- **Authorization State** — what is permitted, by whom, and under what bounded frame (enforceable)
- **Direction State** — the semantic intent that informs agent planning within those bounds (local, private)

The protocol does not generate decisions.
It defines the conditions under which human-authorized execution may occur.

AI cannot originate human authority, and it cannot safely infer human direction. Authorization is made enforceable through cryptographic attestations and Gatekeeper verification. Direction is preserved locally and never leaves local custody by default.

---

## Protocol Scope

### What the Protocol Verifies

The protocol verifies:

- A human committed (cryptographic signature)
- To a specific action (frame hash)
- Under specific constraints (execution context hash)
- At a specific time (SP timestamp)
- With declared authority (domain ownership)

### What the Protocol Does NOT Verify

The protocol does NOT verify:

- Understanding
- Informed consent
- Quality of reasoning
- Whether the human read anything
- Whether AI contributed to the decision

**The protocol verifies commitment, not comprehension.**

### What the Protocol Verifies About Direction State

The protocol may verify that Direction State existed and was committed to through cryptographic hashes (`gate_content_hashes`) or local gate closure rules.

The protocol does NOT verify:

- Semantic correctness of direction content
- Adequacy of reasoning
- Whether the model understood the direction
- Whether the chosen objective was wise
- Whether the tradeoff was morally or strategically sound

The protocol can verify commitment to direction, but not the truth or quality of that direction.

### Execution Context, Not Disclosure

Execution context represents the structured constraints binding an executor. It is NOT:

- Evidence of understanding
- Proof of review quality
- Record of what was "seen"
- Informed consent documentation

Any semantic content used to reach a decision (AI analysis, deliberation, reasoning) remains local and out of protocol scope.

### Action vs. Execution

The protocol uses two related but distinct terms:

| Term | Meaning | Attested via |
|------|---------|-------------|
| **Action** | WHAT is being authorized | Frame fields (profile-specific, e.g. `repo` + `sha`) |
| **Execution** | HOW it is carried out, under what constraints | `execution_path`, `execution_context_hash` |

**Action** is the thing being authorized — deploy SHA X to environment Y. The action is identified by the frame fields, which are hashed into `frame_hash` and signed in the attestation.

**Execution** is the carrying out of that action under specific constraints — which governance path, what domains must approve, what context each domain commits to.

The Gatekeeper receives the frame fields and attestations, reconstructs `frame_hash`, and validates that every attestation matches. Only attested data is trusted — the Gatekeeper never accepts unattested parameters.

### Protocol vs. Profile Layering

The protocol defines abstract concepts. Profiles define concrete implementations.

| Layer | Defines | Example |
|-------|---------|---------|
| **Protocol** | Execution context structure, frame binding, attestation format | "Execution context must be immutably bound to the action" |
| **Profile** | How binding works in a specific context | "For GitHub PRs, declared fields live in `.hap/binding.json` in the commit" |

HAP governs any context where humans authorize actions:

- Code deployment (git repositories)
- Document approval (markdown files, wikis)
- Infrastructure changes (Terraform, Ansible)
- AI agent workflows (human attests to bounds, agent executes within)
- Policy decisions
- Contract signing

The protocol must remain abstract. Context-specific bindings belong in profiles.

---

## Privacy Invariant

> **No semantic content leaves local custody by default or by protocol design.**

This includes (but is not limited to): source code, diffs, commit messages, natural language descriptions, rendered previews, and risk summaries.

HAP MAY transmit cryptographic commitments (e.g., hashes), structural metadata, and signatures, but MUST NOT transmit semantic evidence to Service Providers or Executors.

Any disclosure of semantic content MUST be an explicit, human-initiated action outside the protocol. The protocol makes authorship verifiable without exposing content.

---

## Threat Model

Implementations MUST assume:

- compromised Local App (blind-signing risk),
- malicious or buggy Executor,
- malicious or negligent Service Provider,
- profile and supply-chain attacks.

HAP does **not** assume trusted UIs, trusted executors, or honest automation.

---

## Decision States

HAP distinguishes between two categories of decision state: **Authorization State** and **Direction State**. They are not exposed or enforced in the same way.

Authorization determines whether execution may occur. Direction determines how an agent should act within authorized bounds.

### Authorization States

**Frame — What action is being authorized?**

The canonical and deterministic representation of the action and governance context. In v0.3, a Frame is defined as key-value maps with deterministic canonicalization. Profiles define required keys, key semantics, and canonical ordering. The frame uniquely identifies an action and its governance context — it is derived from profile-specific action fields plus the declared profile and execution path.

**Commitment — Has a human explicitly approved execution?**

Commitment closes alternatives and authorizes proceeding under the selected frame.

**Decision Owner — Who is accountable for the authorization?**

Execution requires an identifiable human whose authority covers the required domain.

### Direction States

**Problem — Why is action justified?**

The locally held reason the action is worth taking.

**Objective — What outcome should the system optimize for?**

The intended result that should guide system behavior.

**Tradeoff — What cost, constraint, or risk is accepted?**

The boundary conditions under which the objective may be pursued.

Direction State may contain semantic content. It is local by default, may be encrypted by the implementation, and MUST NOT be transmitted to Service Providers, Gatekeepers, or Executors as semantic plaintext. The protocol may attest to cryptographic commitments to Direction State (via `gate_content_hashes`), but does not require its disclosure.

### Normative Distinction

Authorization States are required for attestation and Gatekeeper enforcement.
Direction States may be required by a profile for local gate closure and local agent guidance, but their semantic content remains outside protocol disclosure by default.

Implementations MUST ensure all required states are resolved before attestation or execution.
No skipping, no inference, no automated assumption.

---

## Decision Ownership & Consequence Domains

Ownership is a **gate for valid decision-making**, not just a state.

### The Decision Owner
A **Decision Owner** is any actor who:
1. Explicitly authorizes execution
2. Accepts responsibility for consequences
3. Declares the domain of authority within which that ownership is valid

A Decision Owner is invalid if the decision's declared consequences exceed their declared domain.

### Domain Authority

In v0.3, domain authority is the mechanism for binding decision owners to their area of responsibility.

Each attestation includes `resolved_domains`, binding a Decision Owner to the domain they attest for:

```json
{
  "domain": "engineering",
  "did": "did:key:..."
}
```

- `domain` — The organizational domain of authority (e.g., `engineering`, `security`, `release_management`). Profile-defined.
- `did` — The Decision Owner's decentralized identifier.

Profiles define required domains for each execution path. The authorization mapping (see Identity & Authorization) defines who may attest for each domain.

### Consequence Domains
Consequences are partitioned by domain. Any actor materially affected in a domain must be a decision owner for that domain.

Common domains include:
- **Delivery** (Scope, timeline, quality)
- **Financial** (Budget, ROI, cost)
- **Legal** (Compliance, liability)
- **Reputational** (Brand, trust)
- **Wellbeing** (Burnout, safety)

### Multi-Owner Decisions
Decisions may have multiple owners.
However, collective or symbolic ownership ("The Team owns this") is invalid.
Ownership must be explicit, domain-scoped, and jointly committed.

**Invariant:** No decision frame may be committed unless all materially affected decision owners are identified and participating.

### Divergence Is Not Failure—False Unity Is

When materially affected parties issue conflicting attestations (e.g., different Frame hashes or incompatible tradeoffs), HAP blocks shared execution—not human agency.

This is not a deadlock. It is a boundary signal: "Your directions diverge."

Systems should respond by prompting users to:

"Your directions diverge. Initiate a new decision?"

This ensures drift is replaced by explicit divergence, preserving both autonomy and honesty. No shared action proceeds on unratified consensus.

When a domain owner disagrees — whether due to wrong execution path, incomplete context, or inaccurate constraints — they refuse to attest. The proposer must update the declaration and start a new attestation cycle. No one can unilaterally override — all required domains must attest to the same frame.

---

## Core Protocol Principle

**Required decision states MUST be resolved before consequential execution.** Unresolved required states MUST block attestation or execution. Gatekeepers MUST reject execution that lacks valid attestation or exceeds authorized bounds. Implementations may satisfy this through any interaction pattern — approval workflows, bounded pre-authorization, staged review, or local decision capture — as long as the invariant holds.

---

## Gate Definitions

| Gate | Class | Definition |
|------|-------|------------|
| **Frame** | Authorization | Canonical representation of the action and governance context |
| **Problem** | Direction | Local semantic statement of why action is justified |
| **Objective** | Direction | Local semantic statement of the intended outcome |
| **Tradeoff** | Direction | Local semantic statement of accepted cost, constraint, or risk |
| **Commitment** | Authorization | Explicit human approval to proceed |
| **Decision Owner** | Authorization | Qualified human identity cryptographically bound to the approval |

Direction gate content may guide local agent reasoning but is not transmitted semantically outside local custody.

Gate resolution is attested by the Service Provider based on signals from the Local App. Profiles define which gates are required and MAY specify additional verification requirements for each gate.

---

## Profiles

Profiles are the mechanism for domain-specific enforcement, introduced in v0.2 and extended in v0.3.

A **Profile** defines:
- required frame keys,
- execution paths with required domains,
- execution context schema,
- field constraints,
- gate questions,
- validation rules,
- TTL policies,
- retention minimum.

HAP Core is not enforceable without at least one trusted Profile.

Profiles are identified by `profile_id` and versioned independently.

### Execution Paths with Required Domains

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

### Execution Context Schema

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
| `cumulative` | Resolved from execution log (running total within a time window) | `amount_daily`, `deploy_count_daily` |

**Cumulative fields** enable stateful limits — constraints that apply across multiple executions rather than per-call. A cumulative field definition specifies:

- `cumulativeField`: which declared field to aggregate (use `_count` for plain execution counting)
- `window`: time window for aggregation (`daily`, `weekly`, or `monthly`)

The Gatekeeper resolves cumulative fields by querying the execution log before checking bounds. The resolved value = running total within the window + current call's contribution.

```json
{
  "amount_daily": {
    "source": "cumulative",
    "cumulativeField": "amount",
    "window": "daily",
    "description": "Running daily spend total",
    "required": true,
    "constraint": { "type": "number", "enforceable": ["max"] }
  }
}
```

The corresponding frame field uses the convention `{cumulative_field_name}_max` (e.g., `amount_daily_max`) to set the bound.

**Normative rules:**

1. Execution context MUST consist of deterministic, verifiable, and persistent values — either as direct content or as references to persistent sources.
2. All domain owners see the same execution context.
3. The execution context is hashed and included in the attestation.
4. Semantic content (problem, objective, tradeoffs) is entered by humans in gates, not in the execution context.
5. The `profile` field bootstraps everything — it determines which schema applies.
6. Cumulative fields are resolved by the Gatekeeper at verification time. The execution log MUST be available to the Gatekeeper for profiles that define cumulative fields. The log MUST be durable across restarts.
7. Cumulative field resolution is deterministic: given the same execution log state and current call values, the result is always the same.

### Field Constraints

The profile defines the **constraint types** that fields support. Constraint types declare what kinds of boundaries a human can set on a field — not the boundary values themselves. The human sets the specific values in the authorization frame (see Bounded Execution in Gatekeeper).

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
      "action_type": {
        "source": "declared",
        "description": "Authorized action type",
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

### Gate Questions

Predefined gate questions are defined in the Profile:

```json
{
  "gateQuestions": {
    "problem": { "question": "What problem are you solving?", "required": true },
    "objective": { "question": "What outcome do you want?", "required": true },
    "tradeoffs": { "question": "What are you willing to sacrifice?", "required": true }
  }
}
```

Questions are used as guidance — placeholders, not enforcement. The protocol enforces that gate content exists, not its quality.

### Profile-Defined TTL Policy

HAP Core does not fix attestation TTLs.

Each Profile MUST define:
- a default TTL
- a maximum TTL

Gatekeepers MUST enforce profile TTL limits. This prevents approval automation driven by time pressure.

### Retention Policy

Each Profile MUST define a `retention_minimum` — the minimum duration for which attestations must be retained for audit purposes. See Execution Context Resolution for the distinction between TTL and retention.

### Execution Path Enforcement

If a Profile defines an `execution_paths` object, then:

1. Any attestation referencing that Profile MUST include an `execution_path` in its frame.
2. The value of `execution_path` MUST exactly match one of the keys in the Profile's `execution_paths` object.
3. Gatekeepers and Service Providers MUST reject attestations that violate (1) or (2).

If a Profile does not define `execution_paths`, then:

1. The `execution_path` field MUST NOT appear in the frame.
2. Commitment is validated as a simple boolean closure (i.e., "commitment" is present in `resolved_gates`).

This ensures that execution paths are only used when pre-vetted, consequence-aware action templates exist—and never as free-form or ad-hoc declarations.

---

## Execution Context

### Definition

The **execution context** captures everything needed to authorize an action:

- **Governance choices** — declared by the developer (profile, execution_path)
- **Action facts** — derived from the action itself (profile-specific, e.g. repo, sha, changed_paths, diff_url)

The `profile` field is the bootstrap — it determines which schema defines the rest.

The specific fields depend on the profile's execution context schema. Governance choices are common to all profiles; action facts are profile-specific.

**Example (ship profile for git-based workflows):**

```json
{
  "profile": "ship@0.3",
  "execution_path": "deploy-prod-canary",

  "repo": "https://github.com/owner/repo",
  "sha": "abc123def456...",
  "changed_paths": ["src/api/auth.ts", "src/lib/crypto.ts"],
  "diff_url": "https://github.com/owner/repo/compare/base...head",
  "preview_ref": "https://staging.myapp.com",
  "output_ref": "https://myapp.com"
}
```

### Binding Requirements

The execution context MUST be:

**Immutable** — The declared fields are committed with the action. The resolved fields are deterministic for a given action state.

**Bound to action** — How binding works is profile-specific. For ship, declared fields live in `.hap/binding.json` in the commit.

**Verifiable** — Anyone can re-resolve the execution context and compare to the attested hash.

---

## Frame Canonicalization

In v0.3, Frames follow strict canonicalization rules to ensure deterministic hashing.

### Frame Derivation

A frame uniquely identifies an action and its governance context. The frame fields are profile-specific — each profile defines which fields identify the action. All frame fields MUST be attested (included in `frame_hash`).

| Field | Source |
|-------|--------|
| Profile-specific action fields | From the action itself (e.g. `repo`, `sha` for ship) |
| `profile` | From execution context |
| `path` | From execution context |

**v0.3 Frame structure (abstract):**

```
<profile-specific-fields>=<values>
profile=<profile-id>
path=<execution-path>
```

The frame MUST be deterministically derivable from the action and execution context. If the declared execution context changes, the frame changes.

`execution_context_hash` is NOT part of the frame. It moves to the attestation as a top-level field. This keeps the frame stable (it only changes when the action changes) while the execution context hash captures the full deterministic context.

### Canonicalization Rules

HAP Core requires:
- UTF-8 encoding
- newline-delimited `key=value` records
- keys sorted according to Profile-defined key order (or lexicographically by default)
- explicit inclusion of all required keys
- no whitespace normalization

**Key format**
Keys MUST match: `[a-z0-9_]+`

**Value encoding**
- Values MUST NOT contain newline (`\n`) characters.
- If a value contains `=` or any non-printable ASCII, it MUST be percent-encoded (RFC 3986) before frame construction.
- Profiles MAY further restrict allowed characters.

The canonical frame string is hashed to produce `frame_hash`.

### No Condition Fields

v0.3 does not include condition fields in the frame. Self-declared conditions are circular — the person who might want to skip oversight would decide whether oversight is required. Instead, required domains are determined by the **execution path**, which is an explicit governance choice validated by domain owners.

---

## Attestations: Cryptographic Proof of Direction

An attestation is a time-limited, cryptographically signed proof that:

- A specific Frame (identified by frame_hash) was ratified
- All gates required by the Profile were closed
- The execution context was committed to (execution_context_hash)
- Specific domains have explicit Decision Owners (resolved_domains)
- Gate content was articulated and hashed (gate_content_hashes)
- Approval occurred under a specific Profile
- Cryptographic commitments to local direction state were included (`gate_content_hashes`)

Attestations do not contain semantic content. `gate_content_hashes` commit to the locally held semantic direction state associated with the decision. These hashes support tamper-evident auditability without exposing semantic content.

### v0.3 Attestation Payload

```json
{
  "attestation_id": "uuid",
  "version": "0.3",
  "profile_id": "ship@0.3",
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

**Normative rules:**

1. The `execution_context_hash` is computed from the shared execution context (all domains see the same context).
2. For every domain this attestation covers, include: `domain`, `did`.
3. One attestation typically covers one domain (one person, one scope).
4. Multi-domain decisions require multiple attestations from different owners.

### Auditability Guarantee

Each domain owner can independently prove:

- "I attested to frame X" → `frame_hash` in attestation
- "I committed to context Y" → `execution_context_hash` in attestation
- "I articulated my reasoning" → `gate_content_hashes` in attestation
- "For domain Z" → `resolved_domains` in attestation

---

## Gate Content Verifiability

> The protocol guarantees verifiability, not publication. The decision to publish is the owner's.

Gate content is private by default. But if the owner chooses to publish, anyone can verify it is the authentic content that was attested to.

Gate content represents what the human committed to articulating — not that they understood the implications, thought carefully, or wrote it themselves. The protocol verifies commitment, not comprehension.

### Gate Content Hashes in Attestation

At attestation time, the content of each gate is hashed and included in the attestation's `gate_content_hashes` field (see Attestation Payload). This happens automatically — the owner does not need to opt in.

### Publication is Optional

After attestation, the owner may choose to publish the actual gate content:

- As a PR comment
- In a decision log
- In an internal wiki or audit trail
- Not at all

The protocol does not require publication. The hashes in the attestation are sufficient to prove that content existed and was committed to.

### Verification Flow

If gate content is published, anyone can verify it:

1. Hash the published content for each gate
2. Compare against `gate_content_hashes` in the attestation
3. Match = verified authentic content
4. Mismatch = content was tampered with after attestation

### Normative Rules

1. The Local App MUST compute `gate_content_hashes` at attestation time.
2. The hash for each gate MUST be computed from the exact text the owner entered.
3. `gate_content_hashes` MUST be included in the signed attestation payload.
4. The protocol MUST NOT require publication of gate content.
5. If gate content is published, verifiers MUST be able to independently compute the hash and compare.

---

## Execution Context Resolution

### Resolution Flow

The execution context is **computed at processing time**, not stored in the declaration. This ensures determinism and traceability.

```
1. PROPOSER declares governance choices (minimal)
   - profile + execution_path
   - Bound to action through profile-specific mechanism
                                   |
                                   v
2. SYSTEM receives action event
   - Reads declared fields from bound declaration
   - Computes action facts from deterministic sources
                                   |
                                   v
3. SYSTEM presents complete execution context to domain owners
   - Governance choices + action facts = complete context
   - All domain owners see the same context
                                   |
                                   v
4. ATTESTATION captures resolved values
   - frame_hash: commits to action identity
   - execution_context_hash: commits to resolved context
   - This IS the auditable record
```

All resolved values MUST be deterministic — given the same action state, the system always computes the same values. Field sources (`declared`, `action`, `computed`) are defined by the profile's execution context schema.

### Execution Context Hash

The `execution_context_hash` in the attestation commits to the resolved context:

```
execution_context_hash = sha256(canonicalize(resolved_context))
```

The canonicalization ensures consistent hashing regardless of field ordering.

### Traceability

The attestation IS the audit record. It contains:

- `frame_hash` → commits to what action was authorized
- `execution_context_hash` → commits to what context was shown/resolved
- `gate_content_hashes` → commits to what the human articulated (problem/objective/tradeoffs)

Anyone can verify: "This attestation commits to this exact context, derived from this exact action state."

**Normative:** Because the attestation IS the audit record, implementations MUST retain signed attestations beyond TTL expiry for at least the profile-defined minimum retention period. An attestation that is discarded on expiry destroys the audit trail.

### TTL vs Retention

TTL and retention serve different purposes and operate on different timescales:

| Concept | Controls | Who enforces | Duration |
|---------|----------|-------------|----------|
| **TTL** | Whether Gatekeeper accepts for execution | Gatekeeper | Minutes–hours |
| **Retention** | How long the attestation remains verifiable | Integration | Months–years |

- TTL expiry means the Gatekeeper MUST reject the attestation for new executions
- TTL expiry does NOT mean the attestation should be discarded
- Expired attestations retain full cryptographic validity — signatures, hashes, and bindings remain verifiable indefinitely
- Profiles MUST define `retention_minimum` alongside TTL

### Output Provenance

#### Problem

The attestation proves a human committed to an action. But after execution, how does anyone verify that an observable output was produced by an attested action? Without a binding between attestation and output, any system could claim a `frame_hash` it did not earn.

#### Output Reference

Profiles MAY define an `output_ref` field in the execution context schema. When present, it declares where the output of this action will be accessible.

`output_ref` is:
- **Declared** — the proposer specifies the output target
- **Included in `execution_context_hash`** — domain owners attest to it
- **Profile-defined format** — a URL for web deployments, an API endpoint for system actions, or a structured reference for multi-endpoint outputs

Because `output_ref` is part of the execution context, it is hashed and signed. This creates a cryptographic binding between the attestation and the output location.

#### Output Provenance Metadata

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

#### Verification Flow

Given an observable output:

1. Read `frame_hash` from the output's provenance metadata
2. Fetch attestation(s) for that frame_hash from the SP
3. Verify attestation signatures
4. Verify `output_ref` in the attested execution context matches the output's actual location
5. If match — the output is cryptographically bound to the attested action

Step 4 is the critical binding. Without it, a `frame_hash` on an output is just a claim. With it, the claim is verified against what domain owners actually attested to.

#### Normative Rules

1. Profiles MAY define `output_ref` in the execution context schema.
2. When `output_ref` is present, it MUST be included in the execution context hash.
3. Outputs MAY carry `frame_hash` as provenance metadata.
4. Verifiers MUST check that the output's location matches the `output_ref` in the attested execution context.
5. The format of `output_ref` and the method of exposing provenance metadata are profile-specific.

---

## Identity & Authorization

### Principle

> Profiles define what authority is required. Authorization sources define who holds that authority. The SP verifies both before signing.

The protocol separates three concerns:

| Concern | Defines | Example |
|---------|---------|---------|
| **Profile** | What domains are required | `engineering`, `release_management` |
| **Authorization source** | Who can attest for each domain | `did:github:alice` → `engineering` |
| **SP** | Verifies identity and authorization before signing | Checks token, checks mapping, signs or rejects |

### Authentication

Authentication is out of HAP Core scope. Implementations MUST establish identity through external mechanisms (e.g., OAuth, WebAuthn, hardware tokens, passkeys).

The protocol uses **Decentralized Identifiers (DIDs)** for platform-agnostic identity:

- `did:github:alice` — GitHub identity
- `did:gitlab:bob` — GitLab identity
- `did:okta:carol` — Okta identity
- `did:email:dave@company.com` — Email-based identity

The verified DID is included in the attestation's `did` field. The SP MUST NOT issue attestations without verifying the attester's identity through a trusted authentication channel.

### Authorization Mapping

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

### Immutability Rule

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

### SP Authorization Responsibilities

Before signing an attestation, the SP MUST:

1. **Verify identity** — Validate the attester's authentication token against the identity provider. Resolve to a verified DID.
2. **Resolve authorization** — Fetch the domain→owners mapping from the configured authorization source.
3. **Check membership** — Verify that the authenticated DID is in the authorized list for the claimed domain.
4. **Reject or sign** — Only sign the attestation if both identity and authorization checks pass.

### Normative Rules

1. The SP MUST verify attester identity before signing an attestation.
2. The SP MUST verify the attester is authorized for the claimed domain before signing.
3. The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.
4. Changes to the authorization source MUST be made by an authorized party and MUST be auditable. The authorization governance model is organization-specific — it may be peer-governed (existing owners approve changes), hierarchical (supervisors assign authority), or system-managed (identity provider controls role membership). The protocol does not prescribe which model to use. What it requires is that no one can authorize themselves for the same action, and all changes are traceable.
5. The authorization source SHOULD be auditable — it must be possible to determine who was authorized at a given point in time.
6. The verified DID MUST be included in the attestation's `did` field.

---

## Human-Gated Actions

AI systems MUST NOT:

- Define the authorization frame without human approval
- Create binding commitment without explicit human authorization
- Assign or expand decision ownership
- Widen authorized bounds beyond the attested frame
- Override human-declared objectives or accepted tradeoffs at the level defined by the authorization

Within an authorized frame, AI systems MAY:

- Infer intermediate steps
- Generate tactical plans
- Choose among locally valid options
- Optimize execution inside the declared objective and tradeoff boundaries

Actions require different state resolution based on risk:

| Action Type | Required States |
|:---|:---|
| Informational queries | Frame |
| Planning & analysis | Frame, Problem, Objective |
| Execution | All authorization states + direction states as required by Profile |
| Public/irreversible actions | All states + explicit reconfirmation |

This enforces human leadership at the point of irreversibility while permitting useful autonomy within authorized bounds.

### The Decision Closure Loop

1. **State gap detected** — AI identifies missing or ambiguous decision state
2. **Targeted inquiry** — Request for specific state resolution
3. **Human resolves** — Human provides missing direction
4. **Closure evaluated** — System checks if all required states are resolved
5. **Execute or continue** — If closure achieved, AI proceeds; otherwise, loop continues

Order doesn't matter. Only closure matters.

---

## Decision Streams

### Motivation

Individual attestations are snapshots. They prove "someone decided X" but don't show how a project evolved through decisions. For public accountability and project history, we need to link attestations into a verifiable chain.

### Stream Structure

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

### SP-Provided Timestamps

Timestamps come from the Service Provider, not the signer. This prevents backdating.

**Signer submits:** Attestation with no timestamp

**SP registers and returns:**

```json
{
  "attestation": { "..." : "..." },
  "registered_at": 1735888005,
  "sp_signature": "..."
}
```

The SP certifies when it received the attestation. The signer cannot control this.

### Ordering

Two ordering mechanisms:

1. **Sequence** — Logical order within a stream. Decision 3 came after decision 2.
2. **registered_at** — Wall-clock time from SP. When the attestation was actually registered.

Sequence is authoritative for chain order. Timestamp is authoritative for real-world time.

### Normative Rules

1. `project_id` MUST be consistent across all attestations in a stream.
2. `sequence` MUST increment by 1 for each attestation in a stream.
3. `previous_attestation_hash` MUST reference the immediately prior attestation (or null for sequence 1).
4. The SP MUST set `registered_at` when receiving an attestation.
5. The SP MUST sign the registration to certify the timestamp.
6. Signers MUST NOT set timestamps — only the SP provides authoritative time.

### Chain Verification

Anyone can verify a decision stream:

1. Fetch all attestations for a `project_id`
2. Order by `sequence`
3. Verify each `previous_attestation_hash` matches the prior attestation's hash
4. Verify SP signatures on registrations
5. If all checks pass → chain is valid and unbroken

### Genesis Attestation

The first attestation in a stream:

- `sequence`: 1
- `previous_attestation_hash`: null

This is the genesis. All subsequent attestations link back to it.

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Decision Owner** | Human accountable for the action |
| **Local App** | Presents information to the human and collects approval |
| **Service Provider (SP)** | Issues signed attestations |
| **Executor** | Executes the action; untrusted |
| **Gatekeeper** | Enforces HAP validation before execution |

Executors are always treated as **fully untrusted**.

### Gatekeeper

The Gatekeeper is the verification obligation that every execution environment MUST satisfy before proceeding with an attested action. It is not a prescribed component or deployment topology — it is the guarantee that attestation verification has occurred.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — a `verify()` call in application code before execution proceeds
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint

All three are equally valid. The protocol makes no architectural preference. What matters is that the verification steps execute completely and that execution is blocked on a negative result.

A system that has attestations but skips verification is in violation — the attestation alone is not proof of compliance; verified attestation is.

---

## Scope, Agents, and Future Work

### The Core Principle

> Bounds flow down, never up. The root is always human.

HAP governs **human-defined bounds**. Agents execute within those bounds. The chain of authority always traces back to human attestation.

```
Human attests to bounds
    +-- Agent executes within bounds
            +-- Sub-agent executes within narrower sub-bounds
                    +-- ...
```

Agents can narrow bounds (delegate with tighter constraints). Agents cannot widen bounds (grant themselves more authority).

**Field-level constraints make bounds enforceable.** The profile defines what *kinds* of bounds can exist (constraint types). The human sets the *specific* bounds in the authorization frame. The Gatekeeper verifies that every agent execution request falls within those bounds (see Bounded Execution in Gatekeeper).

Without constraints, "bounds" is a narrative claim — the attestation proves a human committed, but nothing prevents execution outside what was committed to. With constraints, the Gatekeeper enforces the actual boundary values the human set.

For agent workflows, bounded execution alone is not always sufficient. Implementations may combine bounded authorization with a local direction payload derived from Problem, Objective, and Tradeoff to guide planning and execution within those bounds.

### Agent Workflows in v0.3

HAP supports agent workflows through bounded execution:

| Component | Role |
|-----------|------|
| **Profile** | Defines constraint types — what kinds of bounds can exist |
| **Human** | Sets bound values in the authorization frame and attests |
| **Agent** | Submits execution requests within those bounds |
| **Gatekeeper** | Verifies attestation validity AND that execution falls within bounds |

The authorization frame IS the pre-authorization. The agent is bound by the values the human committed to. The Gatekeeper enforces both.

**Example:**
```
Profile (spend@0.3) defines:
  amount: number, enforceable: [max]
  currency: string, enforceable: [enum]

Human attests (authorization frame):
  amount_max: 80
  currency: ["EUR"]
  path: "spend-routine"
  -> frame_hash signed by finance domain owner

Agent executes freely within bounds:
  Request 1: amount: 5, currency: "EUR"    -> within bounds
  Request 2: amount: 30, currency: "EUR"   -> within bounds
  Request 3: amount: 120, currency: "EUR"  -> BOUND_EXCEEDED
  Request 4: amount: 50, currency: "USD"   -> BOUND_EXCEEDED

No human involvement for requests 1 and 2.
Requests 3 and 4 are blocked by the Gatekeeper.
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `FRAME_HASH_MISMATCH` | Recomputed frame_hash does not match attestation |
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `DOMAIN_NOT_COVERED` | Required domain has no valid attestation |
| `TTL_EXPIRED` | Attestation has exceeded its time-to-live |
| `PROFILE_NOT_FOUND` | Referenced profile could not be resolved |
| `SCOPE_INSUFFICIENT` | Attestation scope does not cover the required domain |
| `BOUND_EXCEEDED` | Execution request value exceeds authorization frame bound |
| `MALFORMED_ATTESTATION` | Attestation structure is invalid |
| `DOMAIN_SCOPE_MISMATCH` | Attestation domain doesn't match requirement |
| `EXECUTION_CONTEXT_VIOLATION` | Execution context missing required fields |
| `BINDING_FILE_MISSING` | Action has no bound execution context declaration |
| `BINDING_FILE_INVALID` | Declared execution context malformed or missing required fields |

---

## Versioning Rules

- HAP Core versions (`0.x`) define protocol semantics.
- Profiles version independently.
- Breaking changes MUST bump major protocol or profile versions.
- Gatekeepers and Service Providers MUST reject unknown or untrusted versions.

---

## Summary

HAP ensures automation serves human direction — not the reverse.

Every consequential action traces back to a human who defined the frame, articulated the reasoning, accepted the tradeoffs, and committed to proceed. The protocol makes this structurally enforceable through cryptographic attestations and Gatekeeper verification.
