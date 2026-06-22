---
title: "Human Agency Protocol — Core Specification"
version: "Version 0.5"
date: "June 2026"
status: "Normative specification"
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
- With declared authority (owner identity)
- That every consequential action was authorized for execution within bounds (signed receipts)

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

**Execution** is the carrying out of that action under specific constraints — which commitment mode, which owners must approve, what intent the human committed to.

The Gatekeeper receives the bounds + context and attestation, reconstructs both hashes, and validates that they match. Only attested data is trusted — the Gatekeeper never accepts unattested parameters.

### Protocol vs. Profile Layering

The protocol defines abstract concepts. Profiles define concrete implementations.

| Layer | Defines | Example |
|-------|---------|---------|
| **Protocol** | Bounds/context structure, attestation format, receipt format | "Bounds must be hashed and signed" |
| **Profile** | What bounds and context fields exist for a specific authority area | "The charge profile defines amount_max, currency, action_type" |

HAP governs any context where humans authorize bounded action by automated systems:

- AI agent workflows (human attests to bounds, agent executes within)
- Code deployment (git repositories)
- Document approval (markdown files, wikis)
- Infrastructure changes (Terraform, Ansible)
- Policy decisions
- Contract signing

The protocol must remain abstract. Context-specific bindings belong in profiles.

---

## Protocol Composition

HAP is designed for AI agents and other autonomous, semi-autonomous, or automated systems that can take consequential actions after a human has authorized a bounded scope of execution.

HAP is **not** an authentication protocol, an API-access protocol, a tool-transport protocol, or a task-orchestration protocol. It is the **authorization, enforcement, and receipt layer for consequential execution**: it governs the moment where an already-reachable capability is used by an automated system to take an action with material effect.

HAP is designed to **compose with** existing authentication, identity, tool-exposure, authorization, observability, and orchestration systems. It replaces none of them. The systems named below are illustrative, not normative:

- **OAuth / OpenID Connect** may authenticate users, authorize clients, and obtain API access tokens.
- **EUDI wallets, WebAuthn, passkeys, hardware keys, or other identity systems** may establish the verified identity of a Decision Owner.
- **Organizational policy, verifiable credentials, directory systems, or Authority Server group configuration** determine whether that verified identity has authority for a given profile.
- **MCP or equivalent tool protocols** may expose executable capabilities to agents or other automated systems.
- **A2A, workflow engines, or tracing systems such as OpenTelemetry** may model task lifecycle, messages, artifacts, status, streaming updates, operational history, and observability.

HAP begins at the **consequential-execution boundary**. A system may hold API access through OAuth. A tool may be exposed through MCP. A task may be coordinated through A2A or a workflow engine. None of those facts is sufficient for HAP-conformant consequential execution.

> A HAP-conformant implementation **MUST NOT** execute a consequential action unless the Gatekeeper has verified the relevant attestation and obtained a valid execution receipt from the Authority Server **before** execution.

**OAuth grants reachable capability. HAP governs authorized use of that capability.**

### Relationship to OAuth Rich Authorization Requests

OAuth Rich Authorization Requests (RAR) enrich OAuth authorization by allowing structured authorization details to be requested and represented in the OAuth authorization flow. A resource server may use those details to enforce fine-grained API access.

HAP serves a different layer. HAP does not grant API access. HAP requires each consequential execution by an autonomous or semi-autonomous system to be reduced to a profile-defined execution context, checked against human-attested bounds, and authorized by a signed pre-execution receipt.

In short:

- **OAuth** answers: *"May this client access this resource?"*
- **OAuth RAR** answers: *"May this client access this resource under these structured authorization details?"*
- **HAP** answers: *"May this autonomous execution proceed now under this human-attested authorization, and is there a signed receipt proving that before execution?"*

### Example Integration Topology (non-normative)

A representative deployment composing HAP with OAuth and MCP:

1. The user connects an external service using OAuth.
2. The external API is exposed to an agent through MCP tools.
3. The Gatekeeper intercepts MCP write (consequential) calls.
4. The Gatekeeper maps the tool arguments into a profile-defined execution context.
5. The Gatekeeper verifies the human attestation (bounds, context, intent, commitment mode).
6. The Authority Server checks bounds, cumulative limits, expiry, revocation, and required-approver coverage.
7. The Authority Server issues a signed execution receipt.
8. The executor performs the API call only after the receipt is issued.

This topology is illustrative: HAP Core specifies the attestation, receipt, and Gatekeeper obligations, not the surrounding transport or identity choices.

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

## Roles

| Role | Description |
|------|-------------|
| **Decision Owner** | The human who authorizes execution, accepts responsibility, and acts within the authority granted to their identity. |
| **Local App** | The local environment where the human reviews and the agent operates. Holds intent and context in plaintext. |
| **Agent** | The automated system (AI agent, pipeline, script) that proposes and carries out actions within authorized bounds. |
| **Gatekeeper** | Verifies attestations and bounds locally, requests receipts from the Authority Server pre-flight, and enforces fail-closed. |
| **Authority Server (AS)** | Issues signed attestations and execution receipts; enforces per-transaction and cumulative bounds; maintains revocation. |
| **Executor** | Carries out the downstream tool call once the Gatekeeper has obtained a valid receipt. |

> **Note on terminology and placement.** The Roles section is defined here, near the front, so the actors are named before the mechanisms that involve them.

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

`commitment_mode` is part of the **signed** attestation payload. The Gatekeeper MUST drive its review-vs-automatic routing from the signed value, not from any unsigned metadata an Authority Server returns alongside it. If the signed `commitment_mode` requires review (`review` or `review_above_cap`) but the AS supplies no pending approvers, the two disagree — a possible commitment-mode downgrade — and the Gatekeeper MUST fail closed (refuse to auto-execute) rather than treat the action as automatic.

**Decision Owner — Who is accountable for the authorization?**

Execution requires an identifiable human who is a required approver for the decision.

### Direction State

**Intent — Why this authorization, what should the agent achieve, what should it avoid?**

A single locally-held statement that informs the agent's planning within the bounds. It typically covers:

- **Why** — What's the situation? Why does this need to happen?
- **Goal** — What should the agent try to achieve?
- **Watch out** — What should the agent avoid or be careful about?

These are guidance prompts, not enforced categories. The user writes naturally; the protocol stores a single hash (`gate_content_hashes.intent`).

Direction State may contain semantic content. It is local by default, may be encrypted by the implementation, and MUST NOT be transmitted to Authority Servers, Gatekeepers, or Executors as semantic plaintext. The protocol attests to a cryptographic commitment to Direction State (via `gate_content_hashes.intent`), but does not require its disclosure.

**Intent canonicalization.** `gate_content_hashes.intent` is `sha256` over the intent text **canonicalized** as follows, so that any party — the attester, a second approver on another machine, or a third-party auditor — reproduces the identical hash from the same logical statement:

1. Encode as **UTF-8**.
2. Apply Unicode normalization form **NFC**.
3. Normalize line endings to a single `\n` (`\r\n` and `\r` → `\n`).
4. Strip trailing whitespace on each line, then strip leading and trailing whitespace from the whole string.

The hash is computed over the resulting byte sequence. This determinism is REQUIRED: in multi-owner decisions each owner attests separately and all attestations MUST carry the same `gate_content_hashes.intent` (see *Multi-Owner Coverage Rule*), which is only achievable if intent canonicalization is identical across implementations of this protocol version. Canonicalization defines the hash only; it does not alter the intent text an implementation stores, encrypts, or displays.

### Normative Distinction

Authorization States are required for attestation and Gatekeeper enforcement.
Direction State (intent) is required by every profile in v0.5, but its semantic content remains outside protocol disclosure by default.

Implementations MUST ensure all required states are resolved before attestation or execution.
No skipping, no inference, no automated assumption.

---

## Decision Ownership

Ownership is a **gate for valid decision-making**, not just a state.

### The Decision Owner
A **Decision Owner** is any actor who:
1. Explicitly authorizes execution
2. Accepts responsibility for consequences
3. Acts within the authority granted to their identity (configured per group on the AS)

A Decision Owner is invalid if the decision's declared consequences exceed the authority granted to them.

### Owner Authority

In v0.5, authority is bound to a person's verified identity, not to an abstract domain. Each attestation records its Decision Owner(s) by DID in `resolved_owners`:

```json
{
  "resolved_owners": ["did:key:..."]
}
```

- `resolved_owners` — the Decision Owner DIDs this attestation covers (usually one).

Which identities are required to attest for a given profile is **organizational policy, not protocol semantics**: profiles define what authority exists; the AS (per group) defines which members must attest. See "Identity & Authorization" below.

### Who Must Own a Decision
A decision's consequences may span several areas — delivery, financial, legal, reputational, wellbeing. Any person materially affected in such an area must be a Decision Owner for the decision. The protocol does not enumerate areas; it requires that every materially affected owner is identified and participates.

### Multi-Owner Decisions
Decisions may have multiple owners.
However, collective or symbolic ownership ("The Team owns this") is invalid.
Ownership must be explicit, identity-scoped, and jointly committed.

**Invariant:** No authorization may be committed unless all materially affected decision owners are identified and participating.

### Divergence Is Not Failure—False Unity Is

When materially affected parties issue conflicting attestations (e.g., different `bounds_hash` values or incompatible intent), HAP blocks shared execution—not human agency.

This is not a deadlock. It is a boundary signal: "Your directions diverge."

Systems should respond by prompting users to:

"Your directions diverge. Initiate a new decision?"

This ensures drift is replaced by explicit divergence, preserving both autonomy and honesty. No shared action proceeds on unratified consensus.

When an owner disagrees — whether due to wrong bounds, incomplete intent, or unacceptable context — they refuse to attest. The proposer must update the declaration and start a new attestation cycle. No one can unilaterally override — all required owners must attest to the same bounds and context.

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

Profiles are the mechanism for authority-specific enforcement. v0.5 profiles are simpler than v0.3 profiles — they no longer carry execution paths, gate questions, or domain requirements.

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

In v0.5, profiles are universal: the same `charge@0.5` profile works for a solo developer in personal mode and a 500-person enterprise in group mode. Organizational policy (who must attest) is configured on the AS, not in the profile.

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

The execution context schema declares fields that are resolved at execution time, typically used for cumulative limit tracking. The attestation's `execution_context_hash` commits to this **schema** (the canonicalized `executionContextSchema`) — not to the per-call execution values, which are dynamic and tracked by the AS as cumulative state:

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

v0.5 profiles declare the universal set of required gates:

```json
{
  "requiredGates": ["bounds", "intent", "commitment", "decision_owner"]
}
```

All v0.5 profiles MUST require these four gates. The `intent` gate replaces the v0.3 trio of `problem`, `objective`, and `tradeoff`. Profiles MUST NOT define `gateQuestions` — the intent prompt is universal and lives in the gateway UI. Integration manifests MAY provide an optional `intentHint` for context-specific guidance.

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

## Attestations

An attestation is a time-limited, cryptographically signed proof that:

- A specific bounds set was committed to (`bounds_hash`)
- A specific operational context was committed to (`context_hash`)
- The execution context schema was resolved (`execution_context_hash`)
- The Decision Owner(s) are identified (`resolved_owners`)
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
    "resolved_owners": ["did:key:..."],
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
| `execution_context_hash` | Hash of the profile's canonicalized **execution-context schema** (the declared cumulative-tracking fields) — **not** the per-call execution values |
| `resolved_owners` | The Decision Owner DIDs this attestation covers (usually one) |
| `gate_content_hashes` | At minimum: `{ "intent": "sha256:..." }` |
| `commitment_mode` | `"automatic"`, `"review"`, or `"review_above_cap"` |
| `issued_at` | AS-authoritative issue timestamp |
| `expires_at` | AS-authoritative expiry timestamp |

**Conditional fields:**

| Field | When required | Description |
|-------|---|---|
| `above_cap_caps` | `commitment_mode === "review_above_cap"` | Map of bounds field name → numeric cap. Receipt requests exceeding any cap return `APPROVAL_REQUIRED`. |
| `above_cap_approvers` | `commitment_mode === "review_above_cap"` | List of DIDs that must approve a proposal raised by a cap exceedance. |
| `intent_disclosure_hash` | The attestation carries an encrypted-intent disclosure object (companion spec `intent-disclosure@0.1`) | `sha256` binding the disclosure's `intent_ciphertext` and `approvers_frozen` into the signed payload, so the AS cannot alter the ciphertext or approver set undetected. Defined in `governance.md` → *Companion Specifications* → `intent-disclosure@0.1`. |

**Normative rules:**

1. The signed payload MUST include `commitment_mode`. A change of commitment mode requires a new attestation.
2. The signed payload MUST include both `bounds_hash` and `context_hash`. Even when context is empty, `context_hash` is the sha256 of the empty canonical string.
3. The AS signs the payload with its Ed25519 private key. Signatures MUST be encoded as **base64url** without padding when serialized to the attestation envelope. Implementations MUST NOT use standard base64 (which differs in `+`/`/` vs `-`/`_` and in padding) — third-party verifiers reading the spec literally will reject standard-base64 signatures.
4. One attestation typically covers one Decision Owner. Multi-owner decisions require multiple attestations from different owners.
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

Each Decision Owner can independently prove:

- "I attested to bounds X" → `bounds_hash` in attestation
- "I committed to context Y" → `context_hash` in attestation
- "I articulated intent Z" → `gate_content_hashes.intent` in attestation
- "I chose commitment mode M" → `commitment_mode` in attestation
- "As owner O" → `resolved_owners` in attestation

---

## Bounds & Context Canonicalization

Bounds follow strict canonicalization rules to ensure deterministic hashing.

### Bounds Derivation

The bounds object contains exactly the keys defined in the profile's `boundsSchema.keyOrder`. The `profile` field is mandatory and identifies the profile version. There is no `path` field in v0.5.

**v0.5 Bounds structure (abstract):**

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

v0.5 does not include condition fields in bounds. Self-declared conditions are circular — the person who might want to skip oversight would decide whether oversight is required. Approver coverage is enforced by the AS based on group configuration, not by attestation-time conditions.

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

## Execution Receipts

> **No receipt, no execution.**

In v0.3, attestations proved authorization but nothing proved execution. The gateway's local execution log was unsigned and unverifiable. v0.4 closes this gap with **execution receipts** — AS-signed proof that a specific action occurred under a specific attestation, within declared bounds, at a specific time.

Every authorized action produces exactly one receipt. The receipt is the audit artifact for execution.

### The Authority Server as Notary

In v0.5, the AS is a **runtime dependency for execution**. Before any tool call proceeds, the Gatekeeper requests a receipt from the AS. The AS:

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
  "profileId": "charge@0.5",
  "action": "create_payment_link",
  "actionType": "charge",
  "idempotencyKey": "uuid",
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
| `idempotencyKey` | A caller-supplied unique key identifying this logical execution. The AS MUST treat two requests bearing the same `idempotencyKey` as the same logical execution and return the original receipt without re-consuming bounds (Cumulative Tracking rule 5). |
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
  "profileId": "charge@0.5",
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
4. Optionally: verify that `boundsHash` references a valid attestation, and that the attestation's signed payload contains the same `bounds_hash` and `profile_id` (for full chain-of-trust audit)

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

## Identity & Authorization

### Principle

> Profiles define what bounds and context exist. The AS (per group) defines who must attest. The AS verifies identity and required-approver coverage before signing.

The protocol separates three concerns:

| Concern | Defines | Example |
|---------|---------|---------|
| **Profile** | What bounds and context fields exist | `charge@0.5` defines `amount_max`, `currency`, `action_type` |
| **AS group config** | Who must attest for which profile | "For group acme, the `charge` profile requires alice's attestation" |

Required-approver sets are organizational policy, not protocol semantics. They live on the AS, configured per group.

### Identity Is Not Authority

**Verified identity is not equivalent to decision authority.**

An identity system may prove that a Decision Owner is a specific natural or legal person — that is necessary, but not sufficient. HAP additionally requires that this verified identity is *authorized* to act for the relevant profile, group, or organizational context. In group mode, that authority is resolved by the Authority Server's required-approver configuration (or by trusted authority credentials the AS accepts); in personal mode, the user attests directly for their own actions.

This is why authentication is out of HAP Core scope (below) while required-approver coverage is enforced by the AS: identity systems answer *"who is this?"*; HAP answers *"is this person authorized to commit this action, and is there proof?"*

### Authentication

Authentication is out of HAP Core scope. Implementations MUST establish identity through external mechanisms (e.g., OAuth, WebAuthn, hardware tokens, passkeys, API keys).

The protocol uses **Decentralized Identifiers (DIDs)** for platform-agnostic identity:

- `did:key:z6Mk...` — Ed25519 public key as DID
- `did:github:alice` — GitHub identity
- `did:email:dave@company.com` — Email-based identity

The verified DID is recorded in the attestation's `resolved_owners`. The AS MUST NOT issue attestations without verifying the attester's identity through a trusted authentication channel.

### AS Group Configuration

Required approvers move from profiles to AS group configuration in v0.5:

```json
{
  "group": "acme-corp",
  "requiredApprovers": {
    "charge@0.5": ["did:key:alice"],
    "purchase@0.5": ["did:key:alice", "did:key:bob"]
  }
}
```

The profile defines *what* fields exist. The group admin defines *who* must attest for each profile.

### Personal Mode vs Group Mode

**Personal mode** (no group):
- All profiles are available to the user
- No required approvers — the single user attests directly
- The AS skips approver-coverage checks
- The attestation's `resolved_owners` records the user's own DID

**Group mode:**
- Only profiles with configured required approvers are available
- The group admin must assign at least one required approver to each profile they enable
- A profile with no approver configuration is not available to that group
- The AS validates approver coverage: the attesting user must be a required approver in the group

This separation means:
- **Profiles are universal** — the same profile works for a solo developer and a 500-person enterprise
- **Governance is organizational** — configured per group on the AS
- **Personal mode just works** — no groups, no approvers, no configuration required

### Authorization Mapping (Group Mode)

Within a group, the AS holds, per profile, the members whose attestation is required:

```json
{
  "group": "acme-corp",
  "requiredApprovers": {
    "charge@0.5": ["did:key:alice", "did:key:bob"],
    "purchase@0.5": ["did:key:carol"]
  }
}
```

The profile defines WHAT bounds exist. The group config defines WHO must attest for each profile. These are separate concerns:

- Changing the profile (adding a bound) is a **protocol change**
- Changing the AS config (adding a person) is a **personnel change**

### Immutability Rule

> The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.

This is the key security property. Without it, an attester could add themselves to the authorized list and approve their own action in a single step.

### AS Authorization Responsibilities

Before signing an attestation, the AS MUST:

1. **Verify identity** — Validate the attester's authentication token. Resolve to a verified DID.
2. **Resolve required approvers** — In group mode: look up `requiredApprovers` for the attesting user's group and the requested profile. In personal mode: skip.
3. **Check membership** — In group mode: verify that the authenticated DID is a required approver in the group. In personal mode: skip.
4. **Reject or sign** — Only sign the attestation if all checks pass.

### Normative Rules

1. The AS MUST verify attester identity before signing an attestation.
2. In group mode, the AS MUST verify the attester is a required approver before signing.
3. The authorization source MUST NOT be modifiable by the attester as part of the same action being attested.
4. Changes to the authorization source MUST be made by an authorized party and MUST be auditable.
5. The verified DID MUST be recorded in the attestation's `resolved_owners`.

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

### Revocation Supersession (new in v0.5)

When the original attester re-attests with the same `bounds_hash` (e.g., to fix a typo, retry after a network hiccup, or extend TTL), the new attestation is a distinct cryptographic artifact. The AS MAY treat the prior revocation as superseded so the new attestation is not surfaced as revoked in listings.

Normative rules for supersession:

1. The AS MUST NOT silently delete the prior revocation row. Supersession is a **transition**, not an erasure.
2. The AS MUST emit a structured audit event (`revocation.superseded`) recording: the prior `attestation_id`, the new `attestation_id`, the timestamp, and the actor (`did`) initiating the re-attestation.
3. The audit event MUST be retained for at least the profile's `retention_minimum`.
4. Receipts issued under the prior (revoked) attestation remain valid and queryable.
5. The supersession event MUST be visible in the AS's revocation list output (e.g., `revoked_at` plus `superseded_at` and `superseded_by`), so an auditor can trace `revoke → supersede → new-attest` rather than seeing the revocation simply vanish.

This rule was added because the v0.4 reference implementation cleared revocation rows on re-attest, which weakened the audit story. v0.5 keeps the operational benefit (the new attestation isn't shown as revoked) without losing history.

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

## Authority Server Behavior

A HAP Authority Server (AS) is the cryptographic authority and accountability layer of the protocol. It signs attestations that prove a human authorized a specific scope of action, and it signs receipts that prove each action stayed within those bounds.

ASes do not validate truth. They validate Profile compliance and bounds adherence.
ASes do not trust executors. They enable users to enforce boundaries.

### Responsibilities

A v0.5 AS has five primary responsibilities:

1. **Attestation issuance** — sign authorizations after verifying profile compliance, identity, and (in group mode) required-approver coverage
2. **Receipt issuance** — sign execution receipts after checking per-transaction bounds and cumulative limits
3. **Cumulative state tracking** — maintain running totals (daily, monthly) per attestation per action type
4. **Revocation** — maintain a revocation list and refuse to issue receipts against revoked attestations
5. **Retention** — store attestations and receipts for at least the profile-defined `retention_minimum`

The AS receives only the bounds (in plaintext for enforcement) and hashes for everything else (`bounds_hash`, `context_hash`, `execution_context_hash`, `gate_content_hashes.intent`, owner DIDs). ASes **never** receive context content, intent text, or any other semantic content. Context content stays on the gateway, encrypted at rest.

### Attestation Issuance & Validation

For the canonical attestation request and signed attestation payload schemas, see [Attestations](#attestations).

Context fields (`currency`, `action_type`) live in the contextSchema and are hashed into `context_hash` by the gateway. They are **not** part of the bounds sent to the AS — the AS only sees the context hash, and the Gatekeeper is the sole enforcer of context enum/subset constraints. The AS receives the bounds in plaintext because it must enforce them at receipt time.

Each attestation request covers a single Decision Owner. Multi-owner decisions require separate attestation requests — one per owner.

**Validation Rules.** The AS MUST reject the attestation request if:

- `profile_id` is unknown or untrusted
- `bounds` is missing required fields per the profile's `boundsSchema`
- The recomputed bounds hash does not match `bounds_hash`
- `context_hash` is missing
- `execution_context_hash` is missing
- `gate_content_hashes.intent` is missing
- `commitment_mode` is not one of `automatic`, `review`, or `review_above_cap`
- The bounds violate group-level limit ceilings (group mode, if configured)
- Attester identity cannot be verified
- In group mode: the attester is not a required approver
- In group mode: the profile is not enabled for the group, or no required approver is configured for the profile
- Requested TTL exceeds the profile's max TTL

(See [Commitment Modes](#commitment-modes) for the definitions of `automatic`, `review`, and `review_above_cap`.)

**AS Authorization Responsibilities.** Before signing an attestation, the AS MUST:

1. **Verify identity** — Validate the attester's authentication. Resolve to a verified DID.
2. **Resolve required approvers** — In group mode: look up `requiredApprovers` for the group and the requested profile.
3. **Check membership** — In group mode: verify that the authenticated DID is a required approver in the group.
4. **Validate bounds** — Recompute `bounds_hash` from the submitted `bounds` and compare to the provided value.
5. **Validate against group limits** — In group mode: if the group has limit ceilings configured, verify the bounds do not exceed them.
6. **Reject or sign** — Only sign the attestation if all checks pass.

**Attestation properties:**

- Short-lived (TTL bounded by profile max)
- Signed with the AS's Ed25519 private key
- The signed payload includes `commitment_mode` — changing it requires a new attestation
- **Normative**: the `title` field MUST NOT appear in the signed payload. It is AS-side metadata only and can be changed without invalidating the signature.

The AS also stores per-attestation metadata that is not part of the signed payload:

- `title` — human-readable label
- `groupId` — group context
- `createdBy` — user who created the attestation
- `deferredCommitmentOwners` — for multi-owner attestations where some owners are still pending review

When `commitment_mode === "review_above_cap"`, the AS MUST validate `above_cap_caps` keys against the profile's `boundsSchema` (returning `ABOVE_CAP_CONFIG_INVALID` when a cap references a field not declared in the schema).

### Receipt Issuance

> Every authorized action produces exactly one signed receipt before it executes.

For the canonical receipt request schema and signed receipt payload schema, see [Execution Receipts](#execution-receipts).

The AS derives `userId` from the authenticated request context. It is not supplied in the request body.

**AS Validation for Receipt Issuance.** The AS MUST reject the receipt request if:

- `boundsHash` is unknown (return `ATTESTATION_NOT_FOUND`)
- The request body includes a retired v0.3/v0.4-era identifier — `attestationHash`, `frame_hash`, or `path` (return `MALFORMED_RECEIPT_REQUEST`). v0.5 receipt requests use the bare `boundsHash` only; the per-user storage key is reconstructed server-side from `boundsHash` + the authenticated user.
- The request body's `actionType` is not in the profile's `boundsSchema.actionTypes` registry (return `INVALID_ACTION_TYPE`)
- The request is on the synchronous path (`automatic` mode, no `proposalId`) but omits `idempotencyKey` (return `IDEMPOTENCY_KEY_REQUIRED`)
- The `idempotencyKey` was already used for a **different** execution — `profileId`, `action`, or `executionContext` differ from the receipt it is bound to (return `IDEMPOTENCY_MISMATCH`)
- The attestation has been **revoked** (return `ATTESTATION_REVOKED`)
- The attestation has **expired** (return `ATTESTATION_EXPIRED`)
- Any value in `executionContext` exceeds the per-transaction bounds in the attestation (return `BOUND_EXCEEDED`)
- Any cumulative limit (daily, monthly) would be exceeded after applying this execution (return `CUMULATIVE_LIMIT_EXCEEDED`)
- The attestation is in `review` mode and the action has not been explicitly approved by the human (return `PROPOSAL_REQUIRED`)
- The attestation is in `review_above_cap` mode and any value in `executionContext` exceeds an `above_cap_caps` entry (return `APPROVAL_REQUIRED`, including the configured `above_cap_approvers` list so the Gatekeeper can route the proposal)
- The profile referenced by the attestation is unknown or untrusted (return `PROFILE_NOT_FOUND`)

**Idempotent replay (exactly-once enforcement).** Before any of the checks above mutate state, the AS resolves `idempotencyKey`: if it has already issued a receipt for this attestation under that key, it MUST return that **original** receipt unchanged — without incrementing cumulative state, creating a second receipt, or re-running the revocation/expiry/bounds checks. This is what makes the synchronous path exactly-once: a retry after a lost response reproduces the original result rather than double-counting (so the replay succeeds even if the attestation has since been revoked or expired — the action already happened). The dedup record is scoped exactly as cumulative state (per attestation + the authenticated request context, so two group members attesting to identical bounds cannot collide) and is retained at least as long as the receipt it points to (≥ the profile's `retention_minimum`). A reuse of the key with a *different* payload is the `IDEMPOTENCY_MISMATCH` case above — a key identifies one execution and cannot be re-pointed. The review path needs no key: its replay protection is the proposal's `committed → executed` transition.

**Bounds Checking.** For every field in the profile's `boundsSchema.fields`, the AS looks up the field's declared `boundType` and dispatches on `boundType.kind`:

| `boundType.kind` | Check |
|---|---|
| `per_transaction` | `execution[boundType.of]` MUST be ≤ the bound value |
| `cumulative_sum` | `running_sum(boundType.of, boundType.window) + execution[boundType.of]` MUST be ≤ the bound value |
| `cumulative_count` | `running_count(boundType.window) + 1` MUST be ≤ the bound value |
| `enum` | Capability flag — the stored bound value MUST be in `boundType.values`. Enforced at attest time (the AS rejects bounds whose values are not in the allowed set). |

The AS MUST NOT attempt to enforce context constraints (enum/subset on `currency`, `allowed_recipients`, etc.). Context is hashed; the AS only sees the hash. The Gatekeeper is the sole enforcer of context constraints and MUST check them before requesting a receipt.

**Cumulative State Tracking.** The AS MUST maintain cumulative state per (cumulative group, profile, actionType). The key is:

```
key: {cumGroupId}:{profileId}:{actionType}
value: {                        // a derived snapshot, recomputable from receipt history
  daily_amount: <number>,       // sum over the trailing 24h (rolling)
  daily_count: <number>,
  weekly_amount: <number>,      // sum over the trailing 7d (rolling)
  weekly_count: <number>,
  monthly_amount: <number>,     // sum since the 1st of the current month, 00:00 UTC
  monthly_count: <number>,
  monthly_anchor: "YYYY-MM"     // the calendar month this monthly total covers (UTC)
}
```

`cumGroupId` is defined as:

```
cumGroupId = groupId || "personal:" + userId
```

In group mode, `cumGroupId` is the group ID. In personal mode, `cumGroupId` is either:

- the string `personal:{userId}` — when the AS models personal accounts as group-less, OR
- a synthesized group ID for a single-member personal group — when the AS models personal accounts as a group of one (the v0.5 reference implementation does this).

Both strategies are conformant. The wire-side property the spec requires is that personal and group accounting cannot collide, which both strategies guarantee.

**Important**: the key uses `actionType` (the semantic category — `charge`, `write`, `post`, `delete`), not `action` (the downstream tool name). Two different tools that share the same `actionType` under the same profile share a bucket; this is the intended behavior because an authorization scoped to "charges up to €500/day" should cap the total across all charge-producing tools, not give each tool its own allowance.

Cumulative state is **derived from retained receipts** over each window: `daily` and `weekly` are recomputed over the trailing 24h / 7d (rolling — there is no reset boundary), and `monthly` is summed since the 1st of the current month at 00:00 UTC (the only calendar-anchored window). Implementations MAY maintain a cached counter for performance, but the cache MUST be recomputable from receipt history and MUST NOT define the window semantics. The AS is authoritative for cumulative state.

**Worked Example: Multi-Group + Personal.** A single user (Alice) is a member of two groups (`acme-corp` as finance, `widgets-inc` as operations) and also has a personal workspace. She has three separate `charge@0.5` authorizations — one per context. Her cumulative state has three independent buckets:

| Bucket | `cumGroupId` | `profileId` | `actionType` | Semantics |
|---|---|---|---|---|
| Bucket 1 | `acme-corp` | `charge@0.5` | `charge` | Acme's finance spend against Acme limits |
| Bucket 2 | `widgets-inc` | `charge@0.5` | `charge` | Widgets' operations spend against Widgets limits |
| Bucket 3 | `personal:alice-123` | `charge@0.5` | `charge` | Alice's personal spend against her own limits |

When Alice makes a charge via her Acme authorization, only Bucket 1's counters move. Her Widgets and personal buckets are unaffected. This keeps accounting auditable per-attestation, per-group, and prevents cross-contamination.

**`action` vs `actionType` — normative rule.** The receipt request carries both `action` (the downstream tool name, e.g., `create_payment_link`) and `actionType` (the semantic category, e.g., `charge`). The AS MUST:

1. Partition cumulative state by `actionType`, not by `action`.
2. Dispatch bounds enforcement by looking up `boundType` entries in the profile's `boundsSchema.fields` — the `boundType.kind` and any `boundType.of`/`boundType.window` fields determine how each bound is checked. `actionType` is not a dispatch key; it is a cumulative-bucket key.
3. Record `action` in the receipt for audit purposes. `action` MUST NOT affect cumulative state partitioning or bounds dispatch.

The `APPROVAL_REQUIRED` body MUST include the approver DIDs the Gatekeeper should route the proposal to:

```json
{
  "approved": false,
  "errors": [{
    "code": "APPROVAL_REQUIRED",
    "field": "amount",
    "message": "Amount 1500 exceeds cap 1000",
    "cap": 1000,
    "requested": 1500,
    "approvers": ["did:key:...", "did:key:..."]
  }]
}
```

For the full set of error codes a receipt request may return, see [Error Codes](#error-codes).

### Multi-Owner Coverage Rule

When a profile requires multiple approvers (e.g., `purchase@0.5` requiring two members), each required owner attests separately. All such attestations share the same `bounds_hash`, `context_hash`, and `gate_content_hashes.intent`. Before issuing a receipt, the AS MUST validate that the union of attesting owners (`resolved_owners`) covers the required approver set, then issue the receipt. If any required owner's attestation is missing → the AS refuses to issue receipts → the agent cannot act.

To resolve the union at receipt time, the AS MUST gather all live, non-revoked attestations matching the same `bounds_hash`, `context_hash`, `profile_id`, `gate_content_hashes.intent`, and `commitment_mode`, and take the union of their `resolved_owners`. Because storage and idempotency keys are scoped per attester, each required owner's attestation is stored independently and discovered by this match rather than overwriting another's.

### Verification API for Third Parties

An AS MAY expose endpoints that let parties other than the attester or its group verify an attestation or receipt by ID/hash. These endpoints let any holder of the AS's public key check claims independently.

**Normative rules:**

1. Third-party verification responses MUST contain only fields that appear in the **signed** attestation or receipt payload, plus the signature itself, plus revocation status.
2. Third-party verification responses MUST NOT include `title`, `groupId` (when not part of the signed payload), `createdBy`, `deferredCommitmentOwners`, `intent_ciphertext`, `encrypted_keys`, or any other AS-side metadata.
3. Endpoints serving the attester or their group MAY include the metadata; endpoints serving anonymous/external requests MUST NOT.
4. The AS SHOULD distinguish the two surfaces by URL or by authentication (e.g., `/api/as/verify/{boundsHash}` for third parties vs `/api/attestations/{boundsHash}` for owners).

This formalizes the invariant ("`title` MUST NOT appear in signed payload") at the response-shape level: a verifier reading the spec literally MUST receive only signed bytes plus signature and revocation status, and nothing else.

### Retention

The AS MUST retain attestations and receipts for at least the profile-defined `retention_minimum`. Records MUST be:

- Append-only
- Available for audit verification
- Queryable by `boundsHash`, receipt ID, and time range
- Exportable in a standard format

Storage mechanism is implementation-specific (the reference implementation uses Redis with optional persistent backups).

**Profile Bytes Retention.** The AS MUST retain the exact profile bytes for every `profile_id` it has issued attestations or receipts under, for at least as long as the longest live retention obligation against that profile. Concretely: the AS retains the profile bytes until every attestation and every receipt issued under that `profile_id` has passed its `retention_minimum` window.

Once all such windows have elapsed, the AS MAY discard the profile bytes. Profiles that have never produced an attestation or receipt are not retention-bound and MAY be discarded at any time.

This rule exists because receipts outlive attestations and a receipt's `limits` field carries only numeric values — the *meaning* of those values (which `boundType` each field used, which `actionType`s were valid, what `unit` applied) lives in the profile bytes. An auditor presented with an old receipt MUST be able to recover the schema it was signed against.

The protocol does not specify a separate "delete profile after N days unused" timer. The retention obligation is tied to the artifacts produced under the profile, not to wall-clock idleness, so the AS cannot accidentally discard a profile while live receipts still reference it.

**Receipts Outlive Attestations.** Receipts remain cryptographically valid and retrievable after their parent attestation has expired or been revoked. The attestation's TTL and revocation status affect only the AS's willingness to issue **new** receipts against that attestation — they do not affect previously-issued receipts.

- When an attestation expires (TTL elapses), the AS MUST refuse new receipt requests against it (return `ATTESTATION_EXPIRED`). Previously-issued receipts remain valid and queryable.
- When an attestation is revoked, the AS MUST refuse new receipt requests against it (return `ATTESTATION_REVOKED`). Previously-issued receipts remain valid and queryable.
- In both cases, receipts MUST continue to be retrievable until at least `retention_minimum` has elapsed from the receipt's own timestamp, independent of the attestation's lifecycle.

The receipt is a permanent record of what happened under a specific authorization at a specific time. Expiring or revoking the authorization does not erase that history.

### What ASes Are NOT

| Misconception | Reality |
|---------------|---------|
| Ethics enforcer | ASes validate structure and bounds — not morality or legality |
| Global authority | No AS can block others. No hierarchy exists |
| Content inspector | ASes never see semantic content (intent, context content, problem narratives) |
| Stateless oracle | v0.5 ASes maintain cumulative state and a revocation list. They are stateful by design. |

### Security Guarantees

**Fraud Prevention.**

- Fake attestations and receipts fail signature validation
- Stolen keys are mitigated by short TTL + user-controlled AS whitelists
- Revocation provides a fast stop before TTL expiry

**Privacy by Construction.** ASes receive only:

- Bounds (in plaintext, for enforcement)
- `bounds_hash`, `context_hash`, `execution_context_hash`
- `gate_content_hashes.intent`
- Profile ID
- Owner DIDs
- Owner declarations
- `commitment_mode`
- Optional `title` (AS metadata, not signed)

ASes never receive:

- Context content (operational details — only the hash)
- Intent text (only the hash)
- Any narrative reasoning, problem statements, or rendered previews

**Profile Isolation.** A compromised personal AS cannot issue attestations for profiles it doesn't support. Each Profile defines its own validation rules.

**No Executor Trust.** Executors are not required to "do the right thing." If an executor ignores the receipt requirement, it acts outside HAP — and is liable.

## Gatekeeper & Executor Behavior

The Gatekeeper is the enforcement point between human-attested authorization and machine execution. It verifies attestations locally, requests execution receipts from the AS for every action, and blocks execution if any check fails.

The Gatekeeper is not a prescribed component or deployment topology — it is the guarantee that attestation verification AND receipt issuance have occurred before any consequential action proceeds.

### Obligation & Topologies

Every execution environment MUST satisfy the Gatekeeper obligation before proceeding with an attested action.

> **Normative:** Every execution MUST be preceded by:
> 1. Local verification of the attestation (signature, TTL, bounds_hash, context_hash)
> 2. Issuance of an execution receipt by the Authority Server
>
> An implementation that stores or transmits attestations but does not verify them, or that verifies attestations but skips receipt issuance, is non-compliant.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — `verify()` + `requestReceipt()` calls in application code before execution
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint
- **Two cooperating layers** — one library performs local verification (Phase 1) and a second layer requests the receipt and blocks execution on the result (Phase 2). The reference implementation factors the obligation this way: `hap-core`'s `verify()` covers Phase 1 and the gateway's tool proxy covers Phase 2.

All four are equally valid. The protocol makes no architectural preference between monolithic and two-phase factoring. What matters is that the verification steps execute completely, a valid receipt is obtained, and execution is blocked on a negative result from either phase.

When the obligation is split across layers, the layer running Phase 2 is the conformant Gatekeeper and is responsible for ensuring Phase 1 ran. A library that exposes only Phase 1 (e.g., `verify()`-style local checks) MUST be documented as a partial implementation — it is not by itself a Gatekeeper.

A system that has attestations but skips verification or receipt issuance is in violation — the attestation alone is not proof of compliance; verified attestation + valid receipt is.

### Validation Steps

The Gatekeeper performs validation in two phases: **local verification** and **AS receipt issuance**.

**Phase 1: Local Verification.**

1. **Reconstruct canonical bounds** from the submitted bounds object (apply v0.5 escape rules: reject newlines, percent-encode `=`/`%`/non-printable ASCII)
2. **Compute `bounds_hash`** and verify it matches the attestation
3. **Reconstruct canonical context** from the submitted context object (always compute the hash; use the well-known empty hash if context is empty)
4. **Compute `context_hash`** and verify it matches the attestation
5. **Fetch Profile** for the referenced `profile_id`
6. **For each attestation:**
   - Fetch AS public key (cached or on-demand)
   - Verify Ed25519 signature (base64url-decoded) against the canonical attestation payload
   - Verify TTL not expired
   - Verify `commitment_mode` matches what the gateway expects (or pass through if neutral)
7. **Verify required-approver coverage** against the AS's group config (in group mode) or skip (in personal mode)
8. **Check per-transaction bounds** — for every bounds field where `boundType.kind === "per_transaction"`, verify that `execution[boundType.of] <= boundValue`.
9. **Validate `actionType`** — verify the resolved `actionType` (from the tool-gating manifest's `staticExecution.action_type`) is a member of the profile's `boundsSchema.actionTypes`.
10. **Check context constraints** — for every context field with an `enum`, `subset`, or `pattern` constraint, verify that the corresponding value in the execution request satisfies the constraint. This check is **required** locally because the AS only holds `context_hash` and cannot enforce context constraints at receipt time. A non-conforming execution context MUST be rejected here before any AS call.

If any local check fails → reject with a structured error before contacting the AS.

**Phase 2: AS Receipt Issuance.** If Phase 1 passes, the Gatekeeper requests an execution receipt from the AS. The AS performs cumulative limit checks (daily, monthly) and revocation checks. If the AS returns a receipt, execution proceeds. If the AS returns an error, execution is blocked.

### Pre-flight Receipt Request — Fail-Closed

For every authorized write execution, the Gatekeeper sends a receipt request to the AS. For the canonical receipt request schema, see [Execution Receipts](#execution-receipts).

The request body MUST NOT include `path`, `attestationHash`, `frame_hash`, or any other v0.3/v0.4-era identifier. v0.5 ASs MUST reject these. `actionType` MUST be in the profile's `boundsSchema.actionTypes` registry; the Gatekeeper SHOULD validate locally before round-tripping.

**Idempotency (exactly-once).** On the synchronous path (`automatic` mode), the Gatekeeper MUST generate one `idempotencyKey` per tool invocation and reuse it **unchanged** on every retry of that invocation's receipt request. The key MUST be unique per logical execution and MUST NOT be derived from the action's content — two intentionally identical actions are distinct executions and each must be counted. Retrying a receipt request is only safe (and only permitted) when the key is present: a transient failure that hides the AS response *after* it committed is recovered by the retry, which the AS dedups to the original receipt instead of double-counting. The Gatekeeper MUST NOT retry past a **definitive** AS rejection — `BOUND_EXCEEDED`, `CUMULATIVE_LIMIT_EXCEEDED`, `APPROVAL_REQUIRED`, `INVALID_ACTION_TYPE`, `ATTESTATION_REVOKED`, `ATTESTATION_EXPIRED`, `IDEMPOTENCY_MISMATCH` — which fail closed on the first response. Review-mode commits carry a `proposalId` instead and omit the key (the proposal CAS is their replay protection).

On failure, the Gatekeeper MUST block execution and surface the error to the agent and (if applicable) to the human.

**Pre-execution, not post-execution.** The receipt is issued **before** the tool call executes. The flow is:

```
verify locally -> request receipt -> receipt approved -> execute -> store receipt
```

Not:

```
execute -> request receipt
```

This is critical: the AS authorizes the action *before* it happens, not after. The receipt is proof of authorization, not proof of completion. **No receipt → no execution.**

If the AS is unreachable or unresponsive when a receipt is requested, the Gatekeeper MUST block execution. Implementations MUST NOT use a cached prior receipt as a fallback. Implementations MUST NOT have a "warn and proceed" or "degraded" mode for production use. The Gatekeeper MUST NOT cache receipts and reuse them for new executions — each execution requires a fresh receipt.

### Commitment-Mode Handling

The Gatekeeper honors the signed `commitment_mode` on the attestation (see [Commitment Modes](#commitment-modes)):

- **`automatic`** — request a receipt directly and execute on approval.
- **`review`** — the Gatekeeper does not block on `PROPOSAL_REQUIRED` as a hard error; it surfaces the proposal to the user and waits for approval. Once the user approves, the Gatekeeper re-issues the receipt request with the `proposalId`, the AS atomically transitions the proposal from `committed` to `executed`, and the receipt is returned.
- **`review_above_cap`** — automatic below the caps; when the AS returns `APPROVAL_REQUIRED`, the Gatekeeper routes a proposal to the above-cap approvers (see routing below).

**`review_above_cap` routing.** When the AS returns `APPROVAL_REQUIRED`, the Gatekeeper:

1. Reads the `approvers` array from the AS error body.
2. Falls back to the signed attestation's `above_cap_approvers` if the AS did not provide approvers.
3. Submits a proposal to the AS with `pendingApprovers` set to the merged approver list.
4. Returns control to the agent with a tracking token (proposal ID).
5. On approval, replays the receipt request with the `proposalId` (the AS atomically transitions the proposal `committed → executed` and signs the receipt).
6. On rejection, returns the rejection to the agent and does not retry.

The signed `above_cap_approvers` is the source of truth; AS-supplied approvers are an operational hint only. A compromised AS that omits or shrinks the approver list MUST NOT be trusted to widen the action — the Gatekeeper enforces against the signed list.

### Proposal / Review / Approval Lifecycle

In `review` mode, the receipt request returns `PROPOSAL_REQUIRED` with a `proposalId`. Example failure body:

```json
{
  "approved": false,
  "errors": [
    {
      "code": "PROPOSAL_REQUIRED",
      "message": "This authorization is in review mode. Submit a proposal and obtain human approval before requesting a receipt.",
      "proposalId": "uuid-assigned-by-sp"
    }
  ]
}
```

The Gatekeeper surfaces the proposal to the user and waits. Once the user approves, the Gatekeeper re-issues the receipt request with the `proposalId`, the AS atomically transitions the proposal from `committed` to `executed`, and the receipt is returned. The proposal's `committed → executed` transition is the review path's replay protection (no idempotency key is used).

### Executor Gating, Context vs Bounds, Display-Only Logs

The **bounds** are what the human attests to as enforceable constraints; they are hashed into `bounds_hash` and signed. The **context** is the human's operational scope (e.g., target environment, customer segment); it is hashed into `context_hash` and signed but stays local. The **execution** is what the agent submits when it wants to act — the specific values for a single action within the attested bounds.

Per-transaction bounds (`boundType.kind === "per_transaction"`) are enforced locally by the Gatekeeper AND by the AS. Cumulative bounds (`cumulative_sum`, `cumulative_count`) are enforced solely by the AS because the Gatekeeper has no receipt history. Context constraints (enum/subset/pattern) are enforced **solely by the Gatekeeper** because the AS only holds `context_hash` and cannot inspect plaintext context values.

**Local execution logs are display-only.** A Gatekeeper MAY maintain a local record of executions for UI rendering (consumption progress bars, history views, audit replays). It MUST NOT use that record as a second-pass cumulative enforcement layer. The AS's cumulative state is authoritative; running a parallel cumulative check on the Gatekeeper duplicates the source of truth and risks drift between the two. v0.4 reference implementations that re-checked cumulative bounds locally before calling the AS MUST drop the local check by v0.5; per-transaction bounds enforcement on the Gatekeeper remains correct and is unaffected.

The executor executes without discretion — it forwards only minimal, non-semantic commands. Logical separation of attestation logic, gatekeeper logic, and execution logic MUST be maintained. The Gatekeeper MUST NOT have a "bypass" mode. Development/testing environments MAY use test attestations with test AS keys, but the verification logic and receipt issuance MUST still execute.

### Tool-Gating Manifests

> Promotes the integration-manifest contract from the reference Gatekeeper into the protocol surface.

The Gatekeeper enforces bounds against an `executionContext` dictionary (e.g., `{ amount: 5, currency: "EUR" }`). The dictionary exists, but a contract is needed for how an MCP tool call's arguments map *into* that dictionary. Without that contract, every Gatekeeper invents its own mapping rules and integrators cannot interoperate.

A **tool-gating manifest** is a JSON document that pairs an MCP tool with the bounds-and-context it should be checked against. Manifests live with the integration code (not with the profile), so adding a new tool that maps to an existing profile does not require a new profile version.

A Gatekeeper that fronts MCP tool calls (the primary v0.5 use case) consumes a tool-gating manifest per integration. The manifest answers two questions:

1. **Which profile authorizes this tool?** — the manifest's `profile` field.
2. **How does a tool call's arguments produce an `executionContext`?** — the manifest's `tools.<name>.executionMapping` and `staticExecution`.

The Gatekeeper MUST refuse any tool that is not described in a loaded manifest. There is no "permissive default" — read-only tools also require an entry (with `category: "read"`).

**Manifest Schema.**

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

**Field Definitions.**

| Field | Required | Description |
|---|---|---|
| `id` | yes | Stable string identifier for the integration. Forms the namespace prefix in the proxied MCP tool name (`{id}__{tool}`). |
| `profile` | yes | The profile ID this integration's tools attest under. |
| `tools` | yes | Map of original MCP tool name → entry. |
| `tools.<name>.category` | yes | `"read"` or `"write"`. Read tools require a matching authorization but skip execution-context verification. Write tools run the full bounds check. |
| `tools.<name>.staticExecution` | no (write) | Constant key/value pairs merged into the executionContext for every call. MUST set `action_type` to a value in the profile's `boundsSchema.actionTypes`. |
| `tools.<name>.executionMapping` | no (write) | Map of MCP tool argument name → execution-context expression. |

**Execution Mapping Expressions.** An entry in `executionMapping` is one of:

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

**Resolving `actionType`.** `actionType` MUST come from the manifest's `staticExecution.action_type`. The Gatekeeper:

1. Loads the manifest entry for the called tool.
2. Reads `staticExecution.action_type`.
3. Validates that the value is a member of the profile's `boundsSchema.actionTypes`.
4. Sends it to the AS unchanged.

A Gatekeeper that derives `actionType` from the tool name (e.g., by splitting on `__` and reading a prefix) is non-conformant. Tool name → action type is a manifest-author decision, not a runtime inference.

**Read vs Write Categorization.**

| Manifest `category` | Gatekeeper behavior |
|---|---|
| `read` | Verify a matching authorization exists for the manifest's profile. Skip executionContext construction and bounds verification. Do not request a receipt. (Read calls do not consume cumulative state.) |
| `write` | Run the full Phase 1 + Phase 2 flow. Build `executionContext` from `staticExecution` + `executionMapping`. Verify per-transaction bounds locally, request a receipt, block on negative results. |

Read-only tools still require authorization. The protocol forbids ungated read access — the read/write distinction is about *what* is enforced, not *whether* enforcement happens.

**Argument Coercion.** When applying `executionMapping` transforms:

- Numeric arguments stay numeric; non-numeric arguments are stringified.
- Array arguments with `transform: "join_domains"` MUST be reduced via: lowercase → extract domain (suffix after `@`) → deduplicate → sort ascending → join with comma. This produces a deterministic canonical form for `subset` checks.
- Reserved keys whose names start with `_` (e.g., `_imagePreview`) MUST NOT flow into `executionContext`. They are advisory metadata for proposal previews.
- When an argument is an object with an `email` property (e.g., a calendar attendee `{ email, displayName }`), implementations SHOULD coerce to the `email` value before applying string transforms.

## Human-readable affordances (UI layer, non-normative)

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

## Error Codes

Error codes are canonical across the protocol. Implementations MUST emit exactly these codes and MUST NOT alias them under different names. Codes prefixed with `INTERNAL_` or implementation-specific names are not part of the protocol surface and MUST NOT be relied on by integrators.

### Attestation Errors

| Code | Description |
|------|-------------|
| `BOUNDS_HASH_MISMATCH` | Recomputed `bounds_hash` does not match attestation |
| `CONTEXT_HASH_MISMATCH` | Recomputed `context_hash` does not match attestation |
| `INVALID_SIGNATURE` | Attestation signature verification failed |
| `OWNER_NOT_COVERED` | A required approver has no valid attestation |
| `TTL_EXPIRED` | Attestation has exceeded its time-to-live |
| `PROFILE_NOT_FOUND` | Referenced profile could not be resolved |
| `SCOPE_INSUFFICIENT` | Attestation does not cover a required approver |
| `MALFORMED_ATTESTATION` | Attestation structure is invalid (e.g., missing `context_hash`, missing `commitment_mode`) |
| `OWNER_SCOPE_MISMATCH` | Attesting identity is not a required approver |
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

## Future Directions

Optional extensions and forward-looking directions — Output Provenance, Content Provenance, Decision Streams, and resilience to a compromised Authority Server — live in a dedicated, non-normative companion document: see `review.md`. They are not part of the v0.5 binding surface.

## Versioning & Migration

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

## Summary

HAP v0.5 ensures automation serves human direction — not the reverse. Every authorized action carries cryptographic proof that a named human authorized a specific scope, with stated intent, within enforceable bounds. The signed attestation proves the commitment. The signed receipt proves the action.
