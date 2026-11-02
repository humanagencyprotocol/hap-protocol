---
title: "Human Agency Protocol — Review and Future Directions"
version: "Version 0.8"
date: "November 2026"
status: "Non-normative — future directions"
description: "The forward ledger for v0.8: open directions with their targets, the three specification-led surfaces tracked until an implementation closes them, and the deviation rules that bind every implementation. The record of what changed in v0.8 is changelog.md. Implementation status is not part of the specification."
---

This document is the **forward ledger**: what is open, what it targets, and which deviation rules are on record. What was promoted into v0.8 and why — the twelve directions built before they were written, the two promoted specification-led, the details pinned, and the proposals rejected — is `changelog.md`. A v0.8 implementation MAY implement any direction below without losing conformance, and MAY skip all of them without losing conformance.

Each open direction carries an explicit **target**; "undated" means no version commitment exists yet.

**Implementation status is not part of this specification.** Whether a given implementation meets a requirement is that implementation's claim, made in its own report where a reader can weigh it (`governance.md` → *Reference Conformance* → *Implementation reports*). Where an implementation publishes its report is that implementation's matter.

---

## Specification-led in v0.8 — tracked until an implementation closes them

Promotion rule 3 admits a direction that is additive and optional without an implementation, on the condition that it stays on this ledger until one exists. Three surfaces entered v0.8 that way:

- **Public ticket projection** (`protocol.md` → *Public ticket projection — `HAP-ticket-projection`*). The vector `ticket-projection` pins its bytes. What closes it: an Authority Server that serves the projection with its signature for a public ticket view and stops presenting any other redacted view as verified; a ticket-demanding effector that verifies it. Open design point: whether the projection should carry `proposalId` and `approvalSignature` on the review path, so the human-approval link can start from the public view as the owner-signature link now can. Deliberately not added without a case.
- **Remote approval surfaces** (`protocol.md` → *Roles* → *Approval surfaces*). A surface away from the owner's device MUST verify before it shows. What closes it: a remote surface that verifies the mandate and the proposal fingerprint itself, and refuses to offer a decision it cannot decrypt. Device enrolment is the open half (*Device enrolment and revocation* below).
- **Verifier policy** (`protocol.md` → *Owner Signatures* → *Verifier policy — `HAP-verifier-policy`*). What closes it: a verifier — a core-library helper, a pipeline, an auditor's tool — that evaluates a policy document and fails on the named line. The policy's lines are the ones the v0.6 procedure already implied; a relying party that needs a line not listed should say so here before an implementation invents one.

The first two were written so that P2 of the owner-signature order below is not a dependency: the owner entry in the projection, and the `min_binding` and `required_owners` lines of the policy, are conditional on owner signatures existing and impose nothing where they do not.

---

## Owner Signatures — suggested implementation order (specification-led since v0.6)

The normative design is in `protocol.md` → *Owner Signatures*; it was promoted specification-led in v0.6 (rule 3). An implementation approaching it will find this order natural, because each phase produces something an outsider can verify and the last is configuration rather than design:

| | | Size |
|---|---|---|
| **P1** | Types: the `mandate_owners` entry, the `HAP-mandate-projection` and `HAP-approval` objects, the `approvalSignature` ticket field, the error codes, deprecation of `Subject.owner_signature`; a `did:key` encoder/decoder | small |
| **P2** | Key-bearing signing DIDs enrolled through a platform authenticator; signing in a locally installed surface (`signing_surface: gatekeeper_local`); projection verification; owner signatures in the public ticket projection. **Decide the curve first** — see below | large — the real work |
| **P3** | Approval signatures end-to-end; `approvalSignature` enforced at ticket issuance; the approval's `content_hash` as the proposal fingerprint where the profile binds no content | medium |
| **P4** | Verifier policy evaluated by a verifier (now specified — above) | small–medium |
| **P5** | `binding: "eudi"` — and with it, key rotation | configuration, not redesign |

P5 being configuration rather than redesign is the point of the ordering: build the slot against key material that exists today (passkeys), and a national scheme plugs into it.

**The curve is an open decision, and P2 cannot start without it.** `did:key` is defined for several key types; this specification's vectors and its `alg: "EdDSA"` examples use Ed25519, and a `did:key` encoder built to these examples accepts only the Ed25519 multicodec. Platform authenticators on the major desktop and mobile systems commonly sign with **ES256 (P-256)** rather than Ed25519, so "enrol a passkey as the signing DID" is not automatically implementable. Two ways forward, and the choice belongs to whoever starts P2:

- **Accept P-256 signing DIDs.** Widest reach, since it is what platform authenticators already produce. Costs a second multicodec in every encoder, decoder and verifier, and a conformance vector per curve — the whole point of `alg` being carried alongside the DID is to keep curve confusion out, so both paths must be pinned by vectors rather than inferred.
- **Require Ed25519 key material.** Keeps one curve everywhere and the existing vectors unchanged, but narrows enrolment to authenticators and wallets that offer it, which excludes some platform passkeys.

Neither is wrong; leaving it undecided is. `binding: "eudi"` (P5) raises the same question again, because a national scheme brings its own algorithms — so whichever way P2 goes, the verifier must already be able to say which curve it accepts and refuse the rest. v0.8 did not decide it, on purpose: nothing in v0.8 depends on the answer.

**The enrolment ceremony is not specified.** *Identity & Authorization* rule 6 fixes what must be true — the owner DID in a mandate matches the authenticated identity — and *Owner Signatures* fixes what a signing DID must be: key-bearing. What sits between them is unwritten: how an account comes to have a signing DID in the first place, what proves possession of the private key at enrolment (a challenge signed with it is the obvious answer), what happens when an account enrols a second key, and how the event is recorded. *Key lifecycle* covers only the forward path after loss. This is a small specification gap with a large implementation surface, and it is the first thing P2 runs into. It is the same gap as *Device enrolment and revocation* below, and the two should be specified together.

---

## Deviation rules

### D1 — Profile in-place mutations (grandfathered, closed)

The immutability rule was violated before v0.6 closed the loophole normatively: `content_binding` was added **in place** to published `records@0.4` / `customers@0.4` (June 2026) and `email@0.4` / `publish@0.4` (July 2026), and — found while writing v0.8 — further published versions were edited in place in the same period (`email@0.4` three times, `customers@0.5`, `publish@0.4` again, `deploy@0.6` and `0.7`, `email@0.5`). Every one of them predates **2026-08-03**; none has happened since. Tolerable in practice — the authority contract the human signed was untouched, tickets are self-contained, the fields were OPTIONAL — but wrong: an annotation that changes what future tickets publicly expose is a behaviour change. The rule is unchanged. **Every in-place edit to a published profile version made before 2026-08-03 is grandfathered**; the list is the profiles' own git history. Implementations MUST treat them as the last of their kind, and an edit after that date to a published version is a violation, not a candidate for this clause.

### D2 — The field-name fallback for cumulative bounds (closed in v0.8)

v0.7 permitted an enforcement point to keep a field-name fallback for mandates on profile versions that predate `appliesTo`, until no live, unexpired mandate referenced one. v0.8 closes it for v0.8 mandates: the fallback MUST NOT exist on a v0.8 mandate's path. Where a v0.8 mandate names a profile in the v0.6 vocabulary that lacks `appliesTo` on a count bound (D4, marked †), the defined reading applies — absence means the bound governs every action type — and no field-name correlation is used (`protocol.md` → *Migration from v0.7*). No v0.7 mandate is exercised by a v0.8 AS (every mandate is re-granted), so no path remains for it. Whether a given implementation has removed the fallback is a matter for its own report.

### D3 — Scope enum values in `field.enum` (grandfathered per version, closes per profile)

v0.5 retired the top-level `field.enum: string[]` on a scope field in favour of `constraint.values`, and `protocol.md` → *Scope Schema* says implementations MUST NOT fall back to it. Every published profile with enum scope fields still declares its values in `field.enum`, and none in `constraint.values` — the rule was never followed by the profiles the rule's own author publishes. The MUST stands. **Published profile versions carrying `field.enum` are grandfathered**: an implementation MAY read `field.enum` for exactly those versions — a closed list, like D4: charge@0.4–0.7, customers@0.4–0.11, delegation@0.4–0.6, invoicing@0.1, publish@0.4–0.7, purchase@0.4–0.8, sales@0.1–0.4, as of `hap-profiles` 2026-10-29 — and for no other. Each profile MUST move its values to `constraint.values` at its next version, which closes D3 for that profile. Re-admitting `field.enum` as a second read location was rejected (`changelog.md`).

### D4 — Profiles in the v0.6 vocabulary (a register, closed list)

`protocol.md` → *Profiles* reads a profile in the v0.6 vocabulary — one that carries `contextSchema` or a `decision_owner` gate — under its v0.7 names, and exempts it from the v0.7 requirement of `appliesTo` on count bounds. Whether a profile is in that vocabulary is read from its bytes, not from a date. For reference, the published profiles in it, as of `hap-profiles` commit `26f9ef8` (2026-10-29); those marked † also lack `appliesTo` on a `cumulative_count` bound:

calendar@0.4†, calendar@0.5, charge@0.3, charge@0.4†, charge@0.5, customers@0.4†, customers@0.5†, customers@0.6, customers@0.7, customers@0.8, delegation@0.1, delegation@0.2, deploy@0.6†, deploy@0.7†, deploy@0.8†, deploy@0.9, deploy@0.10, email@0.3, email@0.4†, email@0.5†, email@0.6, email@0.7, publish@0.4†, publish@0.5, purchase@0.4†, purchase@0.5, purchase@0.6, records@0.4†, records@0.5, reporting@0.1, reporting@0.2, sales@0.1, sales@0.2, sales@0.3.

The list is closed: a new profile version in the v0.6 vocabulary is not conformant. It shrinks as mandates under these versions expire; it is never extended.

---

## Open directions

### Attachments by reference — undated (needs a recorded review)

Found while writing v0.8. Two published versions of a message profile bind **attachments by reference**: the agent names a document it has seen through a connector (`connector:kind` identifiers under a scope field listing the allowed sources), the Gatekeeper fetches the bytes itself and seals their fingerprints into the content binding as a `files` field, and the content-binding declaration gains a `field_kinds` map (`text`, `list`, `files`) saying how each bound field canonicalizes. The construction follows the protocol's grain — the agent points, the Gatekeeper fetches, the ticket binds what was fetched — and it shipped with no specification text and no recorded review, which is why it is here rather than in `protocol.md`.

Direction, for the review to confirm or reject: `content_binding` version 2 MAY declare `field_kinds`; a field of kind `files` binds an array of `sha256` fingerprints of documents the Gatekeeper fetched from a declared source, in the order given; the source allowlist is a scope constraint (local, never sent); a document that cannot be fetched refuses the call; the approval surface shows the document, not its hash. Open questions: whether the fingerprint should cover the delivered encoding or the fetched bytes (the transport rule in *Content Binding* applies); whether a reference to a document the owner cannot see is approvable at all.

### `gates` on enum bounds — undated

The v0.7 group-caps entry proposed that an `enum` bound SHOULD declare what it gates (`gates`: reads, or named action types), so that a Gatekeeper applies it to every tool of that kind without a per-tool declaration, and a missing declaration cannot leave it unenforced. v0.8 promoted the rest of that entry and not this: nothing has built it. The direction stands as written; declaring `gates` is a profile version change.

### Execution outcome reporting — undated

v0.8 fixed the rule that matters (*Execution Context Schema*, rule 6: consumption counts tickets, never outcomes). What remains is whether and how a Gatekeeper reports an outcome — succeeded, failed, unknown — to the Authority Server, display-only, so that an owner looking at a ticket list sees which actions ran. The report is unsigned by construction (the Gatekeeper is reporting on itself) and MUST NOT feed enforcement; the open design questions are its shape and whether a failed execution's ticket should be marked in a public projection.

### Custody evidence for `binding` — undated

Since v0.8 the owner signs `binding` and `signing_surface`, so an AS can no longer restate them. They remain the owner's device's own claim. Proving custody — that a `webauthn` signature came from a platform authenticator, an `eudi` one from a wallet — needs attestation evidence carried with the signature and a stated trust root for it. Until then `min_binding` constrains the AS, not a compromised device.

### Execution records across Gatekeepers, and consumption by approval — undated

*One execution per ticket* holds per Gatekeeper. Two directions remain: a shared, atomic execution record for an owner who runs several Gatekeepers against one mandate; and, against an AS that signs a second ticket for one approval, consumption keyed on the human approval (`proposal_id` with its approval signature) rather than on the ticket `id`, carried into the public projection so an effector can apply it.

### A hiding commitment for proposal content — undated

`proposalContentHash` is unsalted, so where the possible contents are few an AS can confirm a guess. A commitment salted with randomness kept inside the encrypted content would hide it; it has to be designed together with every other deterministic hash over the same values (`contentHash`), or the salt hides nothing.

### Domain separation of the HPKE wrap — undated

v0.8 pins `info` and associated data as empty, as implemented. A fixed `info` label per use (intent, proposal) would bind each wrap to its purpose. It changes the bytes, so it is a versioned change with a new vector.

### `typ` inside the signed mandate payload — undated

A mandate's `typ` sits in its unsigned header, so mandates and tickets are told apart by their fields (*Ticket Payload Schema*). Signing `typ` into the payload makes the separation explicit; it changes every mandate signature and belongs to a wire-breaking version.

### Proposal lifetime — target: v0.9

The decision window and an execution deadline for a committed proposal are undefined: a committed proposal refused for a cumulative limit stays redeemable until the mandate expires, and a `review` proposal in a group whose approvers cannot decide has no exit (`APPROVAL_IMPOSSIBLE` exists only at ticket time). Direction: an AS-set deadline stated in the proposal for each state, `PROPOSAL_EXPIRED` after it, and `APPROVAL_IMPOSSIBLE` at submission.

### Refusals still without a code — target: v0.9

Mandate request: `mandate_id`/`issued_at`/`issuer` present; an owner DID other than the authenticated one; invalid `subjects`; an `intent_disclosure_hash` mismatch; `review_above_cap` without caps or approvers; an absent or non-positive TTL. Ticket request: both `proposalId` and `idempotencyKey`. Proposal submission: a revoked or expired mandate, an unknown `mandateId`, an invalid `actionType`, a value over a bound. Each needs one code in the stage lists.

### An audience-bound authorization projection — undated

A public projection must not double as authorization (*Public ticket projection*, rule 3). An effector that wants a minimal object rather than the complete ticket needs a projection naming its audience, signed, and consumed once.

### The owner's projection names no Authority Server — next wire-breaking version

A projection carries no `issuer`, so an owner signature is valid with any AS; a projection that reaches a second AS can become a second mandate with its own cumulative bucket. Adding `issuer` to the projection changes the owner-signed bytes.

### A signed `typ` on every AS-signed object other than mandate and ticket — v0.9

Mandates and tickets are told apart by their fields; every further AS-signed object (a decision record, a key-directory signature) should carry a signed `typ`, and the decision record needs a defined shape.

### Coverage evidence on the ticket — undated

A ticket names no covering mandates, and group configuration is unsigned, so after the fact no artifact shows which required owners covered an action. Direction: an optional list of the covering `mandateId`s in the signed ticket.

### Comparison and normalization semantics — v0.9

Which whitespace intent canonicalization and the `text` binding strip (ASCII, or Unicode White_Space); the comparison rule for write-path `enum`/`subset` scope checks (case, NFKC) and the `pattern` dialect; `join_domains` lowercasing against scope strings kept as committed; stringification of objects and booleans in manifest transforms. Each changes an outcome and needs one rule and a vector.

### Vectors owed — v0.9

Content binding (`text` with CRLF, trailing blanks and NFC; a v2 field binding), intent canonicalization and `intent_disclosure_hash`, a manifest validator, success-path ticket cases, and a chain from a co-signed above-cap mandate to its projection.

### Buckets per profile version — undated

The cumulative key carries the versioned `profileId`, so mandates under `charge@0.5` and `charge@0.6` with the same daily bound give one owner two ceilings. Whether the bucket should be per profile name across versions is open; until then the split is stated (*Cumulative State Tracking*).

### Cumulative state on the ticket, per bound — undated

A ticket's `cumulativeState` reports running totals per (profile, action type) bucket, but a `cumulative_count` or `cumulative_sum` bound with an `appliesTo` list spans several buckets, and a profile may declare several sum bounds over different fields. The number on the ticket is then not the number the bound was checked against, and a verifier cannot reproduce the decision from the ticket. The direction: report, per bound that was checked, the running value it was checked against — keyed by the bound's field name. It changes the signed ticket, so it needs its own design and a version that says so. Until then, `cumulativeState` is not the checked value of a bound that spans several action types.

### Device enrolment and revocation for remote approval surfaces — undated

v0.8 named the roles (*Owner Interface*, *approval surface*, *local custody domain*) and the obligation on a remote surface: verify before showing. What is genuinely new protocol surface is **device enrolment and revocation**: an owner with keys on several devices needs enrolment that is itself a consequential, verifiable act (else it is the account-takeover path), and per-device revocation that does not void the mandates. Open questions, deliberately unresolved: whether a remote device is **review-only** (ephemeral per-decision disclosure — decrypt, show, sign, discard) or a **custody peer** holding plaintext at rest, and whether device keys are per-device DIDs under one owner identity or one provisioned key. Review-only with per-device keys is the conservative default. The proposal-content channel (`protocol.md` → *Proposals*) gives this its first case: one key per user can serve every device, which is the custody-peer answer taken by default rather than by decision. This is the same gap as the owner-signature enrolment ceremony above.

### A wire binding — undated

The specification defines artifacts, behaviours, and refusals, and deliberately no endpoints, request authentication, response envelope beyond the `{approved, errors}` shape, proposal transport, or approval transport. v0.8 specified the proposal *object* and its decision but still no transport. Two implementations built from the text alone verify each other's artifacts and cannot talk to each other. Not a conformance gap — a stated limit of interoperability. Direction: a non-normative companion `hap-http-binding@0.1` (paths, methods, auth header, envelope, proposal and approval transport, revoke, verify, `.well-known` key discovery), plus JSON Schemas for the artifact types, the profile, and the manifest, published beside the vectors.

### Sub-mandates and hierarchies of accountability — undated

The protocol's building blocks — groups, grantors and above-cap approvers per profile, `review_above_cap` with named approvers and a count, multi-owner mandates — already support **hierarchies of accountability** in place of hierarchies of supervision. What flows down is authority, not instructions; what flows up is exceptions and tickets, not reports. Span widens, depth collapses, failure handling becomes surgical (revoke one branch). The organizing rule: **each mandate may only grant less than it holds.**

What is not yet a protocol object: a sub-mandate cannot cryptographically prove that it nests inside its parent — that its bounds are a subset, its scope narrower, its expiry no later, its commitment mode no looser. Today that relation is organizational configuration on the AS, an honest-operator control. Making it compromise-resistant evidence means a signed reference from child to parent plus a verifiable subset relation over bounds and scope — the second of which needs the per-field commitments below to be checkable without disclosing the parent. Between independent operators the same mechanism forms a **mesh**; cross-server federation remains deferred (`governance.md` → *Multi-AS Ecosystem*).

### A profile's name is its area, for people — carried from the v0.7 ledger (2026-10-17), not promoted

Found 2026-10-17 while reworking an approval surface so that people think in areas of work ("Customers", "Payments") rather than in the tools that carry them out. A profile already is that area: it is what a mandate grants, whichever connector executes it. Its `name` is the only display field it has, and the names grew without a rule — some name an area ("Email"), some an act ("Charge", "Deploy"), some are long ("Customer Management").

**Direction:** a profile's `name` is its area name, for people: a short noun phrase for the area of work, not an act and not a tool.

1. `name` is display only. It MUST NOT take part in enforcement, signing or matching; a mandate, ticket or bound check MUST NOT change meaning when it changes.
2. A surface SHOULD show the `name` of the newest version of a profile that it knows, also for mandates signed against an older version.

- **Additive:** renaming is a version change like any other edit, so no published profile changes in place, and no live mandate changes meaning.
- **Conformance:** not testable at the enforcement points, by design (rule 1). A suite can check that a mandate signed under one version verifies identically whatever `name` a newer version declares.
- **Not now:** a mark (icon) for the area. A surface can choose one by the profile's id; a profile-declared mark would be a plain word, never markup.
- **Why not promoted in v0.8:** the entry reached the ledger after the v0.8 text was drafted and has no recorded review. It is additive and could be promoted specification-led at the next version.

### Read classification for remote, vendor-controlled connectors — undated

A connector reached through a remote MCP server the operator does not control has a tool list that cannot be enumerated when its manifest is written and can change without notice. Under *Tool-Gating Manifests* rule 1 such tools are refused until named. Where an operator chooses to name a catch-all action type for them, genuine reads are counted as consequential, consume a write budget, and produce tickets — over-restrictive rather than unsafe, but it means a ticket exists for something no one executed. What the specification could add is a name for the situation: a declared *unclassified* action class, so a ticket carrying it reads as "this connector could not tell what this was, and treated it as consequential" rather than as a positive claim about the action.

### Deploy binds the artifact digest; the source commit is the reader's pointer — undated

A deploy ticket binds the **source commit** as text, so a released page can name its own approval in a footer a reader can check. Two things then tie that commit to the bytes that go live: the page's footer, and the deployment host's report of which commit produced the build. Both are self-asserted strings. Direction: **bind what goes live, not where it goes live, and not what a page says about itself.** Where the served artifact is committed, its tree hash is already a content digest of the served bytes; where the host builds, an image or bundle digest is. A future deploy profile binds the digest alongside the source commit, the effector verifies the digest of what it is about to activate — independently, per *Deployment Security Profile* — and the footer becomes a cross-check that may only refuse. Repository, environment, and pipeline are covered by the public ticket projection's disclosed fields, not by this item.

### Subject export of evidence at the AS — undated (custody half promoted)

The Gatekeeper half — custody of the complete signed ticket, mandate, and issuer key — is normative since v0.7. The remaining half: the authenticated subject can export, at any time, the complete signed tickets issued under their mandates and the mandates behind them — including expired and superseded ones, since *append-only* (v0.8, `governance.md` → *AS Accountability*) means nothing less — in a self-contained format that verifies offline (issuer key included). This converts *Retention at the Authority Server*'s operator-facing export duty into a right the evidence's subject can exercise while an account still exists; it does not reach the already-terminated case, which is why custody is the primary mechanism and export is the recovery path.

### Selective disclosure / per-field commitments — undated (activates when a case requires it)

A single hash over a declared subset is all-or-nothing at disclosure time. Proving *"the environment was production"* without revealing the artifact requires a commitment per field plus a hash over those commitments — and that construction MUST NOT be adopted without a per-field random salt: bound values are frequently short and enumerable, and an unsalted per-field hash is recoverable by enumeration. The sub-mandate direction above is the second case that would need it. The v0.8 rule that scope values never travel (`protocol.md` → *Ticket Request Schema*, rule 7) is the same argument applied to the wire.

### Resilience to a Compromised Authority Server — remaining items

Owner signatures (v0.6) removed authority fabrication from the compromised-AS surface; the enforcement-class table records exactly what remains honest-operator, and v0.8 added one compromise-resistant control (one execution per ticket) and one half-and-half (the proposal fingerprint). Remaining:

- **Transparency log — undated.** An append-only, independently auditable log of signed mandates and tickets — equivocation, ignored revocations, and cumulative-cap violations become detectable. To be worth its cost it must be **external or multi-witness**: an AS-run log is no defence against the AS. Its justification is the irreducible residue — cumulative state and pre-flight ordering are claims about a sequence only the AS witnesses.
- **Reader public-key authenticity — open; targets `intent-disclosure@0.2`.** The keys that wrap the content key — for intent and, since v0.8, for proposal content — are served by the AS unauthenticated and bound into nothing signed. Binding the map into the signed payload makes only *later* substitution detectable; what holds is a key the verifier never receives from the AS. These are **encryption** (X25519) keys where `did:key` here carries an Ed25519 **signing** key, so closing this needs either an identifier that carries an X25519 key or a defined derivation. The hash-definition change is breaking, hence the companion-spec version bump. v0.8 widened the exposure (proposal content now rides the same keys) without changing the analysis.

### Output Provenance — profile-bound, undated

Binding a mandate to an observable output location (`output_ref` in the scope schema, hashed and signed) remains specified and unpromoted: it lands in the deploy-style profile that adopts it, not in HAP Core. Maturity marker: no external integrator.

### `eudi` wallet integration — P5, undated

The `binding: "eudi"` value and its validation semantics are normative; what remains is the wallet integration itself and its rotation story — tracked here because it is also the answer to key rotation, which no rotation chain or AS-mediated mechanism can provide.

### The public layer — not a protocol item, recorded once

The vocabulary is the specification's. Websites, product copy, and AI-facing context documents follow the specification, not the other way round; v0.8's three new role terms and the retirement of *Local App* reach the public layer by the same sequence: spec first, wire second, copy third.
