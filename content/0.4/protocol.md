---
title: "Protocol"
version: "Version 0.4"
date: "April 2026"
---

**HAP defines cryptographic pre-authorization of bounded execution — whether by AI agents, CI/CD pipelines, or automated systems.**

AI systems increasingly execute tasks, call tools, and trigger irreversible actions.
The central risk is not only misalignment, but execution without valid human authorization and direction drift inside authorized bounds.

HAP solves this by defining how humans cryptographically authorize consequential actions and how implementations preserve human-defined direction during execution. Every authorized action produces a signed **execution receipt** — cryptographic proof of who authorized it, when, and within which bounds.

**The receipt is pre-execution proof, not post-execution confirmation.** The Gatekeeper MUST obtain a receipt from the Service Provider *before* the tool call executes. If the SP refuses to issue a receipt — or is unreachable — the action MUST NOT proceed. This makes the SP a runtime dependency by design: execution without proof is execution without accountability.

The protocol distinguishes between:

- **Authorization State** — what is permitted, by whom, and under what bounds (enforceable)
- **Direction State** — the semantic intent that informs agent planning within those bounds (local, private)

The protocol does not generate decisions.
It defines the conditions under which human-authorized execution may occur.

AI cannot originate human authority, and it cannot safely infer human direction. Authorization is made enforceable through cryptographic attestations and Gatekeeper verification. Direction is preserved locally and never leaves local custody by default.

---

## Protocol Scope

### What the Protocol Verifies

The protocol verifies:

- A human committed (cryptographic signature)
- To bounded action (`bounds_hash`)
- Under specific operational scope (`context_hash`)
- With stated intent (`gate_content_hashes.intent`)
- At a specific time (SP timestamp)
- With declared authority (domain ownership)
- That every authorized action was executed within bounds (signed receipts)

### What the Protocol Does NOT Verify

The protocol does NOT verify:

- Understanding
- Informed consent
- Quality of reasoning
- Whether the human read anything
- Whether AI contributed to the decision

**The protocol verifies commitment, not comprehension.**

### What the Protocol Verifies About Direction State

The protocol may verify that Direction State existed and was committed to through a cryptographic hash (`gate_content_hashes.intent`).

The protocol does NOT verify:

- Semantic correctness of intent content
- Adequacy of reasoning
- Whether the model understood the intent
- Whether the chosen direction was wise
- Whether the accepted risks were morally or strategically sound

The protocol can verify commitment to intent, but not the truth or quality of that intent.

### Bounds, Context, and Disclosure

The protocol distinguishes two structural categories of authorization parameters:

- **Bounds** — enforceable constraints. These are sent to the Service Provider in plaintext so the SP can verify per-transaction limits and track cumulative consumption against the human's declared ceilings. Bounds are typically abstract (numeric ceilings, enum allowlists, time windows) and contain no operational secrets.
- **Context** — operational details that scope the authorization but require no SP enforcement. Context stays local. The SP only ever sees `context_hash`. Examples: deployment targets, customer segments, data subjects.

Any semantic content used to reach a decision (AI analysis, deliberation, reasoning) remains local and out of protocol scope.

### Action vs. Execution

The protocol uses two related but distinct terms:

| Term | Meaning | Attested via |
|------|---------|-------------|
| **Action** | WHAT is being authorized | Bounds + context (profile-specific) |
| **Execution** | HOW it is carried out, under what constraints | `bounds_hash`, `context_hash`, `execution_context_hash` |

**Action** is the thing being authorized — charge customers up to $100, deploy to staging, send up to 20 emails per day. The action is identified by the bounds and context, which are hashed into `bounds_hash` and `context_hash` and signed in the attestation.

**Execution** is the carrying out of that action under specific constraints — which commitment mode, what domains must approve, what intent the human committed to.

The Gatekeeper receives the bounds + context and attestation, reconstructs both hashes, and validates that they match. Only attested data is trusted — the Gatekeeper never accepts unattested parameters.

### Protocol vs. Profile Layering

The protocol defines abstract concepts. Profiles define concrete implementations.

| Layer | Defines | Example |
|-------|---------|---------|
| **Protocol** | Bounds/context structure, attestation format, receipt format | "Bounds must be hashed and signed" |
| **Profile** | What bounds and context fields exist for a specific authority domain | "The charge profile defines amount_max, currency, action_type" |

HAP governs any context where humans authorize bounded action by automated systems:

- AI agent workflows (human attests to bounds, agent executes within)
- Code deployment (git repositories)
- Document approval (markdown files, wikis)
- Infrastructure changes (Terraform, Ansible)
- Policy decisions
- Contract signing

The protocol must remain abstract. Context-specific bindings belong in profiles.

---

## Privacy Invariant

> **No semantic content leaves local custody by default or by protocol design.**

This includes (but is not limited to): source code, diffs, commit messages, natural language descriptions, rendered previews, risk summaries, and the full text of the human's intent.

HAP MAY transmit cryptographic commitments (e.g., hashes), structural metadata, and signatures, but MUST NOT transmit semantic evidence to Service Providers or Executors.

The bounds/context split is the structural mechanism that enforces this invariant: bounds (abstract limits) flow to the SP; context (operational details) stays local. The SP only sees `context_hash`, never the context content.

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

**Bounds — What is authorized?**

The enforceable constraints on action — per-transaction ceilings, cumulative limits, allowed enums. Bounds are profile-defined and human-set. They are sent to the SP in plaintext and hashed into `bounds_hash`.

**Context — Under what operational scope?**

Operational details that scope the authorization but stay local — deployment targets, customer segments, data subjects. Context is profile-defined and human-set. It is hashed into `context_hash`. Empty context (no fields) is permitted; the hash is still computed and included.

**Commitment — Has a human explicitly approved execution?**

Commitment closes alternatives and authorizes proceeding. Commitment is recorded in the attestation as `commitment_mode`:

- `automatic` — the agent acts within the bounds without per-action human approval
- `review` — each agent action becomes a proposal that the human must approve before execution

**Decision Owner — Who is accountable for the authorization?**

Execution requires an identifiable human whose authority covers the required domain.

### Direction State

**Intent — Why this authorization, what should the agent achieve, what should it avoid?**

A single locally-held statement that informs the agent's planning within the bounds. It typically covers:

- **Why** — What's the situation? Why does this need to happen?
- **Goal** — What should the agent try to achieve?
- **Watch out** — What should the agent avoid or be careful about?

These are guidance prompts, not enforced categories. The user writes naturally; the protocol stores a single hash (`gate_content_hashes.intent`).

Direction State may contain semantic content. It is local by default, may be encrypted by the implementation, and MUST NOT be transmitted to Service Providers, Gatekeepers, or Executors as semantic plaintext. The protocol attests to a cryptographic commitment to Direction State (via `gate_content_hashes.intent`), but does not require its disclosure.

### Normative Distinction

Authorization States are required for attestation and Gatekeeper enforcement.
Direction State (intent) is required by every profile in v0.4, but its semantic content remains outside protocol disclosure by default.

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

In v0.4, domain authority is the mechanism for binding decision owners to their area of responsibility.

Each attestation includes `resolved_domains`, binding a Decision Owner to the domain they attest for:

```json
{
  "domain": "finance",
  "did": "did:key:..."
}
```

- `domain` — The organizational domain of authority (e.g., `finance`, `engineering`, `compliance`). Defined by the SP per group.
- `did` — The Decision Owner's decentralized identifier.

In v0.4, **domain requirements are organizational policy, not protocol semantics.** Profiles define what authority categories exist; the SP (per group) defines who must attest for each profile. See "Identity & Authorization" below.

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

**Invariant:** No authorization may be committed unless all materially affected decision owners are identified and participating.

### Divergence Is Not Failure—False Unity Is

When materially affected parties issue conflicting attestations (e.g., different `bounds_hash` values or incompatible intent), HAP blocks shared execution—not human agency.

This is not a deadlock. It is a boundary signal: "Your directions diverge."

Systems should respond by prompting users to:

"Your directions diverge. Initiate a new decision?"

This ensures drift is replaced by explicit divergence, preserving both autonomy and honesty. No shared action proceeds on unratified consensus.

When a domain owner disagrees — whether due to wrong bounds, incomplete intent, or unacceptable context — they refuse to attest. The proposer must update the declaration and start a new attestation cycle. No one can unilaterally override — all required domains must attest to the same bounds and context.

---

## Core Protocol Principle

**Required decision states MUST be resolved before consequential execution.** Unresolved required states MUST block attestation or execution. Gatekeepers MUST reject execution that lacks a valid attestation, exceeds authorized bounds, or lacks a valid execution receipt. Implementations may satisfy this through any interaction pattern — approval workflows, bounded pre-authorization, staged review, or local decision capture — as long as the invariant holds.

---

## Gate Definitions

| Gate | Class | Definition |
|------|-------|------------|
| **Bounds** | Authorization | Canonical representation of the enforceable constraints on action |
| **Context** | Authorization | Canonical representation of the operational scope (local) |
| **Intent** | Direction | Local semantic statement of why the authorization exists, what the agent should achieve, and what to avoid |
| **Commitment** | Authorization | Explicit human approval to proceed, recorded as `commitment_mode` |
| **Decision Owner** | Authorization | Qualified human identity cryptographically bound to the approval |

The Intent gate's content may guide local agent reasoning but is not transmitted semantically outside local custody. Only `gate_content_hashes.intent` flows to the SP.

Gate resolution is attested by the Service Provider based on signals from the Local App. Profiles define which gates are required.

---

## Profiles

Profiles are the mechanism for domain-specific enforcement. v0.4 profiles are simpler than v0.3 profiles — they no longer carry execution paths, gate questions, or domain requirements.

A **Profile** defines:
- bounds schema (enforceable constraints)
- context schema (operational scope, may be empty)
- execution context schema (cumulative tracking fields)
- field constraints
- required gates
- TTL policy (default and max)
- retention minimum

HAP Core is not enforceable without at least one trusted Profile.

Profiles are identified by `profile_id` and versioned independently. Once published, a profile version is immutable.

### Universal Profiles

In v0.4, profiles are universal: the same `charge@0.4` profile works for a solo developer in personal mode and a 500-person enterprise in group mode. Organizational policy (who must attest) is configured on the SP, not in the profile.

### Bounds Schema

The bounds schema defines the enforceable parameters. Every bounds field declares a `boundType` — a discriminated union describing exactly how the bound is enforced. The `boundType` is the single source of truth for enforcement dispatch; implementations MUST NOT infer enforcement semantics from field name patterns.

```json
{
  "boundsSchema": {
    "keyOrder": ["profile", "amount_max",
                 "amount_daily_max", "amount_monthly_max", "transaction_count_daily_max"],
    "fields": {
      "profile":    { "type": "string", "required": true },
      "amount_max": {
        "type": "number",
        "required": true,
        "boundType": { "kind": "per_transaction", "of": "amount" }
      },
      "amount_daily_max": {
        "type": "number",
        "required": true,
        "boundType": { "kind": "cumulative_sum", "of": "amount", "window": "daily" }
      },
      "amount_monthly_max": {
        "type": "number",
        "required": true,
        "boundType": { "kind": "cumulative_sum", "of": "amount", "window": "monthly" }
      },
      "transaction_count_daily_max": {
        "type": "number",
        "required": true,
        "boundType": { "kind": "cumulative_count", "window": "daily" }
      }
    }
  }
}
```

Note that `currency` and `action_type` are **not** in the bounds schema. They are operational scoping fields and live in the **context schema** (see below). The SP only enforces bounds; enum scoping of context values is enforced locally by the Gatekeeper.

#### The BoundType union

Every v0.4 bounds field MUST declare a `boundType`. Four kinds are defined:

```
BoundType =
  | { kind: "per_transaction";  of: string }
  | { kind: "cumulative_sum";   of: string;  window: "daily" | "monthly" }
  | { kind: "cumulative_count"; window: "daily" | "monthly" }
  | { kind: "enum";             values: string[] }
```

| Kind | How it is enforced | Examples |
|------|-------------------|----------|
| `per_transaction` | The SP (and Gatekeeper) check that `execution[boundType.of] <= boundValue` for the current call. No cumulative state. | `amount_max`, `recipient_max`, `booking_duration_max` |
| `cumulative_sum` | The SP maintains a running sum of `execution[boundType.of]` across prior receipts in the window; the current call is approved iff `running_sum + execution[of] <= boundValue`. | `amount_daily_max`, `spend_monthly_max` |
| `cumulative_count` | The SP counts qualifying receipts in the window; the current call is approved iff `running_count + 1 <= boundValue`. No execution context field is read. | `write_daily_max`, `post_monthly_max`, `booking_daily_max` |
| `enum` | The stored bound value MUST be in the allowed set. This is a capability flag — not an enforced limit on the execution value, but a capability check at attestation time and at tool-proxy time. | `read_access`, `delete_access`, `archive_access` |

**Normative rules:**

1. Every bounds schema MUST include a `profile` field as the first key.
2. Every bounds field (excluding the metadata `profile` field) MUST declare a `boundType`. Implementations MUST fail closed on any bounds field that omits `boundType`.
3. Enforcement implementations MUST dispatch on `boundType.kind` and MUST NOT infer enforcement semantics from field name patterns.
4. The human sets specific values in the authorization at attestation time. The profile defines what *can* be constrained, not the values.
5. Profile authors MUST NOT include operational details (target_env, customer_segment, branch, currency, action_type) in the bounds schema. Operational scoping fields belong in the context schema.

### Context Schema

The context schema defines operational scoping fields that stay local. Context fields are enum-constrained or subset-constrained; they describe what the authorization covers (currency, action type, allowed recipients, target environment). Context content is never sent to the SP — only `context_hash` flows to the SP — so context constraints MUST be enforced by the Gatekeeper locally before requesting a receipt.

```json
{
  "contextSchema": {
    "keyOrder": ["currency", "action_type"],
    "fields": {
      "currency":    {
        "type": "string",
        "required": true,
        "constraint": { "type": "string", "enforceable": ["enum"] }
      },
      "action_type": {
        "type": "string",
        "required": true,
        "constraint": { "type": "string", "enforceable": ["enum"] }
      }
    }
  }
}
```

Some profiles have an empty context schema (e.g., `records` — whose bounds are all capability flags and a single cumulative count, with no operational scoping). When context is empty, `context_hash` is the sha256 of the empty canonical string and is still included in the attestation payload for structural uniformity.

**Normative rules:**

1. Context content MUST NOT be sent to the SP. Only `context_hash` flows to the SP.
2. Context MUST be deterministic and canonicalized identically across all implementations of the protocol version.
3. Context cannot be updated after attestation. Changing context invalidates `context_hash`, requiring re-attestation.
4. Empty context is valid. The hash is still computed and included in the attestation payload.
5. The Gatekeeper MUST locally enforce every profile-defined context constraint (enum, subset, pattern) against the execution values before requesting a receipt. Because the SP only holds `context_hash`, it cannot enforce these constraints — the Gatekeeper is the sole enforcer.

### Execution Context Schema (Cumulative Tracking)

The execution context schema declares fields that are resolved at execution time, typically used for cumulative limit tracking:

```json
{
  "executionContextSchema": {
    "fields": {
      "amount_daily": {
        "source": "cumulative",
        "cumulativeField": "amount",
        "window": "daily",
        "description": "Running daily spend total",
        "required": true,
        "constraint": { "type": "number", "enforceable": ["max"] }
      }
    }
  }
}
```

**Field sources:**

| Source | Meaning |
|--------|---------|
| `declared` | Value provided by the agent in the execution request |
| `cumulative` | Running total computed by the SP from receipt history within a time window |

Cumulative fields enable stateful limits — constraints that apply across multiple executions rather than per-call. A cumulative field definition specifies:

- `cumulativeField`: which declared field to aggregate (use `_count` for plain execution counting)
- `window`: time window for aggregation (`daily`, `weekly`, or `monthly`)

The corresponding bounds field uses the convention `{cumulative_field_name}_max` (e.g., `amount_daily_max`) to set the ceiling.

**Normative rules:**

1. Cumulative state is computed by the SP from receipt history. The SP is authoritative.
2. The gateway MAY cache consumption state from receipt responses for display, but the SP value is canonical.
3. Cumulative resolution is deterministic: given the same receipt history and current call values, the result is always the same.

### Enforcement Authority

Different constraint categories are enforced by different components. This table maps each constraint category to its enforcer.

| Constraint category | Enforced by | Notes |
|---|---|---|
| **Bounds** `per_transaction` (e.g., `amount_max`, `recipient_max`) | SP and Gatekeeper | The SP sees bounds in plaintext and enforces at receipt time; the Gatekeeper SHOULD also enforce locally as defense in depth and for early rejection. |
| **Bounds** `cumulative_sum` (e.g., `amount_daily_max`) | SP only | The Gatekeeper cannot compute cumulative state without receipt history. The SP is authoritative. |
| **Bounds** `cumulative_count` (e.g., `write_daily_max`) | SP only | Same reason. |
| **Bounds** `enum` (e.g., `read_access: "unlimited"`) | Gatekeeper (and SP at attest time) | The stored bound value is verified against the allowed set at attestation time. At execution time, the Gatekeeper or its tool-proxy checks the capability against the requested operation. |
| **Context** `enum` (e.g., `currency: "USD"`) | Gatekeeper only | The SP only holds `context_hash` and cannot read plaintext context values. The Gatekeeper MUST enforce context enum constraints locally before requesting a receipt. |
| **Context** `subset` (e.g., `allowed_recipients`) | Gatekeeper only | Same reason. |
| **TTL expiry** | SP and Gatekeeper | SP refuses to issue new receipts past expiry; Gatekeeper refuses to request one. |
| **Revocation** | SP only | The Gatekeeper has no revocation list. |

**Normative rules:**

1. Bounds enforcement dispatches on `boundType.kind` (see "The BoundType union" above). Implementations MUST NOT derive enforcement semantics from field name patterns.
2. Context constraints (`enum`, `subset`, `pattern`) MUST be enforced locally by the Gatekeeper. The SP cannot enforce them because it only holds `context_hash`.
3. A profile version is immutable. Changing any bound's `boundType` or any context field's constraint requires a new profile version.
4. Constraints are publicly inspectable — any party can read the profile and know exactly what is enforced and where.

### Required Gates

v0.4 profiles declare the universal set of required gates:

```json
{
  "requiredGates": ["bounds", "intent", "commitment", "decision_owner"]
}
```

All v0.4 profiles MUST require these four gates. The `intent` gate replaces the v0.3 trio of `problem`, `objective`, and `tradeoff`. Profiles MUST NOT define `gateQuestions` — the intent prompt is universal and lives in the gateway UI. Integration manifests MAY provide an optional `intentHint` for context-specific guidance.

### Profile-Defined TTL Policy

HAP Core does not fix attestation TTLs.

Each Profile MUST define:
- a default TTL
- a maximum TTL

```json
{ "ttl": { "default": 86400, "max": 604800 } }
```

Gatekeepers MUST enforce profile TTL limits. The user selects a specific TTL within the profile's allowed range at authorization time. This prevents approval automation driven by time pressure.

### Retention Policy

Each Profile MUST define a `retention_minimum` — the minimum duration for which attestations and receipts must be retained for audit purposes.

---

## Attestations: Cryptographic Proof of Authorization

An attestation is a time-limited, cryptographically signed proof that:

- A specific bounds set was committed to (`bounds_hash`)
- A specific operational context was committed to (`context_hash`)
- The execution context schema was resolved (`execution_context_hash`)
- Specific domains have explicit Decision Owners (`resolved_domains`)
- Intent was articulated and hashed (`gate_content_hashes.intent`)
- The human chose a specific commitment mode (`commitment_mode`)
- Approval occurred under a specific Profile

Attestations do not contain semantic content. `gate_content_hashes.intent` commits to the locally held intent statement. The hash supports tamper-evident auditability without exposing content.

### v0.4 Attestation Payload

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

**Required fields:**

| Field | Description |
|-------|-------------|
| `attestation_id` | UUID assigned by the SP at issuance |
| `version` | Protocol version: `"0.4"` |
| `profile_id` | The profile this authorization is bound to |
| `bounds_hash` | Hash of the canonical bounds string |
| `context_hash` | Hash of the canonical context string (sha256 of empty string when context is empty) |
| `execution_context_hash` | Hash of the resolved execution context |
| `resolved_domains` | One entry per domain this attestation covers |
| `gate_content_hashes` | At minimum: `{ "intent": "sha256:..." }` |
| `commitment_mode` | `"automatic"` or `"review"` |
| `issued_at` | SP-authoritative issue timestamp |
| `expires_at` | SP-authoritative expiry timestamp |

**Normative rules:**

1. The signed payload MUST include `commitment_mode`. A change of commitment mode requires a new attestation.
2. The signed payload MUST include both `bounds_hash` and `context_hash`. Even when context is empty, `context_hash` is the sha256 of the empty canonical string.
3. The SP signs the payload with its Ed25519 private key.
4. One attestation typically covers one domain (one person, one scope). Multi-domain decisions require multiple attestations from different owners.
5. The attestation MAY carry an optional `title` field as SP-side metadata — a human-readable label for display. The `title` field **MUST NOT** appear in the signed payload. Changing the title does not and cannot invalidate the attestation's signature.
6. `bounds.profile` MUST equal `payload.profile_id`. The SP MUST reject attestation requests where these disagree.

### Auditability Guarantee

Each domain owner can independently prove:

- "I attested to bounds X" → `bounds_hash` in attestation
- "I committed to context Y" → `context_hash` in attestation
- "I articulated intent Z" → `gate_content_hashes.intent` in attestation
- "I chose commitment mode M" → `commitment_mode` in attestation
- "For domain D" → `resolved_domains` in attestation

---

## Bounds Canonicalization

Bounds follow strict canonicalization rules to ensure deterministic hashing.

### Bounds Derivation

The bounds object contains exactly the keys defined in the profile's `boundsSchema.keyOrder`. The `profile` field is mandatory and identifies the profile version. There is no `path` field in v0.4.

**v0.4 Bounds structure (abstract):**

```
profile=<profile-id>
<profile-bounds-fields>=<values>
```

The bounds MUST be deterministically derivable from the human's authorization choices. If any bound value changes, `bounds_hash` changes.

### Canonicalization Rules

HAP Core requires:
- UTF-8 encoding
- newline-delimited `key=value` records
- keys sorted according to the profile's `boundsSchema.keyOrder`
- explicit inclusion of all required keys
- no whitespace normalization

**Key format:** Keys MUST match `[a-z0-9_]+`.

**Value encoding:**
- Values MUST NOT contain newline (`\n`) characters.
- If a value contains `=` or any non-printable ASCII, it MUST be percent-encoded (RFC 3986) before canonicalization.
- Profiles MAY further restrict allowed characters.

The canonical bounds string is hashed with sha256 to produce `bounds_hash` in the format `sha256:<64 hex chars>`.

### Context Canonicalization

Context follows the same canonicalization rules as bounds, applied to the profile's `contextSchema.keyOrder`.

For empty context (no `contextSchema` or `keyOrder` is empty), the canonical string is `""` (the empty string). Its sha256 hash is the well-known constant:

```
sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

The empty hash is **always included** in the attestation payload to keep attestation structure uniform across profiles with and without context.

### No Condition Fields

v0.4 does not include condition fields in bounds. Self-declared conditions are circular — the person who might want to skip oversight would decide whether oversight is required. Domain coverage is enforced by the SP based on group configuration, not by attestation-time conditions.

---

## Execution Receipts

> **No receipt, no execution.**

In v0.3, attestations proved authorization but nothing proved execution. The gateway's local execution log was unsigned and unverifiable. v0.4 closes this gap with **execution receipts** — SP-signed proof that a specific action occurred under a specific attestation, within declared bounds, at a specific time.

Every authorized action produces exactly one receipt. The receipt is the audit artifact for execution.

### The Service Provider as Notary

In v0.4, the SP is a **runtime dependency for execution**. Before any tool call proceeds, the Gatekeeper requests a receipt from the SP. The SP:

1. Validates the attestation is current (not expired, not revoked)
2. Checks the requested action against per-transaction bounds
3. Checks cumulative limits against the receipt history
4. If all checks pass: records the execution and returns a signed receipt
5. If any check fails: returns a structured error and the Gatekeeper blocks the action

This is a deliberate change from v0.3's stateless Gatekeeper model. The cost is a per-execution SP round-trip. The benefit is cryptographic proof of every action and the ability to revoke before TTL expires.

### Execution Flow

```
Agent -> Gatekeeper                           -> SP
         |                                       |
         +- verify attestation (local)           |
         +- verify bounds_hash (local)           |
         +- verify context_hash (local)          |
         |                                       |
         +- request execution receipt ----------> validate attestation
         |                                       check per-tx bounds
         |                                       check cumulative limits
         |                                       check revocation
         |                                       record execution
         |                                       sign receipt
         |                              <------- return receipt + consumption state
         |                                       |
         +- execute tool call                    |
         +- store receipt locally                (SP retains authoritative copy)
```

The Gatekeeper MUST obtain a receipt **before** executing the tool call. The receipt is a pre-execution proof of authorization — not a post-execution confirmation.

### Receipt Request Schema

The Gatekeeper sends the following to the SP when requesting an execution receipt:

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
| `boundsHash` | The `bounds_hash` from the attestation being exercised. This is the cryptographic content address of the authorization and is the **sole key** the SP uses to look up the attestation for this receipt request. |
| `profileId` | The profile this attestation is bound to |
| `action` | The downstream tool/action name (e.g., `create_payment_link`). Audit metadata only — MUST NOT be used for cumulative state partitioning. |
| `actionType` | The bounds-level action category (e.g., `charge`, `write`, `post`, `delete`). This field drives cumulative state partitioning and bounds dispatch. |
| `executionContext` | The specific values for this call, including the fields referenced by `boundType.of` for per-transaction and cumulative_sum bounds. |

**Normative rules on identifiers:**

1. The SP MUST use `boundsHash` as the sole lookup key for a receipt request. An `attestation_id` (UUID) is carried separately in the signed attestation payload for audit and display purposes but MUST NOT be accepted as a substitute for `boundsHash` in receipt requests.
2. `boundsHash` is the cryptographic content address of an authorization; changing any bound value produces a new `boundsHash` and therefore a new attestation. `attestation_id` is a stable opaque label that does not encode the attestation's contents.
3. `actionType` MUST be used for cumulative state partitioning and bounds dispatch. `action` is audit metadata and does not affect which bucket a receipt belongs to.

### Receipt Payload Schema

```json
{
  "id": "uuid",
  "groupId": "group-id-or-null",
  "userId": "user-id",
  "boundsHash": "sha256:...",
  "profileId": "charge@0.4",
  "action": "create_payment_link",
  "actionType": "charge",
  "executionContext": {
    "amount": 5,
    "currency": "EUR"
  },
  "cumulativeState": {
    "daily":   { "amount": 45,  "count": 8 },
    "monthly": { "amount": 320, "count": 47 }
  },
  "limits": { ... },
  "timestamp": 1735888050,
  "signature": "base64url..."
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique identifier for this receipt, generated by the SP |
| `groupId` | Group ID if group-managed, `null` for personal mode |
| `userId` | The user whose authorization this receipt was issued under. The SP derives this from the authenticated request context; it is not in the request body. |
| `boundsHash` | The attestation (by `bounds_hash`) this execution is authorized under |
| `profileId` | Profile governing this execution |
| `action` | The downstream tool/action name (mirrors the request; audit metadata only) |
| `actionType` | The bounds-level action category (mirrors the request; drives cumulative bucketing) |
| `executionContext` | The action values that were authorized |
| `cumulativeState` | Cumulative consumption state after this execution is applied |
| `limits` | The effective limits at the time of this receipt (for audit context) |
| `timestamp` | SP-authoritative timestamp |
| `signature` | Ed25519 signature of the canonical receipt payload |

**Signature:** The SP signs the receipt with the same Ed25519 key used for attestations. The signing input is the canonical JSON serialization of the receipt body (excluding the signature itself).

### Cumulative State

The `cumulativeState` object reports the running totals for the daily and monthly windows after this execution is applied. The shape is:

```json
{
  "daily":   { "amount": <number>, "count": <number> },
  "monthly": { "amount": <number>, "count": <number> }
}
```

The SP's cumulative state is authoritative. Implementations MAY cache it for display purposes, but the Gatekeeper MUST NOT trust locally cached values for enforcement — every execution request re-fetches cumulative state as part of the receipt issuance round-trip.

### Receipt Verification

Any party with the SP's public key can verify a receipt:

1. Resolve the SP's Ed25519 public key (via DID, DNS, API endpoint, or static config)
2. Canonicalize the receipt payload (deterministic JSON serialization, excluding signature)
3. Verify the signature against the canonical payload using the public key
4. Optionally: verify that `attestationHash` references a valid attestation (for full chain-of-trust audit)

A valid receipt proves: this SP authorized this specific execution, under this attestation, at this time, with these cumulative totals.

### Retention

The SP MUST retain all receipts for at least the profile-defined `retention_minimum`. Receipts MUST be:

- Append-only (no mutation or deletion within retention period)
- Queryable by `boundsHash` (return all receipts for an attestation)
- Queryable by time range
- Available for export in a standard format for external audit

The gateway SHOULD retain receipts locally for operational use, but the SP copy is authoritative.

**Receipts outlive attestations.** Receipts remain cryptographically valid and retrievable after their parent attestation has expired or been revoked. The attestation's TTL and revocation status affect only the SP's willingness to issue **new** receipts against that attestation — they do not affect previously-issued receipts. The receipt is a permanent record of what happened under a specific authorization at a specific time; expiring or revoking the authorization does not erase that history.

### Properties

- **Cryptographic proof per execution** — every authorized action has an SP-signed receipt
- **Cumulative enforcement at the SP** — the SP tracks usage against the human's declared bounds
- **Cumulative state moves to SP** — the Gatekeeper no longer needs a durable execution log for cumulative tracking
- **Full audit trail at the SP** — every receipt is stored, signed, and queryable
- **Third-party verifiable** — anyone with the SP's public key can verify any receipt
- **Pre-execution guarantee** — the receipt is issued before the tool call executes, not after

The SP is a runtime dependency for execution. This is by design — execution without proof is execution without accountability.

---

## Commitment Modes

v0.4 introduces two commitment modes that record how strictly the human delegates control to the agent. The choice is part of the signed attestation payload.

### Automatic Mode

```
commitment_mode: "automatic"
```

The agent acts within the human's bounds without per-action approval. Each tool call still produces a receipt — the SP enforces bounds and cumulative limits at receipt time. The human commits once (the attestation) and accepts that the agent will act inside those bounds for the TTL duration.

This is the right mode when:

- The bounds are conservative enough that the human is comfortable with any action within them
- The action is reversible or the consequences are bounded by the limits
- The volume of actions makes per-action review impractical

### Review Mode

```
commitment_mode: "review"
```

The agent proposes actions; the human reviews and approves each one before execution. When the agent calls a tool, the Gatekeeper does **not** request a receipt directly. Instead, it creates a proposal that surfaces in the human's review queue (in the gateway UI or via notification). When the human approves, the Gatekeeper requests the receipt and proceeds.

This is the right mode when:

- Individual actions have non-trivial consequences
- The human wants to inspect specific arguments before they take effect
- Bounds alone are not sufficient confidence

### Normative Rules

1. `commitment_mode` MUST be present in the signed attestation payload.
2. Changing the commitment mode requires a new attestation (the SP must re-sign).
3. In `review` mode, the Gatekeeper MUST NOT request a receipt before the human has explicitly approved the specific action.
4. In `automatic` mode, the Gatekeeper MUST request a receipt for every tool call before executing.
5. The SP MUST NOT issue a receipt for an action that has not been explicitly approved when the attestation is in `review` mode. Approval flows are SP-defined; the protocol requires only that approval precede receipt issuance.

---

## Identity & Authorization

### Principle

> Profiles define what bounds and context exist. The SP (per group) defines who must attest. The SP verifies identity and domain authority before signing.

The protocol separates three concerns:

| Concern | Defines | Example |
|---------|---------|---------|
| **Profile** | What bounds and context fields exist | `charge@0.4` defines `amount_max`, `currency`, `action_type` |
| **SP group config** | Who can attest for which profile | "For group acme, the `charge` profile requires the `finance` domain" |
| **Authorization mapping** | Who holds each domain | `did:key:alice` → `finance` |

Domain requirements are organizational policy, not protocol semantics. They live on the SP, configured per group.

### Authentication

Authentication is out of HAP Core scope. Implementations MUST establish identity through external mechanisms (e.g., OAuth, WebAuthn, hardware tokens, passkeys, API keys).

The protocol uses **Decentralized Identifiers (DIDs)** for platform-agnostic identity:

- `did:key:z6Mk...` — Ed25519 public key as DID
- `did:github:alice` — GitHub identity
- `did:email:dave@company.com` — Email-based identity

The verified DID is included in the attestation's `did` field. The SP MUST NOT issue attestations without verifying the attester's identity through a trusted authentication channel.

### SP Group Configuration

Domain requirements move from profiles to SP group configuration in v0.4:

```json
{
  "group": "acme-corp",
  "profileDomains": {
    "charge@0.4": ["finance"],
    "purchase@0.4": ["finance", "compliance"]
  }
}
```

The profile defines *what* fields exist. The group admin defines *who* must attest for each profile.

### Personal Mode vs Group Mode

**Personal mode** (no group):
- All profiles are available to the user
- No domain requirements — the single user attests directly
- The SP skips domain authority checks
- The attestation's `resolved_domains` records the user's self-claimed domain (default: `owner`)

**Group mode:**
- Only profiles with configured domain requirements are available
- The group admin must assign at least one domain to each profile they enable
- A profile with no domain configuration is not available to that group
- The SP validates domain authority: the attesting user must hold the required domain in the group

This separation means:
- **Profiles are universal** — the same profile works for a solo developer and a 500-person enterprise
- **Governance is organizational** — configured per group on the SP
- **Personal mode just works** — no groups, no domains, no configuration required

### Authorization Mapping (Group Mode)

Within a group, the SP holds the mapping of who can attest for which domain:

```json
{
  "group": "acme-corp",
  "domains": {
    "finance": ["did:key:alice", "did:key:bob"],
    "compliance": ["did:key:carol"]
  }
}
```

The profile defines WHAT bounds exist. The group config defines WHO can attest for each domain. These are separate concerns:

- Changing the profile (adding a bound) is a **protocol change**
- Changing the SP config (adding a person) is a **personnel change**

### Immutability Rule

> The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.

This is the key security property. Without it, an attester could add themselves to the authorized list and approve their own action in a single step.

### SP Authorization Responsibilities

Before signing an attestation, the SP MUST:

1. **Verify identity** — Validate the attester's authentication token. Resolve to a verified DID.
2. **Resolve required domains** — In group mode: look up `profileDomains` for the attesting user's group and the requested profile. In personal mode: skip.
3. **Check membership** — In group mode: verify that the authenticated DID holds the required domain in the group. In personal mode: skip.
4. **Reject or sign** — Only sign the attestation if all checks pass.

### Normative Rules

1. The SP MUST verify attester identity before signing an attestation.
2. In group mode, the SP MUST verify the attester is authorized for the claimed domain before signing.
3. The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.
4. Changes to the authorization source MUST be made by an authorized party and MUST be auditable.
5. The verified DID MUST be included in the attestation's `did` field.

---

## Revocation

v0.4 introduces revocation. With execution receipts flowing through the SP, revocation becomes possible: revoke the attestation, and the SP refuses to issue new receipts against it.

- The SP maintains a revocation list, persisted in durable storage.
- When the Gatekeeper requests a receipt, the SP checks if the attestation has been revoked.
- Revoked attestations cause the receipt request to fail with the `ATTESTATION_REVOKED` error code.
- The human can revoke through the SP interface at any time.
- Revocation MAY be initiated by the original attester or by a group admin.

The attestation itself remains cryptographically valid for audit purposes — its signature, hashes, and bindings are unchanged. Revocation only affects the SP's willingness to issue new receipts. v0.3 had no revocation mechanism: TTL expiry was the only stop.

**Normative rules:**

1. The SP MUST persist the revocation list in durable storage.
2. The SP MUST check revocation status before issuing any receipt.
3. Revoked attestations remain verifiable for audit purposes — the signature is still valid.
4. `/api/attestations/mine` and other listing endpoints MUST report revocation status.

---

## Human-Gated Actions

AI systems MUST NOT:

- Define bounds without human approval
- Create binding commitment without explicit human authorization
- Assign or expand decision ownership
- Widen authorized bounds beyond the attested values
- Override human intent at the level defined by the authorization
- Switch commitment mode (e.g., from review to automatic) without re-attestation

Within an authorized scope, AI systems MAY:

- Infer intermediate steps
- Generate tactical plans
- Choose among locally valid options
- Optimize execution inside the declared bounds

Actions require different state resolution based on risk:

| Action Type | Required States |
|:---|:---|
| Informational queries | Bounds + Intent |
| Planning & analysis | Bounds + Context + Intent |
| Execution | All authorization states + intent + valid receipt |
| Public/irreversible actions | All states + explicit reconfirmation (typically `review` mode) |

This enforces human leadership at the point of irreversibility while permitting useful autonomy within authorized bounds.

### The Decision Closure Loop

1. **State gap detected** — AI identifies missing or ambiguous decision state
2. **Targeted inquiry** — Request for specific state resolution
3. **Human resolves** — Human provides missing direction
4. **Closure evaluated** — System checks if all required states are resolved
5. **Execute or continue** — If closure achieved, AI proceeds (subject to receipt issuance); otherwise, loop continues

Order doesn't matter. Only closure matters.

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Decision Owner** | Human accountable for the action |
| **Local App** | Presents information to the human and collects approval (typically the gateway UI) |
| **Service Provider (SP)** | Issues signed attestations and receipts; tracks cumulative state; holds revocation list |
| **Executor** | Executes the action; untrusted |
| **Gatekeeper** | Enforces HAP validation before execution; runtime requester of receipts |

Executors are always treated as **fully untrusted**.

### Gatekeeper

The Gatekeeper is the verification obligation that every execution environment MUST satisfy before proceeding with an attested action. It is not a prescribed component or deployment topology — it is the guarantee that attestation verification has occurred and a valid receipt has been obtained.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — a `verify()` call in application code before execution proceeds
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint

All three are equally valid. The protocol makes no architectural preference. What matters is that:

1. The local verification steps execute completely
2. A valid execution receipt is obtained from the SP
3. Execution is blocked on a negative result from either step

A system that has attestations but skips verification or skips receipt issuance is in violation.

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

**Field-level constraints make bounds enforceable.** The profile defines what *kinds* of bounds can exist (constraint types). The human sets the *specific* bounds in the authorization. The Gatekeeper verifies attestation validity locally; the SP verifies that every execution falls within bounds and within cumulative limits.

For agent workflows, bounded execution alone is not always sufficient. v0.4 combines bounded authorization with the local intent payload to guide agent planning within those bounds. The agent sees: bounds (what it can do), intent (why and what to watch for), and live consumption state (how much has already been used).

### Agent Workflows in v0.4

HAP supports agent workflows through bounded execution + receipts:

| Component | Role |
|-----------|------|
| **Profile** | Defines constraint types — what kinds of bounds can exist |
| **Human** | Sets bound values, writes intent, chooses commitment mode, attests |
| **SP** | Signs the attestation; issues receipts at execution time; tracks cumulative state |
| **Agent** | Submits execution requests within bounds; sees consumption state via receipts |
| **Gatekeeper** | Verifies attestation validity AND obtains a valid receipt before execution |

**Example:**
```
Profile (charge@0.4) defines:
  amount_max: number, enforceable: [max]
  currency: string, enforceable: [enum]
  amount_daily_max: number, enforceable: [max]

Human attests:
  amount_max: 80
  currency: ["EUR"]
  amount_daily_max: 200
  intent: "Refund customers who report shipping damage. Don't refund anything over $80."
  commitment_mode: "automatic"
  -> bounds_hash + context_hash signed by finance domain owner

Agent executes within bounds:
  Request 1: amount: 5, currency: "EUR"   -> receipt issued, daily: 5
  Request 2: amount: 30, currency: "EUR"  -> receipt issued, daily: 35
  Request 3: amount: 120, currency: "EUR" -> BOUND_EXCEEDED (no receipt, no execution)
  Request 4: amount: 50, currency: "USD"  -> BOUND_EXCEEDED (no receipt, no execution)
  Request 5: amount: 50, currency: "EUR"  -> CUMULATIVE_LIMIT_EXCEEDED (would push daily to 235, exceeds 200)

Each successful request produces a signed receipt. Failed requests produce no receipt and no execution.
```

---

## Future Directions

Two v0.3 sections — **Output Provenance** and **Decision Streams** — are carried forward as optional future directions in v0.4 but have been moved out of this document. See `review.md` in this directory. A v0.4 implementation MAY implement them without losing conformance, and MAY skip them without losing conformance.

---

## Error Codes

### Attestation Errors

| Code | Description |
|------|-------------|
| `BOUNDS_HASH_MISMATCH` | Recomputed `bounds_hash` does not match attestation |
| `CONTEXT_HASH_MISMATCH` | Recomputed `context_hash` does not match attestation |
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `DOMAIN_NOT_COVERED` | Required domain has no valid attestation |
| `TTL_EXPIRED` | Attestation has exceeded its time-to-live |
| `PROFILE_NOT_FOUND` | Referenced profile could not be resolved |
| `SCOPE_INSUFFICIENT` | Attestation scope does not cover the required domain |
| `MALFORMED_ATTESTATION` | Attestation structure is invalid |
| `DOMAIN_SCOPE_MISMATCH` | Attestation domain doesn't match requirement |

### Receipt Errors

| Code | Meaning |
|------|---------|
| `ATTESTATION_NOT_FOUND` | Unknown `boundsHash` |
| `ATTESTATION_EXPIRED` | Attestation TTL has elapsed |
| `ATTESTATION_REVOKED` | Attestation has been revoked |
| `BOUND_EXCEEDED` | Per-transaction bound violated |
| `CUMULATIVE_LIMIT_EXCEEDED` | Cumulative limit would be exceeded |
| `PROFILE_NOT_FOUND` | Referenced profile unknown |
| `PROPOSAL_REQUIRED` | Attestation is in review mode and a matching proposalId was not supplied |
| `PROPOSAL_NOT_APPROVED` | Attestation is in review mode and the named proposal has not been committed yet |
| `PROPOSAL_REJECTED` | The named proposal was rejected |
| `PROPOSAL_MISMATCH` | The receipt request does not match the stored proposal (tool, args, or context differ) |
| `PROPOSAL_ALREADY_EXECUTED` | A receipt has already been issued for this proposal |

---

## Versioning Rules

- HAP Core versions (`0.x`) define protocol semantics.
- Profiles version independently.
- Once a profile version is published, it is immutable. Changes require a new profile version.
- Breaking changes MUST bump major protocol or profile versions.
- Gatekeepers and Service Providers MUST reject unknown or untrusted versions.

### Migration from v0.3

v0.4 is a clean break from v0.3. v0.4 implementations do not accept v0.3 attestation requests at runtime. Any v0.3 attestation data remaining in operator storage MUST be purged or re-attested under v0.4 before the v0.4 implementation begins serving requests. Historical v0.3 attestations MAY remain verifiable through a verification-only audit function in hap-core, but they cannot participate in any v0.4 execution flow — they cannot produce v0.4 receipts and the Gatekeeper MUST reject any execution attempt against them.

The clean break is deliberate. The v0.4 refactor (bounds/context split, `boundType` dispatch, `commitment_mode` in signed payload, receipt-required execution) is large enough that a dual-support mode would double the enforcement surface without benefiting any known client — there are no external v0.3 clients to preserve compatibility for.

---

## Summary

HAP v0.4 ensures automation serves human direction — not the reverse. Every authorized action carries cryptographic proof that a named human authorized a specific scope, with stated intent, within enforceable bounds. The signed attestation proves the commitment. The signed receipt proves the action.
