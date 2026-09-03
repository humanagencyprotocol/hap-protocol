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
| **P2** | Key-bearing signing DIDs enrolled through a platform authenticator; signing in a locally installed surface (`signing_surface: gatekeeper_local`); projection verification; owner signatures in any public ticket projection | large — the real work |
| **P3** | Approval signatures end-to-end; `approvalSignature` enforced at ticket issuance | medium |
| **P4** | Verifier policy surface: minimum `binding`, DID pinning, out-of-band acquisition | small–medium |
| **P5** | `binding: "eudi"` — and with it, key rotation | configuration, not redesign |

P5 being configuration rather than redesign is the point of the ordering: build the slot against key material that exists today (passkeys), and a national scheme plugs into it.

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

### The public layer — not a protocol item, recorded once

The vocabulary is now the specification's. Websites, product copy, and AI-facing context documents follow the specification, not the other way round; the change is a copy proposal outside this ledger and is mentioned here only so the sequence is on record: spec first, wire second, copy third.
