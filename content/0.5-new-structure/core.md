---
title: "HAP Core"
version: "Version 0.5"
date: "May 2026"
---

**HAP defines cryptographic pre-authorization of bounded execution — whether by AI agents, CI/CD pipelines, or automated systems.**

AI systems increasingly execute tasks, call tools, and trigger irreversible actions.
The central risk is not only misalignment, but execution without valid human authorization and direction drift inside authorized bounds.

HAP solves this by defining how humans cryptographically authorize consequential actions and how implementations preserve human-defined direction during execution. Every authorized action produces a signed **execution receipt** — cryptographic proof of who authorized it, when, and within which bounds.

**The receipt is pre-execution proof, not post-execution confirmation.** The Gatekeeper MUST obtain a receipt from the Authority Server *before* the tool call executes. If the AS refuses to issue a receipt — or is unreachable — the action MUST NOT proceed. This makes the AS a runtime dependency by design: execution without proof is execution without accountability.

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
- At a specific time (AS timestamp)
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

- **Bounds** — enforceable constraints. These are sent to the Authority Server in plaintext so the AS can verify per-transaction limits and track cumulative consumption against the human's declared ceilings. Bounds are typically abstract (numeric ceilings, enum allowlists, time windows) and contain no operational secrets.
- **Context** — operational details that scope the authorization but require no AS enforcement. Context stays local. The AS only ever sees `context_hash`. Examples: deployment targets, customer segments, data subjects.

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

HAP MAY transmit cryptographic commitments (e.g., hashes), structural metadata, and signatures, but MUST NOT transmit semantic evidence to Authority Servers or Executors.

The bounds/context split is the structural mechanism that enforces this invariant: bounds (abstract limits) flow to the AS; context (operational details) stays local. The AS only sees `context_hash`, never the context content.

Any disclosure of semantic content MUST be an explicit, human-initiated action outside the protocol. The protocol makes authorship verifiable without exposing content.

---

## Threat Model

Implementations MUST assume:

- compromised Local App (blind-signing risk),
- malicious or buggy Executor,
- malicious or negligent Authority Server,
- profile and supply-chain attacks.

HAP does **not** assume trusted UIs, trusted executors, or honest automation.

---

## Decision States

HAP distinguishes between two categories of decision state: **Authorization State** and **Direction State**. They are not exposed or enforced in the same way.

Authorization determines whether execution may occur. Direction determines how an agent should act within authorized bounds.

### Authorization States

**Bounds — What is authorized?**

The enforceable constraints on action — per-transaction ceilings, cumulative limits, allowed enums. Bounds are profile-defined and human-set. They are sent to the AS in plaintext and hashed into `bounds_hash`.

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

Direction State may contain semantic content. It is local by default, may be encrypted by the implementation, and MUST NOT be transmitted to Authority Servers, Gatekeepers, or Executors as semantic plaintext. The protocol attests to a cryptographic commitment to Direction State (via `gate_content_hashes.intent`), but does not require its disclosure.

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

- `domain` — The organizational domain of authority (e.g., `finance`, `engineering`, `compliance`). Defined by the AS per group.
- `did` — The Decision Owner's decentralized identifier.

In v0.4, **domain requirements are organizational policy, not protocol semantics.** Profiles define what authority categories exist; the AS (per group) defines who must attest for each profile. See "Identity & Authorization" below.

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

The Intent gate's content may guide local agent reasoning but is not transmitted semantically outside local custody. Only `gate_content_hashes.intent` flows to the AS.

Gate resolution is attested by the Authority Server based on signals from the Local App. Profiles define which gates are required.

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

The URL-shaped form (e.g., `github.com/humanagencyprotocol/hap-profiles/charge@0.5`) is recommended for human readability and for one-time bootstrap fetching. The protocol does not require that the identifier resolve to a network location at runtime, and operators MUST NOT depend on runtime resolution for correctness. See `governance.md` § "Trust on First Use" for the operational rule.

### Universal Profiles

In v0.4, profiles are universal: the same `charge@0.4` profile works for a solo developer in personal mode and a 500-person enterprise in group mode. Organizational policy (who must attest) is configured on the AS, not in the profile.

### Bounds Schema

The bounds schema defines the enforceable parameters. Every bounds field declares a `boundType` — a discriminated union describing exactly how the bound is enforced. The `boundType` is the single source of truth for enforcement dispatch; implementations MUST NOT infer enforcement semantics from field name patterns.

The bounds schema also declares the **actionTypes registry** — the closed set of `actionType` values that are valid for this profile at receipt time. This makes "which actions are accepted under this profile" a first-class, statically inspectable property; without it the AS cannot validate that an incoming `actionType` is even legal.

```json
{
  "boundsSchema": {
    "actionTypes": ["charge", "refund", "subscribe"],
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

Note that `currency` and `action_type` are **not** in the bounds schema. They are operational scoping fields and live in the **context schema** (see below). The AS only enforces bounds; enum scoping of context values is enforced locally by the Gatekeeper.

`actionType` registry — normative rules:

1. Every v0.5 profile's `boundsSchema` MUST include a non-empty `actionTypes: string[]`.
2. Every receipt request's `actionType` MUST be a member of the profile's `actionTypes`. The AS MUST reject any other value with `INVALID_ACTION_TYPE` before reading bounds.
3. The Gatekeeper MUST validate `actionType` locally against the same list before requesting a receipt.
4. Adding a new `actionType` to a profile is a breaking change requiring a new profile version, because executors that were authorized under the prior version did not consent to the broader set.

#### The BoundType union

Every v0.5 bounds field MUST declare a `boundType`. Four kinds are defined:

```
BoundType =
  | { kind: "per_transaction";  of: string }
  | { kind: "cumulative_sum";   of: string;  window: "daily" | "weekly" | "monthly" }
  | { kind: "cumulative_count"; window: "daily" | "weekly" | "monthly" }
  | { kind: "enum";             values: string[] }
```

| Kind | How it is enforced | Examples |
|------|-------------------|----------|
| `per_transaction` | The AS (and Gatekeeper) check that `execution[boundType.of] <= boundValue` for the current call. No cumulative state. | `amount_max`, `recipient_max`, `booking_duration_max` |
| `cumulative_sum` | The AS maintains a running sum of `execution[boundType.of]` across prior receipts in the window; the current call is approved iff `running_sum + execution[of] <= boundValue`. | `amount_daily_max`, `spend_monthly_max` |
| `cumulative_count` | The AS counts qualifying receipts in the window; the current call is approved iff `running_count + 1 <= boundValue`. No execution context field is read. | `write_daily_max`, `post_monthly_max`, `booking_daily_max` |
| `enum` | The stored bound value MUST be in the allowed set. This is a capability flag — not an enforced limit on the execution value, but a capability check at attestation time and at tool-proxy time. | `read_access`, `delete_access`, `archive_access` |

**Normative rules:**

1. Every bounds schema MUST include a `profile` field as the first key.
2. Every bounds field (excluding the metadata `profile` field) MUST declare a `boundType`. Implementations MUST fail closed on any bounds field that omits `boundType`.
3. Enforcement implementations MUST dispatch on `boundType.kind` and MUST NOT infer enforcement semantics from field name patterns. This forbids regex/suffix matching on field names (e.g., stripping `_daily_max` to derive an `actionType`, appending `_max` to derive a bounds field, or inspecting field name prefixes to skip enforcement). Two `cumulative_count` bounds in the same profile are partitioned by `actionType` only — never by field-name correlation.
4. The human sets specific values in the authorization at attestation time. The profile defines what *can* be constrained, not the values.
5. Profile authors MUST NOT include operational details (target_env, customer_segment, branch, currency, action_type) in the bounds schema. Operational scoping fields belong in the context schema.
6. Bounds fields MUST NOT declare `path`, `paths`, or any other action-routing array. v0.4 retired execution paths; v0.5 forbids any reintroduction. Routing tool calls to specific bounds is the job of `actionType` and the tool-gating manifest.

### Context Schema

The context schema defines operational scoping fields that stay local. Context fields are enum-constrained or subset-constrained; they describe what the authorization covers (currency, action type, allowed recipients, target environment). Context content is never sent to the AS — only `context_hash` flows to the AS — so context constraints MUST be enforced by the Gatekeeper locally before requesting a receipt.

```json
{
  "contextSchema": {
    "keyOrder": ["currency", "action_type"],
    "fields": {
      "currency":    {
        "type": "string",
        "required": true,
        "constraint": {
          "type": "string",
          "enforceable": ["enum"],
          "values": ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]
        }
      },
      "action_type": {
        "type": "string",
        "required": true,
        "constraint": {
          "type": "string",
          "enforceable": ["enum"],
          "values": ["charge", "refund", "subscribe"]
        }
      }
    }
  }
}
```

Some profiles have an empty context schema (e.g., `records` — whose bounds are all capability flags and a single cumulative count, with no operational scoping). The `context_hash` is **always** computed and included in the attestation payload, regardless of whether the schema is empty. When context is empty, the canonical string is `""` and `context_hash` is the well-known sha256 of the empty string. Implementations MUST NOT omit `context_hash` from the attestation payload — a missing `context_hash` is a malformed attestation, not "no context."

Allowed values for an `enum` or `subset` context field live in `constraint.values: string[]`. v0.4 permitted a top-level `field.enum: string[]` as an alternative location; v0.5 retires it for consistency with `boundType: { kind: 'enum', values: [...] }` on the bounds side. Profile authors MUST place allowed values in `constraint.values`. Implementations MUST read from `constraint.values` and MUST NOT fall back to `field.enum`.

**Normative rules:**

1. Context content MUST NOT be sent to the AS. Only `context_hash` flows to the AS.
2. Context MUST be deterministic and canonicalized identically across all implementations of the protocol version.
3. Context cannot be updated after attestation. Changing context invalidates `context_hash`, requiring re-attestation.
4. Empty context is valid. The hash is still computed and included in the attestation payload.
5. The Gatekeeper MUST locally enforce every profile-defined context constraint (enum, subset, pattern) against the execution values before requesting a receipt. Because the AS only holds `context_hash`, it cannot enforce these constraints — the Gatekeeper is the sole enforcer.

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
| `cumulative` | Running total computed by the AS from receipt history within a time window |

Cumulative fields enable stateful limits — constraints that apply across multiple executions rather than per-call. A cumulative field definition specifies:

- `cumulativeField`: which declared field to aggregate (use `_count` for plain execution counting)
- `window`: time window for aggregation (`daily`, `weekly`, or `monthly`)

The corresponding bounds field uses the convention `{cumulative_field_name}_max` (e.g., `amount_daily_max`) to set the ceiling. This naming convention is for human readability only — implementations MUST NOT derive enforcement semantics from this convention. The pairing is established by the bound's `boundType.window` and `boundType.of` fields, not by string manipulation of field names.

Window semantics are fixed by the protocol so that independent ASes computing against the same receipt history produce identical results:

- `daily` and `weekly` are **rolling** windows — the trailing 24 hours and the trailing 7 days (168 hours) measured back from the current instant. A rolling window has no reset boundary, so cumulative consumption can never exceed the bound within *any* such span. This closes the boundary cliff a fixed calendar bucket would allow (spending a full daily budget at 23:59 and again at 00:01), and it requires **no timezone and no week-start configuration** — "the last 24 hours" and "the last 7 days" are unambiguous everywhere.
- `monthly` is a **calendar month**, anchored to the 1st of the month at 00:00 **UTC**. Businesses budget and reconcile on the calendar month, so this window is calendar-aligned rather than rolling; the rolling `daily`/`weekly` windows already bound any burst across a month boundary. The UTC anchor is fixed by the protocol — there is no per-authorization timezone setting.

**Normative rules:**

1. Cumulative state is computed by the AS from receipt history. The AS is authoritative. It MUST NOT be derived from a destructive running counter, so that it is always recomputable and auditable from the retained receipts.
2. The gateway MAY cache consumption state from receipt responses for display, but the AS value is canonical.
3. Cumulative resolution is deterministic: given the same receipt history and the same window definitions above, every AS yields the same totals.
4. A bound's window is one of `daily`, `weekly`, or `monthly` with the semantics defined above. Consumption is partitioned by `actionType`; a receipt contributes to a window only for its own `actionType`.
5. **Exactly-once.** One logical execution consumes bounded authority exactly once. A retried receipt request — for any reason (lost response, network retry, agent re-run) — MUST NOT increment cumulative state or create a second receipt for the same logical execution. On the synchronous path (`automatic` mode) this is enforced by a required `idempotencyKey` (see *Receipt Issuance* in the Authority Server spec); on the review path it is enforced by the proposal's `committed → executed` transition. The two paths give the same guarantee.

### Enforcement Authority

Different constraint categories are enforced by different components. This table maps each constraint category to its enforcer.

| Constraint category | Enforced by | Notes |
|---|---|---|
| **Bounds** `per_transaction` (e.g., `amount_max`, `recipient_max`) | AS and Gatekeeper | The AS sees bounds in plaintext and enforces at receipt time; the Gatekeeper SHOULD also enforce locally as defense in depth and for early rejection. |
| **Bounds** `cumulative_sum` (e.g., `amount_daily_max`) | AS only | The Gatekeeper cannot compute cumulative state without receipt history. The AS is authoritative. |
| **Bounds** `cumulative_count` (e.g., `write_daily_max`) | AS only | Same reason. |
| **Bounds** `enum` (e.g., `read_access: "unlimited"`) | Gatekeeper (and AS at attest time) | The stored bound value is verified against the allowed set at attestation time. At execution time, the Gatekeeper or its tool-proxy checks the capability against the requested operation. |
| **Context** `enum` (e.g., `currency: "USD"`) | Gatekeeper only | The AS only holds `context_hash` and cannot read plaintext context values. The Gatekeeper MUST enforce context enum constraints locally before requesting a receipt. |
| **Context** `subset` (e.g., `allowed_recipients`) | Gatekeeper only | Same reason. |
| **TTL expiry** | AS and Gatekeeper | AS refuses to issue new receipts past expiry; Gatekeeper refuses to request one. |
| **Revocation** | AS only | The Gatekeeper has no revocation list. |

**Normative rules:**

1. Bounds enforcement dispatches on `boundType.kind` (see "The BoundType union" above). Implementations MUST NOT derive enforcement semantics from field name patterns.
2. Context constraints (`enum`, `subset`, `pattern`) MUST be enforced locally by the Gatekeeper. The AS cannot enforce them because it only holds `context_hash`.
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

### Attestation Payload (v0.5)

```json
{
  "header": { "typ": "HAP-attestation", "alg": "EdDSA" },
  "payload": {
    "attestation_id": "uuid",
    "version": "0.5",
    "profile_id": "charge@0.5",
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
| `attestation_id` | UUID assigned by the AS at issuance |
| `version` | Protocol version: `"0.5"` |
| `profile_id` | The profile this authorization is bound to |
| `bounds_hash` | Hash of the canonical bounds string |
| `context_hash` | Hash of the canonical context string (sha256 of empty string when context is empty) |
| `execution_context_hash` | Hash of the resolved execution context |
| `resolved_domains` | One entry per domain this attestation covers |
| `gate_content_hashes` | At minimum: `{ "intent": "sha256:..." }` |
| `commitment_mode` | `"automatic"`, `"review"`, or `"review_above_cap"` |
| `issued_at` | AS-authoritative issue timestamp |
| `expires_at` | AS-authoritative expiry timestamp |

**Conditional fields:**

| Field | When required | Description |
|-------|---|---|
| `above_cap_caps` | `commitment_mode === "review_above_cap"` | Map of bounds field name → numeric cap. Receipt requests exceeding any cap return `APPROVAL_REQUIRED`. |
| `above_cap_approvers` | `commitment_mode === "review_above_cap"` | List of DIDs that must approve a proposal raised by a cap exceedance. |

**Normative rules:**

1. The signed payload MUST include `commitment_mode`. A change of commitment mode requires a new attestation.
2. The signed payload MUST include both `bounds_hash` and `context_hash`. Even when context is empty, `context_hash` is the sha256 of the empty canonical string.
3. The AS signs the payload with its Ed25519 private key. Signatures MUST be encoded as **base64url** without padding when serialized to the attestation envelope. Implementations MUST NOT use standard base64 (which differs in `+`/`/` vs `-`/`_` and in padding) — third-party verifiers reading the spec literally will reject standard-base64 signatures.
4. One attestation typically covers one domain (one person, one scope). Multi-domain decisions require multiple attestations from different owners.
5. The attestation MAY carry an optional `title` field as AS-side metadata — a human-readable label for display. The `title` field **MUST NOT** appear in the signed payload. Changing the title does not and cannot invalidate the attestation's signature.
6. `bounds.profile` MUST equal `payload.profile_id`. The AS MUST reject attestation requests where these disagree.

### Signing Canonicalization

Both attestation signing and receipt signing rely on a deterministic JSON serialization of the payload. v0.4 left this implicit ("canonical JSON serialization"); v0.5 makes it explicit so two independent ASes (or an AS and an external verifier) cannot disagree about which bytes were signed.

**Signing canonicalization (normative):**

1. UTF-8 encoding.
2. Object keys sorted lexicographically by Unicode code point (ascending).
3. No insignificant whitespace — no spaces between tokens, no trailing whitespace, no leading or trailing newline.
4. Numbers serialized as the shortest round-trippable form (the same value that JSON.parse → JSON.stringify would produce after the sort step). Integer values MUST be written without a decimal point; floats MUST use the shortest representation that round-trips.
5. Strings escaped per RFC 8259 (`\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX` for control chars). Non-ASCII Unicode characters MUST be passed through as UTF-8 bytes (no `\u` escaping required).
6. Arrays preserve element order as given.
7. The signature field itself MUST NOT be present in the bytes being signed.

This is compatible with RFC 8785 (JSON Canonicalization Scheme) and implementations MAY use a JCS library directly.

Implementations MUST publish at least one **signing test vector** in their conformance suite — a (payload, canonical bytes, signature) triple — so other implementations can verify their canonicalization matches.

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

**Value encoding (normative, v0.5):**
- Values MUST NOT contain raw newline (`\n`) or carriage-return (`\r`) characters. Implementations MUST reject input containing them; silent stripping or normalization is a violation because it produces a hash that does not faithfully represent the input.
- If a value contains `=`, `\n`, `\r`, `%`, or any byte outside the printable ASCII range (0x20–0x7E), it MUST be percent-encoded (RFC 3986) before canonicalization. The `%` byte is included to keep encoding self-inverse.
- Implementations MUST percent-encode at canonicalization time, not at value entry time, so the stored input remains the human's original bytes.
- Profiles MAY further restrict allowed characters via `constraint.pattern`. Pattern violations MUST surface as `BOUNDS_INVALID_VALUE` (or `CONTEXT_INVALID_VALUE` for context fields), distinct from a hash mismatch.

The canonical bounds string is hashed with sha256 to produce `bounds_hash` in the format `sha256:<64 hex chars>`.

### Context Canonicalization

Context follows the same canonicalization rules as bounds, applied to the profile's `contextSchema.keyOrder`.

For empty context (no `contextSchema` or `keyOrder` is empty), the canonical string is `""` (the empty string). Its sha256 hash is the well-known constant:

```
sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

The empty hash is **always included** in the attestation payload to keep attestation structure uniform across profiles with and without context.

### No Condition Fields

v0.4 does not include condition fields in bounds. Self-declared conditions are circular — the person who might want to skip oversight would decide whether oversight is required. Domain coverage is enforced by the AS based on group configuration, not by attestation-time conditions.

---

## Execution Receipts

> **No receipt, no execution.**

In v0.3, attestations proved authorization but nothing proved execution. The gateway's local execution log was unsigned and unverifiable. v0.4 closes this gap with **execution receipts** — AS-signed proof that a specific action occurred under a specific attestation, within declared bounds, at a specific time.

Every authorized action produces exactly one receipt. The receipt is the audit artifact for execution.

### The Authority Server as Notary

In v0.4, the AS is a **runtime dependency for execution**. Before any tool call proceeds, the Gatekeeper requests a receipt from the AS. The AS:

1. Validates the attestation is current (not expired, not revoked)
2. Checks the requested action against per-transaction bounds
3. Checks cumulative limits against the receipt history
4. If all checks pass: records the execution and returns a signed receipt
5. If any check fails: returns a structured error and the Gatekeeper blocks the action

This is a deliberate change from v0.3's stateless Gatekeeper model. The cost is a per-execution AS round-trip. The benefit is cryptographic proof of every action and the ability to revoke before TTL expires.

### Execution Flow

```
Agent -> Gatekeeper                           -> AS
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
         +- store receipt locally                (AS retains authoritative copy)
```

The Gatekeeper MUST obtain a receipt **before** executing the tool call. The receipt is a pre-execution proof of authorization — not a post-execution confirmation.

### Receipt Request Schema

The Gatekeeper sends the following to the AS when requesting an execution receipt:

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
| `boundsHash` | The `bounds_hash` from the attestation being exercised. This is the cryptographic content address of the authorization and is the **sole key** the AS uses to look up the attestation for this receipt request. |
| `profileId` | The profile this attestation is bound to |
| `action` | The downstream tool/action name (e.g., `create_payment_link`). Audit metadata only — MUST NOT be used for cumulative state partitioning. |
| `actionType` | The bounds-level action category (e.g., `charge`, `write`, `post`, `delete`). This field drives cumulative state partitioning and bounds dispatch. |
| `executionContext` | The specific values for this call, including the fields referenced by `boundType.of` for per-transaction and cumulative_sum bounds. |

**Normative rules on identifiers:**

1. The AS MUST use `boundsHash` as the sole lookup key for a receipt request. An `attestation_id` (UUID) is carried separately in the signed attestation payload for audit and display purposes but MUST NOT be accepted as a substitute for `boundsHash` in receipt requests.
2. `boundsHash` is the cryptographic content address of an authorization; changing any bound value produces a new `boundsHash` and therefore a new attestation. `attestation_id` is a stable opaque label that does not encode the attestation's contents.
3. `actionType` MUST be used for cumulative state partitioning and bounds dispatch. `action` is audit metadata and does not affect which bucket a receipt belongs to.
4. `actionType` MUST be a member of the profile's `boundsSchema.actionTypes` registry. The AS MUST reject other values with `INVALID_ACTION_TYPE`.
5. The receipt request body MUST NOT include a `path` field. v0.5 ASes MUST reject requests carrying it. (v0.4 retired `path` from bounds; v0.5 finishes the removal across all wire formats.)
6. AS storage keys MAY combine `boundsHash` with the attester's identity (e.g., `${boundsHash}:${userId}`) to disambiguate two members of the same group attesting to identical bounds. This is an AS implementation detail and does not affect the wire contract: receipt requests still use `boundsHash` plus the AS's authenticated request context.

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
| `id` | Unique identifier for this receipt, generated by the AS |
| `groupId` | Group ID if group-managed, `null` for personal mode |
| `userId` | The user whose authorization this receipt was issued under. The AS derives this from the authenticated request context; it is not in the request body. |
| `boundsHash` | The attestation (by `bounds_hash`) this execution is authorized under |
| `profileId` | Profile governing this execution |
| `action` | The downstream tool/action name (mirrors the request; audit metadata only) |
| `actionType` | The bounds-level action category (mirrors the request; drives cumulative bucketing) |
| `executionContext` | The action values that were authorized |
| `cumulativeState` | Cumulative consumption state after this execution is applied |
| `limits` | The effective limits at the time of this receipt (for audit context) |
| `timestamp` | AS-authoritative timestamp |
| `signature` | Ed25519 signature of the canonical receipt payload, encoded as base64url without padding |

**Signature:** The AS signs the receipt with the same Ed25519 key used for attestations. The signing input is produced by the **Signing Canonicalization** rules above (sorted keys, no whitespace, base64url-encoded signature). The receipt's own `signature` field MUST NOT be present in the bytes being signed.

**Receipt payload — normative rules:**

1. The persisted receipt MUST contain `actionType`. v0.4 implementations that omitted it MUST be migrated.
2. The receipt MUST NOT contain a `path` field. Persisted v0.4 receipts that included `path` MAY remain unchanged for audit, but new receipts MUST NOT include it.
3. `groupId` is `null` only when the AS runs in true personal mode (no group construct at all). AS implementations MAY model personal mode as a "group of one" with a synthesized group ID; in that case `groupId` is non-null and reflects the synthesized identifier.

### Cumulative State

The `cumulativeState` object reports the running totals for the daily and monthly windows after this execution is applied. The shape is:

```json
{
  "daily":   { "amount": <number>, "count": <number> },
  "monthly": { "amount": <number>, "count": <number> }
}
```

The AS's cumulative state is authoritative. Implementations MAY cache it for display purposes, but the Gatekeeper MUST NOT trust locally cached values for enforcement — every execution request re-fetches cumulative state as part of the receipt issuance round-trip.

### Receipt Verification

Any party with the AS's public key can verify a receipt:

1. Resolve the AS's Ed25519 public key (via DID, DNS, API endpoint, or static config)
2. Canonicalize the receipt payload (deterministic JSON serialization, excluding signature)
3. Verify the signature against the canonical payload using the public key
4. Optionally: verify that `attestationHash` references a valid attestation (for full chain-of-trust audit)

A valid receipt proves: this AS authorized this specific execution, under this attestation, at this time, with these cumulative totals.

### Retention

The AS MUST retain all receipts for at least the profile-defined `retention_minimum`. Receipts MUST be:

- Append-only (no mutation or deletion within retention period)
- Queryable by `boundsHash` (return all receipts for an attestation)
- Queryable by time range
- Available for export in a standard format for external audit

The gateway SHOULD retain receipts locally for operational use, but the AS copy is authoritative.

**Receipts outlive attestations.** Receipts remain cryptographically valid and retrievable after their parent attestation has expired or been revoked. The attestation's TTL and revocation status affect only the AS's willingness to issue **new** receipts against that attestation — they do not affect previously-issued receipts. The receipt is a permanent record of what happened under a specific authorization at a specific time; expiring or revoking the authorization does not erase that history.

### Properties

- **Cryptographic proof per execution** — every authorized action has an AS-signed receipt
- **Cumulative enforcement at the AS** — the AS tracks usage against the human's declared bounds
- **Cumulative state moves to AS** — the Gatekeeper no longer needs a durable execution log for cumulative tracking
- **Full audit trail at the AS** — every receipt is stored, signed, and queryable
- **Third-party verifiable** — anyone with the AS's public key can verify any receipt
- **Pre-execution guarantee** — the receipt is issued before the tool call executes, not after

The AS is a runtime dependency for execution. This is by design — execution without proof is execution without accountability.

---

## Commitment Modes

v0.4 introduced two commitment modes; v0.5 adds a third. The choice is part of the signed attestation payload.

### Automatic Mode

```
commitment_mode: "automatic"
```

The agent acts within the human's bounds without per-action approval. Each tool call still produces a receipt — the AS enforces bounds and cumulative limits at receipt time. The human commits once (the attestation) and accepts that the agent will act inside those bounds for the TTL duration. Because the receipt is issued synchronously with no proposal, every automatic-mode receipt request MUST carry an `idempotencyKey` (Cumulative Tracking rule 5) so a retried call is counted exactly once.

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

### Review-Above-Cap Mode (new in v0.5)

```
commitment_mode: "review_above_cap"
```

The agent acts automatically while every per-transaction value stays within the **group cap** for the relevant bound; the moment any value would exceed a group cap, the AS refuses to issue a receipt and instead returns an `APPROVAL_REQUIRED` error carrying the list of approvers the group has configured. The Gatekeeper then converts the call into a proposal addressed to those approvers and waits.

The cap set is profile-and-group-specific. A group admin configures, per profile, a `caps` map (e.g., `{ amount_max: 1000 }`) and a list of approver DIDs. v0.5 lifts this from an AS-internal convention (existing in the v0.4 reference implementation as `aboveCap`) into a signed protocol mode so a third-party Gatekeeper can know in advance whether a tool call may produce a synchronous receipt or a proposal.

This is the right mode when:

- The team wants delegation up to a known threshold
- Above the threshold, multi-party human review is required
- The threshold is a property of the group, not the individual authorization

```json
{
  "commitment_mode": "review_above_cap",
  "above_cap_caps": { "amount_max": 1000 },
  "above_cap_approvers": ["did:key:...", "did:key:..."]
}
```

`above_cap_caps` and `above_cap_approvers` are part of the signed attestation payload. Changing either requires a new attestation. A receipt request that exceeds any cap MUST be rejected with `APPROVAL_REQUIRED`; the AS MUST NOT silently downgrade to `BOUND_EXCEEDED`.

### Normative Rules

1. `commitment_mode` MUST be present in the signed attestation payload.
2. Changing the commitment mode requires a new attestation (the AS must re-sign).
3. In `review` mode, the Gatekeeper MUST NOT request a receipt before the human has explicitly approved the specific action.
4. In `automatic` mode, the Gatekeeper MUST request a receipt for every tool call before executing.
5. The AS MUST NOT issue a receipt for an action that has not been explicitly approved when the attestation is in `review` mode. Approval flows are AS-defined; the protocol requires only that approval precede receipt issuance.
6. In `review_above_cap` mode, the Gatekeeper MUST request a receipt synchronously for every call. If the AS returns `APPROVAL_REQUIRED`, the Gatekeeper MUST submit a proposal targeting the approvers named in the AS response (or, defensively, the `above_cap_approvers` from the signed attestation). On approval, the receipt request is replayed with the resulting `proposalId`.
7. `above_cap_caps` keys MUST reference fields declared in the profile's `boundsSchema`. The AS MUST reject attestations where they do not.

---

## Identity & Authorization

### Principle

> Profiles define what bounds and context exist. The AS (per group) defines who must attest. The AS verifies identity and domain authority before signing.

The protocol separates three concerns:

| Concern | Defines | Example |
|---------|---------|---------|
| **Profile** | What bounds and context fields exist | `charge@0.4` defines `amount_max`, `currency`, `action_type` |
| **AS group config** | Who can attest for which profile | "For group acme, the `charge` profile requires the `finance` domain" |
| **Authorization mapping** | Who holds each domain | `did:key:alice` → `finance` |

Domain requirements are organizational policy, not protocol semantics. They live on the AS, configured per group.

### Authentication

Authentication is out of HAP Core scope. Implementations MUST establish identity through external mechanisms (e.g., OAuth, WebAuthn, hardware tokens, passkeys, API keys).

The protocol uses **Decentralized Identifiers (DIDs)** for platform-agnostic identity:

- `did:key:z6Mk...` — Ed25519 public key as DID
- `did:github:alice` — GitHub identity
- `did:email:dave@company.com` — Email-based identity

The verified DID is included in the attestation's `did` field. The AS MUST NOT issue attestations without verifying the attester's identity through a trusted authentication channel.

### AS Group Configuration

Domain requirements move from profiles to AS group configuration in v0.4:

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
- The AS skips domain authority checks
- The attestation's `resolved_domains` records the user's self-claimed domain (default: `owner`)

**Group mode:**
- Only profiles with configured domain requirements are available
- The group admin must assign at least one domain to each profile they enable
- A profile with no domain configuration is not available to that group
- The AS validates domain authority: the attesting user must hold the required domain in the group

This separation means:
- **Profiles are universal** — the same profile works for a solo developer and a 500-person enterprise
- **Governance is organizational** — configured per group on the AS
- **Personal mode just works** — no groups, no domains, no configuration required

### Authorization Mapping (Group Mode)

Within a group, the AS holds the mapping of who can attest for which domain:

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
- Changing the AS config (adding a person) is a **personnel change**

### Immutability Rule

> The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.

This is the key security property. Without it, an attester could add themselves to the authorized list and approve their own action in a single step.

### AS Authorization Responsibilities

Before signing an attestation, the AS MUST:

1. **Verify identity** — Validate the attester's authentication token. Resolve to a verified DID.
2. **Resolve required domains** — In group mode: look up `profileDomains` for the attesting user's group and the requested profile. In personal mode: skip.
3. **Check membership** — In group mode: verify that the authenticated DID holds the required domain in the group. In personal mode: skip.
4. **Reject or sign** — Only sign the attestation if all checks pass.

### Normative Rules

1. The AS MUST verify attester identity before signing an attestation.
2. In group mode, the AS MUST verify the attester is authorized for the claimed domain before signing.
3. The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.
4. Changes to the authorization source MUST be made by an authorized party and MUST be auditable.
5. The verified DID MUST be included in the attestation's `did` field.

---

## Revocation

v0.4 introduces revocation. With execution receipts flowing through the AS, revocation becomes possible: revoke the attestation, and the AS refuses to issue new receipts against it.

- The AS maintains a revocation list, persisted in durable storage.
- When the Gatekeeper requests a receipt, the AS checks if the attestation has been revoked.
- Revoked attestations cause the receipt request to fail with the `ATTESTATION_REVOKED` error code.
- The human can revoke through the AS interface at any time.
- Revocation MAY be initiated by the original attester or by a group admin.

The attestation itself remains cryptographically valid for audit purposes — its signature, hashes, and bindings are unchanged. Revocation only affects the AS's willingness to issue new receipts. v0.3 had no revocation mechanism: TTL expiry was the only stop.

**Normative rules:**

1. The AS MUST persist the revocation list in durable storage.
2. The AS MUST check revocation status before issuing any receipt.
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
| **Authority Server (AS)** | Issues signed attestations and receipts; tracks cumulative state; holds revocation list |
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
2. A valid execution receipt is obtained from the AS
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

**Field-level constraints make bounds enforceable.** The profile defines what *kinds* of bounds can exist (constraint types). The human sets the *specific* bounds in the authorization. The Gatekeeper verifies attestation validity locally; the AS verifies that every execution falls within bounds and within cumulative limits.

For agent workflows, bounded execution alone is not always sufficient. v0.4 combines bounded authorization with the local intent payload to guide agent planning within those bounds. The agent sees: bounds (what it can do), intent (why and what to watch for), and live consumption state (how much has already been used).

### Agent Workflows in v0.5

HAP supports agent workflows through bounded execution + receipts:

| Component | Role |
|-----------|------|
| **Profile** | Defines constraint types — what kinds of bounds can exist |
| **Human** | Sets bound values, writes intent, chooses commitment mode, attests |
| **AS** | Signs the attestation; issues receipts at execution time; tracks cumulative state |
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

Two v0.3 sections — **Output Provenance** and **Decision Streams** — were moved into a separate `review.md` in v0.4 pending re-review. v0.5 folds them back here as concise optional directions and adds a third, **Content Provenance**. A v0.5 implementation MAY implement any of them without losing conformance, and MAY skip all of them without losing conformance. The decision rule for promoting a future direction into the binding surface is: at least one reference implementation exercises it end-to-end **and** at least one external integrator depends on it. Of the three, only Content Provenance has a reference implementation as of v0.5 (Suveren's `records`/`customers`); none yet has a dependent external integrator, so none is promoted.

### Output Provenance

For deployment-style profiles (`ship`, `provision`, `deploy`), it can be useful to bind the attestation to an observable output — a deployed URL, an artifact, a configuration state.

Profiles MAY define an `output_ref` field in the **context schema**. Because `output_ref` is part of context, it is hashed into `context_hash` and signed; the binding between attestation and output location is therefore cryptographic. After execution, outputs MAY carry provenance metadata (`attestation_id` + `bounds_hash`, optionally an AS endpoint and receipt IDs). Verification flow:

1. Read provenance metadata from the output.
2. Fetch the attestation through the AS's third-party verification endpoint (see `authority.md` § "Verification API for Third Parties").
3. Verify the attestation signature.
4. Verify `output_ref` in the attested context matches the output's actual location — this is the binding step; without it an `attestation_id` on an output is just a claim.
5. Optionally fetch receipts to verify the execution chain.

Output Provenance is a useful design pattern for deployment-style profiles. The deploy profile is not yet shipped in `hap-profiles`; when it ships, expect Output Provenance to be promoted into that profile's normative surface — not into HAP Core. Profile-bound features stay profile-bound.

### Content Provenance

Output Provenance binds an output's **location**. Some profiles produce content with no stable address — an email body, a published post, a CRM record, a database row. **Content Provenance** is the ephemeral-content analog: it binds the **bytes** instead, for those profiles.

A profile MAY declare a `content_binding` block — `{ "version": "1", "kind": "jcs" | "text", "pre_footer"?: bool }`. When present, the Gatekeeper computes a `content_hash` over the action's content and includes it in the receipt **request**; the AS copies it verbatim into the signed receipt **payload**. The AS receives **only the hash, never the content** — so Content Provenance preserves HAP's privacy-minimal design (the AS sees hashes, never plaintext).

Canonicalization is normative and versioned — a verifier MUST pin `content_binding.version`:

- `kind:"jcs"` — RFC 8785 JCS of the record payload → `sha256`. For structured writes (records, CRM), which have no single content field; the whole payload is the content.
- `kind:"text"` — UTF-8 of the auto-detected content field after Unicode NFC, LF line endings, trailing per-line whitespace stripped, and trailing blank lines removed; taken **pre-footer** when `pre_footer` is set. For communicative profiles (email, publish, calendar).

Receipt additions, both OPTIONAL (omitting them is fully conformant):

- request: `content_hash` (Gatekeeper → AS).
- payload: `content_hash` + `content_binding` (signed by the AS).

Verification: recompute the hash from the held or stored content using the receipt's `content_binding`, compare to the signed `content_hash`, and verify the receipt signature. A match under a valid signature proves the AS attested that **this exact content** was authorized under these bounds at this time. It does **not** prove real-world identity (account-level only), nor catch edits made outside Suveren — those surface only as a gap between the signed content and the live artifact, never prevented.

Like Output Provenance, Content Provenance lives in the relevant **profiles** (`records`, `customers`, then `publish`, `calendar`, `email`) — **not in HAP Core**. Core only gains the optional signed receipt fields that profiles MAY populate. Promotion follows the same rule (a reference implementation exercises it end-to-end **and** an external integrator depends on it); Suveren's `records`/`customers` implementation satisfies the first condition.

### Decision Streams

Individual attestations are snapshots. For public accountability and project history, attestations MAY be linked into a verifiable chain. Each attestation MAY optionally belong to a decision stream:

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

If implemented, `stream` MUST be part of the **signed** attestation payload (otherwise an AS could rewrite history) and any verifier consuming the stream MUST validate the `previous_attestation_hash` chain.

The use cases that motivate decision streams (public project histories, regulatory audits of multi-step decisions) have not surfaced in any reference implementation since v0.3. v0.6 will re-review; if no integrator has asked by then, this direction retires.

---

## Error Codes

Error codes are canonical across `core.md`, `authority.md`, and `gatekeeper.md`. Implementations MUST emit exactly these codes and MUST NOT alias them under different names. Codes prefixed with `INTERNAL_` or implementation-specific names are not part of the protocol surface and MUST NOT be relied on by integrators.

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
| `MALFORMED_ATTESTATION` | Attestation structure is invalid (e.g., missing `context_hash`, missing `commitment_mode`) |
| `DOMAIN_SCOPE_MISMATCH` | Attestation domain doesn't match requirement |
| `INVALID_ACTION_TYPE` | The receipt request's `actionType` is not in the profile's `actionTypes` registry |
| `BOUNDS_INVALID_VALUE` | A bounds value violates the profile's pattern, encoding, or range constraint |
| `CONTEXT_INVALID_VALUE` | A context value violates the profile's pattern, encoding, or enum/subset constraint |
| `ABOVE_CAP_CONFIG_INVALID` | `above_cap_caps` references a field not declared in the profile's `boundsSchema` |

### Receipt Errors

| Code | Meaning |
|------|---------|
| `ATTESTATION_NOT_FOUND` | Unknown `boundsHash` |
| `ATTESTATION_EXPIRED` | Attestation TTL has elapsed |
| `ATTESTATION_REVOKED` | Attestation has been revoked |
| `BOUND_EXCEEDED` | Per-transaction bound violated |
| `CUMULATIVE_LIMIT_EXCEEDED` | Cumulative limit would be exceeded |
| `PROFILE_NOT_FOUND` | Referenced profile unknown |
| `INVALID_ACTION_TYPE` | The `actionType` in the receipt request is not in the profile's `actionTypes` registry |
| `APPROVAL_REQUIRED` | The attestation is in `review_above_cap` mode and the request exceeds a configured cap; submit a proposal |
| `PROPOSAL_REQUIRED` | Attestation is in review mode and a matching proposalId was not supplied |
| `PROPOSAL_NOT_FOUND` | The named proposal does not exist |
| `PROPOSAL_NOT_APPROVED` | Attestation is in review mode and the named proposal has not been committed yet |
| `PROPOSAL_EXPIRED` | The named proposal expired before it was committed |
| `PROPOSAL_REJECTED` | The named proposal was rejected |
| `PROPOSAL_MISMATCH` | The receipt request does not match the stored proposal (tool, args, or context differ) |
| `PROPOSAL_ATTESTATION_MISMATCH` | The named proposal references a different attestation than the receipt request |
| `PROPOSAL_ALREADY_EXECUTED` | A receipt has already been issued for this proposal |
| `MALFORMED_RECEIPT_REQUEST` | The request carries a retired v0.3/v0.4 identifier (`attestationHash`, `frame_hash`, or `path`); v0.5 uses bare `boundsHash` |
| `IDEMPOTENCY_KEY_REQUIRED` | A synchronous (`automatic`-mode, no `proposalId`) receipt request omitted the required `idempotencyKey` |
| `IDEMPOTENCY_MISMATCH` | An `idempotencyKey` was reused for a different execution (`profileId`, `action`, or `executionContext` differ) |

---

## Tool-Gating Manifest

> New in v0.5. Promotes the integration-manifest contract from the reference Gatekeeper into the protocol surface.

The Gatekeeper enforces bounds against an `executionContext` dictionary (e.g., `{ amount: 5, currency: "EUR" }`). v0.4 specified that the dictionary exists but did not specify how an MCP tool call's arguments map *into* that dictionary. Without that contract, every Gatekeeper invents its own mapping rules and integrators cannot interoperate.

A **tool-gating manifest** is a JSON document that pairs an MCP tool with the bounds-and-context it should be checked against. Manifests live with the integration code (not with the profile), so adding a new tool that maps to an existing profile does not require a new profile version.

### Manifest Schema

```json
{
  "id": "stripe",
  "profile": "github.com/humanagencyprotocol/hap-profiles/charge@0.5",
  "tools": {
    "create_payment_link": {
      "category": "write",
      "staticExecution": { "action_type": "charge" },
      "executionMapping": {
        "amount_cents": { "field": "amount", "divisor": 100 },
        "currency": "currency"
      }
    },
    "list_payment_links": {
      "category": "read"
    }
  }
}
```

### Field Definitions

| Field | Required | Description |
|---|---|---|
| `id` | yes | Stable string identifier for the integration. Forms the namespace prefix in the proxied MCP tool name (`{id}__{tool}`). |
| `profile` | yes | The profile ID this integration's tools attest under. |
| `tools` | yes | Map of original MCP tool name → entry. |
| `tools.<name>.category` | yes | `"read"` or `"write"`. Read tools require a matching authorization but skip execution-context verification. Write tools run the full bounds check. |
| `tools.<name>.staticExecution` | no (write) | Constant key/value pairs merged into the executionContext for every call. MUST set `action_type` to a value in the profile's `boundsSchema.actionTypes`. |
| `tools.<name>.executionMapping` | no (write) | Map of MCP tool argument name → execution-context expression. |

### Execution Mapping Expressions

An entry in `executionMapping` is one of:

| Form | Effect |
|---|---|
| `"contextField"` | Direct copy: `executionContext.contextField = args.argName`. Numeric arguments stay numeric; everything else is stringified. |
| `{ "field": "ctx", "divisor": N }` | Numeric division: `executionContext.ctx = Number(args.argName) / N`. Used for unit conversion (e.g., cents → currency units). |
| `{ "field": "ctx", "transform": "length" }` | `executionContext.ctx = args.argName.length` (when arg is array). |
| `{ "field": "ctx", "transform": "join" }` | Joins array items with commas (lowercase, sorted is **not** required at this layer; see `join_domains` for the canonical form). |
| `{ "field": "ctx", "transform": "join_domains" }` | Extracts email domains, deduplicates, lowercases, sorts ascending, joins with commas. Used for `subset` checks against `allowed_domains`. |
| Array of the above | One argument fans out to multiple executionContext fields. |

**Normative rules:**

1. Every gated MCP tool MUST be described in a tool-gating manifest. A tool with no manifest entry MUST be refused (no ungated read access; no implicit "trust this tool").
2. The Gatekeeper MUST resolve `actionType` from `staticExecution.action_type`. Implementations MUST NOT derive `actionType` from the tool name or any string-manipulation of `action`.
3. The `category` field is the sole switch between read-only and write enforcement. There is no implicit categorization by name pattern.
4. Manifests are integration-side artifacts; multiple manifests MAY reference the same profile.
5. Implementations MUST treat `_imagePreview` and other reserved-prefix-`_` keys as advisory metadata that does not flow into the executionContext.

The reference Gatekeeper's manifest shape (used in production by `hap-gateway`) is the v0.5 canonical form.

---

## UI Affordance Layer (Optional)

> Optional in v0.5. Non-normative for enforcement; normative for the field name and shape so multi-gateway ecosystems render the same way.

A profile MAY include presentation hints on field definitions. These hints flow only to the local app (gateway UI) and are never sent to the AS or to executors. They are advisory: a Gatekeeper that ignores them is fully conformant.

```json
{
  "fields": {
    "amount_max": {
      "type": "number",
      "required": true,
      "boundType": { "kind": "per_transaction", "of": "amount" },
      "displayName": "Max per transaction",
      "description": "Maximum monetary amount per transaction",
      "unit": "currency:EUR",
      "default": 100
    }
  }
}
```

| Hint | Type | Purpose |
|---|---|---|
| `displayName` | string | Human-readable label for the form input. Falls back to the field name. |
| `description` | string | One-line helper text. |
| `unit` | string | Measurement dimension. Recognized values: `count`, `minutes`, `hours`, `days`, `percent`, `currency:<ISO 4217 code>`. Renders next to the input. |
| `format` | string | Input hint for string fields. Recognized values: `email`, `domain`, `url`, `currency`. |
| `default` | string\|number | Initial value the UI seeds the input with. Not a fallback at enforcement time. |
| `toolsDescription` | string | For `boundType: { kind: "enum" }` flags, a short label naming the tools the flag gates (e.g., `"delete_record"`). |

Implementations that render forms based on profile schemas SHOULD respect these hints. Implementations that do not render forms (e.g., a CI/CD Gatekeeper) MAY ignore them.

UI hints MUST NOT influence enforcement. A Gatekeeper that branches on `format: "email"` to decide whether to enforce a context constraint is non-conformant — `format` is presentation only.

---

## Versioning Rules

- HAP Core versions (`0.x`) define protocol semantics.
- Profiles version independently.
- Once a profile version is published, it is immutable. Changes require a new profile version.
- Breaking changes MUST bump major protocol or profile versions.
- Gatekeepers and Authority Servers MUST reject unknown or untrusted versions.

### Migration from v0.4

v0.5 is a minor version bump. The wire format and the signed-payload shape are unchanged for `automatic` and `review` attestations. Existing v0.4 attestations remain verifiable and MAY be exercised under v0.5 implementations subject to the rules below.

**Profile-side breaking changes (require a new profile version):**

1. `field.enum: string[]` is retired. Move allowed values into `constraint.values: string[]`.
2. `boundsSchema.actionTypes: string[]` is now required. Profiles MUST add it.
3. Any per-field `paths: [...]` arrays MUST be removed.

**Wire-side compatibility:**

4. The receipt request body's `attestationHash` field has been renamed back to its content-address name `boundsHash` to match the spec. Servers MUST accept `boundsHash`. For one transition release they MAY also accept `attestationHash` as a deprecated alias; new code MUST emit `boundsHash`.
5. The receipt request body's `path` field is retired. Servers MUST reject requests that include it.
6. The receipt response and persisted receipt MUST include `actionType`.
7. Error codes follow the canonical list above. `LIMIT_EXCEEDED` is retired in favor of `BOUND_EXCEEDED` and `CUMULATIVE_LIMIT_EXCEEDED`.
8. Signatures (attestation and receipt) MUST be encoded as base64url (no padding). Standard base64 is retired.
9. The `review_above_cap` commitment mode is new. v0.4 attestations cannot use it; v0.5 attestations using it cannot be enforced by v0.4-only Gatekeepers.

**Cumulative-state migration:**

10. Cumulative state is keyed by `(cumGroupId, profileId, actionType)`. Implementations that previously included `path` in the key MUST migrate state by collapsing on `path` (sum the buckets). Implementations that used a name-suffix regex to skip `cumulative_count` bounds for non-matching `actionType`s MUST remove the regex; the new `actionType`-only key removes the need for it.

### Migration from v0.3

(Retained from v0.4 for completeness.) v0.3 implementations cannot participate in v0.4 or v0.5 execution flows. Any historical v0.3 attestation data is verification-only.

---

## Summary

HAP v0.4 ensures automation serves human direction — not the reverse. Every authorized action carries cryptographic proof that a named human authorized a specific scope, with stated intent, within enforceable bounds. The signed attestation proves the commitment. The signed receipt proves the action.
