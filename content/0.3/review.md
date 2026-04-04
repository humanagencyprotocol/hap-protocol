---
title: "v0.3 Review — Findings and v0.4 Proposal"
version: "Version 0.3"
date: "March 2026"
---

## Context

These findings emerged from end-to-end testing of the HAP Agent Gateway with a live Stripe MCP integration. The test created a `spend@0.3` authorization and exercised gated tool calls against the Stripe API through the Gatekeeper.

What worked: attestation creation, Gatekeeper verification, frame hash computation, cumulative constraint enforcement, tool-level gating with execution mapping (cents to dollars divisor), and action_type enum rejection.

What surfaced: design tensions around **authority domain boundaries**, **tool scoping**, and **frame privacy** that v0.3 does not address.

---

## Finding 1: One Integration, Multiple Authority Domains

A single MCP integration (e.g., Stripe) exposes tools that span multiple authority domains:

| Tool | Authority domain | Profile |
|------|-----------------|---------|
| `create_payment_link` | Financial commitment | `spend` |
| `create_refund` | Financial commitment | `spend` |
| `create_customer` | Business data mutation | `data` |
| `create_product` | Business data mutation | `data` |
| `list_customers` | Read-only | (none) |

v0.3 maps one integration to one profile. This forces the spend profile to either:

- **Gate non-financial tools under spend** — `create_customer` gets `staticExecution: { action_type: "read" }` which fails against a `charge`-only authorization. Semantically wrong: creating a customer is not a financial decision.
- **Ungated non-financial tools** — `create_customer` passes without authorization. Functionally convenient but abandons the principle that consequential mutations require human authority.
- **Block non-financial tools entirely** — via the `default` catch-all gating. Correct in principle but prevents legitimate operations.

None of these are satisfactory. The root cause: **v0.3 assumes a 1:1 mapping between integration and authority profile**.

---

## Finding 2: Profiles Should Define Tool Scope, Not Just Gating Rules

The current `toolGating` section answers: "given this tool, how do we map its arguments to execution context?" But it does not answer: "should this tool be part of this profile's scope at all?"

The spend profile should only see tools that move money. `create_customer` should not appear in the spend profile's tool set — it belongs to a different authority domain entirely.

This is the difference between:
- **Tool gating** — how to verify a tool call against authorization bounds (v0.3)
- **Tool scoping** — which tools belong to which authority domain (missing)

---

## Finding 3: Data as the Source of Truth

The Stripe `create_customer` example reveals a workflow design issue. Customer data should not originate from the financial integration:

1. **`data` profile** — governs creation and mutation of business entities (customers, products)
2. **`spend` profile** — governs financial operations against those entities
3. The connection between them is a **sync or deployment step**, not a direct Stripe API call

An agent authorized under `spend` should charge an existing customer, not create one. Customer creation is a data domain operation that happens upstream.

---

## Finding 4: Frame Privacy — Bounds vs. Context

The v0.3 Privacy Invariant states:

> **No semantic content leaves local custody by default or by protocol design.**

The current implementation sends the full frame to the SP. For `spend` profiles this is benign — the frame contains abstract numeric bounds (`amount_max: 100`, `currency: USD`). But for `ship`, `provision`, or `data` profiles, the frame may contain operational details:

```
profile: ship@0.3
path: deploy-staging
target_env: staging.acme.internal
app: order-service
branch: feature/payments
deploy_max: 5
```

Here, `target_env`, `app`, and `branch` are semantic content that should not leave local custody. But `deploy_max` is an enforceable constraint the SP needs for receipt validation.

v0.3 treats the frame as a single object that goes to the SP in full. This violates the Privacy Invariant for any profile where the frame contains operational details.

---

## Finding 5: Domain Requirements Are Policy, Not Protocol

v0.3 profiles define `requiredDomains` per execution path:

```json
{
  "executionPaths": {
    "spend-routine": {
      "requiredDomains": ["finance"],
      "ttl": { "default": 86400, "max": 86400 }
    },
    "spend-reviewed": {
      "requiredDomains": ["finance", "compliance"],
      "ttl": { "default": 14400, "max": 86400 }
    }
  }
}
```

This creates three problems:

1. **Org structures vary.** Acme Corp's finance person might be "treasury." A bank might require "risk" + "treasury" + "cfo." The profile author cannot anticipate every org's governance structure.

2. **Personal use breaks.** A solo developer has no groups, no domains, no one to attest. But `spend-routine` demands `finance` domain coverage — there is no way to create a personal authorization.

3. **Governance changes require profile changes.** If an org adds a compliance requirement to routine spending, they must fork the profile to add a domain. This conflates protocol structure with organizational policy.

The root cause: **domain requirements are organizational policy, not protocol semantics.** "Who must approve a $100 payment" is a governance decision that differs by org. The profile should define *what* is bounded, not *who* must approve.

---

## Finding 6: Profile Design Principles for AI-Native Operations

**Observation:** End-to-end testing with Stripe and Gmail integrations, combined with analysis of what small AI-native businesses (1–10 people) need to operate, surfaced four principles for profile design that should guide v0.4 and beyond.

**Principle 1: One profile per authority domain, not per tool.**
A profile represents a category of consequential action — spending money, managing customers, publishing content. Multiple MCP tools and integrations map to one profile via integration manifests. Stripe and PayPal both map to `charge`. Notion and Airtable both map to `records`. This keeps profiles stable while allowing unlimited tool integrations.

**Principle 2: Integration manifests do the heavy lifting.**
Profiles define abstract bounds and execution context. Manifests map concrete tool arguments to those abstractions (e.g., Stripe's `unit_amount` in cents to the profile's `amount` in currency units, or Gmail's `to` field to `recipient_count` via a `length` transform). Adding a new payment provider requires only a new manifest, not a new profile.

**Principle 3: Profiles should be stable, manifests should be numerous.**
A team should never need to modify a profile. Profiles are infrastructure — defined once, versioned, immutable once published. Growth happens in manifests. A company with three Stripe accounts and two Gmail accounts doesn't need more profiles — they need more integration instances with the same profiles.

**Principle 4: Execution paths map to trust levels, not business processes.**
`customers-read` vs `customers-write` vs `customers-delete` reflects escalating trust requirements (24h / 8h / 2h TTL). They are not workflow stages. Do not create paths like `email-customer-support` and `email-sales-outreach` — the business context belongs in the human's gate answers, not in the path structure.

**Revised profile set for AI-native small businesses:**

| Profile | Authority Domain | Direction |
|---------|-----------------|-----------|
| `charge` | Receive money from customers | Money in |
| `purchase` | Spend company money | Money out |
| `email` | Communicate with specific people | Communication |
| `customers` | CRM: contacts, activities, deals, tasks | Customer data |
| `schedule` | Calendar: read, draft, book events | Time management |
| `publish` | Post public content: social media, blogs | Public presence |
| `records` | Personal structured data (renamed from `data`) | Personal data |

Seven profiles cover the full operational surface of a small business. They handle the operational work that drains time but isn't the team's core craft.

**Separation decisions:**

- **`schedule` is separate from `email`** — sending an email and booking a meeting are different consequential actions with different risk profiles, different bounds (recipients vs. duration/lookahead), and often different tools (Gmail vs. Google Calendar vs. Calendly). Folding them together forces combined authorization that nobody thinks about as one decision.

- **`data` split into `customers` (shared CRM) and `records` (personal data)** — a team CRM with contacts, deals, and activities is a shared authority domain with different access patterns than personal structured data. The `customers` profile defines a standardized CRM schema (contacts, activities, deals, tasks) that any MCP server can implement, enabling interoperable CRM tools. The `records` profile covers personal databases and spreadsheet replacements.

- **`purchase` is separate from `charge`** — spending company money and charging customers are opposite directions of money flow with different risk vectors. `charge` risks overcharging a customer (reputational + legal). `purchase` risks overspending company funds (financial).

**CRM as a HAP-native concept:**
The `customers` profile introduces a standardized CRM schema: contacts (with type, stage, tags), activities (email, call, meeting, note, purchase), deals (pipeline stages, values), and tasks (linked to contacts or deals). Any MCP server that implements this schema works with the `customers` profile — whether backed by SQLite, Postgres, Notion, or Airtable. This is different from wrapping an existing CRM API (Salesforce, HubSpot); those would get their own integration manifests mapping to the same `customers` profile.

---

## Immediate v0.3 Fix

Until v0.4, the spend profile should only list tools that move money in its `toolGating.overrides`. All other tools should be excluded by setting the `default` gating to reject, and only explicitly overridden tools are accessible:

- Financial operations: explicit `executionMapping` + `staticExecution`
- Financial reads: `null` (ungated — balance, invoice list, subscription list)
- Non-financial tools: not listed, caught by default, rejected

This means `create_customer`, `create_product`, `create_price`, `search_customers`, and other data-domain tools are blocked under spend by design. They require a separate `data` authorization to access.

---

## Proposal for v0.4

v0.4 addresses four issues: frame privacy (Finding 4), domain governance (Finding 5), execution accountability, and revocation. Multi-profile integration scoping (Findings 1-3) is deferred to v0.5 — it is architecturally sound but introduces significant complexity in tool resolution and conflict handling that requires separate design work.

### Replace Frame with Bounds + Context

The v0.3 "frame" concept is retired. In its place, two first-class concepts with separate cryptographic identities:

**Bounds** — enforceable constraints, sent to SP:
- Per-transaction limits: `amount_max`
- Cumulative limits: `amount_daily_max`, `amount_monthly_max`, `transaction_count_daily_max`
- Enum constraints: `currency`, `action_type`
- Structural: `profile`, `path`

The human defines ALL limits in their authorization — both per-transaction and cumulative. This preserves human agency: the decision owner sets the ceiling, not the SP administrator.

**Context** — operational details, stays local, optional, encrypted at rest:
- Deployment targets: `target_env`, `app`, `branch`
- Data subjects: `customer_segment`, `region`
- Any field the human uses to scope their intent but that the SP has no need to see

Each has its own hash:

```
bounds_hash  = hash(canonical(bounds))   — SP can verify (it has the bounds)
context_hash = hash(canonical(context))  — only gateway can verify (content is local)
```

Two hashes are necessary: `bounds_hash` lets the SP (and any third-party auditor) cryptographically verify that the bounds it enforces match what was attested. `context_hash` proves context was not tampered with post-attestation, verifiable only by the gateway which holds the content.

The attestation contains both hashes:

```json
{
  "bounds_hash": "sha256:abc...",
  "context_hash": "sha256:def...",
  "gate_content_hashes": { ... }
}
```

### What Goes Where

```
                     SP                          Gateway (local)
                     --                          ---------------
Bounds:              stored + enforced           stored
Context:             context_hash only           stored, encrypted
Gate content:        gate_content_hashes only    stored, encrypted
Attestation:         stored (signed blob)        cached
```

The SP enforces bounds (numeric ceilings, enum allowlists, cumulative limits). The Gatekeeper verifies everything locally — bounds against `bounds_hash`, context against `context_hash`, gate content against `gate_content_hashes`.

### Profile Schema

Profiles declare bounds and context as separate schemas:

```json
{
  "boundsSchema": {
    "keyOrder": ["profile", "path", "amount_max", "currency", "action_type",
                 "amount_daily_max", "amount_monthly_max", "transaction_count_daily_max"],
    "fields": {
      "profile":    { "type": "string", "required": true },
      "path":       { "type": "string", "required": true },
      "amount_max": { "type": "number", "required": true, "constraint": { "enforceable": ["max"] } },
      "currency":   { "type": "string", "required": true, "constraint": { "enforceable": ["enum"] } },
      "action_type": { "type": "string", "required": true, "constraint": { "enforceable": ["enum"] } },
      "amount_daily_max": { "type": "number", "required": true, "constraint": { "enforceable": ["max"] } },
      "amount_monthly_max": { "type": "number", "required": true, "constraint": { "enforceable": ["max"] } },
      "transaction_count_daily_max": { "type": "number", "required": true, "constraint": { "enforceable": ["max"] } }
    }
  },
  "contextSchema": {
    "fields": {}
  }
}
```

For `spend`, context is empty — all fields are bounds. For `ship` or `provision`, context carries operational detail.

### Example: spend

```
Bounds (-> SP):     { profile: "spend@0.4", path: "spend-routine",
                      amount_max: 100, currency: "USD", action_type: "charge",
                      amount_daily_max: 500, amount_monthly_max: 5000,
                      transaction_count_daily_max: 20 }
Context (local):    {} (empty)
```

### Example: ship

```
Bounds (-> SP):     { profile: "ship@0.4", path: "deploy-staging",
                      deploy_max: 5, env_type: "staging",
                      deploy_daily_max: 10 }
Context (local):    { target_env: "staging.acme.internal",
                      app: "order-service", branch: "feature/payments" }
```

The SP knows "up to 5 staging deploys, max 10/day." It does not know the server address, app name, or branch.

### Execution Model

The human defines all bounds. The SP enforces them. The gateway verifies locally and delegates cumulative checks to the SP.

```
Human -> defines bounds in authorization (per-tx + cumulative limits)
  |
SP at issuance -> validates bounds <= group limits (optional), signs attestation
  |
Agent calls tool
  |
Gateway -> verifies attestation locally (signature, TTL, domains, bounds_hash, context_hash)
  |
SP at execution -> checks per-tx bounds + cumulative totals against authorization bounds
               -> returns signed receipt with current consumption state
  |
Gateway -> proxies tool call if receipt approved
```

### Two Layers of Limits

Authorization bounds and SP group limits serve different purposes:

- **Authorization bounds** (human-defined, per-authorization): "I authorize up to $100/tx, $500/day for this agent."
- **Group limits** (optional, org policy): "No one in this organization can authorize more than $10,000/tx."

The SP enforces both:
- **At issuance** — if group limits are configured, SP refuses to sign an attestation whose bounds exceed them
- **At execution** — SP checks cumulative totals against the authorization's bounds, returns signed receipt with current consumption state

Group limits are optional. If not configured, the SP enforces only what the human authorized. Group limits constrain what humans can authorize — they do not override human decisions.

### Move Domain Requirements from Profiles to SP

Profiles no longer define `requiredDomains`. Execution paths keep their `description` and `ttl`, but domain requirements move to the SP as group-level configuration.

**Profile (v0.4):**

```json
{
  "executionPaths": {
    "spend-routine": {
      "description": "Day-to-day financial transactions within authorized bounds",
      "ttl": { "default": 86400, "max": 86400 }
    },
    "spend-reviewed": {
      "description": "Large or unusual transactions requiring dual authorization",
      "ttl": { "default": 14400, "max": 86400 }
    }
  }
}
```

**SP group configuration:**

```json
{
  "group": "acme-corp",
  "pathDomains": {
    "spend@0.4": {
      "spend-routine": ["treasury"],
      "spend-reviewed": ["treasury", "cfo"]
    }
  }
}
```

The profile defines *what* paths exist. The group admin defines *who* must attest for each.

### Two Modes of Operation

**Personal mode** (no group):
- All execution paths are available
- No domain requirements — the single user attests directly
- The SP skips domain authority checks
- The attestation's `resolved_domains` records the user's self-claimed domain (for audit)

**Group mode:**
- Only paths with configured domain requirements are available
- The group admin must assign at least one domain to each path they enable
- A path with no domain configuration is not available (cannot be selected in the UI)
- The SP validates domain authority: the attesting user must hold the required domain in the group

This separation means:
- **Profiles are universal** — the same `spend@0.4` profile works for a solo developer and a 500-person enterprise
- **Governance is organizational** — configured per group on the SP, alongside group limits
- **Personal mode just works** — no groups, no domains, no configuration required

### Execution Receipts

v0.3 attestations prove authorization but nothing proves execution. The gateway's execution log is unsigned and unverifiable. If the gateway claims "I only allowed 5 transactions," there is no cryptographic proof.

The SP acts as a **notary** for each execution. Before a tool call proceeds, the gateway requests an execution receipt from the SP. The SP checks the authorization's bounds (both per-transaction and cumulative), records the execution, and returns a signed receipt.

The receipt is the audit artifact. Every authorized action produces exactly one receipt. The receipt is cryptographic proof that a specific action occurred, under a specific attestation, within declared bounds, at a specific time.

No receipt, no execution.

#### Execution Flow

```
Agent -> Gateway                              -> SP
         |                                       |
         +- verify attestation (local)           |
         +- verify bounds_hash (local)           |
         +- verify context_hash (local)          |
         |                                       |
         +- request execution receipt ----------> validate attestation_id
         |                                       check per-tx bounds
         |                                       check cumulative limits
         |                                       record execution
         |                                       sign receipt
         |                              <------- return receipt + consumption state
         |                                       |
         +- execute tool call                    |
         +- store receipt locally                (SP retains authoritative copy)
```

The gateway MUST obtain a receipt before executing the tool call. The receipt is a pre-execution proof of authorization — not a post-execution confirmation.

#### Receipt Request Schema

The gateway sends the following to the SP when requesting an execution receipt:

```json
{
  "attestation_id": "uuid",
  "execution": {
    "tool": "create_payment_link",
    "action_type": "charge",
    "amount": 5,
    "currency": "EUR"
  },
  "timestamp": 1735888050
}
```

- `attestation_id` — references the active attestation under which this execution is authorized
- `execution` — the specific action values for this call (same shape as the `execution` block in bounded execution requests)
- `timestamp` — client-provided timestamp; the SP MAY reject if clock skew exceeds a configurable tolerance

#### Receipt Payload Schema

```json
{
  "header": { "typ": "HAP-receipt", "alg": "EdDSA" },
  "payload": {
    "receipt_id": "uuid",
    "attestation_id": "uuid",
    "version": "0.4",
    "profile_id": "charge@0.4",
    "execution": {
      "tool": "create_payment_link",
      "action_type": "charge",
      "amount": 5,
      "currency": "EUR"
    },
    "consumption": {
      "amount_daily": 45,
      "amount_monthly": 320,
      "transaction_count_daily": 8
    },
    "issued_at": 1735888050,
    "sp_did": "did:key:z6Mk..."
  },
  "signature": "base64url..."
}
```

**Required fields:**

| Field | Description |
|-------|-------------|
| `receipt_id` | Unique identifier for this receipt, generated by the SP |
| `attestation_id` | The attestation this execution is authorized under |
| `version` | Protocol version |
| `profile_id` | Profile governing this execution |
| `execution` | The action values that were authorized (mirrors the request) |
| `consumption` | Current cumulative state after this execution is applied |
| `issued_at` | SP-authoritative timestamp |
| `sp_did` | The SP's decentralized identifier |

**Signature:** The SP signs the receipt with the same Ed25519 key used for attestations. The signing input is the canonical JSON serialization of `payload`.

#### SP Validation Before Issuing

The SP MUST reject the receipt request if:

- `attestation_id` is unknown, expired, or revoked
- Any `execution` value exceeds the per-transaction bounds in the attestation's frame
- Any cumulative limit would be exceeded after applying this execution
- The profile referenced by the attestation is unknown or untrusted
- Clock skew between client `timestamp` and SP clock exceeds tolerance

**Error response:**

```json
{
  "approved": false,
  "errors": [
    {
      "code": "CUMULATIVE_LIMIT_EXCEEDED",
      "field": "amount_daily",
      "message": "Daily spend would be 95, exceeding limit of 80",
      "limit": 80,
      "current": 40,
      "requested": 55
    }
  ]
}
```

**Receipt error codes:**

| Code | Meaning |
|------|---------|
| `ATTESTATION_NOT_FOUND` | Unknown attestation_id |
| `ATTESTATION_EXPIRED` | Attestation TTL has elapsed |
| `ATTESTATION_REVOKED` | Attestation has been revoked |
| `BOUND_EXCEEDED` | Per-transaction bound violated |
| `CUMULATIVE_LIMIT_EXCEEDED` | Cumulative limit would be exceeded |
| `PROFILE_NOT_FOUND` | Referenced profile unknown |
| `CLOCK_SKEW` | Client timestamp outside tolerance |

#### Consumption State

Each receipt includes the cumulative consumption state *after* this execution is applied. The consumption object mirrors the cumulative fields defined in the profile's execution context schema.

The gateway uses consumption state to:
- Display live usage to the human in the agent's context
- Make local pre-flight decisions (e.g., warn the agent it is approaching a limit)

The SP's consumption state is authoritative. The gateway's local state is advisory.

#### Verification

Any party with the SP's public key can verify a receipt:

1. Resolve `sp_did` to the SP's Ed25519 public key
2. Canonicalize the `payload` object (deterministic JSON serialization)
3. Verify the `signature` against the canonical payload using the public key
4. Optionally verify that `attestation_id` references a valid attestation (for full chain-of-trust audit)

A valid receipt proves: this SP authorized this specific execution, under this attestation, at this time, with these cumulative totals.

#### Retention

The SP MUST retain all receipts for at least the profile-defined `retention_minimum`. Receipts MUST be:

- Append-only (no mutation or deletion within retention period)
- Queryable by `attestation_id` (return all receipts for an attestation)
- Queryable by time range
- Available for export in a standard format for external audit

The gateway SHOULD retain receipts locally for operational use but the SP copy is authoritative.

#### Properties

- **Cryptographic proof per execution** — every authorized action has an SP-signed receipt
- **Cumulative enforcement at the SP** — the SP tracks usage against the human's declared bounds
- **Cumulative state moves to SP** — the gateway no longer needs a durable execution log for cumulative tracking; the SP receipt is authoritative
- **Full audit trail at the SP** — every receipt is stored, signed, and queryable
- **Third-party verifiable** — anyone with the SP's public key can verify any receipt
- **Pre-execution guarantee** — the receipt is issued before the tool call executes, not after

The SP is a runtime dependency for execution. This is by design — execution without proof is execution without accountability.

### Revocation

With execution receipts flowing through the SP, revocation becomes possible:

- SP maintains a revocation list
- When the gateway requests a receipt, SP checks if the attestation has been revoked
- Revoked attestations return an `ATTESTATION_REVOKED` error
- The human can revoke through the SP interface at any time

The attestation remains cryptographically valid for audit, but the SP refuses to issue execution receipts against it. v0.3 relies on TTL only — there is no way to stop an agent before TTL expires.

### Impact on Current Implementation

1. **hap-profiles** — replace `frameSchema` with `boundsSchema` + `contextSchema`; remove `requiredDomains` from `executionPaths`
2. **hap-sp** — store bounds + `bounds_hash` + `context_hash`, never store context content; add per-group path domain configuration; attest route checks domains from group config (group mode) or skips (personal mode)
3. **hap-gateway** — store context locally (encrypted), only send bounds to SP; `requiredDomains` comes from SP response, not profile; personal mode sends no domain requirements
4. **hap-gateway UI** — personal mode: no domain selector, all paths available; group mode: only paths with configured domains shown
5. **Attestation payload** — replace `frame_hash` with `bounds_hash` + `context_hash`
6. **Gatekeeper** — verify `bounds_hash` and `context_hash` separately
7. **hap-core** — update `computeFrameHash()` to `computeBoundsHash()` + `computeContextHash()`

Existing v0.3 attestations with `frame_hash` remain valid under a migration path: treat `frame_hash` as `bounds_hash` with empty context.

---

## Deferred to v0.5: Multi-Profile Integration Scoping

Findings 1-3 identify the need for multi-profile integrations (one integration governed by multiple profiles). This requires:

- **Tool scope declaration** — profiles declare which tools they claim authority over (allowlist)
- **Multi-profile integrations** — an integration maps tools to different profiles
- **Profile-scoped read-only tools** — `list_customers` visible under `data`, not `spend`
- **Agent tool set resolution** — union of tools from all active authorizations

This is deferred because it introduces unresolved design questions:

- Tool conflict resolution (tool claimed by multiple profiles)
- Cross-profile dependencies (spend tool needs data from data-scoped tool)
- Profile composition (composite authorizations spanning multiple profiles)

The v0.3 immediate fix (allowlist financial tools only under spend) is sufficient until this is designed.

---

## Future: Profile Actions and Provider Mapping

Tool scoping uses provider-specific tool names in profiles. A future version could introduce:

- **Profile actions** — profiles define canonical actions (`charge`, `refund`, `subscribe`). The human authorizes against these, not tool names. Integration-agnostic.
- **Provider mapping** — a separate layer maps provider tools to profile actions (`create_payment_link` -> `charge`). Swap providers without changing profiles or authorizations.

This is deferred because the current `action_type` + `toolGating` model works for per-execution bound checking, and tool scoping solves the immediate domain boundary problem.

---

## Design Decisions

- **SP availability** — The SP is a runtime dependency for execution receipts. No receipt, no execution. Degraded mode is not supported — this is by design.
- **Cross-SP multi-domain** — Not supported in v0.4. Single SP per deployment.
- **Context evolution** — Context cannot be updated after attestation. Changing context invalidates `context_hash`, requiring re-attestation. This is intentional: the human's operational scope is part of what was committed to.
- **Empty context hash** — Always included. `context_hash` of `{}` explicitly proves "there was no context." Uniform attestation structure, no conditional parsing, forward compatible if context fields are added later.
- **Domain requirements are policy** — Profiles define what paths exist. The SP (group admin) defines who must attest for each path. In personal mode, no domain requirements — single user attests directly. In group mode, paths without configured domains are unavailable. At least one domain must be assigned to enable a path for a group.

## Finding 7: Execution Paths Are Redundant

**Observation:** With the introduction of commitment mode (Automatic vs Review Each Action), execution paths no longer serve a purpose that isn't already covered by other mechanisms.

v0.3 execution paths defined different "modes" of operation under the same profile — e.g., `spend-routine` vs `spend-reviewed`, or `publish-draft` vs `publish-post`. Each path could have different TTLs and different required domains.

**What made them redundant:**

1. **Commitment mode replaces risk-level paths.** `publish-draft` (human reviews before posting) and `publish-post` (agent posts directly) are now commitment mode choices — "Review Each Action" vs "Automatic." This works for every integration without profiles pre-defining draft/post paths.

2. **Tool gating already controls what the agent can do.** Integration manifests define which tools are gated and how. The gatekeeper enforces bounds per tool call, not per path.

3. **TTL is a per-authorization choice.** The user selects TTL during authorization. Different paths having different TTL defaults adds complexity — the human should decide based on their situation, not based on what the profile author pre-defined.

4. **Bounds already constrain scope.** `post_daily_max: 3` limits the agent regardless of path. The enforcement layer doesn't need paths to enforce limits.

5. **Paths confuse users.** "Choose an execution path" is protocol jargon. The real user decisions are: what can the agent do (bounds), for how long (TTL), and do I review each action (commitment mode).

### Proposal: Remove Execution Paths in v0.4

**Remove from protocol:**
- `execution_path` field from the attestation frame
- `path` field from bounds schema
- `path=<execution-path>` from frame canonicalization

**Remove from profiles:**
- `executionPaths` object — TTL stays at profile level: `ttl: { default, max }`

**Simplify SP group configuration:**
- Replace `pathDomains` with `profileDomains` — domain requirements per profile, not per path
- "Who can authorize spend" not "who can authorize spend-routine vs spend-reviewed"

**What replaces what:**

| Execution Path Feature | Replacement |
|---|---|
| Different TTLs per path | User selects TTL at authorization time |
| Draft vs post paths | Commitment mode: Review vs Automatic |
| Different domains per path | Domains per profile in group config |
| Path as governance level | Commitment mode + bounds + TTL |

**Add to attestation:**
- `commitment_mode`: `"automatic"` or `"review"` — explicitly records the human's choice

**Migration:**
- v0.3 attestations with `execution_path` remain valid — field is ignored during verification
- Profiles with `executionPaths` continue to work — field is ignored
- SP `pathDomains` configs collapse into `profileDomains` (union of all path domains per profile)

**Impact:**
1. hap-profiles — remove `executionPaths`, keep `ttl` at profile level
2. hap-sp — replace `pathDomains` with `profileDomains`
3. hap-gateway UI — remove path selector, keep TTL selector and commitment mode
4. hap-core — remove `path` from frame computation
5. Gatekeeper — stop validating `execution_path`
6. Attestation schema — remove `execution_path`, add `commitment_mode`

---

## Finding 8: Collapse Direction Gates to Single Intent Field

**Observation:** The three direction gates (Problem, Objective, Tradeoff) are protocol-correct but user-hostile. Users don't naturally decompose intent into these categories. The distinction between "why is this justified" and "what should the agent achieve" is blurry — most users write the same thing in both. Three separate screens of text input creates friction without improving accountability.

**What the three gates were designed to do:**

Force the user to think about *why*, *what outcome*, and *what risks* separately. This produces structured direction state for agent planning and structured hashes for audit.

**Why it doesn't work in practice:**

1. Users don't think in these categories. They think: "I want my agent to do X because of Y, and be careful about Z."
2. The distinctions are blurry. "Process refunds" is simultaneously the problem and the objective.
3. Three text screens feel like bureaucracy, not useful reflection.
4. Users write the minimum to proceed — defeating the purpose.

**The accountability argument doesn't hold:** The cryptographic guarantee is that the user committed to *something* before execution. Whether that's three separate hashes or one hash over a single text block, the proof is equivalent. The user is accountable for what they wrote either way.

**What matters for the agent:** The agent needs context — why this authorization exists and what to be careful about. One well-written paragraph provides more useful intent than three reluctant one-liners.

### Proposal: Single Intent Gate in v0.4

Replace the three direction gates with one `intent` gate.

**Protocol changes:**

- `gate_content_hashes` changes from `{ problem, objective, tradeoffs }` to `{ intent }`
- Single hash, single field, single gate
- `requiredGates` in profiles: replace `problem`, `objective`, `tradeoff` with `intent`
- Remove `gateQuestions` from profiles entirely — the intent prompt is universal, defined in the gateway UI

**UX:**

One field with guidance prompts (not required sections):

> **What should your agent know?**
>
> Help your agent understand your intent. Consider:
> - **Why** — What's the situation? Why does this need to happen?
> - **Goal** — What should the agent try to achieve?
> - **Watch out** — What should the agent avoid or be careful about?

The user writes naturally. The prompts guide completeness without forcing categories. Integration manifests may optionally provide a contextual hint (e.g., "For payment authorizations, consider mentioning your refund policy").

**AI assistant role:** One advisory call instead of three. "Based on your bounds and what you've written, here are some things to consider — risks you haven't mentioned, edge cases."

**Attestation payload:**

```json
{
  "gate_content_hashes": {
    "intent": "sha256:..."
  }
}
```

**Profile schema:**

```json
{
  "requiredGates": ["bounds", "intent", "commitment", "decision_owner"]
}
```

No `gateQuestions`. The intent prompt is universal. Integration manifests may optionally include an `intentHint` string for context-specific guidance.

**Migration:**
- v0.3 attestations with `{ problem, objective, tradeoffs }` remain valid — hashes are still verifiable
- v0.4 attestations use `{ intent }` — single hash
- Profiles with `requiredGates: ["problem", "objective", "tradeoff"]` mapped to `["intent"]`

**Impact:**
1. hap-core — update `gate_content_hashes` type, hash computation
2. hap-sp — accept `{ intent }` in attestation requests, validate single gate
3. hap-gateway UI — replace three gate screens with one intent field
4. hap-gateway MCP — mandate brief includes `Intent:` instead of separate `Problem:/Objective:/Tradeoffs:`
5. hap-profiles — remove `gateQuestions`, replace three direction gates with `intent` in `requiredGates`
6. Integration manifests — optional `intentHint` field for context-specific guidance

**Authorization title:** v0.4 also introduces a required `title` field — a human-readable label for the authorization (e.g., "Daily refund processing"). The title is stored as metadata, not part of the attestation hash.

---

## Open Questions (v0.5)

1. **Receipt batching** — For high-frequency agent operations, per-execution SP calls add latency. Should the protocol support batched receipt requests?
2. **Multi-profile integrations** — Tool scoping, conflict resolution, cross-profile dependencies (see Deferred to v0.5 section).
3. **Profile actions and provider mapping** — Canonical actions vs. provider-specific tool names (see Future section).




Steps generation - they will be newls generated each time the users come back. - it should be 
