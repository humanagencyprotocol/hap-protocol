---
title: "Human Agency Protocol — Review and Future Directions"
version: "Version 0.7"
date: "September 2026"
status: "Non-normative — future directions"
description: "The forward ledger for v0.7: open directions with their targets, and the deviation rules that bind every implementation. The record of what changed in v0.7 is changelog.md. Implementation status is not part of the specification."
---

This document is the **forward ledger**: what is open, what it targets, and which deviation rules are on record. What was promoted into v0.7 and why — the vocabulary release, its renames, retirements, and the proposals considered and rejected — is `changelog.md`. A v0.7 implementation MAY implement any direction below without losing conformance, and MAY skip all of them without losing conformance.

Each open direction carries an explicit **target**; "undated" means no version commitment exists yet.

**Implementation status is not part of this specification.** Whether a given implementation meets a requirement is that implementation's claim, made in its own report where a reader can weigh it (`governance.md` → *Reference Conformance* → *Implementation reports*). The reference implementation's report is published with the conformance suite (`hap-e2e/CONFORMANCE.md`). Until 2026-09-03 this file carried such status; `changelog.md` → *Implementation status left the specification* records why it no longer does.

---

## Owner Signatures — suggested implementation order (specification-led since v0.6)

The normative design is in `protocol.md` → *Owner Signatures*; it was promoted specification-led in v0.6 (rule 3). An implementation approaching it will find this order natural, because each phase produces something an outsider can verify and the last is configuration rather than design:

| | | Size |
|---|---|---|
| **P1** | Types: the `mandate_owners` entry, the `HAP-mandate-projection` and `HAP-approval` objects, the `approvalSignature` ticket field, the error codes, deprecation of `Subject.owner_signature`; a `did:key` encoder/decoder | small |
| **P2** | Key-bearing signing DIDs enrolled through a platform authenticator; signing in a locally installed surface (`signing_surface: gatekeeper_local`); projection verification; owner signatures in any public ticket projection. **Decide the curve first** — see below | large — the real work |
| **P3** | Approval signatures end-to-end; `approvalSignature` enforced at ticket issuance | medium |
| **P4** | Verifier policy surface: minimum `binding`, DID pinning, out-of-band acquisition | small–medium |
| **P5** | `binding: "eudi"` — and with it, key rotation | configuration, not redesign |

P5 being configuration rather than redesign is the point of the ordering: build the slot against key material that exists today (passkeys), and a national scheme plugs into it.

**The curve is an open decision, and P2 cannot start without it.** `did:key` is
defined for several key types; this specification's vectors and its `alg:
"EdDSA"` examples use Ed25519, and the reference `did:key` encoder accepts only
the Ed25519 multicodec. Platform authenticators on the major desktop and mobile
systems commonly sign with **ES256 (P-256)** rather than Ed25519, so "enrol a
passkey as the signing DID" is not automatically implementable. Two ways
forward, and the choice belongs to whoever starts P2:

- **Accept P-256 signing DIDs.** Widest reach, since it is what platform
  authenticators already produce. Costs a second multicodec in every encoder,
  decoder and verifier, and a conformance vector per curve — the whole point of
  `alg` being carried alongside the DID is to keep curve confusion out, so both
  paths must be pinned by vectors rather than inferred.
- **Require Ed25519 key material.** Keeps one curve everywhere and the existing
  vectors unchanged, but narrows enrolment to authenticators and wallets that
  offer it, which excludes some platform passkeys.

Neither is wrong; leaving it undecided is. `binding: "eudi"` (P5) raises the
same question again, because a national scheme brings its own algorithms — so
whichever way P2 goes, the verifier must already be able to say which curve it
accepts and refuse the rest.

**The enrolment ceremony is not specified.** *Identity & Authorization* rule 6
fixes what must be true — the owner DID in a mandate matches the authenticated
identity — and *Owner Signatures* fixes what a signing DID must be: key-bearing.
What sits between them is unwritten: how an account comes to have a signing DID
in the first place, what proves possession of the private key at enrolment
(a challenge signed with it is the obvious answer), what happens when an account
enrols a second key, and how the event is recorded. *Key lifecycle* covers only
the forward path after loss. This is a small specification gap with a large
implementation surface, and it is the first thing P2 runs into.

---

## Deviation rules

### D1 — Profile in-place mutations (grandfathered, closed)

The immutability rule was violated four times before v0.6 closed the loophole: `content_binding` was added **in place** to the published `records@0.4` / `customers@0.4` (June 2026) and then to `email@0.4` / `publish@0.4` (July 2026). No version bump, no re-issuance. Tolerable in practice — the authority contract the human signed was untouched, tickets are self-contained, and the fields were OPTIONAL — but wrong: an annotation that changes what future tickets publicly expose is a behavior change, and for `email` it changed the privacy posture of already-signed mandates without their being re-signed. v0.6 closed the loophole normatively (no annotation exemption). These four mutations are grandfathered; implementations MUST treat them as the last of their kind.

### D2 — The field-name fallback for cumulative bounds (closes on a condition)

`protocol.md` → *Migration from v0.6*, semantic change 1, permits an enforcement point to keep a field-name fallback for mandates on profile versions that predate `appliesTo` — and requires its removal once no live, unexpired mandate references such a version. The condition is stated there; whether a given implementation has met it is a matter for its report.

---

## Open directions

### Retire the field-name fallback — targets the first release after the D2 condition holds

Step 1 (specify `appliesTo`) landed in v0.7. Step 2 is deletion of the fallback in every enforcement point, gated on the D2 condition. Procedural lesson carried forward from v0.6: a fix that changes what a *profile* may declare is a protocol change wearing a bug fix's clothes, and it belongs in the ledger the day it ships.

### A wire binding — undated

The specification defines artifacts, behaviours, and refusals, and deliberately no endpoints, request authentication, response envelope beyond the `{approved, errors}` shape, proposal object, or approval transport. Two implementations built from the text alone verify each other's artifacts and cannot talk to each other. Not a conformance gap — a stated limit of interoperability. Direction: a non-normative companion `hap-http-binding@0.1` (paths, methods, auth header, envelope, proposal and approval transport, revoke, verify, `.well-known` key discovery), plus JSON Schemas for the six artifact types, the profile, and the manifest, published beside the vectors.

### Sub-mandates and hierarchies of accountability — undated

The protocol's building blocks — groups, required approvers per profile, `review_above_cap` with named approvers, multi-owner mandates — already support **hierarchies of accountability** in place of hierarchies of supervision. What flows down is authority, not instructions; what flows up is exceptions and tickets, not reports. Span widens (a mandate holder can hold dozens of sub-mandates if most activity runs automatically), depth collapses (a layer exists only where a distinct scope of accountability exists), and failure handling becomes surgical (revoke one branch). The organizing rule: **each mandate may only grant less than it holds.**

What is not yet a protocol object: a sub-mandate cannot cryptographically prove that it nests inside its parent — that its bounds are a subset, its scope narrower, its expiry no later, its commitment mode no looser. Today that relation is organizational configuration on the AS, an honest-operator control. Making it compromise-resistant evidence means a signed reference from child to parent plus a verifiable subset relation over bounds and scope — the second of which needs the per-field commitments below to be checkable without disclosing the parent. Between independent operators the same mechanism forms a **mesh** — temporary trees per undertaking on a permanent network of sovereign nodes, with a locally operated Authority Server as civic infrastructure. Cross-server federation remains deferred (`governance.md` → *Multi-AS Ecosystem*); a discovery layer over ticket histories is out of scope and carries the privacy cost the specification already names under *Read Authorization*.

### Scope values must not travel in the execution context — targets the next version

Found 2026-09-04 while auditing a live Authority Server's stored data. A ticket
request carries `executionContext`, the per-call values, **in plaintext** — it
has to, because the AS enforces per-transaction and cumulative bounds against
those values. Scope, by contrast, reaches the AS only as `scope_hash`, and the
Gatekeeper is its sole enforcer (*Enforcement Authority*).

Nothing currently keeps the two apart on the way out. A tool-gating manifest
maps one connector argument into several execution-context keys, and where a
scope dimension is among them — a message's recipients mapped into the same
`allowed_recipients` key the scope schema declares — those values are sent to
the AS and stored in the signed ticket, in the clear. The AS cannot act on them:
no `boundType` names them, and it holds no plaintext allowlist to compare
against. So the disclosure buys nothing and costs the privacy the bounds/scope
split exists to protect.

**The rule to add:** a Gatekeeper MUST send only the execution-context fields
some `boundType.of` names, plus `actionType` and any field a declared content
binding requires. Values that exist to satisfy a *scope* constraint are checked
locally and MUST NOT be transmitted. Equivalently: a field's presence on the
wire should follow from a bound that reads it, never from a manifest mapping
that happens to produce it.

**Why hashing them instead is not the answer.** Recipients, domains and
environment names are short and enumerable; an unsalted hash of an email address
falls to a dictionary. Salting defeats comparison, which was the only reason to
send anything. This is the same argument *Selective disclosure / per-field
commitments* already makes, and it applies with more force here, because the
values are the counterparties.

**If the AS should verify scope, that is a different mechanism, deliberately not
proposed here.** It would need commitments the AS can compare without learning
values — a keyed construction whose key the Gatekeeper holds and the AS does
not, with the allowed set committed in the mandate and the per-call value
committed in the request. The residual cost is **linkability**: a stable
commitment lets the operator count how often the same unknown counterparty
recurs. That may be an acceptable trade for a deployment that wants a second
enforcement point; it is not the current design, and adopting it would move
scope enforcement from *compromise-resistant* to *shared with an
honest-operator control*. Recorded so the trade is chosen rather than drifted
into.

### One execution per ticket — targets the next version

Found 2026-09-04 during a gated release. *Cumulative Tracking* rule 5 guarantees **one ticket per logical execution**: a retried ticket request returns the original ticket, and bounded authority is consumed once. That held perfectly — and the action still ran twice. Two triggers inside one Gatekeeper requested a ticket for the same committed proposal; the Authority Server correctly replayed the original to the second; and nothing on the Gatekeeper side knew the tool had already been called. The effect was stopped by the downstream system's own conflict check, not by the protocol.

The specification is half-stated. The Authority Server's half is normative. The Gatekeeper's half — that **a ticket authorizes at most one execution** — is nowhere, and only the Gatekeeper can supply it, because only it knows whether it went on to act. Direction, as Gatekeeper conformance:

1. A Gatekeeper MUST keep a durable record of the tickets under which it has executed, written **before** the downstream call, so an interruption leaves "started, outcome unknown" rather than nothing.
2. A replayed ticket (`idempotent: true`, or the review path's original returned after `executed`) is a **recovery signal for a lost response, not an authorization to act again**. With a record of completion the Gatekeeper MUST NOT execute; with a record of intent but no completion it MUST surface the ambiguity to the Mandate Owner rather than resolve it by guessing — unless the profile or manifest declares the action idempotent under its ticket id.
3. Where several triggers can execute committed proposals, they MUST be serialized per proposal.

This is the missing counterpart of rule 5 and is testable in a conformance suite: concurrent triggers against one committed proposal MUST produce one downstream effect. It does not change the Authority Server, the ticket, or the wire.

### A ticket names the request it answers — targets the next version

*Cumulative Tracking* rule 5 binds a retried ticket request to its original ticket through the `idempotencyKey` — but the ticket does not carry that key. A Gatekeeper therefore cannot tell from the signed ticket alone whether it answers the request it sent, or is another valid ticket for the same mandate, action and context. Exactly-once holds at the Authority Server; the Gatekeeper has nothing signed to hold it against. On the review path the signed `proposalId` already does this job; the synchronous path lacks its counterpart.

Direction:

1. When a ticket request carries an `idempotencyKey`, the AS MUST copy it verbatim into the signed ticket — at issuance, as part of the payload it signs.
2. A Gatekeeper MUST refuse a ticket whose `idempotencyKey` differs from the one it sent, and SHOULD refuse a ticket whose `timestamp` falls outside a short freshness window.

Every ticket then names the single request it answers, and the chain request → ticket → the Gatekeeper's execution record becomes checkable end to end. It adds one field to the ticket; a verifier that checks the signature over the whole canonical payload is unaffected, and tickets issued before the field existed stay valid as issued. It records that an execution was *authorized* for that request, not that it *happened* — a signed record of the execution itself belongs to *Output Provenance*.

### Per-transaction bounds must be able to require their value — targets the next version

Found 2026-09-30 while exercising a new quote-to-order profile against the reference Gatekeeper. A `per_transaction` bound "applies wherever its `of` field is present in the execution context" (*Bounds*, rule 7). The converse follows: an execution that does not carry the field is not checked against the bound at all. A limit of 5,000 per quote refuses a declared value of 6,000 and permits a call that declares no value. Both enforcement points behave this way, correctly by the text.

The same hole was closed for scope in v0.6. *Required dimensions (`requiredFor`)* exists because a constraint "is only as good as the Gatekeeper's ability to see the value it constrains", and absence of a value is indistinguishable from absence of enforcement. Bounds never received the counterpart. The exposure is widest where it matters most. A connector whose amount argument is optional, a tool-gating mapping with a mistyped field name, or a third-party connector that never maps the amount at all each turns a monetary cap into a limit that nothing can exceed, and nothing says so.

**Direction:** a `per_transaction` bound MAY declare `requiredFor: string[]`, drawn from the profile's `actionTypes` registry with the same semantics as on a scope constraint. For a listed `actionType`, an execution whose context lacks the bound's `of` field, or carries a value that is not a number, MUST be refused by the Gatekeeper and by the Authority Server (`BOUND_EXCEEDED`, naming the bound and stating that the value is absent). For unlisted action types the bound keeps today's meaning, which is what lets one profile govern both a document with an amount and a deletion without one.

- **Additive:** a profile that declares nothing behaves exactly as now, so no live mandate changes meaning.
- **Profiles:** profiles that carry monetary or quantity caps should adopt it in their next version.
- **Conformance:** testable at both enforcement points. For a listed action type, a missing value MUST be refused, a non-numeric value MUST be refused, and a value within the bound MUST pass.
- **Rejected alternative:** making absence a refusal everywhere, without a declaration, would break bounds that are legitimately irrelevant to some action types. That breakage is why rule 7 is phrased by presence in the first place.

### A profile can restrict the commitment modes of its mandates — targets the next version

Found 2026-10-05 while designing a profile under which an agent proposes mandates and agent instructions for a person to approve. Such a profile is only safe as review-only: every action it governs must wait for a person. Today the profile cannot say so. `commitment_mode` is chosen by the person signing the mandate (*Commitment*), and nothing ties it to the profile, so the same profile can be granted as `automatic` — by a slip on a mandate screen, or by a direct request to the Authority Server. The Authority Server signs whatever mode it is asked to sign.

**Direction:** a profile MAY declare `commitment_modes: string[]`, the commitment modes a mandate under it may carry.

1. When a profile declares `commitment_modes`, the Authority Server MUST refuse to sign a mandate whose `commitment_mode` is not listed. `review_above_cap` counts as its own mode: a profile that lists only `review` does not admit it, because it lets actions below the caps run without approval.
2. The declaration is read fail-closed. An empty list, a value that is not a list, or entries that are not commitment modes narrow what is allowed and never widen it. A declaration with no valid entry admits no mandate.
3. A surface that offers commitment modes to a Mandate Owner SHOULD offer only the listed ones. The Authority Server's refusal is the rule; the surface only avoids a signing that would be refused.

- **Additive:** a profile without the field admits every mode, so no live mandate changes meaning.
- **Conformance:** testable at the Authority Server. For a profile that lists only `review`, a request to sign `automatic` MUST be refused and a request to sign `review` MUST succeed. A profile without the field MUST accept both.
- **Not covered:** the field constrains what is signed, not what the Gatekeeper does with it. Routing still follows the signed `commitment_mode` (*Commitment*), and that needs no change.

### The owner's disclosure choice can be standing — targets the next version

Found 2026-10-06 in a test run where an agent proposed mandates for its owner to approve. Disclosure is opt-in per mandate (*Identity Assurance* → *Two orthogonal knobs*; `governance.md` → *Invariant 2*). In practice, whether the name is attached then depends on whichever surface builds the request. The mandate screen asked the owner. The path that turned an approved agent proposal into a mandate never asked, so 27 of 29 tickets in the run came out without the owner's name, although the owner was verified and meant to stand behind every one. Nothing was wrong on the record: each ticket still names the owner's DID. What failed was the owner's choice, which was lost on one path.

**Direction:** an Authority Server MAY hold a **standing disclosure choice** on the owner's account: "attach my verified name to every mandate I give".

1. Only the owner can set it, in an authenticated session, as an explicit act. It MUST NOT be on by default, and the owner can withdraw it at any time.
2. While it is set, the AS MUST stamp the disclosed `subjects` entry on every mandate that owner gives at `high`, whatever the request carries. A request cannot opt out of a standing choice. The owner withdraws the choice instead.
3. Withdrawing it affects only mandates given afterwards. Signed mandates and their tickets stay as issued.
4. A surface that builds a mandate request SHOULD show the owner, before signing, that the name will be attached.

- **Why this satisfies Invariant 2:** the name appears only because the owner chose it. The choice is made once for every mandate instead of once per mandate. *Invariant 2*'s words "opt-in per authorization" should be read, and in the next version written, as "the owner's explicit choice, applied per authorization".
- **Additive:** an account without the choice behaves exactly as now.
- **Conformance:** testable at the AS. With the choice set, a mandate request without a disclosure flag MUST yield a mandate carrying `subjects` with the name, and its tickets MUST copy it. Without the choice, the per-mandate opt-in rule is unchanged.

### A profile can declare a maximum for a bound — targets the next version

Found 2026-10-06 while designing a reporting profile whose mandate sets how far back an agent may read the evidence for a report (`reporting@0.2`, `read_max_age_days`). A bound limits each action. Nothing limits the bound itself: a Mandate Owner can sign any value, and the Authority Server signs whatever value it is asked to sign. For most bounds the owner's judgement is the right limit. For some the profile knows better. A reporting window of ten years turns a report into a search of the whole history, and no owner choice makes that the profile's purpose.

**Direction:** a numeric bounds field MAY declare `maximum: number`, the largest value a mandate under the profile may carry for it. First declared by `reporting@0.2`: `read_max_age_days` with `maximum: 366`.

1. When a field declares `maximum`, the Authority Server MUST refuse to sign a mandate whose value for that field exceeds it, or is not a number (`BOUNDS_INVALID_VALUE`, naming the field and the maximum).
2. A component that enforces the bound SHOULD apply the lower of the signed value and `maximum`, so that a mandate signed in error is still limited.
3. A surface that lets a Mandate Owner set the bound SHOULD NOT accept a value above `maximum`. The Authority Server's refusal is the rule; the surface only avoids a signing that would be refused.

- **Additive:** a field without `maximum` behaves exactly as now, so no live mandate changes meaning.
- **Profiles:** declaring or lowering a `maximum` changes which mandates are valid, so it is a profile version change, never an in-place edit.
- **Conformance:** testable at the Authority Server. For a field with `maximum: 366`, a request to sign 367 MUST be refused, a non-numeric value MUST be refused, and 366 MUST succeed.
- **Not covered:** a lower bound. No case needs it yet.

### Group roles: who may grant, who approves above the cap — targets the next version

Found 2026-10-14 while setting up a team of ten in the reference implementation. Two rules in *Personal Mode vs Group Mode* and *Review-Above-Cap Mode* combine badly. The granting user MUST be a required approver, so every member who needs the profile is on the approver list. `above_cap_approvers` are the DIDs that MUST approve an above-cap proposal, so every above-cap action then needs every member's approval. One list carries two roles: permission to grant, and control above the group's threshold. Neither rule says whether the proposer may approve their own above-cap action.

**Direction:** group configuration names two roles per profile.

1. **Grantors** — who may sign a mandate for the profile. In group mode the Authority Server MUST verify the Mandate Owner is a grantor (replacing "is a required approver" for this purpose).
2. **Above-cap approvers** — who may approve a proposal raised by a cap exceedance. The list MAY be empty.
3. `above_cap_approvals` — how many distinct approvers must approve (default 1). A proposal is committed when that many have approved.
4. The proposer of an above-cap action MUST NOT count as one of its approvers. An approver set that cannot reach `above_cap_approvals` without the proposer makes the cap hard for that proposer.
5. A cap MAY be marked hard: a ticket request above it MUST be refused, never routed. With no above-cap approvers every cap is hard, and the Authority Server SHOULD refuse to sign a mandate whose bound exceeds a hard cap rather than sign one that fails on every action.
6. Roles, `above_cap_approvals` and which caps are hard are signed into the mandate with `above_cap_caps` and `above_cap_approvers`; changing them requires a new mandate.

- **Why:** permission and control are different people in any team larger than two. Requiring every approver turns a threshold into a standstill as soon as one approver is absent.
- **Compatibility:** a group whose grantors equal its approvers, with `above_cap_approvals` equal to the list length, behaves as today.
- **Conformance:** testable at the Authority Server. A grantor who is not an approver can sign; an above-cap proposal commits after the configured number of distinct approvals; the proposer's approval is not counted; a hard cap refuses with no proposal.

### A group can cap reads and capability switches — targets the next version

Found 2026-10-14 together with the entry above. *Read Authorization* says a read limit one party enforces against another — a team admin capping a member's reach — "re-enters the signed surface", but defines no mechanism. Reads carry no ticket, so the Authority Server's above-cap check never sees them, and a read cannot be approved one by one. Separately, `above_cap_caps` maps a field to a numeric cap, so a capability switch (an `enum` bound such as `read_access: none | unlimited`) cannot be capped at all.

**Direction:**

1. A group cap on a bound the Gatekeeper alone enforces (a read bound; the profile marks it `enforcedBy: "gatekeeper"`) is always hard. The Authority Server MUST refuse to sign a mandate above it and MUST sign the group cap into the mandate as a ceiling.
2. The Gatekeeper MUST NOT apply a local read policy beyond a signed group ceiling. In personal mode, and below the ceiling, the local read policy governs as today (*Read window precedence*).
3. An `enum` bound's `values` are ordered from most restrictive to most permissive. A group cap on an `enum` bound is one of its values; a mandate whose value comes later in the order exceeds the cap.
4. An `enum` bound SHOULD declare what it gates (`gates`: reads, or named action types), so that a Gatekeeper applies it to every tool of that kind without a per-tool declaration, and a missing declaration cannot leave it unenforced.

- **Why:** a team admin needs to limit how far a member's agent reads and whether it reads at all; today neither holds.
- **Compatibility:** groups without read caps and profiles without ordered enums behave as today. Declaring `gates` or reordering `values` is a profile version change.
- **Conformance:** testable. A mandate above a group read cap is refused; a Gatekeeper with a local window above the signed ceiling reads only up to the ceiling; a mandate with `read_access: unlimited` under a group cap of `none` is refused.

### The Authority Server never sees what an action contains — targets the next version

Found 2026-10-12 in a demo run of the reference implementation. A review-mode proposal reached the Authority Server with its full tool arguments readable: an email's text, a quote's lines, the intent of a mandate an agent proposed. They were kept and returned on every listing. Nothing in the protocol forbade it. The AS used them for exactly one thing: to check, when the ticket was requested, that the action was the one approved, and a fingerprint does that. Mandate intents already work this way (`intent-disclosure`: the AS relays ciphertext and sees hashes). Proposals were left out.

**Direction:** the content of a proposed action is end-to-end encrypted. The AS sees who may decide, the bound values it enforces, and fingerprints. It never sees the content.

1. The component that submits a proposal MUST encrypt its content (the action's arguments and anything rendered from them for the approver) to the keys of everyone who may read it: the submitter, the Mandate Owner, and each possible approver. It MUST send the content's fingerprint with it. This is the same construction as the approver disclosure channel.
2. The values the AS enforces bounds on (the execution context: the fields a bound refers to) stay readable to the AS. Without them it cannot enforce. Nothing else of the action is readable to it.
3. The AS MUST bind the ticket to the proposal by fingerprint. A ticket request whose content fingerprint differs from the proposal's MUST be refused, and the refusal MUST NOT carry content.
4. A decision (approve, reject, send back) SHOULD carry the fingerprint of what the deciding surface decrypted and showed. The AS MUST refuse a decision whose fingerprint differs from the proposal's. With an approver signature (*Owner Signatures* above) the fingerprint is what the approver signs.
5. An approval surface that cannot decrypt (no key for this device) MUST NOT offer the decision. It shows that the content is encrypted for another device.

- **Why the AS can still do its job:** it enforces bounds on the execution context, binds tickets by fingerprint, and keeps the signed record. None of these needs the content.
- **Devices:** reading a proposal on several surfaces (a desktop gateway, a phone) means one key per device, enrolled and revoked by the owner. This is the open question in *Owner Interface, approval surface, and the local custody domain* below, now with a first case.
- **Migration:** content an AS already holds readable SHOULD be removed once the proposal is decided. The submitting component keeps its own archive.
- **Conformance:** testable at the AS. A stored proposal MUST NOT contain readable arguments. A ticket request with a different fingerprint MUST be refused without echoing content. A decision with a wrong fingerprint MUST be refused.

### System context on an approval surface — targets the next version

Found 2026-10-13 in a demo run of the reference implementation. An agent proposed a quote with `customer_id: cust-1` and a line `item_id: item-1, qty: 10`. The approval surface showed exactly those bound values. They were correct and complete, and they meant nothing to the person deciding. The implementation can read who `cust-1` is and what `item-1` is from the system the action goes to, and show that next to the values (customer name, credit limit, article name, list price, stock). These are not parameters of the action, and the ticket does not bind them. *Conformance: what is displayed MUST be what is bound* (`protocol.md`) forbids displaying a consequential parameter that is not bound. It does not say what may be shown **next to** the bound parameters to make them understandable.

**Direction:** an approval surface MAY show **system context**: data the Gatekeeper reads from the target system before approval, never data supplied by the agent.

1. System context MUST be visibly distinguished from bound values on the surface. A reader must be able to tell "this is what you approve" from "this is what the system currently says about it".
2. System context MUST NOT replace a bound value. A name is shown next to the id it resolves, never instead of it.
3. System context MUST come from the Gatekeeper's own read of the target system. Text from the agent is never system context.
4. Where system context decides whether the action is acceptable (the state of the record the action changes, its version or revision), the implementation SHOULD bind it: by the record's version carried in the approved action, or by re-reading before execution and refusing on any difference. Context that only explains a bound value (a customer's name next to its id) need not be bound.
5. The surface SHOULD state when the context was read.

- **Why this satisfies the display rule:** the rule protects the commitment, meaning what the ticket holds. System context is not part of the commitment, and point 1 keeps it from being mistaken for it. Point 4 covers the case where context is the real subject of the decision.
- **Not covered:** how an implementation declares which reads to make. That is implementation configuration (in the reference implementation, the connector manifest).
- **Conformance:** testable on an approval surface. Bound values and system context are distinguishable. Removing every system context element leaves every bound value visible. No agent-supplied text appears as system context.

### What was shown can be bound to the decision; the request an action answers — targets the next version

Found 2026-10-14 while extending the approval surface of the reference implementation. The person approving a quote or a reply needs the **request** it answers (the customer's email, a logged phone call) and the customer's latest entries, not only the bound values and system context. Two gaps follow from *System context on an approval surface* above.

1. **The agent may point, but not speak.** Which request an action answers is known to the agent, not to the Gatekeeper. The agent can supply a **reference** (system, record kind, id). The Gatekeeper then reads the record itself and shows it. The shown text is the system's, but the **choice** of record is the agent's claim, and the surface MUST label it as such ("linked by the agent"). A reference that cannot be read MUST NOT block the action; the surface says it could not be read. A reference is not a parameter of the action and MUST NOT reach the effector.
2. **Context the Gatekeeper finds on its own.** The Gatekeeper MAY show the latest entries it can read for the same counterparty (matched only on declared exact keys, never on time or wording). The surface MUST NOT present them as related to this request. Same counterparty is not the same matter. Text an agent wrote earlier through the Gatekeeper and now read back is still the agent's text, and the surface MUST mark it so.
3. **Binding what was shown.** System context and these reads are unbound and change after the decision. An implementation MAY let the decision carry a fingerprint of exactly what the surface displayed (`shown_hash`, over a canonical serialization), keep the displayed snapshot in the approver's custody, and let the Authority Server record the fingerprint **per decider** without ever seeing the content. Later, the snapshot and the fingerprint show what the decider saw.

- **Why point 3 does not extend *what is displayed MUST be what is bound*:** it covers more and proves less. The snapshot is held by the approver's side and the fingerprint is recorded by the Authority Server, not signed by the decider. It shows that the approver's snapshot is unchanged since the decision, not that it was honestly produced. A decider-signed decision (see *The Authority Server never sees what an action contains*) would strengthen it.
- **Not covered:** how an implementation declares which records can be referenced and which entries are read (implementation configuration; in the reference implementation, the connector manifest); disputes across approving devices that do not hold the snapshot.
- **Conformance:** testable on an approval surface and at the effector. An agent reference is labelled as the agent's; an unreadable reference does not block; the reference never reaches the effector; no entry is labelled as related; where `shown_hash` is supported, each decider's fingerprint is recorded separately and a later decision does not overwrite an earlier one.

### Read classification for remote, vendor-controlled connectors — undated

A connector reached through a remote MCP server the operator does not control has a tool list that cannot be enumerated when its manifest is written and can change without notice. Under *Tool-Gating Manifests* rule 1 such tools are refused until named. Where an operator chooses to name a catch-all action type for them (`charge@0.5` registers `unclassified` for this reason), genuine reads are counted as consequential, consume a write budget, and produce tickets — over-restrictive rather than unsafe, but it means a ticket exists for something no one executed. What the specification could add is a name for the situation: a declared *unclassified* action class, so a ticket carrying it reads as "this connector could not tell what this was, and treated it as consequential" rather than as a positive claim about the action.

### Dual-signed public ticket projection — targets v0.8 (slipped from v0.7; reason in `changelog.md`)

> **Security dependency, not only a transparency improvement.** Invariant 10 permits a ticket-demanding effector to satisfy Complete Mediation, and such an effector must establish the ticket's authenticity itself. A public projection that withholds the signature cannot give it that: the effector asks the Authority Server whether the signature is valid and its mediation therefore depends on the AS being both honest and reachable — an honest-operator control where the invariant demands compromise-resistant evidence (`protocol.md` → *Enforcement classes*). The dual-signed projection is what closes that.

A public ticket view deliberately redacts private fields **and the signature**; because one Ed25519 signature covers the whole ticket, the public page cannot be independently re-verified — its "signature valid" is the AS re-verifying itself. Full zero-trust verification is available only to the holder of the complete signed ticket, which for a *private* action is the party that matters. For a *public* artifact "everyone is the holder," and the gap is real.

The fix: the AS separately signs a public-only projection `{id, mandateId, timestamp, profileId, actionType, boundsHash, contentHash, contentBinding, identity, issuer}` and exposes it with its signature — carrying `mandateId` and `boundsHash` (the mandate reference) and, where present, the owner's signature entry from `mandate_owners`, because without those the ticket → mandate → owner-signature chain cannot even start from the public view — extended by two requirements that surface when the ticket becomes a **bearer proof presented to a third party**:

1. **Replay.** Idempotency is retry-dedup, not replay defence. A ticket presented twice to an external verifier is a different problem; content binding contains most of it, but an old ticket could force old, vulnerable code back into production. Minimum: a validity window in the projection. Stronger: a spent-ticket record or an issue-time nonce.
2. **Scope fields must be verifiable, not merely disclosed.** A machine verifier must check the ticket authorizes *this* repository, environment, and pipeline. Those live in `executionContext`, which the projection redacts — so the projection must carry the execution-context fields the profile or mandate **declares disclosable** (`disclose_fields` supplies the mechanism).

Related, smaller pieces of the same machine-verification surface: content negotiation on a public ticket URL (JSON for agents), a `.well-known` discovery document, a structured ticket marker in email headers, and a verifier helper plus ticket types in a core library.

### Verifier policy for external relying parties — targets v0.8

v0.6 made verifier policy the **primary enforcement tier** for owner signatures ("the relying party demands a minimum `binding`… MUST fail, not warn") but defined no interface for a relying party who is not running a gateway. An auditor, a counterparty's system, or a pipeline consuming a bearer ticket has a normative verification *procedure* but no defined way to express its policy (minimum binding, required owners, pinned DIDs) or a standard failure semantics. Same gap class as the projection above, and the two should land together: a small, declarative verifier-policy document that any conformant verifier evaluates identically.

### Deploy binds the artifact digest; the source commit is the reader's pointer — undated

Found 2026-09-04. A deploy ticket binds the **source commit** as text, so a released page can name its own approval in a footer a reader can check. Two things then tie that commit to the bytes that go live: the page's footer, and the deployment host's report of which commit produced the build. Both are self-asserted strings — a footer says what the build put there; an artifact commit's message says what its author typed; neither is signed. And reading the footer requires the staged build to be publicly fetchable, which is the wrong dependency for a verification step.

Direction: **bind what goes live, not where it goes live, and not what a page says about itself.** Where the served artifact is committed, its tree hash is already a content digest of the served bytes; where the host builds, an image or bundle digest is. A future deploy profile binds the digest alongside the source commit (the declared-field binding already on this ledger), the effector verifies the digest of what it is about to activate — independently, per *Deployment Security Profile* — and the footer becomes a cross-check that may only refuse. The artifact → source link should become a build attestation rather than a commit message. Repository, environment, and pipeline remain covered by the dual-signed projection item above, not by this one.

### Subject export of evidence at the AS — undated (custody half promoted)

The Gatekeeper half — custody of the complete signed ticket, mandate, and issuer key — is normative since v0.7. The remaining half: the authenticated subject can export, at any time, the complete signed tickets issued under their mandates and the mandates behind them, in a self-contained format that verifies offline (issuer key included). This converts *Retention at the Authority Server*'s operator-facing export duty into a right the evidence's subject can exercise — while an account still exists; it does not reach the already-terminated case, which is why custody is the primary mechanism and export is the recovery path. Deliberately out of scope: custody on an employer-owned device (a returned laptop surrenders the archive with it — a deployment-profile concern, candidate for user-designated escrow), and any subject access *after* termination, which no protocol text can force on a hostile operator.

### Selective disclosure / per-field commitments — undated (activates when a case requires it)

A single hash over a declared subset is all-or-nothing at disclosure time. Proving *"the environment was production"* without revealing the artifact requires a commitment per field plus a hash over those commitments — and that construction MUST NOT be adopted without a per-field random salt: bound values are frequently short and enumerable, and an unsalted per-field hash is recoverable by enumeration. The sub-mandate direction above is the second case that would need it (proving a subset relation without disclosing the parent).

### Resilience to a Compromised Authority Server — remaining items

Owner signatures (v0.6) removed authority fabrication from the compromised-AS surface; the v0.7 enforcement-class table records exactly what remains honest-operator. Remaining:

- **Transparency log — undated.** An append-only, independently auditable log of signed mandates and tickets — equivocation, ignored revocations, and cumulative-cap violations become detectable. To be worth its cost it must be **external or multi-witness**: an AS-run log is no defence against the AS. Its justification is the irreducible residue — cumulative state and pre-flight ordering are claims about a sequence only the AS witnesses, and a witnessed log is the only mechanism on the table that reaches them.
- **Approver public-key authenticity — open; targets `intent-disclosure@0.2`.** The approver keys that wrap the content key are served by the AS unauthenticated and bound into nothing signed — `intent_disclosure_hash` freezes the approver *set*, not their *keys*. Binding the map into the signed payload makes only *later* substitution detectable; what holds is a key the verifier never receives from the AS. These are **encryption** (X25519) keys where `did:key` here carries an Ed25519 **signing** key, so closing this needs either an identifier that carries an X25519 key or a defined derivation — not to be taken casually. The hash-definition change is breaking, hence the companion-spec version bump.

### Output Provenance — profile-bound, undated

Binding a mandate to an observable output location (`output_ref` in the scope schema, hashed and signed) remains specified and unpromoted: it lands in the deploy-style profile that adopts it, not in HAP Core. Maturity marker: no external integrator.

### `eudi` wallet integration — P5, undated

The `binding: "eudi"` value and its validation semantics are normative; what remains is the wallet integration itself and its rotation story — tracked here because it is also the answer to key rotation, which no rotation chain or AS-mediated mechanism can provide.

### "Gateway" appears in normative text without a definition — targets the next version

Found 2026-09-10 in a terminology audit. The word *gateway* — an implementation's product name, defined nowhere in this specification — appears ten times in the published v0.7 text, including in normative sentences (a MAY on caching consumption state; where scope content rests encrypted; who computes `scope_hash`). Each occurrence stands in for one of the defined terms, and not always the same one: the caching, UI, and custody mentions mean the **Local App**; the hashing mention means the **Gatekeeper**; the forking list pairs "Gatekeeper / Gateway" as if they were two roles. The pattern is that product vocabulary leaked in wherever the text describes the packaged experience rather than the role. The fix is mechanical — replace each occurrence with the defined term it stands for — but it edits published normative text, so it waits for the next version rather than being corrected in place. It should land together with the vocabulary direction below, which resolves what "Local App" itself should become.

### Owner Interface, approval surface, and the local custody domain — undated

**Local App** names an accident of packaging. The roles table lists it — a piece of software — among actors, and its definition bundles three things that are distinct and only *happen* to be colocated in the reference implementation: the enforcement point (where Gatekeeper and Executor run, in front of the effectors — this cannot move), custody (where plaintext intent and scope live at rest), and the surface where the Mandate Owner reviews and signs. The moment an implementation offers a remote review client — a phone, a web client — the bundle comes apart, and "local" stops meaning *on the same machine*.

Direction, three terms in place of one:

1. **Owner Interface** — a role, not a component: wherever the Mandate Owner exercises ownership — authors intent, grants and revokes mandates, reviews proposals, inspects tickets. An implementation may have several (desktop, phone, web); each is mostly unconstrained UX.
2. **Approval surface** — the normatively constrained part of any Owner Interface: the display where a commitment is shown and signed. The displayed-must-be-bound rule (`protocol.md` → *Conformance: what is displayed MUST be what is bound*) already attaches here; a remote approval surface adds one obligation — it MUST be a **verifying client**, not a renderer: decrypt, recompute the hashes, and check them against the *signed* mandate before showing anything as approvable. Otherwise blind-signing risk moves from the Local App to the phone.
3. **Local custody domain** — the trust boundary formerly implied by "local": the set of endpoints holding the owner's keys and semantic plaintext. The Authority Server sits outside it, always.

The transport for a remote Owner Interface already exists in the protocol: the approver disclosure channel (`intent-disclosure`) — content encrypted to a recipient key, the AS relaying ciphertext blindly, the recipient verifying the full chain before trusting what it displays. A remote owner surface is that channel with the owner as recipient: **the owner as their own remote approver.** The privacy posture is unchanged (the AS still sees hashes and ciphertext); the metadata concession — the AS learns who reviews what and when — is the one the approver flow already makes.

What is genuinely new protocol surface is **device enrolment and revocation**: an owner with keys on several devices needs enrolment that is itself a consequential, verifiable act (else it is the account-takeover path), and per-device revocation that does not void the mandates. This is the same gap the Owner Signatures enrolment ceremony leaves open (above), and the two should be specified together. Open questions, deliberately unresolved here: whether a remote device is **review-only** (ephemeral per-decision disclosure — decrypt, show, sign, discard) or a **custody peer** holding plaintext at rest, and whether device keys are per-device DIDs under one owner identity or one provisioned key — review-only with per-device keys is the conservative default.

### The public layer — not a protocol item, recorded once

The vocabulary is now the specification's. Websites, product copy, and AI-facing context documents follow the specification, not the other way round; the change is a copy proposal outside this ledger and is mentioned here only so the sequence is on record: spec first, wire second, copy third.
