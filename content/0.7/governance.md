---
title: "Human Agency Protocol — Governance"
version: "Version 0.7"
date: "August 2026"
status: "Normative — full prose (draft)"
description: "How HAP is governed: invariant constraints instead of institutions. No central authority, no registry, no approval process — conformance is enforced locally."
---

HAP is governed by invariant constraints, not institutions.

There is no central authority, no steward council, no registry, and no mandatory approval process. Compliance is enforced locally and cryptographically by any participant using the open specification.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals.

---

## Core Laws

HAP is designed to satisfy three non-negotiable laws of globally scalable protocols:

1. Anyone can implement it
2. Anyone can verify it
3. No one can stop it

Any governance mechanism that violates these laws is invalid.

---

## Canonical HAP Invariants

A system may only claim to be HAP-compliant if all of the following invariants hold.

### Invariant 1 — No Mandate, No Ticket. No Ticket, No Execution.

A consequential action is any operation that affects external state, human wellbeing, financial position, legal standing, or reputation.

No executor (human or machine) may perform a consequential action unless preceded by:

1. A valid HAP mandate conforming to a trusted Profile, given by an identifiable Mandate Owner
2. A valid mandate ticket issued by the AS for that specific action, under that mandate, before the action runs

This is the v0.4 strengthening of the v0.3 invariant. v0.3 required only the mandate. v0.4 requires both the mandate (proof of authorization) and the ticket (proof that the specific action was within bounds at the time of execution).

v0.7 gives the invariant its final form of words — the same words used in public: **no mandate, no ticket; no ticket, no execution.** The first half rules out acting *without* a mandate; the second rules out acting *outside* one. A permission system promises only the first, and only for access; the ticket puts an identifiable human behind each act (identifiable by DID; the name is disclosed only by opt-in — *Invariant 2*).

v0.6 added the sentence that follows the invariant: **a mandate constrains execution; it does not transfer authority.** HAP does not model an automated system as an authority holder — authority remains with the Mandate Owner, and the protocol authorizes executions against mandates, never agents (see `protocol.md` → *Authority, Mandate, Ticket, Capability, Execution*).

### Invariant 2 — Explicit Human Mandate Ownership

Every mandate must reference at least one identifiable human Mandate Owner. Collective, symbolic, or anonymous ownership is invalid.

v0.7 states the boundary sharply: a Mandate Owner is **one identifiable natural person**, resolved by the Authority Server's authentication to exactly one human. Institutional authority is valid under HAP only when exercised *through* such a person, who answers for the act. A role, a committee, a policy, a shared account, or a system MUST NOT be enrolled as an owner identity. Whether the person's name is disclosed is a separate, opt-in property (`protocol.md` → *Identity Assurance*); the rule is about who stands behind the DID, not whether the DID is labelled. Designs in which "the human" means an institution's policy — humans as a species rather than this person for this act — do not satisfy this invariant, however carefully the policy is enforced.

### Invariant 3 — Required-Owner Coverage

Each Mandate Owner is identified by DID. In group mode, execution is invalid if the profile's required approvers (as defined by the AS group configuration) are not all covered by the granting Mandate Owners. In personal mode, the user commits directly with no approver checks.

### Invariant 4 — Privacy Preservation

No semantic content may leave local custody by protocol design. ASes and Executors receive only:

- Bounds (in plaintext, for AS enforcement)
- Cryptographic hashes (`bounds_hash`, `scope_hash`, `execution_context_hash`, `gate_content_hashes.intent`, `contentHash`)
- Structural metadata
- Signatures (the AS's, and any owner signatures and approval signatures)
- DIDs and owner declarations
- **By explicit owner opt-in only:** a disclosed identity (`subjects.disclose.name`) under Identity Assurance (`protocol.md` → *Identity Assurance*). This is the single carve-out to the list above, it exists only at `assurance: "high"`, and it is opt-in per authorization — never a protocol default. An AS that receives a name the owner did not explicitly choose to disclose violates this invariant.

Scope content, intent text, and any other narrative remain local.

### Invariant 5 — Profile Conformance

Mandates must reference a specific Profile. Validation rules are Profile-defined. Unknown or untrusted Profiles must be rejected.

### Invariant 6 — Binding Commitment

Once execution occurs, the associated commitment, ownership record, and ticket must be append-only and non-reversible. History may be appended to, but not rewritten. Revocation does not rewrite history — it only prevents new tickets from being issued against a mandate.

### Invariant 7 — Cryptographic Ticket Before Execution

> New in v0.4.

Every authorized action must obtain an AS-signed ticket before it executes. The ticket is the cryptographic proof that this execution was authorized before it ran. A system that authorizes actions without tickets is not v0.4+ compliant.

### Invariant 8 — Tool-Gating Manifest Integrity

> New in v0.5.

A Gatekeeper that fronts MCP tool calls (or any other tool-shaped surface) MUST gate every tool — including read-only tools — through a tool-gating manifest. There is no permissive default and no implicit categorization. `actionType` MUST be resolved from the manifest, never inferred from string patterns on tool names.

A system that exposes ungated tool access, or that derives enforcement semantics from tool-name parsing, is not v0.5+ compliant.

v0.6 extends the same fail-closed reading to the read path: a tool classified as a read that declares no applicable read governance MUST be denied (or carry an explicit, recorded exemption), and a resource scope enforced on writes MUST bind reads of the same resource (`protocol.md` → *Read Authorization*).

### Invariant 9 — Deterministic Signing

> New in v0.5.

Mandate and ticket signatures MUST be produced over a deterministic JSON canonicalization (sorted keys, no insignificant whitespace, base64url signatures, RFC 8785 compatible). The specification publishes the signing test vectors (*Reference Conformance*); an implementation MUST reproduce them so independent verifiers can confirm canonicalization parity.

A system whose signatures depend on object insertion order or implementation-specific JSON serialization is not v0.5+ compliant.

### Invariant 10 — Complete Mediation

> New in v0.6.

A HAP deployment MUST ensure that every consequential capability within its scope is reachable **only** through a HAP-enforced boundary — either because no path to the effector exists that does not traverse the Gatekeeper (**path exclusivity**), or because the effector itself refuses to produce the consequential effect without a valid mandate ticket (**ticket-demanding execution**).

A ticket-demanding effector satisfies this invariant only where it establishes the authenticity, action class, scope binding, freshness, and replay protection appropriate to that action (see *Deployment Security Profile*). Verifying a signature alone is not mediation: it confirms the ticket is genuine, not that it authorizes this effect now.

**Invariant 1 is conditional on this one.** A deployment that leaves an unmediated path to a consequential capability does not satisfy "no execution without mandate and ticket" for that capability, no matter how correctly its Gatekeeper behaves — the Gatekeeper is simply not on the path.

HAP does not implement, and cannot verify, the isolation this invariant depends on. It states the requirement, defines the two ways to satisfy it, and specifies the operator obligations below.

---

## Profile Governance

Profiles are the mechanism for authority-specific enforcement. Profile governance follows these principles:

### Permissionless Creation

Anyone may create and publish a Profile. No approval is required.

### Versioned Evolution

Profiles version independently of HAP Core. Breaking changes require version bumps. Once published, a profile version is immutable — changes require a new version.

### Local Trust Decisions

Applications and ASes decide which Profiles to trust. There is no global Profile registry.

### Trust on First Use

`profile_id` is a stable identifier, not a runtime fetch URL. ASes and Gatekeepers MUST resolve `profile_id` to bytes through a one-time provisioning step (bundled at install, or fetched once and persisted) and MUST NOT re-fetch on the mandate or ticket hot path. The protocol relies on the publisher's immutability promise plus each operator's local copy. Two different questions are answered by two different mechanisms. *Did the publisher serve honest bytes at provisioning time?* — the protocol provides no cryptographic check for that; operators concerned about publisher integrity SHOULD verify a content hash at provisioning time using out-of-band means. *Was this mandate issued under the profile I hold, and did the AS and the Gatekeeper agree on it?* — since v0.7 the signed mandate carries `profile_hash` (`sha256` over the JCS serialization of the parsed profile — `protocol.md` → *Profile hash*), so the profile a mandate was issued under is content-addressed from the artifact itself, the issuance check (`PROFILE_HASH_MISMATCH`) catches a Gatekeeper and an AS holding different profiles for the same `profile_id`, and a later substitution by the AS is detectable. Provisioning remains one-time.

Once provisioned, the local copy is the operator's source of truth for that `profile_id`. The protocol's trust unit is "Public Key + Profile + Local Policy"; the profile is part of the local trust anchor, not a remote dependency.

### Transparent Specification

Profiles must fully specify:
- Bounds schema (enforceable parameters)
- `boundsSchema.actionTypes: string[]` — closed registry of valid `actionType` values (new in v0.5)
- Scope schema (operational scope, may be empty), including any `scopeKind` and `requiredFor` declarations (new in v0.6)
- Execution context schema (cumulative tracking)
- Required gates (`bounds`, `intent`, `commitment`, `mandate_owner`)
- TTL limits (default and max)
- Retention minimum
- Any optional v0.6+ surfaces it adopts: `content_binding`, a `disclose_fields` list (public-disclosure declaration; the default is none), `ownerSignature` floor, `ticket_lookup`
- `appliesTo` on every `cumulative_count` bound (REQUIRED for profiles published under v0.7 or later), and on any `cumulative_sum` bound that governs fewer than all of the profile's action types (`protocol.md` → *Bounds Schema*, rule 7)

Ambiguous Profiles are unenforceable.

Profiles MUST NOT define:
- `executionPaths` — removed in v0.4
- `requiredDomains` — moved to AS group configuration (now `requiredApprovers`)
- `gateQuestions` — the intent prompt is universal in the gateway UI
- `paths: [...]` arrays on bounds fields — finished removal in v0.5
- `field.enum: string[]` — retired in v0.5; allowed values live in `constraint.values`

### Profile Versioning

- Profiles MUST declare a version
- Once published, profile versions are immutable
- Breaking changes MUST bump the version
- ASes MUST reject unknown profile versions
- A publisher deprecating a profile version SHOULD announce a sunset date after which it will issue no new mandates under it; mandates and tickets already issued remain valid and retained

---

## Permissionless Implementation

Any individual, team, or system may:

- Implement the HAP protocol
- Run an Authority Server
- Publish Profiles
- Enforce HAP locally
- Reject non-compliant executors

No approval is required. No registration is necessary.

---

## Cryptographic Self-Verification

Compliance is proven exclusively through:

- Correct schema usage
- Valid cryptographic signatures (on mandates and tickets)
- Invariant-preserving behavior

If an implementation satisfies the invariants, it is compliant. If it does not, it is not.

No external certification is required.

---

## Adversarial Interoperability

HAP assumes all remote parties are potentially hostile.

Local systems decide which entities to trust using:

- Public key whitelisting
- Local policy
- User-defined reputation

There is no global root of trust. There is only local sovereignty plus cryptographic proof.

---

## Forkability and Naming

Forking is a feature, not a failure.

Any community may fork:

- Profiles
- Authority Server implementations
- Gatekeeper / Gateway implementations
- UX layers
- Execution models

However:

- If core invariants are preserved, the system may call itself HAP
- If any canonical invariant is broken, the system must rename itself

This preserves interoperability without requiring permission.

---

## Reference Conformance

To support interoperability without institutional control, the HAP ecosystem maintains:

- Public invariant test vectors
- Reference bounds and scope canonicalization tests (including escape rules: newline rejection, percent-encoding of `=`/`%`/non-printable bytes)
- Signing canonicalization test vectors — `(payload, canonical bytes, base64url signature)` triples with a known public key
- Mandate validation test cases (per-mode: `automatic`, `review`, `review_above_cap`)
- Ticket validation test cases (success, `BOUND_EXCEEDED`, `CUMULATIVE_LIMIT_EXCEEDED`, `APPROVAL_REQUIRED`, `INVALID_ACTION_TYPE`)
- Profile compliance checks (presence of `boundsSchema.actionTypes`; `appliesTo` present and non-empty on every `cumulative_count` bound of a v0.7+ profile and ⊆ `actionTypes`; `appliesTo` absent on `per_transaction` and `enum` bounds; `boundType` on every bounds field except `profile`; `content_binding.appliesTo` ⊆ `actionTypes`; absence of `field.enum`; absence of `paths` arrays)
- A profile-hash vector — a published profile and its `profile_hash` (JCS-derived, `protocol.md` → *Profile hash*)
- Tool-gating manifest schema validator (incl. `manifestVersion` and the closed transform vocabulary)
- Content-binding canonicalization vectors (`text` rule, JCS field-binding objects, pinned hashes)
- Mandate-projection vectors — (mandate payload, reconstructed `HAP-mandate-projection` canonical bytes, signature) triples (new in v0.6)

> **Deliverable (since v0.5; widened in v0.7).** The vectors are the specification's, not any implementation's. Since v0.7 they live **with the specification** — `content/<version>/vectors/*.json`, one test case per top-level entry — so any third-party AS or Gatekeeper can self-verify parity; an implementation-neutral artifact meant to settle whose bytes are correct cannot live inside one implementation. The reference core library MUST consume these files in its own test suite rather than carry copies (status: `review.md`).
>
> v0.7 defines the **conformance vector set** — implementation-neutral, checkable offline, with no server, no store, no identity system, and no URL (the specification defines no endpoints, so a suite that speaks HTTP to fixed paths cannot be pointed at a conformant implementation that shares none of them). Three sets:
>
> 1. **Canonical bounds and scope → hash.** A bounds object and a scope object, the exact canonical string each must produce, and its `sha256`. A one-character disagreement here means nothing either party signs will ever verify against the other, and it is invisible until two implementations meet.
> 2. **Payload → signature.** A mandate, a ticket, a mandate projection (plain and `review_above_cap`), a co-signed mandate, and an approval, each with a published test key and the exact base64url signature. Pins field ordering, escaping, number formatting, and encoding together.
> 3. **Request → required refusal.** A table of (situation, request, error code): no `actionType` → `INVALID_ACTION_TYPE`; over a cumulative bound → `CUMULATIVE_LIMIT_EXCEEDED`; review mode without an approved proposal → `PROPOSAL_REQUIRED`; a revoked mandate → `MANDATE_REVOKED`; an unregistered `appliesTo` member → `PROFILE_INVALID`; a retired identifier in a ticket request → `MALFORMED_TICKET_REQUEST`. This set matters most, because refusal is where the safety lives.
> 4. **Profile → `profile_hash`.** A published profile and the value every party must compute for it.
>
> An implementation that reproduces every vector is conformant on those points. What vectors cannot prove — *sequence*: that the ticket preceded execution, that cumulative state is counted correctly across many calls — remains a claim about a running system and needs a live suite. This is a **normative deliverable of the specification**, not a promoted direction (a MUST-ship artifact is neither additive nor optional, so rule 3 does not apply). The v0.7 files exist (`content/0.7/vectors/`, 2026-09-03); what `review.md` tracks is their consumption by the reference library.

Running these tests is voluntary. Publishing results is optional.

No entity grants approval. No entity issues certification.

---

## AS Governance

Authority Servers are trusted parties. Their governance must be explicit:

### AS Operators

- Who operates the AS?
- What jurisdiction?
- What liability?

### AS Accountability

Each obligation below is an **honest-operator control** (`protocol.md` → *Enforcement classes*): it binds an AS that means to comply and is no defence against one that does not. What holds against the operator is the artifact in someone else's hands — the signed ticket and mandate the Gatekeeper keeps in custody.

- ASes MUST publish their signing public key
- ASes MUST retain a record of all mandates issued
- ASes MUST retain a record of all tickets issued (new in v0.4)
- ASes MUST retain mandate and ticket records for at least the profile-defined retention period
- Records MUST be append-only
- ASes MUST maintain a revocation list (new in v0.4)
- ASes SHOULD publish mandate and ticket counts and statistics
- ASes MUST NOT issue mandates without verifying required-approver coverage (in group mode)
- ASes MUST NOT issue tickets for revoked or expired mandates

### AS Misbehavior

- Issuing mandates for unauthorized DIDs → AS trust revocation
- Issuing tickets that violate bounds → AS trust revocation
- Backdating timestamps → AS trust revocation
- Refusing valid requests → escalation path required

---

## Deployment Security Profile

> New in v0.6.

Complete Mediation (Invariant 10) is satisfied by the execution environment, not by the protocol. A conformant deployment MUST provide the following properties. They are stated as obligations so an operator, an auditor, or a security reviewer has a checklist rather than an inference.

Each item states a **security property**. Where a topology is named it is an example of how the property is commonly achieved, never a definition of it: a deployment that achieves the property by other means is conformant, and one that matches the topology without achieving the property is not.

**Credential and effector custody.** A deployment MUST ensure that possession of any credential available to the agent is **insufficient to cause a consequential effect without HAP authorization**. Under path exclusivity, credentials capable of causing the effect MUST remain behind the Gatekeeper boundary. Under ticket-demanding execution, the effector MAY be directly reachable by the agent, and the agent MAY hold a credential that reaches it, provided the effector independently validates a ticket before producing the effect. The credential then confers reachability, not consequential authority, and separating those two is the point of the strategy.

**Executor access.** An Executor MUST either accept consequential commands only through the Gatekeeper boundary, or independently enforce valid mandate tickets at its own execution boundary. Exposing a directly callable interface is a violation only in the first case.

**Ticket-demanding effectors.** Where an effector enforces tickets itself, it MUST establish:

1. **Authenticity** — the ticket is genuine and was issued by an Authority Server the effector trusts. Where the effector cannot verify the signature itself, this reduces to trusting the issuer, and MUST NOT be described as independent verification.
2. **Action class** — the ticket authorizes this kind of action (`actionType`, and a `profileId` the effector expects). A ticket for a cheaper action MUST NOT release a costlier one.
3. **Scope binding** — the ticket binds *this* effect, checked by recomputing the content hash from what is about to be executed. This is the load-bearing check; without it the ticket authorizes some action rather than this one.
4. **Freshness** — the ticket falls within a validity window the effector defines, and its timestamp is not implausibly in the future. This is what stops an old ticket returning old, possibly vulnerable, state to production.
5. **Replay protection, scaled to the action** — where repeating the action is itself the harm (a payment, a message send, an irreversible provisioning step), the effector MUST consume the ticket atomically so a second presentation fails. Where the effect is idempotent, the validity window MAY suffice; a spent-ticket store SHOULD NOT be mandated there, since it buys little and adds state, atomicity requirements, and new failure modes.
6. **Honest scope statement** — the effector MUST document which properties it does not check, so an operator does not infer coverage that is absent.

A verifier SHOULD NOT depend on the software it is verifying: an effector that recomputes the canonical form itself, rather than calling the library that produced it, keeps a defect in that library from becoming invisible to the check that exists to catch it.

**Gatekeeper integrity.** The agent MUST NOT be able to modify, replace, reconfigure, restart into a different configuration, impersonate, intercept, or extract protected secrets from the Gatekeeper. *(Non-normative: this is commonly achieved by separating agent and Gatekeeper into distinct processes under distinct user accounts, containers, hosts, or hardware boundaries, scaled to the value of the effectors involved. Separation alone does not establish the property — two processes under one account may be able to attach to one another, and a privileged container or a VM with an exposed management interface provides less than its topology suggests.)*

**Signing-key custody.** The Authority Server's signing key MUST NOT reside on any host the agent can reach. Where a profile or verifier policy requires a mandate `binding` above `raw`, the owner's signing key MUST be held in the custody that binding names and MUST NOT be exportable to software the agent can read.

**Fail-closed everywhere.** Every dependency whose absence would otherwise permit execution MUST refuse instead: an unreachable Authority Server blocks, an unreadable profile blocks, an undeterminable resource scope blocks, an unparseable argument blocks. "Degraded mode" is not a conformant configuration.

**Declared posture.** A deployment claiming HAP conformance SHOULD record, per consequential capability, which mediation strategy it relies on. This is a **declaration, not a proof** — HAP cannot verify it, in exactly the sense that `signing_surface` is a declaration (`protocol.md` → *Owner Signatures*). It carries information because there is no benefit in claiming a posture to a party who will weigh it, and none a verifier can check. It is recorded because a control that is assumed rather than stated is the failure mode this specification repeatedly forbids elsewhere.

### Which strategy is available

The two strategies are not interchangeable, and the choice is often not free:

| Situation | Approach |
|---|---|
| Third-party effector you cannot modify (payments, mail, calendar) | **Path exclusivity only** — ticket-demanding execution is unavailable |
| Effector you own, with a trigger that cannot be fully restricted (CI/CD, webhooks, internal APIs) | **Ticket-demanding**, subject to the six conditions above |
| Effector you own, reachable only through a credential the Gatekeeper holds | Path exclusivity, or both |
| High-value effector where topology cannot be guaranteed indefinitely | Both |

Ticket-demanding execution requires an effector you control, or one whose operator has adopted the protocol. A third-party API cannot be made to demand tickets, and no amount of architecture on the deploying side changes that. Where it is unavailable, path exclusivity is the only option and its fragility must be carried knowingly — it depends on a topology holding for the life of the deployment, and nothing in the system reports when it stops holding.

---

## Multi-AS Ecosystem

The protocol supports multiple ASes:

- Organizations choose which AS(s) to use
- Verifiers can trust multiple ASes
- Mandates and tickets reference which AS signed them
- No single AS has monopoly on trust

### Interoperability

- ASes SHOULD use compatible mandate and ticket formats
- ASes MAY federate approver authority (AS-A trusts AS-B's authority registry)
- Cross-AS verification MUST be possible if both ASes are trusted

> The protocol does not yet specify cross-AS ticket federation (unchanged since v0.5). A single mandate lives on a single AS. Multi-AS federation for tickets is deferred to a future version.

---

## Approver Authority Governance

Since v0.5, required approvers are configured per group on the AS, not in profiles.

### Within Groups

- The group admin defines `requiredApprovers` — which profiles are enabled and which members must commit
- The group admin defines group membership — who may commit
- Authority grants SHOULD require approval from existing authority holders
- Authority SHOULD have expiration (annual renewal)

### Audit Trail

- All authority grants/revocations MUST be logged
- Logs MUST include: who granted, to whom, which profile, when, expiration

---

## Dispute Resolution

When mandate or ticket validity is disputed:

1. Verify cryptographic validity (signatures, hashes)
2. Verify required-approver coverage at time of mandate
3. Verify AS was trusted at time of mandate
4. For tickets: verify the ticket was issued during the mandate's TTL window and before any revocation
5. If all valid → mandate and ticket stand
6. If authority was invalid → mandate is void, AS may be at fault
7. If ticket was issued for an unauthorized action → AS misbehavior

---

## TTL Enforcement

- Each Profile defines TTL limits (default and max)
- Gatekeepers MUST enforce these limits at mandate issuance
- The user selects a specific TTL within the profile's allowed range at issuance time
- This prevents time-pressure attacks on approval

### Retention Enforcement

- Each Profile defines `retention_minimum`
- Mandates MUST be retained beyond TTL expiry for audit purposes
- Tickets MUST be retained for at least `retention_minimum` from the ticket's own timestamp, independent of the parent mandate's lifecycle
- **Tickets outlive mandates**: TTL expiry and revocation of a mandate affect only the AS's willingness to issue *new* tickets against it. Previously-issued tickets remain cryptographically valid, queryable, and retained until their own retention window elapses. Destroying a ticket because its parent mandate was revoked destroys the audit trail of what actually happened and is a governance violation.
- Discarding mandates or tickets on TTL expiry destroys the audit trail
- **Gatekeeper custody (v0.7):** the Gatekeeper MUST retain the complete signed ticket, the mandate it ran under, and the issuer key for every execution it performs (`protocol.md` → *Retention and Gatekeeper custody*) — the subject's own evidence, verifiable without the AS, and still verifiable after the AS has vanished, rotated keys, or closed the owner's account

### Revocation

- v0.4 adds revocation as a first-class concept
- The AS maintains a revocation list, persisted in durable storage
- Revoked mandates remain cryptographically valid for audit, but the AS refuses to issue new tickets against them
- Revocation is faster than waiting for TTL expiry
- **Revocation is permanent (v0.7):** a revoked mandate is never renewed, re-signed, or un-revoked; wanting it back is a new mandate with a new id

---

## Error Transparency

- Gatekeepers and ASes SHOULD return structured error codes
- Error codes MUST NOT leak sensitive information (intent text, scope content, business secrets)
- Failed validations MUST abort execution

See the canonical error-code tables in [protocol.md](protocol.md#error-codes).

---

## What Governance Is Not

HAP governance explicitly rejects:

- Central registries
- Steward councils
- Qualification processes
- Compliance certification bodies
- Jurisdiction-based approval

HAP governs behavior, not actors.

---

## Trust Model

Trust in HAP is constructed as:

```
Public Key + Profile + Local Policy
```

Every Authority Server, Profile, Executor, or App identifies itself via a public key. Local systems choose which keys and Profiles to trust. Unknown or untrusted keys are ignored by default.

There is no global trust anchor.

### The Authority Server Cannot Check Itself

Several controls in this specification have the same shape, and stating the shape once is worth more than restating the limitation each time it recurs:

> **An AS-side *check* is not a defence against the AS.**
> **An AS-*signed artifact held by another party* is evidence a compromised AS cannot retroactively alter.**

Both halves are load-bearing, and the second stops the first from proving too much.

The first half retires a class of decorative control. If the only thing standing between a claim and its abuse is the Authority Server validating that claim, then against a compromised Authority Server nothing stands there at all. A requirement the AS records, a uniqueness check the AS performs, a key directory the AS serves — each holds against an honest operator and evaporates against a dishonest one. That is not a reason to remove such controls; it is a reason not to describe them as defences against the operator.

The second half is why tickets are worth anything. An AS-signed artifact does not *prevent* a malicious operator. But once it is signed and in someone else's hands it cannot be rewritten — which is precisely why tickets outlive mandates: expiring or revoking an authorization does not erase the record of what happened under it. Evidence and prevention are different properties, and the AS can supply the first without being trusted for the second.

Owner signatures (`protocol.md` → *Owner Signatures*) are this invariant applied: it exists to move authorization out of the class the first half describes (an AS assertion) and into the class the second half describes (a distributed, independently verifiable artifact). Instances the invariant catches inside this specification: cumulative bound enforcement (an AS-side check — conceded below; the Gatekeeper's own custody archive covers only its own executions and is deliberately not an enforcement input), nonce consumption (AS-side, so defence-in-depth against third parties only), mandate-request co-signature requirements (recorded by the AS, so assurance rather than enforcement), and any AS-served key directory, including an AS signature over its own key directory — that is the AS vouching for the AS.

**Consequence.** Adopting this invariant obliged an audit of everything this specification describes as "enforced," separating what holds only against an honest AS from what holds against a later-compromised one. v0.7 performed it; the result is the enforcement-class table in `protocol.md` → *Enforcement classes*, which annotates each control as *honest-operator* or *compromise-resistant* and forbids describing the former as a defence against the operator. An invariant with no audit behind it would have been the same decorative control it was written to eliminate.

**Scope of AS trust.** Choosing to trust an Authority Server's key means trusting it to **sign honestly and to enforce cumulative bounds, revocation, and approval**. The local Gatekeeper is the counterweight: it re-derives `gate_content_hashes` from locally-held content and enforces per-transaction bounds and scope constraints, so a misbehaving AS cannot cause an Executor to run an action the human never authored locally. A *compromised* AS can still over-authorize authorities the human did create — cumulative state and pre-flight ordering are claims about a sequence only the AS witnesses, and that residue is stated honestly in `protocol.md` → *What this does and does not prove*. What v0.6 removes from the compromised-AS attack surface is **fabrication of authority**: where owners co-sign their mandates and approvals, the AS can no longer forge authorization artifacts attributed to a Mandate Owner, fabricate or discard approvals, flip commitment mode, or extend a mandate's life. Mandates without owner signatures retain the v0.5 posture. The remaining hardening directions (a witnessed transparency log, approver-public-key authenticity) are tracked in `review.md` → "Resilience to a Compromised Authority Server."

### Relationship to execution-boundary control models (non-normative)

Since early 2026 several independent designs have converged on the execution boundary as the control point for AI agents. They share a lineage — security and compliance: an institution writes policy, a system enforces it at the last moment, and the agent is a system to be governed. HAP shares the door and not the philosophy. It is a **delegation** model from the leadership lineage: a named person gives a mandate, and the system proves that what ran fell inside it. The differences are the ones this document already makes normative — a *named human's* mandate rather than institutional authority (*Invariant 2*); a *portable proof* held by parties other than the operator rather than an internal control (*The Authority Server Cannot Check Itself*; Gatekeeper custody); an *open* specification rather than a proprietary layer (*Core Laws*); and a *why* — the committed intent — rather than only a permission. In one line: **control governs the agent; a mandate governs the delegation.** A control model can sit under HAP as part of the execution environment (`protocol.md` → *What HAP does not secure*); it cannot substitute for it, because a fence with no named human behind each act is exactly the unmandated condition the protocol exists to end — and it stays that condition however narrow the fence becomes.

---

## Companion Specifications

Some capabilities sit outside HAP Core but interoperate through it. v0.5 introduced the notion of a **companion specification** — an optional, independently versioned document that defines an extension surface. Companion specs MAY be implemented without affecting HAP Core conformance. A companion spec MUST NOT relax any HAP Core invariant; it MAY add new invariants applicable only to participants implementing the companion.

### `output-provenance@0.1`

Binds mandates to observable outputs (URLs, artifacts, configuration state) via an optional `output_ref` field in the profile's scope schema. See `review.md` § "Output Provenance" for the design. **Profile-bound by design:** when a deployment-style profile adopts it, `output_ref` is promoted into that profile's normative surface — not into HAP Core. The companion-spec registration exists so the design has a stable name; it does not make Output Provenance a Core surface.

*(`decision-streams@0.1` was registered here in v0.5. The direction retired in v0.6 — no reference implementation since v0.3 and no integrator asked. The registration is withdrawn; the design record remains in the v0.5 archive.)*

### `intent-disclosure@0.1`

**Status:** Normative companion specification. Optional — implementing it does not affect HAP Core conformance, but a participant that claims `intent-disclosure@0.1` MUST satisfy every requirement below.

Enables multi-recipient encrypted intent for `review` and `review_above_cap` authorizations, where the intent text is needed by approvers (typically on different machines than the original mandate owner) but MUST NOT be readable by the AS.

The HAP privacy invariant says no semantic content leaves local custody. That works for `automatic` mode, where no one downstream of the mandate owner reads intent. For review modes, two non-conformant solutions tempt implementers:

1. Send intent in plaintext to the AS for relay. **Violates the privacy invariant.**
2. Keep intent on the mandate owner's machine and require approvers to fetch it directly. **Operationally fragile, breaks asynchronous review.**

`intent-disclosure@0.1` chooses a third path: encrypt the intent under each approver's public key, store the ciphertext on the AS, and let approvers decrypt locally. The AS holds bytes it cannot read.

#### Disclosure object

The mandate owner computes the following object and sends it to the AS alongside the mandate. These fields are AS-side metadata — they are **not** part of the signed mandate payload; their integrity is guaranteed instead by `intent_disclosure_hash` (below), which **is** signed.

```json
{
  "intent_ciphertext": "base64url(iv ‖ AES-256-GCM ciphertext)",
  "encrypted_keys": {
    "did:key:alice": { "ct": "base64url(wrapped CEK)", "enc": "base64url(HPKE enc)" },
    "did:key:bob":   { "ct": "base64url(wrapped CEK)", "enc": "base64url(HPKE enc)" }
  },
  "approvers_frozen": ["did:key:alice", "did:key:bob"]
}
```

| Field | Required | Description |
|---|---|---|
| `intent_ciphertext` | yes | The **canonical intent text** (per *Intent canonicalization* in `protocol.md`) encrypted under a freshly generated 256-bit content-encryption key (CEK) with **AES-256-GCM**; the 96-bit IV is prepended to the ciphertext before base64url encoding. |
| `encrypted_keys` | yes | One entry per approver, keyed by the approver's **DID**. Each entry wraps the CEK to that approver using **HPKE (RFC 9180)** with suite `DHKEM(X25519, HKDF-SHA256) + HKDF-SHA256 + AES-256-GCM`: `enc` is the HPKE encapsulated key, `ct` is the HPKE-sealed CEK. Each recipient is sealed independently. |
| `approvers_frozen` | yes | Snapshot of the approver DID set at issuance time. The key set of `encrypted_keys` MUST equal this set. |

#### Signed binding (`intent_disclosure_hash`)

When a mandate carries a disclosure object, its **signed** payload (the Ed25519-signed `MandatePayload`) MUST include the field `intent_disclosure_hash`, computed as:

```
intent_disclosure_hash = "sha256:" + hex(
  sha256( utf8( intent_ciphertext ‖ "\n" ‖ JCS(sort(approvers_frozen)) ) )
)
```

where `intent_ciphertext` is the exact base64url string above, `sort(approvers_frozen)` orders the DIDs by Unicode code point, and `JCS` is RFC 8785 JSON Canonicalization of the sorted array. The mandate owner computes this **after** encryption and signs it as part of the mandate.

This is the integrity anchor: `intent_ciphertext`, `encrypted_keys`, and `approvers_frozen` travel unsigned, but any change to the ciphertext or the approver set alters `intent_disclosure_hash`, which is covered by the AS signature over the mandate — and, where the owner co-signed, by the owner-signed projection as well, which is what makes approver-set substitution detectable against a compromised AS. (`encrypted_keys` is bound transitively: its key set MUST equal `approvers_frozen`, and a verifier MUST reject any mismatch.)

#### Verification chain

1. **AS, at issuance time** — recompute `intent_disclosure_hash` from the received `intent_ciphertext` + `approvers_frozen`; it MUST equal the value in the signed payload, and `keys(encrypted_keys)` MUST equal `approvers_frozen`. On any mismatch the AS MUST reject the mandate (fail-closed) — it does not store it.
2. **AS, relaying to an approver** — return `intent_ciphertext`, the caller's own `encrypted_keys[caller_did]`, and `approvers_frozen` only to a DID present in `approvers_frozen`.
3. **Approver, on receipt of the disclosure** — verify the AS signature over the mandate (and the owner signature, where present); recompute `intent_disclosure_hash` and confirm it matches; HPKE-open the CEK; AES-256-GCM-decrypt the intent; recompute `gate_content_hashes.intent` over the decrypted, canonicalized text and confirm it equals the value in the signed mandate. Only then is the intent trustworthy. This chain ties ciphertext, approver set, and plaintext-intent commitment together under one signature.

#### Companion-spec invariants

- **C1.** The AS MUST NOT be able to decrypt `intent_ciphertext`. If the AS holds any decryption key for any approver, the companion spec is not in force.
- **C2.** The signed mandate payload MUST include `intent_disclosure_hash` as defined above. Without it, a malicious or compromised AS could swap ciphertexts, replace wrapped keys, or widen/shrink the approver set without invalidating the AS signature over the mandate; against an AS that is itself compromised, only an owner-signed projection carrying the hash makes the substitution detectable.
- **C3.** When the approver set changes (e.g., an approver leaves the group), a **new** mandate with a new disclosure object MUST be issued for any subsequent action: the CEK is regenerated and re-wrapped for the new `approvers_frozen` set. Superseded wrapped keys MUST be retained for audit but MUST NOT be referenced by any future ticket. A ticket MUST only be issued against a mandate whose `approvers_frozen` matches the current required-approver set.

As a companion spec, only `review` / `review_above_cap` deployments opt in; `automatic`-only deployments carry none of this. The Suveren reference AS and gateway implement this companion spec; see `protocol.md` *Intent canonicalization* for the shared hashing rule the chain depends on.

**Known limitation (read against *The Authority Server Cannot Check Itself*).** The approver public keys used to wrap the CEK are served by the AS and are not bound into any signed payload — `intent_disclosure_hash` freezes the approver *set*, not their *keys*. Intent confidentiality therefore holds against a passive AS and any interceptor, but an actively malicious AS could substitute an attacker key at issuance. Binding the approver→key map into the signed payload would make *later* substitution detectable but cannot stop an AS already malicious at issuance; what would actually hold is a key the verifier never receives from the AS. That fix does not transfer for free from the owner-signing answer, because these are **encryption** (X25519) keys where `did:key` as used in this specification carries an Ed25519 **signing** key. Changing the hash definition is a breaking change, so it is deferred to `intent-disclosure@0.2`; the open design question is tracked in `review.md`.

---

## Final Statement

HAP does not ask for permission. It does not seek legitimacy from institutions.

Its authority derives from invariants that cannot be bypassed without detection.

Systems that preserve those invariants interoperate. Systems that do not are ignored.

That is the entirety of governance.
