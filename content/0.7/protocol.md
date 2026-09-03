---
title: "Human Agency Protocol — Core Specification"
version: "Version 0.7"
date: "August 2026"
status: "Normative specification — draft"
description: "The normative HAP specification: profiles, bounds, scope, gates, mandates, mandate tickets, content binding, read authorization, and owner signatures. No mandate, no ticket. No ticket, no execution."
---

**HAP defines cryptographic pre-authorization of bounded execution — whether by AI agents, CI/CD pipelines, or automated systems.**

AI systems increasingly execute tasks, call tools, and trigger irreversible actions.
The central risk is not only misalignment, but execution **without a mandate** — an action no identifiable human signed for — and direction drift inside a mandate's bounds.

HAP solves this by defining how a human gives an agent a **mandate** — signed, bounded, revocable — and how every consequential action under it obtains a **mandate ticket** before it runs. The ticket is cryptographic proof of who authorized the action, when, and within which bounds.

> **No mandate, no ticket. No ticket, no execution.**

The key words MUST, MUST NOT, REQUIRED, SHALL, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document and in `governance.md` are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals.

**The ticket is pre-execution proof, not post-execution confirmation.** The Gatekeeper MUST obtain a ticket from the Authority Server *before* the tool call executes. If the AS refuses to issue one — or is unreachable — the action MUST NOT proceed. This makes the AS a runtime dependency by design: execution without proof is execution without accountability.

The protocol distinguishes between:

- **Authorization State** — what is permitted, by whom, and under what bounds (enforceable)
- **Direction State** — the semantic intent that informs agent planning within those bounds (local, private)

The protocol does not generate decisions.
It defines the conditions under which mandated execution may occur.

AI cannot originate human authority, and it cannot safely infer human direction. Authorization is made enforceable through signed mandates and Gatekeeper verification. Direction is preserved locally and never leaves local custody by default.

---

## Protocol Scope

### What the Protocol Verifies

The protocol verifies:

- A human committed (cryptographic signature)
- To bounded action (`bounds_hash`)
- Under specific operational scope (`scope_hash`)
- With stated intent (`gate_content_hashes.intent`)
- At a specific time (AS timestamp)
- With declared authority (owner identity)
- That every consequential action was authorized for execution within bounds (signed tickets)

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

### Bounds, Scope, and Disclosure

The protocol distinguishes two structural categories of authorization parameters:

- **Bounds** — enforceable constraints. These are sent to the Authority Server in plaintext so the AS can verify per-transaction limits and track cumulative consumption against the human's declared ceilings. Bounds are typically abstract (numeric ceilings, enum allowlists, time windows) and contain no operational secrets.
- **Scope** — operational details that narrow the mandate but require no AS enforcement. Scope stays local. The AS only ever sees `scope_hash`. Examples: deployment targets, customer segments, data subjects.

Any semantic content used to reach a decision (AI analysis, deliberation, reasoning) remains local and out of protocol scope.

Both categories above are **signed into the mandate** — Bounds via `bounds_hash`, Scope via `scope_hash`. They govern **consequential action**: what the agent may *do* on the human's behalf, enforced through the signed ticket loop. A third class of constraint governs **non-consequential access** — how far an agent may *read* into the human's own data (e.g. a read-age window, readable containers). Because reads produce no ticket (see *Protocol Composition*), read policy MAY be enforced **locally by the Gatekeeper and left unsigned** — present in neither `bounds_hash` nor `scope_hash`.

The governing rule is that **a limit lives in the same trust domain as its enforcement.** A constraint enforced through the signed ticket loop MUST be signed, so any relying party can verify it. A constraint enforced only by the local Gatekeeper, over the human's own data, need not be — there is no counterparty to prove it to, and a signed read limit that no ticket ever checks would be a signature over nothing. The exception proves the rule: where a read limit must be enforced by *another party against the human* — an organization capping a member's read reach — it re-enters the signed surface, because now there is a counterparty who must trust it.

**Precedence (normative since v0.6).** Some profiles published before this rule carry read-shaped bounds inside the signed mandate (e.g. a `read_max_age_days` bound). Where an implementation supports both, the **local read policy governs** and the signed read bound is a **fallback** applying only to mandates issued before a local policy was set. This is a deliberate, narrow exception to "only signed data is trusted": the signed value was a limit in the wrong trust domain, and freezing it into the mandate promised an enforcement the ticket loop never checks. With neither a local policy nor a signed bound present, reads fail closed (see *Read Authorization*).

### Action vs. Execution

The protocol uses two related but distinct terms:

| Term | Meaning | Signed via |
|------|---------|-------------|
| **Action** | WHAT is being authorized | Bounds + scope (profile-specific) |
| **Execution** | HOW it is carried out, under what constraints | `bounds_hash`, `scope_hash`, `execution_context_hash` |

**Action** is the thing being authorized — charge customers up to $100, deploy to staging, send up to 20 emails per day. The action is identified by the bounds and scope, which are hashed into `bounds_hash` and `scope_hash` and signed in the mandate.

**Execution** is the carrying out of that action under specific constraints — which commitment mode, which owners must approve, what intent the human committed to.

The Gatekeeper receives the bounds + scope and mandate, reconstructs both hashes, and validates that they match. On the consequential path, only signed data is trusted — the Gatekeeper never accepts unsigned parameters for a write. Read policy is the stated exception (see *Bounds, Scope, and Disclosure* above and *Read Authorization* below): it is deliberately local and unsigned, and where a legacy signed read bound and a local read policy both exist, the local policy governs and the signed bound is a fallback for mandates that predate it.

### Protocol vs. Profile Layering

The protocol defines abstract concepts. Profiles define concrete implementations.

| Layer | Defines | Example |
|-------|---------|---------|
| **Protocol** | Bounds/scope structure, mandate format, ticket format | "Bounds must be hashed and signed" |
| **Profile** | What bounds and scope fields exist for a specific authority area | "The charge profile defines amount_max, currency, action_type" |

HAP governs any context where humans authorize bounded action by automated systems:

- AI agent workflows (human commits to bounds, agent executes within)
- Code deployment (git repositories)
- Document approval (markdown files, wikis)
- Infrastructure changes (Terraform, Ansible)
- Policy decisions
- Contract signing

The protocol must remain abstract. Domain-specific bindings belong in profiles.

---

## Protocol Composition

HAP is designed for AI agents and other autonomous, semi-autonomous, or automated systems that can take consequential actions after a human has authorized a bounded scope of execution.

HAP is **not** an authentication protocol, an API-access protocol, a tool-transport protocol, or a task-orchestration protocol. It is the **authorization, enforcement, and ticket layer for consequential execution**: it governs the moment where an already-reachable capability is used by an automated system to take an action with material effect.

HAP is designed to **compose with** existing authentication, identity, tool-exposure, authorization, observability, and orchestration systems. It replaces none of them. The systems named below are illustrative, not normative:

- **OAuth / OpenID Connect** may authenticate users, authorize clients, and obtain API access tokens.
- **EUDI wallets, WebAuthn, passkeys, hardware keys, or other identity systems** may establish the verified identity of a Mandate Owner.
- **Organizational policy, verifiable credentials, directory systems, or Authority Server group configuration** determine whether that verified identity has authority for a given profile.
- **MCP or equivalent tool protocols** may expose executable capabilities to agents or other automated systems.
- **A2A, workflow engines, or tracing systems such as OpenTelemetry** may model task lifecycle, messages, artifacts, status, streaming updates, operational history, and observability.

HAP begins at the **consequential-execution boundary**. A system may hold API access through OAuth. A tool may be exposed through MCP. A task may be coordinated through A2A or a workflow engine. None of those facts is sufficient for HAP-conformant consequential execution.

> A HAP-conformant implementation **MUST NOT** execute a consequential action unless the Gatekeeper has verified the relevant mandate and obtained a valid mandate ticket from the Authority Server **before** execution.

**OAuth grants reachable capability. HAP governs authorized use of that capability.**

### Relationship to OAuth Rich Authorization Requests

OAuth Rich Authorization Requests (RAR) enrich OAuth authorization by allowing structured authorization details to be requested and represented in the OAuth authorization flow. A resource server may use those details to enforce fine-grained API access.

HAP serves a different layer. HAP does not grant API access. HAP requires each consequential execution by an autonomous or semi-autonomous system to be reduced to a profile-defined execution context, checked against human-signed bounds, and authorized by a signed pre-mandate ticket.

In short:

- **OAuth** answers: *"May this client access this resource?"*
- **OAuth RAR** answers: *"May this client access this resource under these structured authorization details?"*
- **HAP** answers: *"May this autonomous execution proceed now under this human-signed mandate, and is there a signed ticket proving that before execution?"*

### Example Integration Topology (non-normative)

A representative deployment composing HAP with OAuth and MCP:

1. The user connects an external service using OAuth.
2. The external API is exposed to an agent through MCP tools.
3. The Gatekeeper intercepts MCP write (consequential) calls.
4. The Gatekeeper maps the tool arguments into a profile-defined execution context.
5. The Gatekeeper verifies the human mandate (bounds, scope, intent, commitment mode).
6. The Authority Server checks bounds, cumulative limits, expiry, revocation, and required-approver coverage.
7. The Authority Server issues a signed mandate ticket.
8. The executor performs the API call only after the ticket is issued.

This topology is illustrative: HAP Core specifies the mandate, ticket, and Gatekeeper obligations, not the surrounding transport or identity choices.

---

## Privacy Invariant

> **No semantic content leaves local custody by default or by protocol design.**

This includes (but is not limited to): source code, diffs, commit messages, natural language descriptions, rendered previews, risk summaries, and the full text of the human's intent.

HAP MAY transmit cryptographic commitments (e.g., hashes), structural metadata, and signatures, but MUST NOT transmit semantic evidence to Authority Servers or Executors. In particular, a Gatekeeper MUST NOT send the preimage of any hash it computes — the bounds are the one deliberate exception, sent in plaintext because the AS enforces them.

**Transport.** The protocol fixes payloads, not transport. Any transport carrying a mandate request, ticket request, or proposal between a Gatekeeper and an Authority Server MUST provide confidentiality and server authentication (in practice, TLS with a verified certificate); the signatures defined here protect integrity and attribution of the artifacts, not the privacy of the request that produced them.

The bounds/scope split is the structural mechanism that enforces this invariant: bounds (abstract limits) flow to the AS; scope (operational details) stays local. The AS only sees `scope_hash`, never the scope content.

Any disclosure of semantic content MUST be an explicit, human-initiated action outside the protocol. The protocol makes authorship verifiable without exposing content.

---

## Threat Model

Implementations MUST assume:

- compromised Local App (blind-signing risk),
- malicious or buggy Executor,
- malicious or negligent Authority Server,
- profile and supply-chain attacks.

HAP does **not** assume trusted UIs, trusted executors, or honest automation.

### What HAP does not secure

> New in v0.6.

HAP is an authorization and evidence layer. It is not a sandbox, a hypervisor, a secrets manager, or a network policy engine, and it MUST NOT be deployed as though it were. The following are preconditions supplied by the execution environment, not properties HAP provides:

- operating-system, container, and hypervisor isolation
- credential custody and vaulting
- network segmentation and egress control
- host hardening and patching
- minimization of the trusted computing base

The relationship is the same one TLS has to the operating system it runs on: TLS does not secure the host, and is not weakened by saying so — it is precise about what it protects and about what a compromised endpoint costs. HAP's guarantee is *this action was authorized against a human's bounded mandate, and there is portable proof*. It is not *this machine is trustworthy*.

**The load-bearing assumption is complete mediation** (`governance.md` → *Invariant 10*): everything above holds only where a consequential capability cannot be reached except through a HAP-enforced boundary. Where an agent can reach an effector by another path, HAP's decision is not wrong — it is simply not consulted. The two ways to satisfy that condition, and the obligations each places on the deployment, are specified in `governance.md` → *Deployment Security Profile*.

---

## Roles

| Role | Description |
|------|-------------|
| **Mandate Owner** | The identifiable human who gives the mandate, accepts responsibility for what runs under it, and acts within the authority granted to their identity. Always one person — never a role, committee, policy, shared account, or system. Whether their name is disclosed is a separate, opt-in property (*Identity Assurance*). |
| **Local App** | The local environment where the human reviews and the agent operates. Holds intent and scope in plaintext. |
| **Agent** | The automated system (AI agent, pipeline, script) that proposes and carries out actions within authorized bounds. |
| **Gatekeeper** | Verifies mandates and bounds locally, requests tickets from the Authority Server pre-flight, and enforces fail-closed. |
| **Authority Server (AS)** | Issues signed mandates and mandate tickets; enforces per-transaction and cumulative bounds; maintains revocation. |
| **Executor** | Carries out the downstream tool call once the Gatekeeper has obtained a valid ticket. |

> **Note on terminology and placement.** The Roles section is defined here, near the front, so the actors are named before the mechanisms that involve them.

### Authority, Mandate, Ticket, Capability, Execution

v0.6 fixed four terms that earlier versions used loosely. v0.7 makes them — with one addition — the protocol's *only* vocabulary: the same words on the wire, in this document, and in public. The distinctions are load-bearing: the vocabulary must not concede what the architecture refuses.

**Authority** — the legitimate power to decide that a consequence may occur. Held by the Mandate Owner — one identifiable human — or by an institution *through* identifiable humans. Not held by the agent.

**Mandate** — what a person gives an agent under that authority: a bounded, revocable permission for a defined class of execution — profile, bounds, scope, committed intent, commitment mode, approvers, expiry. The signed mandate (the `HAP-mandate` object the Authority Server issues, optionally co-signed by its owner) *is* the record; there is no second artifact. Until v0.6 this record was called an *attestation*; the word is retired (see *Migration from v0.6*).

**Mandate ticket** (*ticket*) — what a mandate produces for one action: an AS-signed proof, obtained *before* the action runs, that this execution fell inside this mandate at this time. One ticket admits one action. Afterwards the same object is the evidence — for the owner, an auditor, a counterparty, or a court; it does not become something else and does not change its name. Until v0.6 this object was called an *execution receipt*; the word is retired for carrying the wrong tense — a receipt follows payment, and the whole point of the ticket is *before*.

**Capability** — what the agent can technically do through a tool or API, irrespective of whether it may. Capability is access. **Access is not a mandate.**

**Execution** — one attempted consequence, evaluated against the mandate before it may run. The specification keeps *action* (what is being authorized) and *execution* (one attempt to carry it out) apart — see *Action vs. Execution*.

**Without a mandate** (*unmandated*) — the condition the protocol exists to make impossible: a consequential action no identifiable human signed for. How narrow the agent's access is does not matter — a tightly scoped credential used ten thousand times a month with no human's name on any single use is unmandated ten thousand times. The failure HAP addresses is attribution, not reach.

*(Informally, implementation surfaces call a mandate a **grant** or an **authorization**; both name the same object. **Limits** is the public synonym for bounds and does not appear in normative text. The v0.6 glossary kept retired words alive inside signed identifiers "to avoid invalidating artifacts"; v0.7 reverses that — one word per thing, everywhere, while there is one implementation and no external integrator to migrate.)*

> **HAP does not model an automated system as an authority holder.** Authority remains with the accountable human or institution — the Mandate Owner. The automated system executes under a bounded mandate issued under that authority. A mandate constrains execution; it does not transfer authority.

The design already enforces this: no authority-bearing credential, mandate, or signing key is ever placed in the agent's possession. The agent receives a brief describing its bounds — that much is transferred, and must be, or it could not stay inside them. What it never receives is anything it could present as proof of authority. It requests execution; the Gatekeeper evaluates each consequential call against a mandate held elsewhere; execution may still be refused.

An implementation may track which model, process, or session performed something, for attribution and telemetry. That is useful and orthogonal. It does not make the agent an authority holder, and HAP deliberately does not authorize agents — **it authorizes executions against mandates**. This exclusion is stated so that agent-level authorization is not added later in the belief that its absence was an oversight.

If some jurisdiction grants autonomous systems a legal status of their own, the security model is unchanged, because it never rested on their lacking one.

---

## Decision States

HAP distinguishes between two categories of decision state: **Authorization State** and **Direction State**. They are not exposed or enforced in the same way.

Authorization determines whether execution may occur. Direction determines how an agent should act within authorized bounds.

### Authorization States

**Bounds — What is authorized?**

The enforceable constraints on action — per-transaction ceilings, cumulative limits, allowed enums. Bounds are profile-defined and human-set. They are sent to the AS in plaintext and hashed into `bounds_hash`.

**Scope — Where does the mandate apply?**

Operational details that narrow the mandate but stay local — deployment targets, customer segments, data subjects. Scope is profile-defined and human-set. It is hashed into `scope_hash`. Empty scope (no fields) is permitted; the hash is still computed and included.

**Commitment — Has a human explicitly approved execution?**

Commitment closes alternatives and authorizes proceeding. Commitment is recorded in the mandate as `commitment_mode`:

- `automatic` — the agent acts within the bounds without per-action human approval
- `review` — each agent action becomes a proposal that the human must approve before execution

`commitment_mode` is part of the **signed** mandate payload. The Gatekeeper MUST drive its review-vs-automatic routing from the signed value, not from any unsigned metadata an Authority Server returns alongside it. If the signed `commitment_mode` requires review (`review` or `review_above_cap`) but the AS supplies no pending approvers, the two disagree — a possible commitment-mode downgrade — and the Gatekeeper MUST fail closed (refuse to auto-execute) rather than treat the action as automatic.

**Mandate Owner — Who is accountable for the authorization?**

Execution requires an identifiable human who is a required approver for the decision.

### Direction State

**Intent — Why this authorization, what should the agent achieve, what should it avoid?**

A single locally-held statement that informs the agent's planning within the bounds. It typically covers:

- **Why** — What's the situation? Why does this need to happen?
- **Goal** — What should the agent try to achieve?
- **Watch out** — What should the agent avoid or be careful about?

These are guidance prompts, not enforced categories. The user writes naturally; the protocol stores a single hash (`gate_content_hashes.intent`).

Direction State may contain semantic content. It is local by default, may be encrypted by the implementation, and MUST NOT be transmitted to Authority Servers, Gatekeepers, or Executors as semantic plaintext. The protocol commits to a cryptographic commitment to Direction State (via `gate_content_hashes.intent`), but does not require its disclosure.

**Intent canonicalization.** `gate_content_hashes.intent` is `sha256` over the intent text **canonicalized** as follows, so that any party — the mandate owner, a second approver on another machine, or a third-party auditor — reproduces the identical hash from the same logical statement:

1. Encode as **UTF-8**.
2. Apply Unicode normalization form **NFC**.
3. Normalize line endings to a single `\n` (`\r\n` and `\r` → `\n`).
4. Strip trailing whitespace on each line, then strip leading and trailing whitespace from the whole string.

The hash is computed over the resulting byte sequence. This determinism is REQUIRED: in multi-owner decisions each owner commits separately and all mandates MUST carry the same `gate_content_hashes.intent` (see *Multi-Owner Coverage Rule*), which is only achievable if intent canonicalization is identical across implementations of this protocol version. Canonicalization defines the hash only; it does not alter the intent text an implementation stores, encrypts, or displays.

### Normative Distinction

Authorization States are required for mandate and Gatekeeper enforcement.
Direction State (intent) is required by every profile since v0.5, but its semantic content remains outside protocol disclosure by default.

Implementations MUST ensure all required states are resolved before a mandate is issued and before anything executes under it.
No skipping, no inference, no automated assumption.

---

## Mandate Ownership

Ownership is a **gate for valid decision-making**, not just a state.

### The Mandate Owner
A **Mandate Owner** is one identifiable natural person — resolved by the Authority Server's authentication to exactly one human — who:
1. Explicitly gives the mandate
2. Accepts responsibility for what executes under it
3. Acts within the authority granted to their identity (configured per group on the AS)

A Mandate Owner is invalid if the decision's declared consequences exceed the authority granted to them.

**A Mandate Owner is one identifiable human (normative, v0.7).** Institutional authority — an office, an organization, a policy — is valid under HAP only when exercised *through* one identifiable person who answers for the act. A role, a committee, a policy document, a shared account, or an automated system MUST NOT be enrolled as an owner identity, and a mandate whose owner resolves to one is invalid (`governance.md` → *Invariant 2*). The rule binds the Authority Server's enrolment and authentication — it is an honest-operator control (*Enforcement classes*): no verifier can tell a person from a shared mailbox behind a DID, which is why it is stated as an obligation on the AS rather than as a property of the artifact. Whether the person's *name* is disclosed is a separate, opt-in property (*Identity Assurance*); the default record is a pseudonymous DID. This is what separates a mandate from a control: a control is a fence an institution writes and a system enforces; a mandate is what a person signs and answers for.

### Owner Authority

Since v0.5, authority is bound to a person's verified identity, not to an abstract domain. Each mandate records its Mandate Owner in `mandate_owners` — exactly one entry in v0.7, carrying the owner's DID and, where the owner co-signed, their signature (see *Owner Signatures*):

```json
{
  "mandate_owners": [{ "did": "did:key:..." }]
}
```

- `mandate_owners` — the Mandate Owner this mandate covers. v0.7 merges the v0.6 pair `resolved_owners` (a DID list) and `owner_mandates` (a signature list) into this single list: one owner, one entry, one name. **In v0.7 the array holds exactly one entry** — the authenticated owner (Mandate rule 7; Identity rule 6 forbids a DID other than the authenticated one). The array form is reserved for a future multi-signer ceremony not yet specified; multi-owner coverage is built from separate mandates (*Multi-Owner Coverage Rule*).

Which identities are required to commit for a given profile is **organizational policy, not protocol semantics**: profiles define what authority exists; the AS (per group) defines which members must commit. See "Identity & Authorization" below.

### Who Must Own a Decision
A decision's consequences may span several areas — delivery, financial, legal, reputational, wellbeing. Any person materially affected in such an area must be a Mandate Owner for the decision. The protocol does not enumerate areas; it requires that every materially affected owner is identified and participates.

### Multi-Owner Decisions
Decisions may have multiple owners.
However, collective, symbolic, or institutional ownership ("the team owns this", "the policy allows it", "the committee decided") is invalid.
Ownership must be explicit, identity-scoped, and jointly committed.

**Invariant:** No authorization may be committed unless all materially affected mandate owners are identified and participating.

### Divergence Is Not Failure—False Unity Is

When materially affected parties issue conflicting mandates (e.g., different `bounds_hash` values or incompatible intent), HAP blocks shared execution—not human agency.

This is not a deadlock. It is a boundary signal: "Your directions diverge."

Systems should respond by prompting users to:

"Your directions diverge. Initiate a new decision?"

This ensures drift is replaced by explicit divergence, preserving both autonomy and honesty. No shared action proceeds on unratified consensus.

When an owner disagrees — whether due to wrong bounds, incomplete intent, or unacceptable scope — they refuse to commit. The proposer must update the declaration and start a new mandate cycle. No one can unilaterally override — all required owners must commit to the same bounds and scope.

---

## Core Protocol Principle

**Required decision states MUST be resolved before consequential execution.** Unresolved required states MUST block mandate or execution. Gatekeepers MUST reject execution that lacks a valid mandate, exceeds authorized bounds, or lacks a valid mandate ticket. Implementations may satisfy this through any interaction pattern — approval workflows, bounded pre-authorization, staged review, or local decision capture — as long as the invariant holds.

---

## Gate Definitions

| Gate | Class | Definition |
|------|-------|------------|
| **Bounds** | Authorization | Canonical representation of the enforceable constraints on action |
| **Scope** | Authorization | Canonical representation of the operational scope (local) |
| **Intent** | Direction | Local semantic statement of why the authorization exists, what the agent should achieve, and what to avoid |
| **Commitment** | Authorization | Explicit human approval to proceed, recorded as `commitment_mode` |
| **Mandate Owner** | Authorization | Qualified human identity cryptographically bound to the approval |

The Intent gate's content may guide local agent reasoning but is not transmitted semantically outside local custody. Only `gate_content_hashes.intent` flows to the AS.

Gate resolution is signed by the Authority Server based on signals from the Local App. Profiles define which gates are required.

---

## Profiles

Profiles are the mechanism for authority-specific enforcement. v0.5+ profiles are simpler than v0.3 profiles — they no longer carry execution paths, gate questions, or domain requirements.

A **Profile** defines:
- bounds schema (enforceable constraints)
- scope schema (operational scope, may be empty), including per-field `scopeKind` and `requiredFor` declarations
- execution context schema (cumulative tracking fields)
- field constraints
- required gates
- TTL policy (default and max)
- retention minimum
- optionally, a `content_binding` declaration (see *Content Binding*)
- optionally, a `disclose_fields: string[]` declaration (see *Ticket Disclosure Is Declared*; the default is that nothing is disclosed)
- optionally, an `ownerSignature` floor (see *Owner Signatures*)
- optionally, a `ticket_lookup` opt-in (see *Ticket Lookup by Content*)

HAP Core is not enforceable without at least one trusted Profile.

Profiles are identified by `profile_id` and versioned independently. Once published, a profile version is immutable. **v0.6 states this strictly: *any* field change to a published profile version — including additive, OPTIONAL, or annotation-class fields — requires a new profile version.** There is no annotation exemption; whether a field touches the authority contract or only the ticket surface, it changes what operating under the profile *means*. (The v0.5-era in-place annotations that motivated this tightening are documented in `review.md` and are grandfathered as the last of their kind.)

The URL-shaped form (e.g., `github.com/humanagencyprotocol/hap-profiles/charge@0.5`) is recommended for human readability and for one-time bootstrap fetching. The protocol does not require that the identifier resolve to a network location at runtime, and operators MUST NOT depend on runtime resolution for correctness. See `governance.md` § "Trust on First Use" for the operational rule.

### Universal Profiles

Since v0.5, profiles are universal: the same `charge@0.5` profile works for a solo developer in personal mode and a 500-person enterprise in group mode. Organizational policy (who must commit) is configured on the AS, not in the profile.

### Bounds Schema

The bounds schema defines the enforceable parameters. Every bounds field declares a `boundType` — a discriminated union describing exactly how the bound is enforced. The `boundType` is the single source of truth for enforcement dispatch; implementations MUST NOT infer enforcement semantics from field name patterns.

The bounds schema also declares the **actionTypes registry** — the closed set of `actionType` values that are valid for this profile at ticket time. This makes "which actions are accepted under this profile" a first-class, statically inspectable property; without it the AS cannot validate that an incoming `actionType` is even legal.

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
        "boundType": { "kind": "cumulative_count", "window": "daily" },
        "appliesTo": ["charge", "subscribe"]
      }
    }
  }
}
```

Note that `currency` and `action_type` are **not** in the bounds schema. They are operational scoping fields and live in the **scope schema** (see below). The AS only enforces bounds; enum scoping of scope values is enforced locally by the Gatekeeper.

`actionType` registry — normative rules:

1. Every profile's `boundsSchema` (v0.5+) MUST include a non-empty `actionTypes: string[]`.
2. Every ticket request's `actionType` MUST be a member of the profile's `actionTypes`. The AS MUST reject any other value with `INVALID_ACTION_TYPE` before reading bounds.
3. The Gatekeeper MUST validate `actionType` locally against the same list before requesting a ticket.
4. Adding a new `actionType` to a profile is a breaking change requiring a new profile version, because executors that were authorized under the prior version did not consent to the broader set.

#### The BoundType union

Every bounds field MUST declare a `boundType`. Four kinds are defined:

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
| `cumulative_sum` | The AS maintains a running sum of `execution[boundType.of]` across prior tickets in the window; the current call is approved iff `running_sum + execution[of] <= boundValue`. | `amount_daily_max`, `spend_monthly_max` |
| `cumulative_count` | The AS counts qualifying tickets in the window; the current call is approved iff `running_count + 1 <= boundValue`. No execution context field is read. | `write_daily_max`, `post_monthly_max`, `booking_daily_max` |
| `enum` | The stored bound value MUST be in the allowed set. This is a capability flag — not an enforced limit on the execution value, but a capability check at issuance time and at tool-proxy time. | `read_access`, `delete_access`, `archive_access` |

**Normative rules:**

1. Every bounds schema MUST include a `profile` field as the first key.
2. Every bounds field (excluding the metadata `profile` field) MUST declare a `boundType`. Implementations MUST fail closed on any bounds field that omits `boundType`.
3. Enforcement implementations MUST dispatch on `boundType.kind` and MUST NOT infer enforcement semantics from field name patterns. This forbids regex/suffix matching on field names (e.g., stripping `_daily_max` to derive an `actionType`, appending `_max` to derive a bounds field, or inspecting field name prefixes to skip enforcement). Which cumulative bound governs which action type is declared by `appliesTo` (rule 7) — never by field-name correlation.
4. The human sets specific values in the authorization at issuance time. The profile defines what *can* be constrained, not the values.
5. Profile authors MUST NOT include operational details (target_env, customer_segment, branch, currency, action_type) in the bounds schema. Operational scoping fields belong in the scope schema.
6. Bounds fields MUST NOT declare `path`, `paths`, or any other action-routing array. v0.4 retired execution paths; v0.5 forbids any reintroduction. Routing tool calls to specific bounds is the job of `actionType` and the tool-gating manifest.
7. **`appliesTo` (new in v0.7).** A `cumulative_sum` or `cumulative_count` bound MAY declare `appliesTo: string[]`, naming the action types it governs; on a `cumulative_count` bound in a profile published under v0.7 or later it is **REQUIRED** — a forgotten declaration on a count bound would silently throttle every action type. Absence on a `cumulative_sum` bound, or on any bound in an older profile, means the bound governs **every** action type in the profile's `actionTypes` registry. Every member MUST be drawn from that registry — a bound governing an action nobody can request enforces nothing — and an AS MUST refuse a profile whose `appliesTo` names an unregistered action type (`PROFILE_INVALID`). `appliesTo` MUST NOT be declared on a `per_transaction` bound (it applies wherever its `of` field is present in the execution context) or on an `enum` bound (a capability flag). Enforcement points MUST select cumulative bounds by `appliesTo` (or by its absence), never by field-name correlation (rule 3). The same key on a content binding reads with the opposite default (absent = none, *Content Binding*); the difference is deliberate — an extra bound is a tighter limit, an extra binding is a refused action — and both are held by the profile-compliance checks (`governance.md` → *Reference Conformance*). The field was in use before it was specified; `changelog.md` records the procedural lesson.

### Scope Schema

The scope schema defines operational scoping fields that stay local. Scope fields are enum-constrained or subset-constrained; they describe what the authorization covers (currency, action type, allowed recipients, target environment). Scope content is never sent to the AS — only `scope_hash` flows to the AS — so scope constraints MUST be enforced by the Gatekeeper locally before requesting a ticket.

```json
{
  "scopeSchema": {
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

Some profiles have an empty scope schema (e.g., `records` — whose bounds are all capability flags and a single cumulative count, with no operational scoping). The `scope_hash` is **always** computed and included in the mandate payload, regardless of whether the schema is empty. When scope is empty, the canonical string is `""` and `scope_hash` is the well-known sha256 of the empty string. Implementations MUST NOT omit `scope_hash` from the mandate payload — a missing `scope_hash` is a malformed mandate, not "no scope."

Allowed values for an `enum` or `subset` scope field live in `constraint.values: string[]`. v0.4 permitted a top-level `field.enum: string[]` as an alternative location; v0.5 retires it for consistency with `boundType: { kind: 'enum', values: [...] }` on the bounds side. Profile authors MUST place allowed values in `constraint.values`. Implementations MUST read from `constraint.values` and MUST NOT fall back to `field.enum`.

#### Scope kinds (`scopeKind`, new in v0.6)

A scope field's meaning is not uniform: some fields name the *other party* to a communication or transaction, others name *which container an item belongs to*. Profiles SHOULD mark each scope field:

```jsonc
"allowed_recipients": { "format": "email", "scopeKind": "counterparty" },
"allowed_calendars":  { "format": "string", "scopeKind": "resource" }
```

- **`counterparty`** — names the other party (email `allowed_recipients`, calendar `allowed_attendees`, purchase `allowed_vendors`). Matched against the item's participant list.
- **`resource`** — names the container the item belongs to (`allowed_calendars`, publish `allowed_platforms`). A direct attribute match.

Absent an explicit `scopeKind`, an implementation MAY infer `counterparty` from `format: email|domain` as a transitional measure; the explicit declaration is normative. `scopeKind` matters on the read path — a `resource` scope enforced on writes MUST also bind reads of the same resource (see *Read Authorization*).

#### Required dimensions (`requiredFor`, new in v0.6)

A scope constraint is only as good as the Gatekeeper's ability to see the value it constrains. A connector argument that carries the whole action opaquely (e.g. a raw RFC 2822 message blob) bypasses every constraint on the dimensions inside it. A constraint MAY therefore declare `requiredFor: string[]` — a list of `actionType`s for which the constrained dimension MUST be present in the execution context. For a listed `actionType`, an execution that does not carry the constrained dimension MUST be refused: absence of the value is indistinguishable from absence of enforcement, so it fails closed rather than passing unchecked.

**Normative rules:**

1. Scope content MUST NOT be sent to the AS. Only `scope_hash` flows to the AS.
2. Scope MUST be deterministic and canonicalized identically across all implementations of the protocol version.
3. Scope cannot be updated once the mandate is issued. Changing scope invalidates `scope_hash`, requiring a new mandate.
4. Empty scope is valid. The hash is still computed and included in the mandate payload.
5. The Gatekeeper MUST locally enforce every profile-defined scope constraint (enum, subset, pattern) against the execution values before requesting a ticket. Because the AS only holds `scope_hash`, it cannot enforce these constraints — the Gatekeeper is the sole enforcer.
6. For any constraint declaring `requiredFor`, the Gatekeeper MUST refuse an execution of a listed `actionType` whose execution context lacks the constrained dimension.

### Execution Context Schema (Cumulative Tracking)

The execution context schema declares fields that are resolved at execution time, typically used for cumulative limit tracking. The mandate's `execution_context_hash` commits to this **schema** (the canonicalized `executionContextSchema`) — not to the per-call execution values, which are dynamic and tracked by the AS as cumulative state:

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
| `cumulative` | Running total computed by the AS from ticket history within a time window |

Cumulative fields enable stateful limits — constraints that apply across multiple executions rather than per-call. A cumulative field definition specifies:

- `cumulativeField`: which declared field to aggregate (use `_count` for plain execution counting)
- `window`: time window for aggregation (`daily`, `weekly`, or `monthly`)

The corresponding bounds field uses the convention `{cumulative_field_name}_max` (e.g., `amount_daily_max`) to set the ceiling. This naming convention is for human readability only — implementations MUST NOT derive enforcement semantics from this convention. The pairing is established by the bound's `boundType.window` and `boundType.of` fields, not by string manipulation of field names.

Window semantics are fixed by the protocol so that independent ASes computing against the same ticket history produce identical results:

- `daily` and `weekly` are **rolling** windows — the trailing 24 hours and the trailing 7 days (168 hours) measured back from the current instant. A rolling window has no reset boundary, so cumulative consumption can never exceed the bound within *any* such span. This closes the boundary cliff a fixed calendar bucket would allow (spending a full daily budget at 23:59 and again at 00:01), and it requires **no timezone and no week-start configuration** — "the last 24 hours" and "the last 7 days" are unambiguous everywhere.
- `monthly` is a **calendar month**, anchored to the 1st of the month at 00:00 **UTC**. Businesses budget and reconcile on the calendar month, so this window is calendar-aligned rather than rolling; the rolling `daily`/`weekly` windows already bound any burst across a month boundary. The UTC anchor is fixed by the protocol — there is no per-authorization timezone setting.

**Normative rules:**

1. Cumulative state is computed by the AS from ticket history. The AS is authoritative. It MUST NOT be derived from a destructive running counter, so that it is always recomputable and auditable from the retained tickets.
2. The gateway MAY cache consumption state from ticket responses for display, but the AS value is canonical.
3. Cumulative resolution is deterministic: given the same ticket history and the same window definitions above, every AS yields the same totals.
4. A bound's window is one of `daily`, `weekly`, or `monthly` with the semantics defined above. Consumption is partitioned by `actionType`; a ticket contributes to a window only for its own `actionType`, and a bound counts only the action types its `appliesTo` names (all of them when absent).
5. **Exactly-once.** One logical execution consumes bounded authority exactly once. A retried ticket request — for any reason (lost response, network retry, agent re-run) — MUST NOT increment cumulative state or create a second ticket for the same logical execution. On the synchronous path (`automatic` mode) this is enforced by a required `idempotencyKey` (see *Ticket Issuance* in the Authority Server spec); on the review path it is enforced by the proposal's `committed → executed` transition. The two paths give the same guarantee.

### Enforcement Authority

Different constraint categories are enforced by different components. This table maps each constraint category to its enforcer.

| Constraint category | Enforced by | Notes |
|---|---|---|
| **Bounds** `per_transaction` (e.g., `amount_max`, `recipient_max`) | AS and Gatekeeper | The AS sees bounds in plaintext and enforces at ticket time; the Gatekeeper MUST also enforce locally, against the signed mandate it holds (*Validation Steps*, Phase 1 step 8) — this local check is what makes the control compromise-resistant (*Enforcement classes*). |
| **Bounds** `cumulative_sum` (e.g., `amount_daily_max`) | AS only | The Gatekeeper's custody archive holds only its own executions and is not authoritative; cumulative state is the AS's ticket history across every Gatekeeper exercising the bucket. |
| **Bounds** `cumulative_count` (e.g., `write_daily_max`) | AS only | Same reason. |
| **Bounds** `enum` (e.g., `read_access: "unlimited"`) | Gatekeeper (and AS at issuance time) | The stored bound value is verified against the allowed set at issuance time. At execution time, the Gatekeeper or its tool-proxy checks the capability against the requested operation. |
| **Scope** `enum` (e.g., `currency: "USD"`) | Gatekeeper only | The AS only holds `scope_hash` and cannot read plaintext scope values. The Gatekeeper MUST enforce scope enum constraints locally before requesting a ticket. |
| **Scope** `subset` (e.g., `allowed_recipients`) | Gatekeeper only | Same reason. |
| **TTL expiry** | AS and Gatekeeper | AS refuses to issue new tickets past expiry; Gatekeeper refuses to request one. |
| **Revocation** | AS only | The Gatekeeper has no revocation list. |

**Normative rules:**

1. Bounds enforcement dispatches on `boundType.kind` (see "The BoundType union" above). Implementations MUST NOT derive enforcement semantics from field name patterns.
2. Scope constraints (`enum`, `subset`, `pattern`) MUST be enforced locally by the Gatekeeper. The AS cannot enforce them because it only holds `scope_hash`.
3. A profile version is immutable. **Any** field change to a published profile version — including additive, OPTIONAL, or annotation-class fields — requires a new profile version. v0.5's enumeration ("any bound's `boundType` or any scope field's constraint") was read as exhaustive; v0.6 removes the ambiguity: there is no annotation exemption.
4. Constraints are publicly inspectable — any party can read the profile and know exactly what is enforced and where.

### Enforcement classes — what each control holds against (v0.7 audit)

`governance.md` → *The Authority Server Cannot Check Itself* obliged an audit of everything this specification calls "enforced", separating what holds only while the Authority Server is honest from what still holds against an AS compromised later. The result is an annotation, not a redesign. Two classes:

- **Honest-operator control (HOC)** — a check the AS performs. Holds against every other party; evaporates against the AS itself.
- **Compromise-resistant evidence (CRE)** — an artifact signed and held by a party other than the AS, or a check a party other than the AS performs. A later-compromised AS cannot alter or bypass it.

| Control | Class | Why |
|---|---|---|
| Per-transaction bounds | HOC at the AS; **CRE at the Gatekeeper** | The Gatekeeper re-checks locally against the signed mandate it holds. |
| Cumulative bounds (`cumulative_sum`, `cumulative_count`) | **HOC** | Only the AS holds the ticket history — the residue named in *What this does and does not prove*. |
| Scope constraints (`enum`, `subset`, `pattern`) | **CRE** | Enforced solely by the Gatekeeper against locally held scope; the AS never sees the values. |
| `actionType` registry membership | HOC at the AS; CRE at the Gatekeeper | Both check against profile bytes the signed mandate content-addresses via `profile_hash`. |
| TTL expiry | HOC at the AS; CRE at the Gatekeeper and any verifier | `expires_at` is in the signed mandate. |
| Revocation | **HOC** | The Gatekeeper holds no revocation list; a revoked mandate is still a valid signature. |
| Commitment mode (`review` routing) | **CRE** against a later compromise; HOC at issuance unless owner-signed | The Gatekeeper routes from the signed `commitment_mode`, never from AS metadata; a downgrade fails closed. An AS malicious *at issuance* signs any mode — only an owner signature over the projection pins it. |
| Required-approver coverage | **HOC** | Group configuration is an AS record. Owner signatures make *which owners signed* CRE; *which owners were required* remains HOC. |
| Approval of a proposal | HOC; **CRE where owner-signed** (`HAP-approval`) | An unsigned approval is an AS state transition. |
| Mandate authenticity — who committed | HOC; **CRE where owner-signed** | The v0.6 mechanism exists for exactly this promotion. |
| Ticket authenticity, timestamp, pre-flight ordering | **HOC** | The AS signs what the AS witnessed. Ordering is a claim about a sequence only the AS sees; a witnessed transparency log (`review.md`) is the only mechanism on the table that reaches it. |
| Content binding (`contentHash`) | **CRE** | The Gatekeeper computes it; any holder of the artifact recomputes it. |
| Idempotency / exactly-once | **HOC** | An AS-side dedup record. |
| Identity assurance `as_vouched` | **HOC** by definition | The operator vouches. `eudi` is CRE. |
| Owner is one identifiable human — no role, committee, or shared account enrolled | **HOC** | An enrolment and authentication obligation on the AS; a DID does not reveal what stands behind it. |
| Nonce consumption | **HOC** | Defence-in-depth against third parties only. |
| Ticket retention at the AS | **HOC** | Which is why Gatekeeper custody (*Retention and Gatekeeper custody*) exists. |

The table is normative in one respect: **an implementation MUST NOT describe an HOC control as a defence against its own operator.** Wherever this document says "enforced", read it with this table beside it.

### Required Gates

Profiles declare the universal set of required gates:

```json
{
  "requiredGates": ["bounds", "intent", "commitment", "mandate_owner"]
}
```

All v0.5+ profiles MUST require these four gates. The `intent` gate replaces the v0.3 trio of `problem`, `objective`, and `tradeoff`. Profiles MUST NOT define `gateQuestions` — the intent prompt is universal and lives in the gateway UI. Integration manifests MAY provide an optional `intentHint` for context-specific guidance.

### Profile-Defined TTL Policy

HAP Core does not fix mandate TTLs.

Each Profile MUST define:
- a default TTL
- a maximum TTL

```json
{ "ttl": { "default": 86400, "max": 604800 } }
```

Gatekeepers MUST enforce profile TTL limits. The user selects a specific TTL within the profile's allowed range at issuance time. This prevents approval automation driven by time pressure.

### Retention Policy

Each Profile MUST define a `retention_minimum` — the minimum duration for which mandates and tickets must be retained for audit purposes.

---

## Mandates

A mandate is a time-limited, cryptographically signed proof that:

- A specific bounds set was committed to (`bounds_hash`)
- A specific operational scope was committed to (`scope_hash`)
- The execution context schema was resolved (`execution_context_hash`)
- The Mandate Owner is identified (`mandate_owners`)
- Intent was articulated and hashed (`gate_content_hashes.intent`)
- The human chose a specific commitment mode (`commitment_mode`)
- Approval occurred under a specific Profile

Mandates do not contain semantic content. `gate_content_hashes.intent` commits to the locally held intent statement. The hash supports tamper-evident auditability without exposing content.

### Mandate Request Schema

What the Gatekeeper sends to obtain a mandate. Most of it becomes the signed payload below; the rows marked *request only* do not, and are listed here because a field with no documented home is a field two implementations will place differently.

```json
{
  "profile_id": "charge@0.5",
  "profile_hash": "sha256:...",
  "supported_versions": ["0.6", "0.7"],
  "bounds": { "profile": "charge@0.5", "amount_max": 100, "amount_daily_max": 500 },
  "bounds_hash": "sha256:...",
  "scope_hash": "sha256:...",
  "execution_context_hash": "sha256:...",
  "gate_content_hashes": { "intent": "sha256:..." },
  "commitment_mode": "review",
  "ttl": 86400
}
```

| Field | Description |
|---|---|
| `profile_id` | The profile this mandate is bound to. |
| `profile_hash` | *(new in v0.7)* The content address of the profile the Gatekeeper provisioned for that `profile_id`: `"sha256:" + hex(sha256(JCS(profile)))`, where `JCS` is the RFC 8785 serialization of the **parsed** profile document (*Profile hash*, below). The AS computes the same value over its own provisioned copy and refuses on mismatch (`PROFILE_HASH_MISMATCH`). Signed into the payload once it matches. |
| `supported_versions` | *Request only, new in v0.7.* The protocol versions the requesting Gatekeeper can verify and enforce. See *Version negotiation*. |
| `bounds` | *Request only.* The bounds object **in plaintext** — REQUIRED; the AS must hold the values to enforce them at ticket time. The AS MUST recompute the canonical string, compare it to `bounds_hash`, and refuse on disagreement (`BOUNDS_HASH_MISMATCH`). A request carrying a hash and no plaintext MUST be refused (`MALFORMED_MANDATE`): a mandate the AS cannot enforce is not a mandate. |
| `bounds_hash`, `scope_hash`, `execution_context_hash`, `gate_content_hashes` | As in the signed payload. Scope content is never sent — only its hash. |
| `commitment_mode` | `automatic`, `review`, or `review_above_cap`; with `above_cap_caps` and `above_cap_approvers` when the last. |
| `ttl` | *Request only.* The requested lifetime in seconds, within the profile's allowed range. For a request without an owner signature the AS turns it into the signed `issued_at` / `expires_at`. |
| `expires_at` | *Conditional.* REQUIRED when the request carries an owner signature (the owner signs the expiry — *Owner Signatures*), otherwise MUST be absent. An absolute Unix timestamp chosen by the owner, no later than `now + ttl_max` of the profile. The AS MUST sign exactly this value as the payload's `expires_at` or refuse (`MALFORMED_MANDATE`); it MUST NOT extend or shorten it. |

A request MAY additionally carry: a `disclose_fields` list (narrowing the profile's, signed into the payload), the owner's signature entry for `mandate_owners`, a `subjects` identity block, and the `intent-disclosure@0.1` disclosure object. A request MUST NOT carry `mandate_id`, `issued_at`, or `issuer` — those are the AS's to assign, and accepting a caller's values would let the requester backdate or misattribute its own authority. `expires_at` is the one owner-chosen timestamp, and only where the owner signs it: the AS still bounds it by the profile's maximum TTL, so the owner can shorten their own authority but never extend it past what the profile allows.

#### Profile hash

`profile_hash` is defined over the parsed document, not the file: `sha256` of the RFC 8785 (JCS) serialization of the profile JSON, written as `sha256:<64 hex>`. Two parties who provisioned the same profile through different channels — a git checkout, an npm tarball that re-serialized it, a copy with a trailing newline or different indentation — MUST arrive at the same value; hashing raw bytes would turn formatting into a refusal. The conformance vectors (`governance.md` → *Reference Conformance*) pin one value over a published profile.

### Mandate Payload (v0.7)

```json
{
  "header": { "typ": "HAP-mandate", "alg": "EdDSA" },
  "payload": {
    "mandate_id": "uuid",
    "version": "0.7",
    "profile_id": "charge@0.5",
    "bounds_hash": "sha256:...",
    "scope_hash": "sha256:...",
    "execution_context_hash": "sha256:...",
    "profile_hash": "sha256:...",
    "issuer": "did:key:z6Mk...",
    "mandate_owners": [{ "did": "did:key:..." }],
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
| `mandate_id` | UUID assigned by the AS at issuance |
| `version` | Protocol version: `"0.7"` (v0.6 and earlier artifacts remain verifiable under their own version and field names — see *Migration from v0.6*) |
| `profile_id` | The profile this mandate is bound to |
| `bounds_hash` | Hash of the canonical bounds string |
| `scope_hash` | Hash of the canonical scope string (sha256 of empty string when scope is empty) |
| `execution_context_hash` | Hash of the profile's canonicalized **execution-context schema** (the declared cumulative-tracking fields) — **not** the per-call execution values |
| `profile_hash` | `sha256` over the JCS serialization of the profile the Gatekeeper provisioned for `profile_id` (new in v0.7; *Profile hash* above). The AS MUST compute the same value over its own copy and refuse on mismatch (`PROFILE_HASH_MISMATCH`): two parties that disagree about the profile must not sign anything under it. The artifact thereby names the exact profile it was issued under; whether the *publisher* served honest bytes at provisioning time is still the operator's out-of-band check (`governance.md` → *Trust on First Use*). |
| `issuer` | The Authority Server's DID (new in v0.7). SHOULD be the `did:key` of the signing key itself, so the artifact names the key that verifies it; MAY be a `did:web` that resolves to that key. Required so a held artifact verifies offline after the AS has rotated keys. |
| `mandate_owners` | The Mandate Owner this mandate covers — exactly one entry in v0.7: `{ did }`, plus the owner's signature fields where the owner co-signed (see *Owner Signatures*) |
| `gate_content_hashes` | At minimum: `{ "intent": "sha256:..." }` |
| `commitment_mode` | `"automatic"`, `"review"`, or `"review_above_cap"` |
| `issued_at` | AS-authoritative issue timestamp |
| `expires_at` | AS-authoritative expiry timestamp |

**Conditional fields:**

| Field | When required | Description |
|-------|---|---|
| `above_cap_caps` | `commitment_mode === "review_above_cap"` | Map of bounds field name → numeric cap. Ticket requests exceeding any cap return `APPROVAL_REQUIRED`. |
| `above_cap_approvers` | `commitment_mode === "review_above_cap"` | List of DIDs that must approve a proposal raised by a cap exceedance. |
| `intent_disclosure_hash` | The mandate carries an encrypted-intent disclosure object (companion spec `intent-disclosure@0.1`) | `sha256` binding the disclosure's `intent_ciphertext` and `approvers_frozen` into the signed payload, so the AS cannot alter the ciphertext or approver set undetected. Defined in `governance.md` → *Companion Specifications* → `intent-disclosure@0.1`. |
| `subjects` | The Mandate Owner disclosed identity (new in v0.6) | Signed identity-assurance block, one entry per owner. See *Identity Assurance* below. |
| `disclose_fields` | The owner narrows which execution-context fields tickets under this mandate may disclose (new in v0.7) | `string[]`, a subset of the profile's `disclose_fields` list. See *Ticket Disclosure Is Declared*. (The name is deliberately not `disclose`: `subjects[].disclose` already names the identity-disclosure object.) |

**Normative rules:**

1. The signed payload MUST include `commitment_mode`. A change of commitment mode requires a new mandate.
2. The signed payload MUST include both `bounds_hash` and `scope_hash`. Even when scope is empty, `scope_hash` is the sha256 of the empty canonical string.
3. The AS signs the payload with its Ed25519 private key. Signatures MUST be encoded as **base64url** without padding when serialized to the mandate envelope. Implementations MUST NOT use standard base64 (which differs in `+`/`/` vs `-`/`_` and in padding) — third-party verifiers reading the spec literally will reject standard-base64 signatures.
4. One mandate covers exactly one Mandate Owner (rule 7). Multi-owner decisions require multiple mandates from different owners.
5. The mandate MAY carry an optional `title` field as AS-side metadata — a human-readable label for display. The `title` field **MUST NOT** appear in the signed payload. Changing the title does not and cannot invalidate the mandate's signature.
6. `bounds.profile` MUST equal `payload.profile_id`. The AS MUST reject mandate requests where these disagree.
7. `mandate_owners` MUST contain exactly one entry in v0.7 (the authenticated owner). The entry MUST carry `did`. An entry that also carries `signature` MUST carry all of `alg`, `signed_at`, `nonce`, `binding`, `signing_surface`, and its `did` MUST be key-bearing (see *Owner Signatures*). `binding` is required-present and value-open: an AS MUST NOT reject an entry for a `binding` value it does not recognize (*Owner Signatures*).
8. The envelope header MAY carry `kid`. When present it MUST identify the same key as `issuer` (for a `did:key` issuer, the multibase key fingerprint), and a verifier MUST reject a disagreement — the field a party writes loses to the field a party cannot forge.
9. **Time.** `issued_at` MUST NOT be in the future by more than the verifier's clock tolerance, and `expires_at` MUST be greater than `issued_at`. A verifier SHOULD tolerate clock skew of at most 300 seconds when checking `issued_at`, `expires_at`, a ticket's `timestamp`, and an owner signature's `signed_at`; the tolerance never extends a mandate's life past `expires_at + 300 s`.

### Signing Canonicalization

Both mandate signing and ticket signing rely on a deterministic JSON serialization of the payload. v0.4 left this implicit ("canonical JSON serialization"); v0.5 makes it explicit so two independent ASes (or an AS and an external verifier) cannot disagree about which bytes were signed.

**Signing canonicalization (normative):**

1. UTF-8 encoding.
2. Object keys sorted lexicographically by Unicode code point (ascending).
3. No insignificant whitespace — no spaces between tokens, no trailing whitespace, no leading or trailing newline.
4. Numbers serialized as the shortest round-trippable form (the same value that JSON.parse → JSON.stringify would produce after the sort step). Integer values MUST be written without a decimal point; floats MUST use the shortest representation that round-trips.
5. Strings escaped per RFC 8259 (`\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX` for control chars). Non-ASCII Unicode characters MUST be passed through as UTF-8 bytes (no `\u` escaping required).
6. Arrays preserve element order as given.
7. The signature field itself MUST NOT be present in the bytes being signed.

This is compatible with RFC 8785 (JSON Canonicalization Scheme) and implementations MAY use a JCS library directly.

The specification publishes **signing test vectors** — (payload, canonical bytes, signature) triples under published test keys — so any implementation can verify that its canonicalization matches; since v0.7 they are part of the **conformance vector set** that lives with the specification (`governance.md` → *Reference Conformance*): hashes, signatures, and required refusals, all checkable offline. An implementation claiming conformance MUST reproduce them.

### Auditability Guarantee

Each Mandate Owner can independently prove:

- "I committed to bounds X" → `bounds_hash` in mandate
- "I committed to scope Y" → `scope_hash` in mandate
- "I articulated intent Z" → `gate_content_hashes.intent` in mandate
- "I chose commitment mode M" → `commitment_mode` in mandate
- "As owner O" → `mandate_owners` in mandate

---

## Bounds & Scope Canonicalization

Bounds follow strict canonicalization rules to ensure deterministic hashing.

### Bounds Derivation

The bounds object contains exactly the keys defined in the profile's `boundsSchema.keyOrder`. The `profile` field is mandatory and identifies the profile version. There is no `path` field in v0.5.

**Bounds structure (abstract, v0.5+):**

```
profile=<profile-id>
<profile-bounds-fields>=<values>
```

The bounds MUST be deterministically derivable from the human's mandate choices. If any bound value changes, `bounds_hash` changes.

### Canonicalization Rules

HAP Core requires:
- UTF-8 encoding
- newline-delimited `key=value` records
- keys sorted according to the profile's `boundsSchema.keyOrder`
- explicit inclusion of all required keys
- **an optional key with no value is omitted** — no record is emitted for it. A key that is present with an empty string renders as `key=` and is a different commitment ("the human set an empty value") from absence ("the human set no limit"). Rendering absence as any placeholder text is a violation: it commits the hash to a value the human never entered (v0.7 states this explicitly because an implementation had rendered a placeholder; `changelog.md` → *Found in the second advisor review*)
- no whitespace normalization

**Key format:** Keys MUST match `[a-z0-9_]+`.

**Value encoding (normative, v0.5+):**
- Values MUST NOT contain raw newline (`\n`) or carriage-return (`\r`) characters. Implementations MUST reject input containing them; silent stripping or normalization is a violation because it produces a hash that does not faithfully represent the input.
- If a value contains `=`, `%`, or any byte outside the printable ASCII range (0x20–0x7E), that byte MUST be percent-encoded (RFC 3986, uppercase hex, over the value's UTF-8 bytes) before canonicalization. The `%` byte is included to keep the encoding self-inverse. `\n` and `\r` are **not** in this list: the rule above refuses them outright, and encoding a byte the previous rule rejects is unreachable. (v0.5 and v0.6 listed them here as well, which read as permission to encode what must be refused; v0.7 removes the contradiction without changing any hash — no conformant implementation could have reached that branch.)
- Implementations MUST percent-encode at canonicalization time, not at value entry time, so the stored input remains the human's original bytes.
- Profiles MAY further restrict allowed characters via `constraint.pattern`. Pattern violations MUST surface as `BOUNDS_INVALID_VALUE` (or `SCOPE_INVALID_VALUE` for scope fields), distinct from a hash mismatch.

The canonical bounds string is hashed with sha256 to produce `bounds_hash` in the format `sha256:<64 hex chars>`.

### Scope Canonicalization

Scope follows the same canonicalization rules as bounds, applied to the profile's `scopeSchema.keyOrder`.

For empty scope (no `scopeSchema` or `keyOrder` is empty), the canonical string is `""` (the empty string). Its sha256 hash is the well-known constant:

```
sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

The empty hash is **always included** in the mandate payload to keep mandate structure uniform across profiles with and without scope.

### No Condition Fields

The protocol does not include condition fields in bounds (removed in v0.5). Self-declared conditions are circular — the person who might want to skip oversight would decide whether oversight is required. Approver coverage is enforced by the AS based on group configuration, not by mandate-time conditions.

---

## Commitment Modes

v0.4 introduced two commitment modes; v0.5 adds a third. The choice is part of the signed mandate payload.

### Automatic Mode

```
commitment_mode: "automatic"
```

The agent acts within the human's bounds without per-action approval. Each tool call still produces a ticket — the AS enforces bounds and cumulative limits at ticket time. The human commits once (the mandate) and accepts that the agent will act inside those bounds for the TTL duration. Because the ticket is issued synchronously with no proposal, every automatic-mode ticket request MUST carry an `idempotencyKey` (Cumulative Tracking rule 5) so a retried call is counted exactly once.

This is the right mode when:

- The bounds are conservative enough that the human is comfortable with any action within them
- The action is reversible or the consequences are bounded by the limits
- The volume of actions makes per-action review impractical

### Review Mode

```
commitment_mode: "review"
```

The agent proposes actions; the human reviews and approves each one before execution. When the agent calls a tool, the Gatekeeper does **not** request a ticket directly. Instead, it creates a proposal that surfaces in the human's review queue (in the gateway UI or via notification). When the human approves, the Gatekeeper requests the ticket and proceeds.

This is the right mode when:

- Individual actions have non-trivial consequences
- The human wants to inspect specific arguments before they take effect
- Bounds alone are not sufficient confidence

### Review-Above-Cap Mode (new in v0.5)

```
commitment_mode: "review_above_cap"
```

The agent acts automatically while every per-transaction value stays within the **group cap** for the relevant bound; the moment any value would exceed a group cap, the AS refuses to issue a ticket and instead returns an `APPROVAL_REQUIRED` error carrying the list of approvers the group has configured. The Gatekeeper then converts the call into a proposal addressed to those approvers and waits.

The cap set is profile-and-group-specific. A group admin configures, per profile, a `caps` map (e.g., `{ amount_max: 1000 }`) and a list of approver DIDs. v0.5 lifts this from an AS-internal convention into a signed protocol mode so a third-party Gatekeeper can know in advance whether a tool call may produce a synchronous ticket or a proposal.

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

`above_cap_caps` and `above_cap_approvers` are part of the signed mandate payload. Changing either requires a new mandate. A ticket request that exceeds any cap MUST be rejected with `APPROVAL_REQUIRED`; the AS MUST NOT silently downgrade to `BOUND_EXCEEDED`.

### Normative Rules

1. `commitment_mode` MUST be present in the signed mandate payload.
2. Changing the commitment mode requires a new mandate (the AS must re-sign).
3. In `review` mode, the Gatekeeper MUST NOT request a ticket before the human has explicitly approved the specific action.
4. In `automatic` mode, the Gatekeeper MUST request a ticket for every tool call before executing.
5. The AS MUST NOT issue a ticket for an action that has not been explicitly approved when the mandate is in `review` mode. Approval flows are AS-defined; the protocol requires only that approval precede ticket issuance.
6. In `review_above_cap` mode, the Gatekeeper MUST request a ticket synchronously for every call. If the AS returns `APPROVAL_REQUIRED`, the Gatekeeper MUST submit a proposal targeting the approvers named in the AS response (or, defensively, the `above_cap_approvers` from the signed mandate). On approval, the ticket request is replayed with the resulting `proposalId`.
7. `above_cap_caps` keys MUST reference fields declared in the profile's `boundsSchema`. The AS MUST reject mandates where they do not.

---

## Mandate Tickets

> **No mandate, no ticket. No ticket, no execution.** A mandate constrains execution; it does not transfer authority.

A mandate says what an agent *may* do. A **mandate ticket** is what the mandate produces for *one* action: AS-signed proof, obtained before the action runs, that this specific execution fell inside this mandate, within its bounds, at this time. v0.4 introduced the object under the name *execution receipt*; v0.7 renames it because the tense was wrong — a receipt follows payment, and the ticket must come first.

Every authorized action obtains exactly one ticket, and obtains it first. Afterwards the same ticket is the evidence for what happened. It is not a second object and does not change its name.

### The Authority Server as Notary

Since v0.5, the AS is a **runtime dependency for execution**. Before any tool call proceeds, the Gatekeeper requests a ticket from the AS. The AS:

1. Validates the mandate is current (not expired, not revoked)
2. Checks the requested action against per-transaction bounds
3. Checks cumulative limits against the ticket history
4. If all checks pass: records the execution and returns a signed ticket
5. If any check fails: returns a structured error and the Gatekeeper blocks the action

This is a deliberate change from v0.3's stateless Gatekeeper model. The cost is a per-execution AS round-trip. The benefit is cryptographic proof of every action and the ability to revoke before TTL expires.

### Execution Flow

```
Agent -> Gatekeeper                           -> AS
         |                                       |
         +- verify mandate (local)           |
         +- verify bounds_hash (local)           |
         +- verify scope_hash (local)          |
         |                                       |
         +- request mandate ticket ----------> validate mandate
         |                                       check per-tx bounds
         |                                       check cumulative limits
         |                                       check revocation
         |                                       record execution
         |                                       sign ticket
         |                              <------- return ticket + consumption state
         |                                       |
         +- execute tool call                    |
         +- store ticket locally                (AS retains authoritative copy)
```

The Gatekeeper MUST obtain a ticket **before** executing the tool call. The ticket is a pre-execution proof of authorization — not a post-execution confirmation.

### Ticket Request Schema

The Gatekeeper sends the following to the AS when requesting a mandate ticket:

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
| `boundsHash` | The `bounds_hash` from the mandate being exercised. This is the cryptographic content address of the authorization and is the **sole key** the AS uses to look up the mandate for this ticket request. |
| `profileId` | The profile this mandate is bound to |
| `action` | The downstream tool/action name (e.g., `create_payment_link`). Audit metadata only — MUST NOT be used for cumulative state partitioning. |
| `actionType` | The bounds-level action category (e.g., `charge`, `write`, `post`, `delete`). This field drives cumulative state partitioning and bounds dispatch. |
| `idempotencyKey` | A caller-supplied unique key identifying this logical execution. The AS MUST treat two requests bearing the same `idempotencyKey` as the same logical execution and return the original ticket without re-consuming bounds (Cumulative Tracking rule 5). |
| `executionContext` | The specific values for this call, including the fields referenced by `boundType.of` for per-transaction and cumulative_sum bounds. |

**Normative rules on identifiers:**

1. The AS MUST use `boundsHash` as the sole lookup key for a ticket request. A `mandate_id` (UUID) is carried separately in the signed mandate payload for audit and display purposes but MUST NOT be accepted as a substitute for `boundsHash` in ticket requests.
2. `boundsHash` is the cryptographic content address of an authorization; changing any bound value produces a new `boundsHash` and therefore a new mandate. `mandate_id` is a stable opaque label that does not encode the mandate's contents.
3. `actionType` MUST be used for cumulative state partitioning and bounds dispatch. `action` is audit metadata and does not affect which bucket a ticket belongs to.
4. `actionType` MUST be a member of the profile's `boundsSchema.actionTypes` registry. The AS MUST reject other values with `INVALID_ACTION_TYPE`.
5. The ticket request body MUST NOT include a `path` field. v0.5+ ASes MUST reject requests carrying it. (v0.4 retired `path` from bounds; v0.5 finishes the removal across all wire formats.)
6. AS storage keys MAY combine `boundsHash` with the mandate owner's identity (e.g., `${boundsHash}:${userId}`) to disambiguate two members of the same group committing to identical bounds. This is an AS implementation detail and does not affect the wire contract: ticket requests still use `boundsHash` plus the AS's authenticated request context.

### Ticket Payload Schema

```json
{
  "id": "uuid",
  "mandateId": "uuid-of-the-mandate",
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
  "limits": { "profile": "charge@0.5", "amount_max": 100, "amount_daily_max": 500 },
  "version": "0.7",
  "issuer": "did:key:z6Mk...",
  "timestamp": 1735888050,
  "signature": "base64url..."
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique identifier for this ticket, generated by the AS |
| `mandateId` | The `mandate_id` of the mandate this ticket was issued under (new in v0.7). Audit and chain-of-custody field only — `boundsHash` remains the lookup key (rule 1 below). Required because two mandates of the same owner may share a `bounds_hash` (a revoked one and its replacement), and a verifier holding the ticket must know which one it ran under. |
| `groupId` | Group ID if group-managed, `null` for personal mode |
| `userId` | The user whose authorization this ticket was issued under. The AS derives this from the authenticated request context; it is not in the request body. It is an AS-internal identifier and proves nothing to a third party; the owner's identity is reached through `mandateId` → `mandate_owners`. |
| `boundsHash` | The mandate (by `bounds_hash`) this execution is authorized under |
| `profileId` | Profile governing this execution |
| `action` | The downstream tool/action name (mirrors the request; audit metadata only) |
| `actionType` | The bounds-level action category (mirrors the request; drives cumulative bucketing) |
| `executionContext` | The action values that were authorized |
| `cumulativeState` | Cumulative consumption state after this execution is applied (*Cumulative State* below) |
| `limits` | The mandate's plaintext bounds object — every key of the profile's `boundsSchema.keyOrder` with the value the human set, exactly as the AS enforced them for this ticket. Included so a ticket reads on its own, without the mandate, against the profile bytes retained under *Retention at the Authority Server*. |
| `version` | Protocol version of the ticket (new in v0.7) — the version of the mandate it was issued under (*Version negotiation*). A ticket without the field was issued under a v0.4–v0.6 mandate and MUST be read under that mandate's `version`. |
| `issuer` | The AS DID, as in the mandate (new in v0.7). |
| `timestamp` | AS-authoritative timestamp |
| `contentHash` | OPTIONAL (new in v0.6) — the content hash computed by the Gatekeeper and copied verbatim by the AS. See *Content Binding*. |
| `contentBinding` | OPTIONAL (new in v0.6) — the profile's `content_binding` declaration echoed into the signed ticket, including the bound field list for a field binding, so a verifier knows exactly what the hash covers. |
| `subjects` | OPTIONAL (new in v0.6) — the disclosed subset of the mandate's signed identity block, copied so the ticket self-verifies. See *Identity Assurance*. |
| `proposalId` | OPTIONAL (new in v0.6) — on the review path, the proposal this ticket executed, bound into the signed payload. |
| `approvalSignature` | OPTIONAL (new in v0.6) — on the review path, the owner's `HAP-approval` signature for the executed proposal, as the object `{ "alg": "EdDSA", "signature": "base64url…", "nonce": "…", "decided_at": … }` together with the approval's `decision` and `content_hash` reconstructible from the ticket (`proposalId`, `mandateId`, `contentHash`), so a holder verifies it against the owner's DID without the AS. MUST be present when the AS verified an approval signature before issuing. A hash of the signature is NOT an acceptable substitute — it would be checkable only by fetching the signature from the AS. See *Owner Signatures* → *Approvals*. |
| `signature` | Ed25519 signature of the canonical ticket payload, encoded as base64url without padding |

**Signature:** The AS signs the ticket with the same Ed25519 key used for mandates. The signing input is produced by the **Signing Canonicalization** rules above (sorted keys, no whitespace, base64url-encoded signature). The ticket's own `signature` field MUST NOT be present in the bytes being signed.

**Ticket payload — normative rules:**

1. The persisted ticket MUST contain `actionType`. v0.4 implementations that omitted it MUST be migrated.
2. The ticket MUST NOT contain a `path` field. Persisted v0.4 tickets that included `path` MAY remain unchanged for audit, but new tickets MUST NOT include it.
3. `groupId` is `null` only when the AS runs in true personal mode (no group construct at all). AS implementations MAY model personal mode as a "group of one" with a synthesized group ID; in that case `groupId` is non-null and reflects the synthesized identifier.

### Cumulative State

The `cumulativeState` object reports the running totals after this execution is applied, one entry per window the profile's bounds use. `daily` and `monthly` are always present; `weekly` is present when any bound of the profile declares `window: "weekly"`. The shape is:

```json
{
  "daily":   { "amount": <number>, "count": <number> },
  "weekly":  { "amount": <number>, "count": <number> },
  "monthly": { "amount": <number>, "count": <number> }
}
```

`amount` is the running sum of the field named by the profile's `cumulative_sum` bounds (zero when the profile has none); `count` is the running number of tickets in the bucket.

The AS's cumulative state is authoritative. Implementations MAY cache it for display purposes, but the Gatekeeper MUST NOT trust locally cached values for enforcement — every execution request re-fetches cumulative state as part of the ticket issuance round-trip.

### Ticket Verification

Any party holding the **complete signed ticket** and the AS's public key can verify it:

1. Read `issuer` from the ticket and resolve that Authority Server's Ed25519 public key — from the DID itself where `issuer` is a `did:key` (the key *is* the identifier, so no directory is involved), otherwise by resolving the DID, or from static config for an AS the verifier already pins. A verifier MUST NOT accept a key offered alongside the ticket in place of the one `issuer` names, and MUST reject a ticket whose `issuer` it does not trust — a genuine signature from an unknown AS proves only that some AS signed it.
2. Canonicalize the ticket payload (deterministic JSON serialization, excluding signature)
3. Verify the signature against the canonical payload using the public key
4. When the ticket carries `contentHash`: recompute the hash from the held content using the ticket's `contentBinding` and compare (see *Content Binding*)
5. Optionally: obtain the mandate named by `mandateId`, and verify that its signed payload carries the same `mandate_id`, `bounds_hash`, and `profile_id`, that the ticket's `timestamp` falls within its `issued_at`–`expires_at` window, and that its `version` equals the ticket's (for full chain-of-trust audit)
6. Where that mandate's `mandate_owners` entry carries a signature: continue up the chain and verify it (see *Owner Signatures* → *Verification procedure*). Because `mandate_owners` sits inside the signed mandate payload, any surface that serves the mandate already carries the owner's signature — no additional endpoint is involved. The completed chain reads: this AS issued this ticket → under this mandate → which this owner's own key signed.

A valid ticket proves: this AS authorized this specific execution, under this mandate, at this time, with these cumulative totals.

**The holder is the verifier.** A single Ed25519 signature covers the whole ticket, so verification requires every signed field. A **redacted public view** of a ticket (one that hides `userId`, `cumulativeState`, `limits`, or recipients) cannot be independently re-verified from the public view alone — a "signature valid" indicator on such a page is the AS re-verifying its own signature. For a private action the holder (the recipient of the mail, the pipeline receiving the dispatch, the issuer's own log) is the party that matters, so the guarantee holds where it is needed. Making a *public* projection independently verifiable (a second AS signature over a public-only subset) is a tracked direction in `review.md`, not a v0.7 guarantee — implementations MUST NOT present a redacted view as independently verified.

### Retention and Gatekeeper custody

The AS MUST retain all tickets for at least the profile-defined `retention_minimum`. Tickets MUST be:

- Append-only (no mutation or deletion within retention period)
- Queryable by `boundsHash` (return all tickets for a mandate)
- Queryable by time range
- Available for export in a standard format for external audit

**Gatekeeper custody (new in v0.7).** The Gatekeeper MUST retain, durably and unpruned, the **complete signed ticket** for every execution it performs, together with the signed mandate it executed under and the issuer public key current at issuance (where `issuer` is a `did:key`, the key is derivable from the artifact and the entry need not store it separately) — so that each entry verifies offline, without the Authority Server, even after the AS has vanished, rotated keys, or closed the owner's account. This costs nothing on the wire (the full ticket is already in every issuance response); it exists for the person the evidence is *about*. An AS is often run by an employer or a vendor, and the exculpatory case — proving the mandate was narrow and the agent stayed inside it — is exactly the case in which the subject may have lost access to the AS. A display-only summary or a pruned log does not satisfy this rule. The AS copy remains authoritative for cumulative state; the Gatekeeper copy is the subject's own evidence.

- **Failure semantics.** Custody is fail-closed like everything else: a ticket that cannot be archived MUST NOT be executed. The archive write precedes the tool call; if it fails, the execution is refused and the ticket is left unspent on the Gatekeeper side (the AS has counted it — an honest cost, and the same one a network failure after issuance already carries). A best-effort archive that lets an execution proceed unrecorded is non-conformant.
- **Ceiling and deletion.** "Unpruned" has a floor, not an infinite horizon: entries MUST be kept for at least the profile's `retention_minimum` measured from the ticket's own timestamp. After that, the **owner** — and only the owner — MAY export and delete them. The archive is the owner's evidence and, where it holds a disclosed name or locally stored intent, the owner's personal data; the deletion right follows the same person.
- **Scope.** Custody binds every Gatekeeper that performs executions, including an embedded-library Gatekeeper in a pipeline or CI job: an execution environment with no durable store MUST hand each entry to one before executing, or it is non-conformant. A ticket-demanding effector acting as a second Gatekeeper satisfies custody for the tickets it consumed through its spent-ticket record, which MUST hold the complete ticket rather than an identifier.

**Tickets outlive mandates.** Tickets remain cryptographically valid and retrievable after their parent mandate has expired or been revoked. The mandate's TTL and revocation status affect only the AS's willingness to issue **new** tickets against that mandate — they do not affect previously-issued tickets. The ticket is a permanent record of what happened under a specific authorization at a specific time; expiring or revoking the authorization does not erase that history.

### Properties

- **Cryptographic proof per execution** — every authorized action has an AS-signed ticket
- **Cumulative enforcement at the AS** — the AS tracks usage against the human's declared bounds
- **Cumulative state moves to AS** — the Gatekeeper keeps no execution log *for cumulative tracking*; custody of the signed tickets (*Retention and Gatekeeper custody*) is a separate obligation and is not an enforcement input
- **Full audit trail at the AS** — every ticket is stored, signed, and queryable
- **Third-party verifiable** — anyone with the AS's public key can verify any ticket
- **Pre-execution guarantee** — the ticket is issued before the tool call executes, not after

The AS is a runtime dependency for execution. This is by design — execution without proof is execution without accountability.

---

## Content Binding

> New in v0.6 as normative surface, promoted under the v0.6 promotion rule after end-to-end use (the v0.6 `changelog.md` records the review).

A ticket proves an execution was authorized. **Content binding** makes it prove *what* was executed: the ticket carries a hash of the action's content, so a party holding the delivered artifact — an email, a post, a record, a commit — can check that it is byte-for-byte what the human authorized.

The privacy posture is unchanged: the Gatekeeper computes the hash locally and sends it in the ticket **request**; the AS copies it verbatim into the signed ticket **payload**. **The AS receives only the hash, never the content.**

### Declaration

A profile MAY declare a `content_binding` block:

```json
{ "content_binding": { "version": "1", "kind": "text", "pre_footer": true } }
```

| Field | Values | Meaning |
|---|---|---|
| `version` | `"1"` \| `"2"` | Canonicalization version. A verifier MUST pin it. |
| `kind` | `"jcs"` \| `"text"` | What is hashed and how (below). |
| `pre_footer` | boolean | For `text`: hash the content **before** any implementation-appended footer. |
| `fields` | `string[]` (version 2 only) | The declared field subset to bind (below). |
| `required_fields` | `string[]` (version 2 only) | Subset of `fields` that MUST be present. |
| `appliesTo` | `string[]` (version 2 only) | Action types the binding covers, read strictly. |

### Canonicalization (normative, versioned)

- **`kind:"jcs"`** — RFC 8785 JCS of the record payload → `sha256`. For structured writes (records, CRM) with no single content field; the whole payload is the content.
- **`kind:"text"`** — UTF-8 of the content field after: Unicode **NFC**, line endings normalized to LF, trailing per-line whitespace stripped, trailing blank lines removed; taken **pre-footer** when `pre_footer` is set. For communicative profiles (email, publish, calendar). Which argument is the content field is manifest data (`contentField`), with auto-detection from a prose vocabulary as fallback.

### Version 2: declared fields

Version 1 has two modes and neither is the general case: `text` binds a **single** field, `jcs` binds the **whole** payload. A profile that binds prose binds the body and nothing else — the ticket then proves *"this text was approved"*, not *"…to be sent to these recipients."* An Executor may take approved wording and deliver it elsewhere, and the ticket still verifies: a ticket that verifies while certifying something no one agreed to manufactures confidence.

The repair is not to bind the whole call. A hash over the whole call is checkable only by a party that knows the whole call — and an email recipient holds the body, the subject, and their own address, but not `bcc`. **What is required is a declared subset, chosen so that the intended verifier can reproduce it.**

At `version:"2"` a profile declares `fields`; the Gatekeeper constructs an object from exactly those keys and canonicalizes it by the declared `kind` (JCS sorts keys, so field ordering never affects the hash). The selection rule is stated, not implied: **bind everything the approving human is shown, and nothing the intended verifier cannot see** — for a message profile that means recipients, subject, and body, and deliberately *not* blind recipients.

**Absence.** An absent **optional** field is omitted from the hashed object; an absent **required** field (`required_fields`) MUST refuse the call. A value that is null or empty after canonicalization counts as absent — the two MUST NOT be distinguished, or the same message hashes differently depending on whether a connector sent `""` or nothing. If **no** declared field carries a value, the call MUST be refused regardless of `required_fields`: that hash would commit to nothing while reading exactly like one that commits to everything. Omission is safe because the field list is published in the signed ticket (`contentBinding`): a verifier holding a message with a `Cc` header knows `cc` is in scope and includes it, so a recipient added after approval still breaks the hash.

**Scope (`appliesTo`).** A profile gates more than its content-bearing calls — `email` also gates deletes, which carry an identifier and no content. A field binding therefore MAY declare `appliesTo`, using the profile's action-type vocabulary, and it MUST be read **strictly**: an undeclared action type is NOT covered. This is deliberately the opposite of how a bound reads the same key — an extra bound is a tighter limit; an extra content binding is a refused legitimate action. An implementation that finds a gated write with no declared action type under a content-binding profile SHOULD say so, because the ticket it issues will bind nothing.

**Canonicalization inside the object.** Every string entering the bound object — at any depth, including inside arrays — MUST be canonicalized by the `text` rule before serialization. This is what makes the binding checkable at all: the verifier of an email holds the **delivered** copy, whose body has CRLF line endings and transport-added trailing whitespace, and JCS embeds strings verbatim. Array order MUST be preserved (reordering recipients is a change worth catching, and no transport reorders them). Values MUST NOT be otherwise normalized — in particular, addresses MUST NOT be lowercased; the local part is case-sensitive per RFC 5321 and this layer has no standing to make that semantic claim.

### Conformance: an identifier MUST have one spelling

A binding hashes an exact string, so two spellings of one value are two bindings. For prose this never bites; for an identifier it is the normal case — `https://x.app` and `https://x.app/` name the same build and produce different hashes. Where a profile binds an identifier rather than prose, its normal form MUST be declared (in the connector, next to the declaration naming the bound field), and the Gatekeeper MUST apply it **before the value is shown for approval** — not merely before hashing. Applied early, the value approved, the value bound, and the value a verifier can later reproduce are one string. The cost of leaving this undeclared is worse than a mismatch: a ticket that cannot be found reads as *no ticket exists*, so a trailing slash becomes indistinguishable from an action that was never authorized. Adding or changing a normalization rule moves every hash it produces and is a breaking change on the same footing as adding a bound field.

### Conformance: a bound value MUST survive transport

An implementation MUST NOT bind a field the transport will alter in delivery. This is not hypothetical: a live send bound a subject containing an em-dash; RFC 5322 headers are ASCII-only and the connector wrote raw UTF-8, so it arrived mangled and the recipient could not reproduce the hash — every layer behaved correctly and the check still failed. **A false mismatch is worse than no binding**: a verifier who sees a mismatch on honest mail learns that mismatches are noise, and the next real one is dismissed too. The repair belongs at the boundary: the value is hashed as approved and encoded for transport on the way out, in that order. Which argument needs which encoding is declared by the connector; the encodings belong to the engine. Implementations SHOULD assume this class of defect is present until a bound field has been verified against a genuinely delivered copy.

### Conformance: what is displayed MUST be what is bound

An implementation MUST NOT display, on an approval surface, a consequential parameter it does not bind; and MUST NOT bind a parameter it does not display. **Bound but not displayed** means the human committed to something never seen. **Displayed but not bound** means the Executor may alter it after approval — the reviewer's attention was spent on a value the ticket does not hold. Where another mechanism independently constrains a displayed parameter (a pipeline that checks the repository it runs in; review-mode proposal matching that pins the whole argument set), that MUST be stated in the profile or manifest rather than left to coincidence. This is a conformance requirement, not a presentation guideline — and it is the one place where the "UI hints MUST NOT influence enforcement" rule below does not apply, because here the display *is* part of the enforcement claim. The protocol concedes elsewhere that it verifies commitment, not comprehension; that concession is only defensible if what was shown and what was signed are the same thing.

### Verification, and what a match does not prove

Recompute the hash from the held content using the ticket's signed `contentBinding`, compare to the signed `contentHash`, and verify the ticket signature. A match under a valid signature proves the AS signed that **this exact content** was authorized under these bounds at this time. It does **not** prove real-world identity (see *Identity Assurance*), and it does not catch edits made outside the gated path — those surface only as a gap between the signed content and the live artifact, never prevented.

### Ticket Lookup by Content

An AS MAY offer a public lookup from a content hash to its ticket(s), so a verifier holding only an artifact can discover whether a ticket exists. Because such an endpoint is a **confirmation oracle** — it confirms that specific content was sent through the system — it MUST be opt-in per profile via a `ticket_lookup` declaration, MUST be rate-limited, and MUST return an indistinguishable not-found for content that exists but is not disclosable. Profiles whose content is public by nature (publish, public deploys) are the intended users; profiles carrying private content MUST NOT enable it.

### Ticket Disclosure Is Declared

A machine verifier of a deploy needs to see the environment a ticket authorized; an email ticket must never reveal who was written to. Both are tickets, and one projection cannot serve both — so what a ticket exposes publicly is **declared**, never assumed:

> A profile — and, where finer control is wanted, a mandate — DECLARES which execution-context fields a ticket may disclose publicly. The default is **none**. Absence of a declaration is never permission.

**Declaration shape (v0.7).** A profile declares `disclose_fields: string[]` — the execution-context field names a ticket MAY expose publicly. A mandate MAY carry a signed `disclose_fields: string[]` that is a **subset** of the profile's list (a mandate can narrow, never widen); when present, the mandate's list governs, and it is covered by the owner-signed projection where the owner co-signs (*Owner Signatures*), so an AS cannot drop the owner's narrowing. A public projection of a ticket exposes exactly the governing list and nothing else. No list, or an empty list, discloses nothing. (`disclose_fields`, not `disclose`: the latter already names the identity-disclosure object inside `subjects`.)

This is the same fail-closed reading used throughout this specification: an unset read window denies; undeclared read governance denies; undeclared disclosure reveals nothing. Existing profiles are unaffected by construction — they declare nothing, so they disclose nothing. `email` keeps recipients private permanently; `publish` may disclose freely; `deploy` against a public repository may disclose repository, environment, and pipeline, while the same profile against a private repository discloses none of it — which is why the declaration belongs on the mandate as well as the profile: the owner knows whether the target is public. Stated for the reader rather than the implementer: **you decide whether a ticket proves only that you approved something, or exactly what you approved.**

---

## Identity & Authorization

### Principle

> Profiles define what bounds and scope exist. The AS (per group) defines who must commit. The AS verifies identity and required-approver coverage before signing.

The protocol separates three concerns:

| Concern | Defines | Example |
|---------|---------|---------|
| **Profile** | What bounds and scope fields exist | `charge@0.5` defines `amount_max`, `currency`, `action_type` |
| **AS group config** | Who must commit for which profile | "For group acme, the `charge` profile requires alice's mandate" |

Required-approver sets are organizational policy, not protocol semantics. They live on the AS, configured per group.

### Identity Is Not Authority

**Verified identity is not equivalent to decision authority.**

An identity system may prove that a Mandate Owner is a specific natural person — that is necessary, but not sufficient. HAP additionally requires that this verified identity is *authorized* to act for the relevant profile, group, or organizational context. In group mode, that authority is resolved by the Authority Server's required-approver configuration (or by trusted authority credentials the AS accepts); in personal mode, the user commits directly for their own actions.

This is why authentication is out of HAP Core scope (below) while required-approver coverage is enforced by the AS: identity systems answer *"who is this?"*; HAP answers *"is this person authorized to commit this action, and is there proof?"*

### Authentication

Authentication is out of HAP Core scope. Implementations MUST establish identity through external mechanisms (e.g., OAuth, WebAuthn, hardware tokens, passkeys, API keys).

The protocol uses **Decentralized Identifiers (DIDs)** for platform-agnostic identity:

- `did:key:z6Mk...` — Ed25519 public key as DID
- `did:github:alice` — GitHub identity
- `did:email:dave@company.com` — Email-based identity

The verified DID is recorded in the mandate's `mandate_owners`. The AS MUST NOT issue mandates without verifying the mandate owner's identity through a trusted authentication channel.

**Identity DIDs vs signing DIDs (new in v0.6).** The forms above are all valid as *identity* — a stable label for who signed. They are not all valid as *signing identity*. A `did:key` is **self-certifying**: the public key *is* the identifier, so substituting the key produces a different DID that no longer matches the owner the mandate names — a verifier needs no key directory, no continuity history, no trusted server.

> **Conformance rule.** A DID used as a Mandate Owner's **signing** identity (see *Owner Signatures*) MUST be key-bearing, or otherwise independently resolvable without recourse to the Authority Server. A non-self-certifying identifier silently voids the co-signature's central guarantee: the AS becomes the key directory, and an AS-served key directory is no defence against the AS (see `governance.md` → *The Authority Server Cannot Check Itself*).

`did:github` and `did:email` remain valid identity DIDs; they MUST NOT be used as signing DIDs, and there is no pairing mechanism between the two — a co-signing owner appears in `mandate_owners` by their key-bearing DID itself (see *Owner Signatures* for why a pairing is deliberately impossible). Self-certification removes *substitution*; it does not deliver the DID to a verifier — the verifier must still learn the owner's DID from an out-of-band source (the owner's own website, a business card, a prior signed artifact already trusted). A reader who believes self-certification alone solves cold verification has been misled; the out-of-band step is the honest cost.

### AS Group Configuration

Required approvers moved from profiles to AS group configuration in v0.5:

```json
{
  "group": "acme-corp",
  "requiredApprovers": {
    "charge@0.5": ["did:key:alice"],
    "purchase@0.5": ["did:key:alice", "did:key:bob"]
  }
}
```

The profile defines *what* fields exist. The group admin defines *who* must commit for each profile.

### Personal Mode vs Group Mode

**Personal mode** (no group):
- All profiles are available to the user
- No required approvers — the single user commits directly
- The AS skips approver-coverage checks
- The mandate's `mandate_owners` records the user's own DID

**Group mode:**
- Only profiles with configured required approvers are available
- The group admin must assign at least one required approver to each profile they enable
- A profile with no approver configuration is not available to that group
- The AS validates approver coverage: the granting user must be a required approver in the group

This separation means:
- **Profiles are universal** — the same profile works for a solo developer and a 500-person enterprise
- **Governance is organizational** — configured per group on the AS
- **Personal mode just works** — no groups, no approvers, no configuration required

### Authorization Mapping (Group Mode)

Within a group, the AS holds, per profile, the members whose mandate is required:

```json
{
  "group": "acme-corp",
  "requiredApprovers": {
    "charge@0.5": ["did:key:alice", "did:key:bob"],
    "purchase@0.5": ["did:key:carol"]
  }
}
```

The profile defines WHAT bounds exist. The group config defines WHO must commit for each profile. These are separate concerns:

- Changing the profile (adding a bound) is a **protocol change**
- Changing the AS config (adding a person) is a **personnel change**

### Immutability Rule

> The authorization source MUST NOT be modifiable by the mandate owner as part of the same action being signed.

This is the key security property. Without it, a mandate owner could add themselves to the authorized list and approve their own action in a single step.

### AS Authorization Responsibilities

Before signing a mandate, the AS MUST:

1. **Verify identity** — Validate the mandate owner's authentication token. Resolve to a verified DID.
2. **Resolve required approvers** — In group mode: look up `requiredApprovers` for the granting user's group and the requested profile. In personal mode: skip.
3. **Check membership** — In group mode: verify that the authenticated DID is a required approver in the group. In personal mode: skip.
4. **Reject or sign** — Only sign the mandate if all checks pass.

### Identity Assurance (new in v0.6)

`mandate_owners` records a Mandate Owner as a bare DID — pseudonymous by design. Identity Assurance adds an optional, **signed** overlay so an authorization (and the tickets and content footers it produces) can carry the owner's verified real-world identity, gated by *how* that identity was verified.

#### Levels, methods, trust root

| Field | Values | Meaning |
|---|---|---|
| `assurance` | `low` \| `high` | `low` → no name shown; `high` → the name MAY be shown |
| `method` | `self_declared` \| `as_vouched` \| `eudi` | how identity was established |
| `trust_root` | `self` \| `as` \| `external` | **who** vouches — the load-bearing field |

- **`self_declared`** (`low`/`self`) — the owner typed a name. Never disclosed.
- **`as_vouched`** (`high`/`as`) — the **AS operator** verified the owner. Valid only within the operator's own trust domain.
- **`eudi`** (`high`/`external`) — an external eID (e.g. an EUDI wallet); AS-independent. Since v0.6 this method binds to an owner signature with `binding: "eudi"` (see *Owner Signatures*) — identity assurance and signature assurance are separate axes, and this is the point where they meet.

#### Signed `subjects` block

When identity is disclosed, the mandate carries a signed `subjects` array (one entry per owner); the ticket copies the disclosed subset so it self-verifies:

```json
"subjects": [{
  "did": "did:key:…",
  "assurance": "high",
  "method": "as_vouched",
  "trust_root": "as",
  "verifier": "did:web:example-as.com",
  "disclose": { "name": "Alice Example" },
  "verified_at": 1735900000
}]
```

Validation: `disclose.name` only when `assurance:"high"`; `as_vouched ⇒ trust_root:"as"` + `verifier`; `eudi ⇒ trust_root:"external"` and a corresponding `mandate_owners` entry with `binding:"eudi"`; `low ⇒` no `disclose`.

> **Deprecated:** earlier drafts carried a `Subject.owner_signature` field (a signature over the identity claim). It signed the wrong object — attribution attaches to *what was committed to*, not to *who someone is* — and it was welded to one method. It is replaced by `mandate_owners`. Implementations MUST NOT emit it; verifiers MAY ignore it on artifacts that carry it.

#### Two orthogonal knobs

**Assurance** (how verified — a property of the credential) is separate from **disclosure** (whether the name is attached to a given authorization — opt-in, default off). `high` *permits* the name; the owner still *chooses* to attach it.

#### Domain-scoping (conformance)

> An AS MAY issue `method:"as_vouched"` (`high`) **only** for subjects within its own trust domain. For any subject outside that domain, `high` MUST come from an external root. An AS MUST NOT self-vouch `high` for an external subject.

#### Credential binding

Identity is **not re-verified per mandate.** Verification is a one-time event that attaches the assurance record to the authenticated credential; each mandate **stamps** the `subjects` block from that credential's *current* record at issuance. Revocation and expiry need no re-verification — the next mandate reflects the change — and a credential minted from a stronger auth session can carry a higher assurance than a weaker one for the same account. A bearer credential carrying `high` is sensitive — which is why the strongest root (`eudi`) binds to a per-event owner signature, not a bearer credential.

#### Disclosure in footers

Where an implementation appends provenance footers to delivered content, the owner's name appears **only at `high`**, derived from the signed `subjects` block:

- `low` → "Sent by an AI agent via «operator»" — no name.
- `high`/`as_vouched` → "Sent by an AI agent of «name», verified by «operator»".
- `high`/`eudi` → "…of «name», identity verified (EUDI)".

`«operator»` renders the actual `verifier`, never a hardcoded brand. A verification surface MUST show the method and trust root, so a relying party can weigh operator-asserted against externally-verified identity.

#### Privacy carve-out

A disclosed name is the one piece of personal semantic content the AS holds under this specification, and it enters only by the owner's explicit opt-in (`disclose`), never by protocol design. See the amended Privacy Invariant scope in `governance.md` → *Invariant 4*.

### Normative Rules

1. The AS MUST verify mandate owner identity before signing a mandate.
2. In group mode, the AS MUST verify the mandate owner is a required approver before signing.
3. The authorization source MUST NOT be modifiable by the mandate owner as part of the same action being signed.
4. Changes to the authorization source MUST be made by an authorized party and MUST be auditable.
5. The verified DID MUST be recorded in the mandate's `mandate_owners`.
6. The AS MUST NOT sign a `subjects` entry whose DID it has not verified against the authenticated credential, and MUST NOT accept a caller-supplied owner DID that differs from the authenticated identity.

---

## Owner Signatures

> New in v0.6 (as *Owner Mandate Signatures*). Optional and additive: a `mandate_owners` entry with no signature fields records an owner exactly as a v0.5 owner DID did.

HAP has an **identity assurance** axis: how strongly is this DID known to belong to this person? It gains in v0.6 a second, independent axis — **signature assurance**: *what key signed the mandate this person is said to have made?* Without it the answer is always the same one: the Authority Server's. The AS authenticates a human, resolves them to a DID, and the AS signs a mandate stating that this person committed to these bounds. The chain is complete and verifiable, but every link is an assertion by one party — and a compromised AS can fabricate authorization artifacts attributed to a Mandate Owner.

> **Principle.** A Mandate Owner MAY sign the mandate, and each approval under it, with a key only they control. When they do, the authority and the decision are attributable to the person independently of the Authority Server.

The missing property has a precise name: **non-repudiation by the human**. Not authentication — an eID or passkey login is fine as authentication. Attribution: a commitment is attributable only when the person's own key signed the specific content they committed to. The ticket stays AS-signed, and should — the human is not present at execution. The ticket's job is *system evidence that an execution fell inside an attributable mandate*; this section upgrades the mandate from **asserted** to **attributable** and touches the ticket not at all.

### The signed object: `HAP-mandate-projection`

The human signs *before* the AS does, so they cannot sign the finished mandate — `mandate_id` and `issued_at` do not exist yet. They sign a **mandate projection**: a canonical object every field of which is known at approval time and reconstructible from the finished mandate.

```json
{
  "typ": "HAP-mandate-projection",
  "version": "0.7",
  "profile_id": "email@0.5",
  "profile_hash": "sha256:…",
  "owner_did": "did:key:z6Mk…",
  "bounds_hash": "sha256:…",
  "scope_hash": "sha256:…",
  "execution_context_hash": "sha256:…",
  "gate_content_hashes": { "intent": "sha256:…" },
  "intent_disclosure_hash": "sha256:…",
  "commitment_mode": "review",
  "expires_at": 1767225600,
  "nonce": "…"
}
```

Canonicalization is RFC 8785 JCS → SHA-256, versioned via `version`; a verifier MUST pin the version. Field absence is defined, not incidental. Conditional fields, each included exactly when the mandate carries it and omitted otherwise: `intent_disclosure_hash`; `above_cap_caps` and `above_cap_approvers` (when `commitment_mode` is `review_above_cap` — both, always together); `disclose_fields` (when the mandate narrows disclosure). A projection that omits a conditional field the mandate carries, or carries one the mandate omits, does not reconstruct and the signature MUST fail.

Every field except `typ`, `owner_did`, and `nonce` exists verbatim in the mandate payload, so a verifier **reconstructs the projection from the mandate it holds** and checks the signature over it — no side channel, no second fetch. `expires_at` exists at signing time because the co-signing owner chooses it and sends it in the request (*Mandate Request Schema*); the AS signs that value or refuses. `owner_did` MUST equal the `did` of the `mandate_owners` entry carrying the signature; a verifier MUST reject an entry whose signature verifies only over a projection naming a different `owner_did`.

This has a consequence stated plainly rather than discovered later: **a co-signing owner is recorded in `mandate_owners` by their key-bearing signing DID itself.** An identity-only DID (`did:github`, `did:email`) remains valid for an owner who does not co-sign. There is deliberately **no pairing field** linking an identity DID to a separate signing key — such a pairing would be recorded and served by the AS, and an AS-recorded pairing is an AS-side check: a compromised AS pairs an attacker's key with the victim's identity DID, and the substitution the key-bearing rule exists to make impossible returns through the side door. An organization using identity-only DIDs therefore migrates a co-signing owner to a key-bearing DID; confirming *whose* key it is remains the out-of-band step, never a directory. Mandates issued under the old identity DID stay attributed to it — the migration is forward-only and creates no link the AS could later rewrite.

- **`profile_hash` is covered deliberately, not incidentally (v0.7).** The owner signs the profile's *bytes*, not only its `profile_id`. Without it the profile tier below would be an AS-side check wearing enforcement's clothes: a compromised AS could point the mandate at different bytes for the same identifier — bytes carrying no `ownerSignature` floor, a wider `actionTypes` registry, or a looser `content_binding` — and nothing the owner signed would contradict it. The whole mechanism exists to move authorization out of the class of claims the AS can restate at will, so what the owner commits to has to include which rulebook applied. Where a profile's `disclose_fields` list governs (rather than a narrower one on the mandate), it is covered by the same hash; a narrower list on the mandate is a projection field of its own (above).
- **Intent is covered without special handling** — `gate_content_hashes` is included wholesale and intent is a gate content hash. `intent_disclosure_hash` is included for a different reason: it binds the ciphertext **and the frozen approver set**, and a compromised AS swapping the approver set is exactly the class of forgery this mechanism exists to stop.
- **`expires_at` is the replay defence.** The human signs how long the authority lives, not only what it permits; replaying the projection produces a mandate identical in authority — it grants nothing new.
- **`above_cap_caps` and `above_cap_approvers` are covered because the mode alone is not the promise.** Without them a compromised AS could keep `commitment_mode: "review_above_cap"` intact while raising every cap and emptying the approver list — a mandate that reads as reviewed and behaves as automatic. The owner signs the caps and the approvers they agreed to.
- **`disclose_fields` is covered where the owner narrowed it**, so the narrowing cannot be dropped by the AS; where only the profile's list governs, `profile_hash` already covers it.
- **`nonce` is defence-in-depth against third parties only.** It prevents duplicate issuance by an honest AS. Nonce enforcement is AS-side, and an AS-side check is not a defence against the AS — the spec deliberately does not credit it with one. Uniqueness is per `owner_did` for the lifetime of the AS's retention window: an AS MUST refuse a second mandate request whose projection carries a `(owner_did, nonce)` pair it has already signed. The nonce SHOULD be at least 128 bits of randomness; it is never reused across mandates.

### Mandate field: `mandate_owners`

Exactly one entry in v0.7 (Mandate rule 7). `did` is required; the remaining fields are present together when the owner co-signed and absent together when they did not:

```json
"mandate_owners": [{
  "did": "did:key:z6Mk…",
  "alg": "EdDSA",
  "signature": "base64url…",
  "signed_at": 1767139200,
  "nonce": "…",
  "binding": "webauthn",
  "signing_surface": "gatekeeper_local"
}]
```

Carried **inside the AS-signed payload**, so the AS commits to having received it and cannot strip it afterwards without invalidating its own signature.

**There is deliberately no `public_key` field, and it MUST NOT be added.** With a key-bearing DID there is nothing to carry — the key *is* the identifier. Carrying one would be a key directory in miniature, and it would fail *silently*: an implementation using a non-key-bearing DID would still validate, because the signature would check against the carried key while the guarantee had quietly evaporated. With the field absent, a non-key-bearing DID fails **structurally** — there is no key to verify against, so non-conformance surfaces as broken verification rather than as verification that works and means nothing. This note exists because a future implementer will otherwise read the absence as an oversight and helpfully re-add it.

`alg` is partly redundant — a `did:key` multicodec prefix already determines the key type. It is kept because an explicit algorithm identifier guards against curve confusion and costs nothing. **If the two disagree, the DID is authoritative** — the field a party writes loses to the field a party cannot forge.

`binding` is the signature-assurance axis:

| `binding` | Key lives in | Defeats | Signature weight |
|---|---|---|---|
| `raw` | software | little — for tests and CI | none |
| `webauthn` | platform authenticator / security key | forged mandates, fabricated approvals, flipped commitment mode, extended expiry | advanced electronic signature at best |
| `eudi` | national wallet with its own display | all of the above, plus a compromised AS *frontend*, plus key rotation | qualified, where the scheme is qualified |

`Subject.method` keeps its meaning — identity assurance. `binding` is independent: the useful intermediate state — *the operator vouches for who Alice is, and Alice's own key signs what she committed to* — is expressible only because the axes are separate.

**Unknown `binding` values pass through.** An AS MUST NOT reject a `mandate_owners` entry solely because it does not recognize its `binding` value — it stores and signs what it received. Requiring a minimum binding is verifier policy (and optionally a profile floor), never an AS gate; this also keeps future binding values (other jurisdictions' qualified-signature schemes) additive rather than version-breaking.

**`signing_surface` is a declaration, not a proof.** Custody answers *who can use the key*; surface answers *who controlled what the key was shown*. A passkey signed in a locally installed UI and the same passkey signed in AS-served JavaScript have identical custody and sharply different exposure — AS-served script can sign something other than what the screen shows. The field records which surface was used (`gatekeeper_local` | `as_web` | `wallet_display`) so the artifact can express whether that attack was defended against — but a claim the mandate owner records about its own environment is not verifiable by anyone. It is self-serving only in the honest direction (there is no use in claiming *more* protection to a party who will weigh it), so it carries real information; it carries none a verifier can check. The only surface a verifier can trust rather than take on faith is one with an independent display — `wallet_display`, which is why `binding: "eudi"` collapses the two axes and ranks above the rest.

### Approvals: `HAP-approval`

In `review` mode the mandate is a container; the per-action approval is where the human's judgment actually lands, and a compromised AS fabricating an approval is the more damaging attack. The approval gets its own signed object:

```json
{
  "typ": "HAP-approval",
  "version": "0.7",
  "proposal_id": "…",
  "mandate_id": "…",
  "decision": "commit",
  "content_hash": "sha256:…",
  "decided_at": 1767139200,
  "nonce": "…"
}
```

The AS MUST verify the approval signature before issuing the ticket for the proposal, and the ticket MUST carry the approval signature itself in the signed payload (field `approvalSignature` — see *Ticket Payload Schema*; never a hash of it, which a holder could check only by asking the AS) — so the ticket proves the human approved **this content**, rather than that the AS says a proposal reached its approved state. Approval transport and storage remain AS-defined, as before.

**What `content_hash` covers.** Where the profile declares a content binding, the approval's `content_hash` MUST equal the ticket's `contentHash` — the human approved these bytes. Where the profile binds no content, `content_hash` is `sha256` over the RFC 8785 JCS of the proposal's argument set — the same object review-mode proposal matching already pins. Stated honestly: without a content binding, checking that link requires holding the proposal record, so it serves the owner and the Gatekeeper rather than a cold third party.

Signing `decision: "reject"` matters as much as signing `commit`: a rejection the AS can discard is a rejection that never happened.

### Where the requirement lives — three tiers, only two of them enforcement

An optional field a compromised AS may simply omit is not a defence: a requirement recorded *by the AS* cannot constrain the AS — it omits the signature and the requirement in one move.

| Tier | Checkable without trusting the AS? | Role |
|---|---|---|
| **Verifier policy** — the relying party demands a minimum `binding` | yes, entirely | **primary enforcement** |
| **Profile** — `ownerSignature: { "required": true, "minBinding": "…" }` | yes: `profile_id` and `profile_hash` are in the AS-signed payload **and in the owner-signed projection**, so the bytes carrying the floor are content-addressed by the party the floor protects, not only by the operator; the bytes are also retention-bound | optional floor |
| **Mandate request** — the owner asks that their authorities be co-signed | no | owner-facing **assurance**, not enforcement |

Verifier policy is the natural home — it is where the protocol's trust unit already points (`governance.md` → *Trust Model*: public key + profile + local policy), it needs no profile fork, and it puts the requirement with the party bearing the risk. The profile floor is reserved for domains that cannot mean anything without a signature; used more freely it forks `charge` from `charge-with-cosign`, exactly the proliferation universal profiles exist to prevent. The mandate-request tier is kept and explicitly labelled assurance — a control that looks like enforcement but is not is worse than no control.

A verifier or AS that finds an applicable requirement unmet MUST fail (`OWNER_SIGNATURE_REQUIRED`), not warn — the same fail-closed reading used everywhere else in this specification.

### Multi-owner: every required owner signs

No quorum. Required-owner coverage already requires the union of granting owners to cover the required set, and the multi-owner coverage rule requires all required owners to commit to the same hashes. Where owner signatures are required, each required owner's mandate carries that owner's `mandate_owners` entry. Quorum would be a new authority semantic, not a signing detail; it belongs in group configuration as *who is required* — and once required, each signs.

### Verification procedure

1. Verify the AS signature over the mandate. *(unchanged)*
2. Apply verifier policy: what minimum `binding` does this relying party require?
3. Read `profile_id`; fetch the profile; read any `ownerSignature` floor.
4. For each required owner: take that owner's mandate (one mandate per owner — *Multi-Owner Coverage Rule*), read its single `mandate_owners` entry, reconstruct the mandate projection from that mandate's own fields, and verify the signature using the key **carried in the owner's DID**.
5. Confirm the DID matches the owner you expected, from an out-of-band source (see *Identity DIDs vs signing DIDs*).
6. In `review` mode: verify the approval signature; where the profile binds content, confirm the approval's `content_hash` equals the ticket's `contentHash`. (Without a content binding, that link is checkable only against the held proposal record — see *Approvals* above.)

Steps 2–6 require no trust in the AS. Step 5 is the one that requires something of the verifier, and it is the honest cost of cold verification.

### Key lifecycle

**Key loss — enroll forward, never re-attribute.** This is an attack vector, not an operational footnote: if AS-mediated recovery can re-attribute existing mandates, a compromised AS attacks recovery instead of signatures and the threat model routes around the whole mechanism.

- Recovery MUST NOT retroactively re-sign or re-attribute existing owner signatures.
- It MAY enroll a new key **going forward only**.
- It MUST emit an auditable key-enrolment event into the AS's append-only history (the same class of record as a revocation: `owner_key.enrolled`, naming the old DID, the new DID, and the time) — a transition, never an erasure.
- Live authorities under the lost key expire or are revoked normally. They are never transferred.

The asymmetry is deliberate and accepted: revoking authorities under a lost key is itself AS-mediated, and that is fine — a malicious AS revoking is denial of service, not forgery.

**Key rotation — the remaining hole.** With a key-bearing DID, rotating the key changes the identity: a verifier holding the owner's old DID from a business card sees a stranger. Under enroll-forward-only that is *correct behaviour* — what is lost is continuity of reputation, not security. Acceptable for passkeys; not acceptable for a legal person across years. A rotation chain (new key signed by old) covers planned hygiene only — it needs the old key, which is precisely what is missing in the loss and compromise cases. What actually re-binds a new key to the same legal person without the AS *and* without the old key is an **external identity root** — which is why the `eudi` binding is not the polite completion of the design but the only thing that closes a hole the design otherwise cannot close. The deferred alternative is an external or multi-witness transparency log; an AS-run log is no defence against the AS.

### What this does and does not prove

**Does:** the mandate is attributable to a key only the owner controls; each approval is attributable to the person who made it; a compromised AS cannot forge authority, fabricate or discard an approval, flip `review` → `automatic`, raise an above-cap threshold or swap its approvers, widen what a ticket discloses, or extend a mandate's life; a verifier with the owner's DID from an out-of-band source needs no trust in the operator.

**Does not:** prove the human *read* what they signed (only that their device signed it); make tickets human-signed (they are execution evidence and stay AS-signed); confer qualified-signature status (a passkey is not a QES); defend against a compromised AS **frontend** serving a signing UI that signs something other than what the screen shows (the answers are a locally installed signing surface, or a wallet with its own display); deliver the owner's DID to a cold verifier.

**The irreducible residue.** Content binding already lets a holder check that an artifact matches the signed hash without the AS, so the decision → execution link is not wholly AS-asserted. What no signature scheme fixes is **cumulative state and pre-flight ordering** — whether this was the 3rd charge or the 30th, and whether the ticket genuinely preceded execution. Those are claims about a *sequence*, not about a document, and only the AS witnesses the sequence. This is the honest floor of the trust model, and it is where an append-only witnessed log would eventually earn its cost.

---

## Revocation

v0.4 introduces revocation. With mandate tickets flowing through the AS, revocation becomes possible: revoke the mandate, and the AS refuses to issue new tickets against it.

- The AS maintains a revocation list, persisted in durable storage.
- When the Gatekeeper requests a ticket, the AS checks if the mandate has been revoked.
- Revoked mandates cause the ticket request to fail with the `MANDATE_REVOKED` error code.
- The human can revoke through the AS interface at any time.
- Revocation MAY be initiated by the original mandate owner or by a group admin.

The mandate itself remains cryptographically valid for audit purposes — its signature, hashes, and bindings are unchanged. Revocation only affects the AS's willingness to issue new tickets. v0.3 had no revocation mechanism: TTL expiry was the only stop.

**Normative rules:**

1. The AS MUST persist the revocation list in durable storage.
2. The AS MUST check revocation status before issuing any ticket.
3. Revoked mandates remain verifiable for audit purposes — the signature is still valid.
4. Listing surfaces MUST report revocation status (the protocol defines no endpoints; any surface that lists mandates to their owner or group is one).

### Revocation is permanent (v0.7)

A revocation is final for the mandate it names. A revoked mandate MUST NOT be renewed, re-signed, un-revoked, or exercised again; "I want it back" is a **new mandate** with a new `mandate_id`, a fresh ceremony, and — where the owner co-signs — a fresh signature. The AS MUST NOT delete or hide the revocation record: it is a transition in an append-only history, never an erasure.

v0.5 permitted the opposite — *Revocation Supersession*, under which an AS MAY treat a prior revocation as superseded when the owner re-issued the same `bounds_hash`. That section is retired in v0.7 (`changelog.md` → *Retired in v0.7*). No implementation built it, and the stricter rule above with per-ceremony mandate identity is what was built instead; a described-but-unbuilt, weaker mechanism invites a later implementer to build it believing it endorsed, and it would weaken the audit story the stricter rule exists to protect.

---

## Human-Gated Actions

AI systems MUST NOT:

- Define bounds without human approval
- Create binding commitment without explicit human authorization
- Assign or expand mandate ownership
- Widen authorized bounds beyond the signed values
- Override human intent at the level defined by the authorization
- Switch commitment mode (e.g., from review to automatic) without re-issuance

Within an authorized scope, AI systems MAY:

- Infer intermediate steps
- Generate tactical plans
- Choose among locally valid options
- Optimize execution inside the declared bounds

Actions require different state resolution based on risk:

| Action Type | Required States |
|:---|:---|
| Planning & analysis (no external effect) | Bounds + Scope + Intent — the agent may reason against the mandate before anything runs; nothing executes and no ticket is issued |
| Execution | All authorization states + intent + valid ticket |
| Public/irreversible actions | All states + explicit reconfirmation (typically `review` mode) |

Reads are not in this table: they are governed by *Read Authorization*, locally and without a ticket. This enforces human leadership at the point of irreversibility while permitting useful autonomy within authorized bounds.

### The Decision Closure Loop

1. **State gap detected** — AI identifies missing or ambiguous decision state
2. **Targeted inquiry** — Request for specific state resolution
3. **Human resolves** — Human provides missing direction
4. **Closure evaluated** — System checks if all required states are resolved
5. **Execute or continue** — If closure achieved, AI proceeds (subject to ticket issuance); otherwise, loop continues

Order doesn't matter. Only closure matters.

## Authority Server Behavior

A HAP Authority Server (AS) is the cryptographic authority and accountability layer of the protocol. It signs mandates that prove a human authorized a specific scope of action, and it signs tickets that prove each action stayed within those bounds.

ASes do not validate truth. They validate Profile compliance and bounds adherence.
ASes do not trust executors. They enable users to enforce boundaries.

### Responsibilities

A v0.7 AS has five primary responsibilities:

1. **Mandate issuance** — sign authorizations after verifying profile compliance, identity, and (in group mode) required-approver coverage
2. **Ticket issuance** — sign mandate tickets after checking per-transaction bounds and cumulative limits
3. **Cumulative state tracking** — maintain running totals (daily, weekly, monthly) per cumulative group, profile, and action type (*Cumulative State Tracking* below — the bucket is shared by every mandate exercising it)
4. **Revocation** — maintain a revocation list and refuse to issue tickets against revoked mandates
5. **Retention** — store mandates and tickets for at least the profile-defined `retention_minimum`

The AS receives only the bounds (in plaintext for enforcement) and hashes for everything else (`bounds_hash`, `scope_hash`, `execution_context_hash`, `gate_content_hashes.intent`, owner DIDs). ASes **never** receive scope content, intent text, or any other semantic content. Scope content stays on the gateway, encrypted at rest.

### Mandate Issuance & Validation

For the canonical mandate request and signed mandate payload schemas, see [Mandates](#mandates).

Scope fields (`currency`, `action_type`) live in the scopeSchema and are hashed into `scope_hash` by the gateway. They are **not** part of the bounds sent to the AS — the AS only sees the scope hash, and the Gatekeeper is the sole enforcer of scope enum/subset constraints. The AS receives the bounds in plaintext because it must enforce them at ticket time.

Each mandate request covers a single Mandate Owner. Multi-owner decisions require separate mandate requests — one per owner.

**Validation Rules.** The AS MUST reject the mandate request if:

- `profile_id` is unknown or untrusted
- `profile_hash` does not equal the hash of the AS's provisioned bytes for `profile_id` (return `PROFILE_HASH_MISMATCH`)
- The profile itself fails validation — `appliesTo` naming an unregistered action type, a `cumulative_count` bound without `appliesTo` on a v0.7+ profile, a bounds field without `boundType` (return `PROFILE_INVALID`)
- `disclose_fields` on the mandate is not a subset of the profile's `disclose_fields` (return `MALFORMED_MANDATE`)
- `bounds` is absent, or is missing required fields per the profile's `boundsSchema` (return `MALFORMED_MANDATE`)
- The recomputed bounds hash does not match `bounds_hash` (return `BOUNDS_HASH_MISMATCH`)
- The request carries an owner signature and no `expires_at`, or an `expires_at` later than the profile's maximum TTL allows, or carries `expires_at` without an owner signature (return `MALFORMED_MANDATE`)
- A `(owner_did, nonce)` pair the AS has already signed (return `MALFORMED_MANDATE`)
- `scope_hash` is missing
- `execution_context_hash` is missing
- `gate_content_hashes.intent` is missing
- `commitment_mode` is not one of `automatic`, `review`, or `review_above_cap`
- The bounds violate group-level limit ceilings (group mode, if configured)
- Owner identity cannot be verified
- In group mode: the mandate owner is not a required approver
- In group mode: the profile is not enabled for the group, or no required approver is configured for the profile
- Requested TTL exceeds the profile's max TTL

(See [Commitment Modes](#commitment-modes) for the definitions of `automatic`, `review`, and `review_above_cap`.)

**AS Authorization Responsibilities.** Before signing a mandate, the AS MUST:

1. **Verify identity** — Validate the mandate owner's authentication. Resolve to a verified DID.
2. **Resolve required approvers** — In group mode: look up `requiredApprovers` for the group and the requested profile.
3. **Check membership** — In group mode: verify that the authenticated DID is a required approver in the group.
4. **Validate bounds** — Recompute `bounds_hash` from the submitted `bounds` and compare to the provided value.
5. **Validate against group limits** — In group mode: if the group has limit ceilings configured, verify the bounds do not exceed them.
6. **Reject or sign** — Only sign the mandate if all checks pass.

**Mandate properties:**

- Short-lived (TTL bounded by profile max)
- Signed with the AS's Ed25519 private key
- The signed payload includes `commitment_mode` — changing it requires a new mandate
- **Normative**: the `title` field MUST NOT appear in the signed payload. It is AS-side metadata only and can be changed without invalidating the signature.

The AS also stores per-mandate metadata that is not part of the signed payload:

- `title` — human-readable label
- `groupId` — group context
- `createdBy` — user who created the mandate
- `deferredCommitmentOwners` — for multi-owner mandates where some owners are still pending review

When `commitment_mode === "review_above_cap"`, the AS MUST validate `above_cap_caps` keys against the profile's `boundsSchema` (returning `ABOVE_CAP_CONFIG_INVALID` when a cap references a field not declared in the schema).

### Ticket Issuance

> Every authorized action produces exactly one signed ticket before it executes.

For the canonical ticket request schema and signed ticket payload schema, see [Mandate Tickets](#mandate-tickets).

The AS derives `userId` from the authenticated request context. It is not supplied in the request body.

**AS Validation for Ticket Issuance.** The AS MUST reject the ticket request if:

- `boundsHash` is unknown (return `MANDATE_NOT_FOUND`)
- The request body includes a retired v0.3/v0.4-era identifier — `attestationHash`, `frame_hash`, or `path` (return `MALFORMED_TICKET_REQUEST`). v0.5+ ticket requests use the bare `boundsHash` only; the per-user storage key is reconstructed server-side from `boundsHash` + the authenticated user.
- The request body's `actionType` is not in the profile's `boundsSchema.actionTypes` registry (return `INVALID_ACTION_TYPE`)
- The request is on the synchronous path (`automatic` mode, no `proposalId`) but omits `idempotencyKey` (return `IDEMPOTENCY_KEY_REQUIRED`)
- The `idempotencyKey` was already used for a **different** execution — `profileId`, `action`, or `executionContext` differ from the ticket it is bound to (return `IDEMPOTENCY_MISMATCH`)
- The mandate has been **revoked** (return `MANDATE_REVOKED`)
- The mandate has **expired** (return `MANDATE_EXPIRED`)
- Any value in `executionContext` exceeds the per-transaction bounds in the mandate (return `BOUND_EXCEEDED`)
- Any cumulative limit (daily, monthly) would be exceeded after applying this execution (return `CUMULATIVE_LIMIT_EXCEEDED`)
- The mandate is in `review` mode and the action has not been explicitly approved by the human (return `PROPOSAL_REQUIRED`)
- The mandate is in `review_above_cap` mode and any value in `executionContext` exceeds an `above_cap_caps` entry (return `APPROVAL_REQUIRED`, including the configured `above_cap_approvers` list so the Gatekeeper can route the proposal)
- The profile referenced by the mandate can no longer be resolved (return `PROFILE_NOT_FOUND`). Under *Profile Bytes Retention* this cannot happen to a conformant AS; the code exists so that an AS which has lost the bytes refuses rather than guesses, and a verifier reading it should treat it as an operator fault, not a property of the mandate.

**Idempotent replay (exactly-once enforcement).** Before any of the checks above mutate state, the AS resolves `idempotencyKey`: if it has already issued a ticket for this mandate under that key, it MUST return that **original** ticket unchanged — without incrementing cumulative state, creating a second ticket, or re-running the revocation/expiry/bounds checks. This is what makes the synchronous path exactly-once: a retry after a lost response reproduces the original result rather than double-counting (so the replay succeeds even if the mandate has since been revoked or expired — the action already happened). The dedup record is scoped per mandate and per authenticated request context (so two group members committing to identical bounds cannot collide) and is retained at least as long as the ticket it points to (≥ the profile's `retention_minimum`). A reuse of the key with a *different* payload is the `IDEMPOTENCY_MISMATCH` case above — a key identifies one execution and cannot be re-pointed. The review path needs no key: its replay protection is the proposal's `committed → executed` transition.

**Bounds Checking.** For every field in the profile's `boundsSchema.fields`, the AS looks up the field's declared `boundType` and dispatches on `boundType.kind` — **after filtering by `appliesTo`**: a cumulative bound whose `appliesTo` does not name the request's `actionType` is skipped for this request, and a cumulative bound with no `appliesTo` applies to every action type:

| `boundType.kind` | Check |
|---|---|
| `per_transaction` | `execution[boundType.of]` MUST be ≤ the bound value |
| `cumulative_sum` | `running_sum(boundType.of, boundType.window) + execution[boundType.of]` MUST be ≤ the bound value |
| `cumulative_count` | `running_count(boundType.window) + 1` MUST be ≤ the bound value |
| `enum` | Capability flag — the stored bound value MUST be in `boundType.values`. Enforced at issuance time (the AS rejects bounds whose values are not in the allowed set). |

The AS MUST NOT attempt to enforce scope constraints (enum/subset on `currency`, `allowed_recipients`, etc.). Scope is hashed; the AS only sees the hash. The Gatekeeper is the sole enforcer of scope constraints and MUST check them before requesting a ticket.

**Cumulative State Tracking.** The AS MUST maintain cumulative state per (cumulative group, profile, actionType). The key is:

```
key: {cumGroupId}:{profileId}:{actionType}
value: {                        // a derived snapshot, recomputable from ticket history
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
- a synthesized group ID for a single-member personal group — when the AS models personal accounts as a group of one.

Both strategies are conformant. The wire-side property the spec requires is that personal and group accounting cannot collide, which both strategies guarantee.

**The bucket is shared, the ceiling is the mandate's.** The key carries no mandate: every live mandate of the same `cumGroupId`, `profileId`, and `actionType` draws on **one** running total, and a ticket request is checked against the bound values of the mandate it names (`boundsHash`). If one user holds two live `charge` mandates with `amount_daily_max` 100 and 500 in the same group, the group's charge spend under that profile is a single sum, and a request under the narrower mandate is refused once that shared sum would exceed 100. This is deliberate — the ceiling a human signs is a ceiling on the group's exposure under that profile, not a separate allowance per mandate — and it is what makes the total recomputable from ticket history without knowing which mandates existed.

**Important**: the key uses `actionType` (the semantic category — `charge`, `write`, `post`, `delete`), not `action` (the downstream tool name). Two different tools that share the same `actionType` under the same profile share a bucket; this is the intended behavior because an authorization scoped to "charges up to €500/day" should cap the total across all charge-producing tools, not give each tool its own allowance.

Cumulative state is **derived from retained tickets** over each window: `daily` and `weekly` are recomputed over the trailing 24h / 7d (rolling — there is no reset boundary), and `monthly` is summed since the 1st of the current month at 00:00 UTC (the only calendar-anchored window). Implementations MAY maintain a cached counter for performance, but the cache MUST be recomputable from ticket history and MUST NOT define the window semantics. The AS is authoritative for cumulative state.

**Worked Example: Multi-Group + Personal.** A single user (Alice) is a member of two groups (`acme-corp` as finance, `widgets-inc` as operations) and also has a personal workspace. She has three separate `charge@0.5` authorizations — one per context. Her cumulative state has three independent buckets:

| Bucket | `cumGroupId` | `profileId` | `actionType` | Semantics |
|---|---|---|---|---|
| Bucket 1 | `acme-corp` | `charge@0.5` | `charge` | Acme's finance spend against Acme limits |
| Bucket 2 | `widgets-inc` | `charge@0.5` | `charge` | Widgets' operations spend against Widgets limits |
| Bucket 3 | `personal:alice-123` | `charge@0.5` | `charge` | Alice's personal spend against her own limits |

When Alice makes a charge via her Acme mandate, only Bucket 1's counters move. Her Widgets and personal buckets are unaffected. This keeps accounting auditable per group and per profile, and prevents cross-contamination; a second Acme `charge` mandate of Alice's would share Bucket 1.

**`action` vs `actionType` — normative rule.** The ticket request carries both `action` (the downstream tool name, e.g., `create_payment_link`) and `actionType` (the semantic category, e.g., `charge`). The AS MUST:

1. Partition cumulative state by `actionType`, not by `action`.
2. Dispatch bounds enforcement by looking up `boundType` entries in the profile's `boundsSchema.fields` — the `boundType.kind` and any `boundType.of`/`boundType.window` fields determine how each bound is checked. `actionType` is not a dispatch key; it is a cumulative-bucket key.
3. Record `action` in the ticket for audit purposes. `action` MUST NOT affect cumulative state partitioning or bounds dispatch.

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

For the full set of error codes a ticket request may return, see [Error Codes](#error-codes).

### Multi-Owner Coverage Rule

When a profile requires multiple approvers (e.g., `purchase@0.5` requiring two members), each required owner commits separately. All such mandates share the same `bounds_hash`, `scope_hash`, and `gate_content_hashes.intent`. Before issuing a ticket, the AS MUST validate that the union of granting owners (the `did`s in `mandate_owners`) covers the required approver set, then issue the ticket. If any required owner's mandate is missing → the AS refuses to issue tickets → the agent cannot act.

To resolve the union at ticket time, the AS MUST gather all live, non-revoked mandates matching the same `bounds_hash`, `scope_hash`, `profile_id`, `gate_content_hashes.intent`, and `commitment_mode`, and take the union of their `mandate_owners` DIDs. Because storage and idempotency keys are scoped per mandate owner, each required owner's mandate is stored independently and discovered by this match rather than overwriting another's.

### Verification API for Third Parties

An AS MAY expose endpoints that let parties other than the mandate owner or its group verify a mandate or ticket by ID/hash. These endpoints let any holder of the AS's public key check claims independently.

**Normative rules:**

1. Third-party verification responses MUST contain only fields that appear in the **signed** mandate or ticket payload, plus the signature itself, plus revocation status.
2. Third-party verification responses MUST NOT include `title`, `groupId` (when not part of the signed payload), `createdBy`, `deferredCommitmentOwners`, `intent_ciphertext`, `encrypted_keys`, or any other AS-side metadata.
3. Endpoints serving the mandate owner or their group MAY include the metadata; endpoints serving anonymous/external requests MUST NOT.
4. The AS SHOULD distinguish the two surfaces by URL or by authentication (e.g., `/api/as/verify/{boundsHash}` for third parties vs `/api/mandates/{boundsHash}` for owners).

This formalizes the invariant ("`title` MUST NOT appear in signed payload") at the response-shape level: a verifier reading the spec literally MUST receive only signed bytes plus signature and revocation status, and nothing else.

### Signing key publication and rotation

An AS MUST publish the Ed25519 public key(s) it signs with, and every artifact it signs names its key through `issuer` (*Mandate Payload*, rule 8). Publication is a discovery convenience, not a trust anchor: a verifier decides which `issuer` DIDs to trust by local policy (`governance.md` → *Trust Model*), and MUST NOT accept a key offered alongside an artifact in place of the one `issuer` names.

Rotation is a new `issuer`, not a replacement. When an AS rotates its signing key it MUST: keep every previously issued mandate and ticket unchanged; continue to publish each retired key, marked retired with the time of retirement, for at least the longest `retention_minimum` of any profile it issued under that key; issue tickets against a live mandate using the key current at ticket time, so a mandate signed by a retired key and a ticket signed by the current key form a valid chain; and record the rotation as an append-only event. A verifier that pins issuers MUST treat a retired key as valid for artifacts whose `issued_at` or `timestamp` precede its retirement, and invalid afterwards.

### Retention at the Authority Server

The AS MUST retain mandates and tickets for at least the profile-defined `retention_minimum`. Records MUST be:

- Append-only
- Available for audit verification
- Queryable by `boundsHash`, ticket ID, and time range
- Exportable in a standard format

Storage mechanism is implementation-specific; the obligations above bind whatever store is used.

**Profile Bytes Retention.** The AS MUST retain the exact profile bytes for every `profile_id` it has issued mandates or tickets under, for at least as long as the longest live retention obligation against that profile. Concretely: the AS retains the profile bytes until every mandate and every ticket issued under that `profile_id` has passed its `retention_minimum` window.

Once all such windows have elapsed, the AS MAY discard the profile bytes. Profiles that have never produced a mandate or ticket are not retention-bound and MAY be discarded at any time.

This rule exists because tickets outlive mandates and a ticket's `limits` field carries only numeric values — the *meaning* of those values (which `boundType` each field used, which `actionType`s were valid, what `unit` applied) lives in the profile bytes. An auditor presented with an old ticket MUST be able to recover the schema it was signed against.

The protocol does not specify a separate "delete profile after N days unused" timer. The retention obligation is tied to the artifacts produced under the profile, not to wall-clock idleness, so the AS cannot accidentally discard a profile while live tickets still reference it.

**Tickets Outlive Mandates.** Tickets remain cryptographically valid and retrievable after their parent mandate has expired or been revoked. The mandate's TTL and revocation status affect only the AS's willingness to issue **new** tickets against that mandate — they do not affect previously-issued tickets.

- When a mandate expires (TTL elapses), the AS MUST refuse new ticket requests against it (return `MANDATE_EXPIRED`). Previously-issued tickets remain valid and queryable.
- When a mandate is revoked, the AS MUST refuse new ticket requests against it (return `MANDATE_REVOKED`). Previously-issued tickets remain valid and queryable.
- In both cases, tickets MUST continue to be retrievable until at least `retention_minimum` has elapsed from the ticket's own timestamp, independent of the mandate's lifecycle.

The ticket is a permanent record of what happened under a specific authorization at a specific time. Expiring or revoking the authorization does not erase that history.

### What ASes Are NOT

| Misconception | Reality |
|---------------|---------|
| Ethics enforcer | ASes validate structure and bounds — not morality or legality |
| Global authority | No AS can block others. No hierarchy exists |
| Content inspector | ASes never see semantic content (intent, scope content, problem narratives) |
| Stateless oracle | v0.5+ ASes maintain cumulative state and a revocation list. They are stateful by design. |

### Security Guarantees

**Fraud Prevention.**

- Fake mandates and tickets fail signature validation
- Stolen keys are mitigated by short TTL + user-controlled AS whitelists
- Revocation provides a fast stop before TTL expiry

**Privacy by Construction.** ASes receive only:

- Bounds (in plaintext, for enforcement)
- `bounds_hash`, `scope_hash`, `execution_context_hash`
- `gate_content_hashes.intent`
- Profile ID
- Owner DIDs
- Owner declarations
- `commitment_mode`
- `mandate_owners` signatures and, **by explicit owner opt-in only**, a disclosed `subjects` identity block (new in v0.6 — see *Identity Assurance*)
- Optional `title` (AS metadata, not signed)

ASes never receive:

- Scope content (operational details — only the hash)
- Intent text (only the hash)
- Any narrative reasoning, problem statements, or rendered previews
- A real name the owner did not explicitly choose to disclose

**Profile Isolation.** A compromised personal AS cannot issue mandates for profiles it doesn't support. Each Profile defines its own validation rules.

**No Executor Trust.** HAP does not require executors to behave well; it requires that badly behaved execution cannot occur unmediated. Where an executor can be reached only through the Gatekeeper, its good behaviour is unnecessary. Where it can be reached directly, the executor MUST itself verify a ticket before acting, to the standard in `governance.md` → *Deployment Security Profile*. An executor that produces a consequential effect with neither property in place is operating outside HAP — the action carries no proof, the deployment does not satisfy Invariant 1 for that capability, and the operator is liable for the difference.

## Gatekeeper & Executor Behavior

The Gatekeeper is the enforcement point between the human-signed mandate and machine execution. It verifies mandates locally, requests mandate tickets from the AS for every action, and blocks execution if any check fails.

The Gatekeeper is not a prescribed component or deployment topology — it is the guarantee that mandate verification AND ticket issuance have occurred before any consequential action proceeds.

### Obligation & Topologies

Every execution environment MUST satisfy the Gatekeeper obligation before proceeding with a mandated action.

> **Normative:** Every execution MUST be preceded by:
> 1. Local verification of the mandate (signature, TTL, bounds_hash, scope_hash)
> 2. Issuance of a mandate ticket by the Authority Server
>
> An implementation that stores or transmits mandates but does not verify them, or that verifies mandates but skips ticket issuance, is non-compliant.

The Gatekeeper obligation may be satisfied by:

- **An embedded library** — `verify()` + `requestTicket()` calls in application code before execution
- **A sidecar process** — a co-located service that gates requests to the executor
- **A standalone service** — a dedicated verification endpoint
- **Two cooperating layers** — one library performs local verification (Phase 1) and a second layer requests the ticket and blocks execution on the result (Phase 2). A common factoring is a verification library for Phase 1 and a tool proxy for Phase 2.

All four are equally valid. The protocol makes no architectural preference between monolithic and two-phase factoring. What matters is that the verification steps execute completely, a valid ticket is obtained, and execution is blocked on a negative result from either phase.

When the obligation is split across layers, the layer running Phase 2 is the conformant Gatekeeper and is responsible for ensuring Phase 1 ran. A library that exposes only Phase 1 (e.g., `verify()`-style local checks) MUST be documented as a partial implementation — it is not by itself a Gatekeeper.

A system that has mandates but skips verification or ticket issuance is in violation — the mandate alone is not proof of compliance; verified mandate + valid ticket is.

**When the trigger cannot be the control point** (new in v0.6). Some effectors expose a trigger that cannot be fully restricted — a CI/CD dispatch, a webhook, an internal API reachable from the same network as the agent. Restricting *access* to the trigger is then the wrong control, because it cannot be made to hold: a credential left on a developer machine, a new egress rule, or a debugging container silently removes it, and nothing reports that it is gone. The control is whether pulling the trigger achieves anything.

Such an effector MUST verify a ticket itself before producing the consequential effect. Doing so makes it a **second Gatekeeper at the true execution boundary**, and makes the ticket a **bearer proof presented to a third party** — the only configuration in which a ticket leaves the requesting Gatekeeper's custody. It also inverts the problem usefully: instead of preventing the agent from reaching the effector, which is often impossible, it makes reaching the effector accomplish nothing.

A ticket-demanding effector carries obligations a signature check alone does not satisfy — action class, scope binding, freshness, and replay protection scaled to the action. They are specified in `governance.md` → *Deployment Security Profile*, and they are why the machine-verification requirements exist.

### Validation Steps

The Gatekeeper performs validation in two phases: **local verification** and **AS ticket issuance**.

**Phase 1: Local Verification.**

1. **Reconstruct canonical bounds** from the submitted bounds object (apply the v0.5+ escape rules: reject newlines, percent-encode `=`/`%`/non-printable ASCII)
2. **Compute `bounds_hash`** and verify it matches the mandate
3. **Reconstruct canonical scope** from the submitted scope object (always compute the hash; use the well-known empty hash if scope is empty)
4. **Compute `scope_hash`** and verify it matches the mandate
5. **Fetch Profile** for the referenced `profile_id`
6. **For each mandate:**
   - Fetch AS public key (cached or on-demand)
   - Verify Ed25519 signature (base64url-decoded) against the canonical mandate payload
   - Verify TTL not expired
   - Read `commitment_mode` from the signed payload; it is the only source the Gatekeeper routes on (*Commitment-Mode Handling*), and the signed mode MUST agree with any unsigned AS metadata or the Gatekeeper fails closed (*Decision States* → *Commitment*)
7. **Required-approver coverage is not a local check.** Group configuration is an AS record the Gatekeeper cannot read (*Enforcement classes*: HOC). The Gatekeeper MUST NOT infer coverage locally; it relies on the AS refusing the ticket (`OWNER_NOT_COVERED`, `COVERAGE_INSUFFICIENT`) and treats that refusal as final.
8. **Check per-transaction bounds** — for every bounds field where `boundType.kind === "per_transaction"`, verify that `execution[boundType.of] <= boundValue`. Per-transaction bounds carry no `appliesTo` (Bounds Schema rule 7); cumulative bounds are the AS's alone (*Display-Only Logs*), and any local mirror of them for display MUST honour `appliesTo`.
9. **Validate `actionType`** — verify the resolved `actionType` (from the tool-gating manifest's `staticExecution.action_type`) is a member of the profile's `boundsSchema.actionTypes`.
10. **Check scope constraints** — for every scope field with an `enum`, `subset`, or `pattern` constraint, verify that the corresponding value in the execution request satisfies the constraint. This check is **required** locally because the AS only holds `scope_hash` and cannot enforce scope constraints at ticket time. A non-conforming execution context MUST be rejected here before any AS call.

If any local check fails → reject with a structured error before contacting the AS.

**Phase 2: AS Ticket Issuance.** If Phase 1 passes, the Gatekeeper requests a mandate ticket from the AS. The AS performs cumulative limit checks (daily, monthly) and revocation checks. If the AS returns a ticket, execution proceeds. If the AS returns an error, execution is blocked.

### Pre-flight Ticket Request — Fail-Closed

For every authorized write execution, the Gatekeeper sends a ticket request to the AS. For the canonical ticket request schema, see [Mandate Tickets](#mandate-tickets).

The request body MUST NOT include `path`, `attestationHash`, `frame_hash`, or any other v0.3/v0.4-era identifier. v0.5+ ASes MUST reject these. `actionType` MUST be in the profile's `boundsSchema.actionTypes` registry; the Gatekeeper SHOULD validate locally before round-tripping.

**Idempotency (exactly-once).** On the synchronous path (`automatic` mode), the Gatekeeper MUST generate one `idempotencyKey` per tool invocation and reuse it **unchanged** on every retry of that invocation's ticket request. The key MUST be unique per logical execution and MUST NOT be derived from the action's content — two intentionally identical actions are distinct executions and each must be counted. Retrying a ticket request is only safe (and only permitted) when the key is present: a transient failure that hides the AS response *after* it committed is recovered by the retry, which the AS dedups to the original ticket instead of double-counting. The Gatekeeper MUST NOT retry past a **definitive** AS rejection — `BOUND_EXCEEDED`, `CUMULATIVE_LIMIT_EXCEEDED`, `APPROVAL_REQUIRED`, `INVALID_ACTION_TYPE`, `MANDATE_REVOKED`, `MANDATE_EXPIRED`, `IDEMPOTENCY_MISMATCH` — which fail closed on the first response. Review-mode commits carry a `proposalId` instead and omit the key (the proposal CAS is their replay protection).

On failure, the Gatekeeper MUST block execution and surface the error to the agent and (if applicable) to the human.

**Pre-execution, not post-execution.** The ticket is issued **before** the tool call executes. The flow is:

```
verify locally -> request ticket -> ticket approved -> execute -> store ticket
```

Not:

```
execute -> request ticket
```

This is critical: the AS authorizes the action *before* it happens, not after. The ticket is proof of authorization, not proof of completion. **No mandate, no ticket. No ticket, no execution.**

If the AS is unreachable or unresponsive when a ticket is requested, the Gatekeeper MUST block execution. Implementations MUST NOT use a cached prior ticket as a fallback. Implementations MUST NOT have a "warn and proceed" or "degraded" mode for production use. The Gatekeeper MUST NOT cache tickets and reuse them for new executions — each execution requires a fresh ticket.

### Commitment-Mode Handling

The Gatekeeper honors the signed `commitment_mode` on the mandate (see [Commitment Modes](#commitment-modes)):

- **`automatic`** — request a ticket directly and execute on approval.
- **`review`** — the Gatekeeper does not block on `PROPOSAL_REQUIRED` as a hard error; it surfaces the proposal to the user and waits for approval. Once the user approves, the Gatekeeper re-issues the ticket request with the `proposalId`, the AS atomically transitions the proposal from `committed` to `executed`, and the ticket is returned.
- **`review_above_cap`** — automatic below the caps; when the AS returns `APPROVAL_REQUIRED`, the Gatekeeper routes a proposal to the above-cap approvers (see routing below).

**`review_above_cap` routing.** When the AS returns `APPROVAL_REQUIRED`, the Gatekeeper:

1. Reads the `approvers` array from the AS error body.
2. Falls back to the signed mandate's `above_cap_approvers` if the AS did not provide approvers.
3. Submits a proposal to the AS with `pendingApprovers` set to the merged approver list.
4. Returns control to the agent with a tracking token (proposal ID).
5. On approval, replays the ticket request with the `proposalId` (the AS atomically transitions the proposal `committed → executed` and signs the ticket).
6. On rejection, returns the rejection to the agent and does not retry.

The signed `above_cap_approvers` is the source of truth; AS-supplied approvers are an operational hint only. A compromised AS that omits or shrinks the approver list MUST NOT be trusted to widen the action — the Gatekeeper enforces against the signed list.

### Proposal / Review / Approval Lifecycle

In `review` mode, the ticket request returns `PROPOSAL_REQUIRED` with a `proposalId`. Example failure body:

```json
{
  "approved": false,
  "errors": [
    {
      "code": "PROPOSAL_REQUIRED",
      "message": "This authorization is in review mode. Submit a proposal and obtain human approval before requesting a ticket.",
      "proposalId": "uuid-assigned-by-as"
    }
  ]
}
```

The Gatekeeper surfaces the proposal to the user and waits. Once the user approves, the Gatekeeper re-issues the ticket request with the `proposalId`, the AS atomically transitions the proposal from `committed` to `executed`, and the ticket is returned. The proposal's `committed → executed` transition is the review path's replay protection (no idempotency key is used).

### Executor Gating, Scope vs Bounds, Display-Only Logs

The **bounds** are what the human commits to as enforceable constraints; they are hashed into `bounds_hash` and signed. The **scope** is the human's operational scope (e.g., target environment, customer segment); it is hashed into `scope_hash` and signed but stays local. The **execution** is what the agent submits when it wants to act — the specific values for a single action within the signed bounds.

Per-transaction bounds (`boundType.kind === "per_transaction"`) are enforced locally by the Gatekeeper AND by the AS. Cumulative bounds (`cumulative_sum`, `cumulative_count`) are enforced solely by the AS because the Gatekeeper has no ticket history. Scope constraints (enum/subset/pattern) are enforced **solely by the Gatekeeper** because the AS only holds `scope_hash` and cannot inspect plaintext scope values.

**Local records are not a cumulative enforcement input.** A Gatekeeper MUST keep the custody archive (*Retention and Gatekeeper custody*) and MAY additionally keep a display record of executions for UI rendering (consumption progress bars, history views). It MUST NOT use either as a second-pass cumulative enforcement layer: the AS's cumulative state is authoritative because it spans every Gatekeeper and every mandate that draws on the bucket, and a local total covers only this Gatekeeper's own executions. Running a parallel cumulative check duplicates the source of truth, risks drift between the two, and refuses actions the AS would have permitted. v0.4 reference implementations that re-checked cumulative bounds locally before calling the AS MUST drop the local check; per-transaction bounds enforcement on the Gatekeeper remains required and is unaffected.

The executor executes without discretion — it forwards only minimal, non-semantic commands. Logical separation of mandate logic, gatekeeper logic, and execution logic MUST be maintained. The Gatekeeper MUST NOT have a "bypass" mode. Development/testing environments MAY use test mandates with test AS keys, but the verification logic and ticket issuance MUST still execute.

### Tool-Gating Manifests

> Promotes the integration-manifest contract from the reference Gatekeeper into the protocol surface.

The Gatekeeper enforces bounds against an `executionContext` dictionary (e.g., `{ amount: 5, currency: "EUR" }`). The dictionary exists, but a contract is needed for how an MCP tool call's arguments map *into* that dictionary. Without that contract, every Gatekeeper invents its own mapping rules and integrators cannot interoperate.

A **tool-gating manifest** is a JSON document that pairs an MCP tool with the bounds-and-scope it should be checked against. Manifests live with the integration code (not with the profile), so adding a new tool that maps to an existing profile does not require a new profile version.

A Gatekeeper that fronts MCP tool calls (the primary use case) consumes a tool-gating manifest per integration. The manifest answers two questions:

1. **Which profile authorizes this tool?** — the manifest's `profile` field.
2. **How does a tool call's arguments produce an `executionContext`?** — the manifest's `tools.<name>.executionMapping` and `staticExecution`.

The Gatekeeper MUST refuse any tool that is not described in a loaded manifest. There is no "permissive default" — read-only tools also require an entry (with `category: "read"`).

**Manifest Schema.**

```json
{
  "manifestVersion": "1",
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
| `manifestVersion` | SHOULD (v0.6) | Version of the manifest schema and its transform vocabulary. This document defines version `"1"`. A manifest without the field MUST be read as version `"1"` (v0.5 manifests predate it); a manifest written under a later version MUST declare it. |
| `id` | yes | Stable string identifier for the integration. Forms the namespace prefix in the proxied MCP tool name (`{id}__{tool}`). |
| `profile` | yes | The profile ID this integration's tools commit under. |
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

This schema — not any vendor's implementation of it — is the canonical, portable binding format at `manifestVersion: "1"`. It originated in the reference Gatekeeper, but the normative shape is the one in this document: two conformant Gatekeepers loading the same manifest against the same profile MUST gate the same tool identically. The transform vocabulary is **closed and versioned**: the expressions in the table above are the complete set for version `"1"`; adding, removing, or changing a transform's semantics requires a new `manifestVersion`. An open or string-evaluated transform set would reintroduce exactly the "infer enforcement from names" hazard the `boundType` rule forbids.

**Resolving `actionType`.** `actionType` MUST come from the manifest's `staticExecution.action_type`. The Gatekeeper:

1. Loads the manifest entry for the called tool.
2. Reads `staticExecution.action_type`.
3. Validates that the value is a member of the profile's `boundsSchema.actionTypes`.
4. Sends it to the AS unchanged.

A Gatekeeper that derives `actionType` from the tool name (e.g., by splitting on `__` and reading a prefix) is non-conformant. Tool name → action type is a manifest-author decision, not a runtime inference.

**Read vs Write Categorization.**

| Manifest `category` | Gatekeeper behavior |
|---|---|
| `read` | Verify a matching authorization exists for the manifest's profile, then enforce **read governance** — the read-age window, resource scope, and identifier matching defined in *Read Authorization* below. Do not build a bounds `executionContext` for write-bound enforcement and do not request a ticket. (Read calls consume no cumulative state.) |
| `write` | Run the full Phase 1 + Phase 2 flow. Build `executionContext` from `staticExecution` + `executionMapping`. Verify per-transaction bounds locally, request a ticket, block on negative results. |

Read-only tools still require authorization *and* read governance. The protocol forbids ungated read access — the read/write distinction is about *what* is enforced, not *whether* enforcement happens. v0.5's blanket "skip bounds verification" for reads is superseded: a read whose resource argument falls outside a granted resource scope MUST be rejected (see *Resource scope MUST bind reads* below).

**Argument Coercion.** When applying `executionMapping` transforms:

- Numeric arguments stay numeric; non-numeric arguments are stringified.
- Array arguments with `transform: "join_domains"` MUST be reduced via: lowercase → extract domain (suffix after `@`) → deduplicate → sort ascending → join with comma. This produces a deterministic canonical form for `subset` checks.
- Reserved keys whose names start with `_` (e.g., `_imagePreview`) MUST NOT flow into `executionContext`. They are advisory metadata for proposal previews.
- When an argument is an object with an `email` property (e.g., a calendar attendee `{ email, displayName }`), implementations SHOULD coerce to the `email` value before applying string transforms.

## Read Authorization

> New in v0.6 as normative surface. Specifies how read authority binds. Reads remain **ticketless** — no consequential action, no ticket — so everything here is enforced by the local Gatekeeper.

Consequential actions are checked twice: the Gatekeeper verifies locally, then the Authority Server enforces cumulative bounds and issues the signed ticket — a Gatekeeper that ignored its own checks still cannot produce a ticket. Reads have no second check. They are ticketless by design, so read enforcement is performed **only** by the local Gatekeeper, and no other party observes it. Stated plainly: **read bounds are a property of a trusted Gatekeeper build, not of the protocol.** A modified, misconfigured, or outdated Gatekeeper reads whatever the connector will return. This is an accepted trade — reads are not the consequential act, and the acts that disclose what was read (send, publish) *are* ticketed on the way out, so the boundary that matters is enforced where the data leaves.

The design implication follows the trust-domain rule (*Bounds, Scope, and Disclosure*): **read policy is local, live configuration — not a signed bound.** It belongs on the **integration**, editable in one place with immediate effect, rather than frozen into each signed authorization. Authority to *act* is signed and per-mandate; reach to *read* is local and live-editable. (The exception is the one the rule names: a read limit one party enforces *against* another — a team admin capping a member's reach — re-enters the signed surface.)

### Read policy binds to the integration, not the mandate

The model below is the RECOMMENDED shape of read authority; the normative floor is the set of MUSTs that follow it (an unset window denies; overrides only raise; resource scopes bind reads; undeclared governance denies). A conformant Gatekeeper SHOULD evaluate read authority as **one policy per integration**, derived from the mandates that enable its read tools, with two knobs:

- **Default age window** — the floor applying to *every* item. It may be set to a number of days, to explicit *unlimited*, or to `0` (read nothing by default). **No configured window at all — neither a local policy nor a legacy signed read bound — is a denial**, not unlimited: an unset window MUST deny rather than permit everything.
- **Per-correspondent overrides** — a list of `identifier → window`, each **≥ the default**. Overrides may only *raise* a window, never lower it.

```
applicableWindow(item) =
    max( defaultWindow,
         { override.window | override.identifier matches some participant of item } )

read permitted  ⇔  age(item) ≤ applicableWindow(item)
```

Normative consequences:

- Because overrides only raise, the default is a **guaranteed floor**, and a multi-party item never yields a conflict — the most permissive applicable window applies.
- An override is a **positive membership test** ("is this identifier among the participants?"). It requires no notion of *self*, hence no identity store, no discovery recipe, no self-subtraction.
- The denial reasons on the read path are **age** and **resource scope** (below) only. There is no coverage denial: a read is never refused because no mandate "reaches" a correspondent.
- Restrictive intent ("only read mail involving X") is expressed as `default = 0` plus higher overrides — the same mechanism at a lower floor, not a separate feature.
- Where several authorizations enable the same integration's reads, the effective default is the **most permissive** among them, and an implementation SHOULD surface it as a single effective number.

**Stated limit.** Matching is ANY-of-participants, not all-parties: an item on which an overridden identifier appears alongside others becomes readable at that identifier's window. This is an **age-tuning** model, not a confidentiality wall; it MUST NOT be presented as "the agent can never see X's correspondence."

### Resource scope MUST bind reads

A `resource` scope (see *Scope kinds*) names a container the authority may act within. Where an implementation enforces such a scope on writes, it **MUST** enforce the same scope on reads of the same resource — enforcing it on one side only produces the incoherent posture that an excluded container is *unwritable yet fully readable*. This is the cheapest read mechanism: a subset membership test on an argument the call already carries, reusing the mapping the write path already declares. A conformant Gatekeeper MUST reject a read whose resource argument falls outside the granted subset, and MUST fail closed where the target resource cannot be determined.

Containers are not only calendars — a mailbox's folders and labels, a drive's shared drives, a workspace's projects are all resource scopes, and a **container allowlist is the preferred way to exclude a class of untrusted content** (notably a mail provider's spam container): an allowlist is default-deny by construction, where a denylist must be written, remembered, and kept in step with each provider's naming.

Where a provider exposes an argument that *widens* the container set (an `includeSpamTrash`-style flag, a caller-supplied label list), that argument is the **Gatekeeper's to set, not the agent's**. A conformant Gatekeeper MUST NOT pass an agent-supplied resource-widening argument through unvalidated, and MUST NOT rely on a provider's permissive-by-omission default — a provider default holds only until the agent supplies the argument, and typically does not apply to fetch-by-id at all.

### Identifier matching

Override and scope identifiers are compared against values the connector supplies. Semantics MUST be fixed and identical across providers, or the same policy yields different results on different backends:

- Comparison is **case-insensitive**; identifiers and extracted values are normalized (NFKC) before matching. NFKC, not the NFC used for intent and content canonicalization: those preserve a text the human wrote, whereas matching must fold compatibility variants so that a look-alike address (full-width letters, ligatures) cannot slip past an allowlist.
- Where a value carries a display name, matching is on the **address**, never the display-name text — display names are unauthenticated, attacker-controlled data.
- Domain identifiers match **that domain exactly**; a subdomain is NOT matched by its parent — silent widening is worse than an explicit second entry.
- Which fields carry participants is **manifest data** (e.g. `From`/`To`), not protocol. Implementations MUST NOT match on message bodies or item content.

### Conformance: undeclared read governance is a denial

Read enforcement is driven by per-connector descriptors — a static gate, a read adapter, a resource mapping. A conformant Gatekeeper MUST NOT treat *absent* descriptors as *permitted*: a tool classified as a read that declares no applicable governance MUST be denied, or carry an explicit, recorded exemption. Absence of configuration is otherwise indistinguishable from absence of enforcement, and a connector silently bypasses the read model by omitting a declaration.

### Conformance: enforcement by construction must not be escapable

Where a Gatekeeper enforces read limits by injecting constraints into a provider **query** supplied by the agent (an optimization over post-fetch filtering), the injected constraints MUST be combined so the agent's own fragment cannot capture or cancel them. In a boolean query language a naive concatenation is insufficient — a fragment ending in a disjunction operator turns the intended conjunction into a union, and the limit stops binding. Implementations MUST bracket the agent-supplied fragment and MUST fail closed on a fragment that cannot be safely combined, rather than silently rewriting it. Query injection is an optimization; **post-fetch enforcement remains the normative baseline** and MUST NOT be omitted on the assumption that the query was constrained.

### Where it lives (portable)

- **Profile**: `scopeKind` per scope field; any bound governing a read window (linked via `boundType.of`, not field name). Provider-agnostic.
- **Manifest**: read adapters only — where participants and dates live, the resource argument mapping, any query-injection template. Provider data. No identity recipe.
- **Gatekeeper**: generic evaluation — window resolution, positive override matching, resource subset test, query composition. No tool or profile literal.

A new provider reuses the profile and engine unchanged, supplying only its manifest adapters. A connector that cannot expose participants simply cannot offer overrides and falls back to the default window.

**Verifiability, deliberately deferred.** If read enforcement ever needs to be verifiable rather than merely performed, the options are, in increasing cost: a signed read policy; denial reporting to the AS; read tickets for a narrow high-sensitivity class. The last MUST NOT be adopted broadly — a complete read record is a metadata trail of everything the owner corresponds with, a privacy cost the current design deliberately avoids paying. All three remain future directions (`review.md`).

## Human-readable affordances (UI layer, non-normative)

> Optional since v0.5. Non-normative for enforcement; normative for the field name and shape so multi-gateway ecosystems render the same way.

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

UI hints MUST NOT influence enforcement. A Gatekeeper that branches on `format: "email"` to decide whether to enforce a scope constraint is non-conformant — `format` is presentation only.

## Error Codes

Error codes are canonical across the protocol. Implementations MUST emit exactly these codes and MUST NOT alias them under different names. v0.7 renamed every code that carried a retired word; the old→new map is in *Migration from v0.6*. Codes prefixed with `INTERNAL_` or implementation-specific names are not part of the protocol surface and MUST NOT be relied on by integrators.

Each code names the party that emits it and the moment it is emitted. *AS · mandate* is the Authority Server refusing a mandate request; *AS · ticket* is the Authority Server refusing a ticket request; *Gatekeeper · local* is the Gatekeeper's own Phase 1 verification, which never reaches the wire; *Verifier* is any holder verifying an artifact offline. A code emitted by the AS on the wire MUST appear in the `{ "approved": false, "errors": [{ "code": … }] }` envelope shown under *Ticket Issuance*.

### Mandate Errors

| Code | Emitted by | Description |
|------|------------|-------------|
| `BOUNDS_HASH_MISMATCH` | AS · mandate; Gatekeeper · local | Recomputed `bounds_hash` does not match the submitted bounds (AS) or the held mandate (Gatekeeper) |
| `SCOPE_HASH_MISMATCH` | Gatekeeper · local; Verifier | Recomputed `scope_hash` does not match mandate |
| `INVALID_SIGNATURE` | Gatekeeper · local; Verifier | The Authority Server's signature over the mandate fails verification |
| `OWNER_NOT_COVERED` | AS · ticket | A required approver has no valid mandate for this execution |
| `TTL_EXPIRED` | Gatekeeper · local; Verifier | The held mandate's `expires_at` has passed (the AS's wire form of the same condition is `MANDATE_EXPIRED`) |
| `PROFILE_NOT_FOUND` | AS · mandate; Gatekeeper · local | Referenced profile could not be resolved |
| `PROFILE_INVALID` | AS · mandate; Gatekeeper · local | The profile fails validation — `appliesTo` names an unregistered action type, a `cumulative_count` bound lacks `appliesTo` (v0.7+ profiles), a bounds field lacks `boundType`, `appliesTo` on a `per_transaction` or `enum` bound (new in v0.7) |
| `PROFILE_HASH_MISMATCH` | AS · mandate | The mandate request's `profile_hash` does not match the AS's provisioned profile for `profile_id` (new in v0.7) |
| `COVERAGE_INSUFFICIENT` | AS · ticket | The union of live mandates does not cover the required approver set (*Multi-Owner Coverage Rule*) |
| `MALFORMED_MANDATE` | AS · mandate; Verifier | Mandate structure or request is invalid — missing `scope_hash` or `commitment_mode`, `bounds` absent from the request, `disclose_fields` not a subset of the profile's, `expires_at` present without an owner signature or absent with one, a reused `(owner_did, nonce)` |
| `VERSION_UNSUPPORTED` | AS · mandate | No protocol version is supported by both the requesting Gatekeeper and the AS (new in v0.7; see *Version negotiation*) |
| `OWNER_NOT_APPROVER` | AS · mandate | Granting identity is not a required approver for the profile in this group |
| `BOUNDS_INVALID_VALUE` | AS · mandate; Gatekeeper · local | A bounds value violates the profile's pattern, encoding, or range constraint, or contains a raw newline |
| `SCOPE_INVALID_VALUE` | Gatekeeper · local | A scope value violates the profile's pattern, encoding, or enum/subset constraint, or contains a raw newline |
| `ABOVE_CAP_CONFIG_INVALID` | AS · mandate | `above_cap_caps` references a field not declared in the profile's `boundsSchema` |
| `OWNER_SIGNATURE_REQUIRED` | AS · mandate; Verifier | An applicable profile floor or policy requires an owner signature (at a minimum `binding`) and none that satisfies it is present (new in v0.6; renamed in v0.7) |
| `OWNER_SIGNATURE_INVALID` | AS · mandate; Verifier | A `mandate_owners` entry fails verification — signature invalid, projection `owner_did` differs from the entry's `did`, non-key-bearing signing DID, incomplete signature fields, or `alg`/DID key-type disagreement (new in v0.6; renamed in v0.7) |

### Ticket Errors

| Code | Emitted by | Meaning |
|------|------------|---------|
| `MANDATE_NOT_FOUND` | AS · ticket | Unknown `boundsHash` |
| `MANDATE_EXPIRED` | AS · ticket | Mandate TTL has elapsed |
| `MANDATE_REVOKED` | AS · ticket | Mandate has been revoked |
| `BOUND_EXCEEDED` | AS · ticket; Gatekeeper · local | Per-transaction bound violated |
| `CUMULATIVE_LIMIT_EXCEEDED` | AS · ticket | Cumulative limit would be exceeded |
| `COVERAGE_INSUFFICIENT` | AS · ticket | The union of live mandates does not cover the required approver set (also listed above) |
| `PROFILE_NOT_FOUND` | AS · ticket | The profile the mandate references can no longer be resolved (an operator fault under *Profile Bytes Retention*) |
| `INVALID_ACTION_TYPE` | AS · ticket; Gatekeeper · local | The `actionType` in the ticket request is absent or not in the profile's `actionTypes` registry |
| `APPROVAL_REQUIRED` | AS · ticket | The mandate is in `review_above_cap` mode and the request exceeds a configured cap; submit a proposal |
| `PROPOSAL_REQUIRED` | AS · ticket | Mandate is in review mode and a matching proposalId was not supplied |
| `PROPOSAL_NOT_FOUND` | AS · ticket | The named proposal does not exist |
| `PROPOSAL_NOT_APPROVED` | AS · ticket | Mandate is in review mode and the named proposal has not been committed yet |
| `PROPOSAL_EXPIRED` | AS · ticket | The named proposal expired before it was committed |
| `PROPOSAL_REJECTED` | AS · ticket | The named proposal was rejected |
| `PROPOSAL_MISMATCH` | AS · ticket | The ticket request does not match the stored proposal (tool, args, or scope differ) |
| `PROPOSAL_MANDATE_MISMATCH` | AS · ticket | The named proposal references a different mandate than the ticket request |
| `PROPOSAL_ALREADY_EXECUTED` | AS · ticket | A ticket has already been issued for this proposal |
| `MALFORMED_TICKET_REQUEST` | AS · ticket | The request carries a retired v0.3/v0.4 identifier (`attestationHash`, `frame_hash`, or `path`); v0.5+ uses bare `boundsHash` |
| `IDEMPOTENCY_KEY_REQUIRED` | AS · ticket | A synchronous (`automatic`-mode, no `proposalId`) ticket request omitted the required `idempotencyKey` |
| `IDEMPOTENCY_MISMATCH` | AS · ticket | An `idempotencyKey` was reused for a different execution (`profileId`, `action`, or `executionContext` differ) |
| `APPROVAL_SIGNATURE_REQUIRED` | AS · ticket | An applicable requirement (profile floor or configured policy) demands an owner-signed approval for this proposal and none was provided (new in v0.6) |
| `APPROVAL_SIGNATURE_INVALID` | AS · ticket; Verifier | The provided `HAP-approval` signature fails verification, or its `content_hash` does not match what it must cover (new in v0.6) |

**Limits.** An AS MAY refuse a request that exceeds size limits it publishes (a bounds or scope value longer than a stated maximum, a `disclose_fields` list longer than the profile's, an `executionContext` above a stated byte size) with `MALFORMED_MANDATE` or `MALFORMED_TICKET_REQUEST` respectively; the protocol fixes no numbers, only that a refusal on size is a refusal and never a truncation.

## Future Directions

Optional extensions and forward-looking directions — Output Provenance, dual-signed public ticket projections, selective disclosure, transparency logs, wallet-integration guidance and the key-rotation story for the `eudi` mandate binding, and the remaining hardening against a compromised Authority Server — live in a dedicated, non-normative companion document: see `review.md`. They are not part of the v0.7 binding surface. (The `binding: "eudi"` value and its validation semantics *are* normative in *Owner Signatures*; supporting it is optional, like any binding an implementation does not offer — what is deferred is the wallet integration itself. Decision Streams was retired in v0.6 and Revocation Supersession in v0.7 — see the respective `changelog.md` for the record.)

## Versioning & Migration

- HAP Core versions (`0.x`) define protocol semantics.
- Profiles version independently.
- Once a profile version is published, it is immutable. Changes require a new profile version.
- Breaking changes MUST bump major protocol or profile versions.
- Gatekeepers and Authority Servers MUST reject unknown or untrusted versions.

### Version negotiation (v0.7)

"Gatekeepers and Authority Servers MUST reject unknown or untrusted versions" is a safety rule, not a transition plan. The transition is specified so that upgrading one side does not silently stop the other:

1. A mandate request carries `supported_versions: string[]` — the protocol versions the requesting Gatekeeper can verify and enforce. The AS issues the mandate at the **highest version both support**; where there is none, it refuses (`VERSION_UNSUPPORTED`). A request without the field is read as `["0.6"]`.
2. A ticket is issued at the version of the **mandate it is issued under**, and carries it (`version`). The version was negotiated when the mandate was requested, by the Gatekeeper that will exercise it, so a ticket never arrives in a version its Gatekeeper cannot read and no ticket is issued — and counted — only to be refused. A Gatekeeper MUST still refuse to execute under a ticket whose `version` differs from its mandate's.
3. A v0.7 AS MUST continue to verify v0.6 mandates and **MUST continue to issue tickets against live v0.6 mandates until they expire** — "TTLs bound the transition" means exactly this. It MUST NOT issue a new v0.6 mandate to a request whose `supported_versions` includes `"0.7"`.
4. A Gatekeeper that supports both versions MUST verify each artifact under the rules and field names of its own `version`; a v0.6 mandate is not re-interpreted under v0.7 names.

Vendor-specific version headers or compatibility endpoints are not protocol; this section is.

### Migration from v0.6

v0.7 is a **vocabulary release**, and it is breaking on the wire by choice. The protocol adopts one vocabulary for the specification, the wire, and the public — *mandate*, *mandate ticket*, *bounds*, *scope*, *Mandate Owner* — and retires *attestation*, *receipt*, *context*, and *Decision Owner* from all three. Renaming signed field names invalidates nothing already issued: a v0.6 artifact stays verifiable under `version: "0.6"` with its own field names; a v0.7 AS issues only `version: "0.7"` artifacts; mandate TTLs bound the transition. There is one reference implementation and no external integrator — the last moment at which this is cheap, and the reason it is done now rather than at 1.0.

**Signed-payload, profile, and wire renames (mechanical, 1:1):**

| v0.6 | v0.7 |
|---|---|
| `header.typ: "HAP-attestation"` | `"HAP-mandate"` |
| `attestation_id` | `mandate_id` |
| `context_hash` | `scope_hash` |
| `contextSchema` (profile) | `scopeSchema` |
| `resolved_owners: string[]` **+** `owner_mandates: object[]` | `mandate_owners: object[]` — exactly one entry, `{ did }` plus signature fields where co-signed |
| `typ: "HAP-mandate"` (the owner-signed projection) | `"HAP-mandate-projection"` |
| `ownerMandate` (profile floor) | `ownerSignature` |
| `receipt_lookup` (profile) | `ticket_lookup` |
| `requiredGates: [..., "decision_owner"]` | `[..., "mandate_owner"]` |
| `version` | `"0.7"` in mandates, projections, and approvals |

**Additive in v0.7 (new signed fields):** `profile_hash` and `issuer` on the mandate; `profile_hash`, and — where present — `above_cap_caps`, `above_cap_approvers`, and `disclose_fields` **in the owner-signed projection** as well, so the owner commits to the profile's bytes, to the above-cap thresholds and approvers, and to any disclosure narrowing, not merely to the mode string (a projection built to the v0.6 field list produces a different signature — an implementation part-way through the migration MUST NOT mix the two); `version`, `issuer`, and `mandateId` on the ticket, and the `limits` field now defined as the mandate's plaintext bounds; `disclose_fields` on the mandate (optional); `supported_versions` and, for co-signed requests, `expires_at` on the mandate request; the header `kid` rule; a clock-skew tolerance (Mandate rule 9); the nonce uniqueness scope. The mandate **request** schema is now written down (*Mandate Request Schema*) rather than left implicit, because v0.7 adds request-only fields to it. `profile_hash` is defined over the JCS serialization of the parsed profile, not over file bytes. New codes: `PROFILE_INVALID`, `PROFILE_HASH_MISMATCH`, `VERSION_UNSUPPORTED`; every code now names its emitter.

**Unchanged on purpose:** `bounds_hash` / `boundsHash` (the word *bounds* stays — it survives plain retelling and "limits" is its public synonym); `executionContext` / `execution_context_hash` / `executionContextSchema` (the per-call values and their schema — a different thing from *scope*, and the rename disambiguates them); `scopeKind`; `approvalSignature`, `contentHash`, `contentBinding`, `subjects`, `idempotencyKey`, `proposalId`; every commitment-mode value; the role names *Gatekeeper*, *Executor*, *Authority Server*; the word *profile*.

**Error-code renames:**

| v0.6 | v0.7 |
|---|---|
| `ATTESTATION_NOT_FOUND` / `ATTESTATION_EXPIRED` / `ATTESTATION_REVOKED` | `MANDATE_NOT_FOUND` / `MANDATE_EXPIRED` / `MANDATE_REVOKED` |
| `MALFORMED_ATTESTATION` | `MALFORMED_MANDATE` |
| `PROPOSAL_ATTESTATION_MISMATCH` | `PROPOSAL_MANDATE_MISMATCH` |
| `CONTEXT_HASH_MISMATCH` / `CONTEXT_INVALID_VALUE` | `SCOPE_HASH_MISMATCH` / `SCOPE_INVALID_VALUE` |
| `MANDATE_SIGNATURE_REQUIRED` / `MANDATE_SIGNATURE_INVALID` | `OWNER_SIGNATURE_REQUIRED` / `OWNER_SIGNATURE_INVALID` |
| `MALFORMED_RECEIPT_REQUEST` | `MALFORMED_TICKET_REQUEST` |
| `SCOPE_INSUFFICIENT` / `OWNER_SCOPE_MISMATCH` | `COVERAGE_INSUFFICIENT` / `OWNER_NOT_APPROVER` — *scope* now names the signed local dimension only |

**Semantic changes:**

1. **`appliesTo` on bounds fields is specified** (*Bounds Schema*, rule 7). Profiles published before 2026-08-27 do not declare it; an enforcement point MAY keep a field-name fallback for mandates on those versions **only until no live, unexpired mandate references one**, and MUST then remove it (`review.md`).
2. **Revocation is permanent.** *Revocation Supersession* is retired. An AS that implemented it MUST stop superseding; existing supersession audit events remain as history.
3. **Gatekeeper custody** of complete signed tickets, mandates, and issuer keys is a MUST (*Retention and Gatekeeper custody*). A Gatekeeper that kept only a pruned display log must add an unpruned archive.
4. **A Mandate Owner is one identifiable human** — now normative (*The Mandate Owner*; `governance.md` → *Invariant 2*). Implementations that model a role, team, or service account as an owner are non-conformant.
5. **Conformance vectors** are a normative deliverable of the specification (`governance.md` → *Reference Conformance*) — not a rule-3 promotion, since a MUST-ship artifact is neither additive nor optional. They live with the specification at `content/0.7/vectors/`; the reference core library consumes them.
6. The **enforcement-class table** (*Enforcement classes*) is new. It changes no behaviour and forbids one description.
7. **Cumulative buckets are shared across mandates** (*Cumulative State Tracking*): stated explicitly, because earlier text said "per mandate" in two places while the key carried no mandate. No conformant implementation changes; a per-`boundsHash` bucket would have been non-conformant.
8. **Per-transaction bounds MUST be enforced locally** by the Gatekeeper (was SHOULD in *Enforcement Authority*). The enforcement-class table already classed this control as compromise-resistant *because* of the local check; a SHOULD cannot carry that claim.
9. **Local cumulative enforcement is removed**, not merely deprecated: a Gatekeeper MUST NOT refuse an execution on a cumulative bound from its own records (*Executor Gating*).

Implementation order for a v0.6 implementation: core library types and vectors → Authority Server (issue `0.7`; verify `0.6`, and keep issuing tickets against live `0.6` mandates until they expire — *Version negotiation*) → Gatekeeper (custody, `mandate_owner` gate, new error codes) → profiles (`scopeSchema`, `ownerSignature`, `ticket_lookup`, `appliesTo` — a new version of each) → conformance suite. Public and product copy follows the specification, not the other way round.

### Migration from v0.5

v0.6 is additive on the wire and stricter in governance. Existing v0.5 mandates and tickets remain verifiable unchanged.

**Additive signed-payload fields (v0.5 verifiers ignore them):**

1. Mandates MAY carry `subjects` (Identity Assurance) and `mandate_owners` (Owner Signatures). Mandates issued under v0.6 carry `version: "0.6"`.
2. Tickets MAY carry `contentHash`, `contentBinding`, `subjects`, `proposalId`, and — on the review path where an approval was owner-signed — `approvalSignature` in the signed payload.

**Deprecations and tightenings:**

3. `Subject.owner_signature` is deprecated: implementations MUST NOT emit it; the `eudi` validation rule now requires a `mandate_owners` entry with `binding: "eudi"` instead.
4. Profile immutability is strict: **any** field change to a published profile version requires a new version — the annotation exemption some implementations read into v0.5's rule is removed. The four v0.5-era in-place mutations (`records@0.4`, `customers@0.4`, `email@0.4`, `publish@0.4`) are grandfathered and documented in `review.md`; implementations MUST treat them as the last of their kind.
5. A DID used as a signing identity MUST be key-bearing. Existing non-key-bearing identifiers remain valid for audit and as identity DIDs; they MUST NOT sign mandates. An implementation minting decorative `did:key` strings (an identifier shaped like `did:key` carrying no key) MUST mint real key-bearing DIDs for any signing use; such an identifier fails structurally, since there is no key to verify against.
6. Tool-gating manifests gain `manifestVersion`; a manifest without it is read as version `"1"`. The transform vocabulary is closed at version `"1"`.
7. Read enforcement is normative: resource scopes that bind writes MUST bind reads; undeclared read governance MUST deny; an unset read window MUST deny. Gatekeepers that shipped v0.5's read model must add these checks.
8. Read-window precedence: a local per-integration read policy takes precedence over a legacy signed read bound (e.g. `read_max_age_days`), which remains only as a fallback for older mandates. New profiles SHOULD NOT declare signed read-window bounds.

### Migration from v0.4

v0.5 is a minor version bump. The wire format and the signed-payload shape are unchanged for `automatic` and `review` mandates. Existing v0.4 mandates remain verifiable and MAY be exercised under v0.5 implementations subject to the rules below.

**Profile-side breaking changes (require a new profile version):**

1. `field.enum: string[]` is retired. Move allowed values into `constraint.values: string[]`.
2. `boundsSchema.actionTypes: string[]` is now required. Profiles MUST add it.
3. Any per-field `paths: [...]` arrays MUST be removed.

**Wire-side compatibility:**

4. The ticket request body's `attestationHash` field has been renamed back to its content-address name `boundsHash` to match the spec. Servers MUST accept `boundsHash`. For one transition release they MAY also accept `attestationHash` as a deprecated alias; new code MUST emit `boundsHash`.
5. The ticket request body's `path` field is retired. Servers MUST reject requests that include it.
6. The ticket response and persisted ticket MUST include `actionType`.
7. Error codes follow the canonical list above. `LIMIT_EXCEEDED` is retired in favor of `BOUND_EXCEEDED` and `CUMULATIVE_LIMIT_EXCEEDED`.
8. Signatures (mandate and ticket) MUST be encoded as base64url (no padding). Standard base64 is retired.
9. The `review_above_cap` commitment mode is new. v0.4 mandates cannot use it; v0.5 mandates using it cannot be enforced by v0.4-only Gatekeepers.

**Cumulative-state migration:**

10. Cumulative state is keyed by `(cumGroupId, profileId, actionType)`. Implementations that previously included `path` in the key MUST migrate state by collapsing on `path` (sum the buckets). Implementations that used a name-suffix regex to skip `cumulative_count` bounds for non-matching `actionType`s MUST remove the regex; the new `actionType`-only key removes the need for it.

### Migration from v0.3

(Retained from v0.4 for completeness.) v0.3 implementations cannot participate in v0.4 or v0.5 execution flows. Any historical v0.3 mandate data is verification-only.

## Summary

HAP v0.7 ensures automation serves human direction — not the reverse. Authority remains with the human; the automated system executes under a bounded mandate. Every authorized action carries cryptographic proof that an identifiable human authorized a specific scope, with stated intent, within enforceable bounds — and, where the owner co-signs, proof that is attributable to the person independently of any operator. The signed mandate is the record of what was given. The signed ticket is the proof of what ran. No mandate, no ticket. No ticket, no execution. A mandate constrains execution — it does not transfer authority.
