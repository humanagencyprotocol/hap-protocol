---
title: "Human Agency Protocol — Review and Future Directions"
version: "Version 0.6"
date: "August 2026"
status: "Non-normative — future directions"
description: "The forward ledger for v0.6: open directions with their targets, deviation notes, implementation status against the spec, and tracked audits. The record of what changed in v0.6 is changelog.md."
---

This document is the **forward ledger**: what is open, what it targets, where the specification currently leads its reference implementation, and which deviations and audits are on record. What was promoted into v0.6 and why — including the revised promotion rule and the review record behind it — is `changelog.md`. A v0.6 implementation MAY implement any direction below without losing conformance, and MAY skip all of them without losing conformance.

Each open direction carries an explicit **target**; "undated" means no version commitment exists yet.

---

## Owner Mandate Signatures — implementation phasing (specification-led)

The normative design is in `protocol.md` → *Owner Mandate Signatures*; it was promoted specification-led (see `changelog.md`, rule 3) and nothing of it is implemented at the time of writing. The phasing, each phase ending with something demonstrable to an outsider:

| | | Size |
|---|---|---|
| **P1** | Types: `owner_mandates`, mandate/approval objects, `approvalSignature` receipt field, new error codes, deprecate `Subject.owner_signature`. A `did:key` encoder/decoder in the core library (none exists today — every DID is currently an opaque string) | small |
| **P2** | WebAuthn registration + real key-bearing signing DIDs in the AS; signing in the locally installed gateway UI; `verifyMandate` in the core library and `owner_mandates` in the public receipt projection | large — the real work |
| **P3** | Approval signatures end-to-end; receipt-route enforcement; `approvalSignature` in the receipt | medium |
| **P4** | Verifier policy surface: minimum-`binding` configuration, DID pinning and out-of-band acquisition UX | small–medium |
| **P5** | `binding: "eudi"` — and with it, key rotation | configuration, not redesign |

P5 being configuration rather than redesign is the point of the ordering: build the slot against key material that exists today (passkeys), and a national scheme plugs into it. The `eudi` binding is not the polite completion of the design — it is the only thing that closes the key-rotation hole the design otherwise cannot close (an external root re-binds a new key to the same legal person without the AS *and* without the old key).

**Dependency worth naming:** the reference AS has no WebAuthn today. P2 is new ground, not a patch.

---

## Deviation notes

### D1 — Profile in-place mutations (grandfathered, closed)

The immutability rule was violated four times by the reference implementation: `content_binding` was added **in place** to the published `records@0.4` / `customers@0.4` (June 2026) and then, following that precedent, to `email@0.4` / `publish@0.4` (July 2026). No version bump, no re-attestation. Tolerable in practice — the authority contract the human signed was untouched, receipts are self-contained, and the fields were OPTIONAL — but wrong: an annotation that changes what future receipts publicly expose is a behavior change, and for `email` it changed the privacy posture of already-signed grants (a public hash of a private body admits confirmation-of-guess on low-entropy content) without the grant being re-signed. v0.6 closes the loophole normatively (no annotation exemption). These four mutations are grandfathered; implementations MUST treat them as the last of their kind.

### D2 — Decorative `did:key` identifiers (open, migration required)

The reference AS mints owner DIDs as `did:key:` followed by a truncated random UUID — an identifier wearing `did:key`'s clothes with no key in it and no self-certifying property. This predates the mandate-signature work but is where it starts costing something: under `protocol.md`'s conformance rule, such a DID MUST NOT sign mandates, and its failure is structural (there is no key to verify against — deliberately, since the wire format carries no `public_key`). Existing identifiers MAY remain for audit continuity and as identity DIDs; **new signing DIDs MUST be real key-bearing DIDs**. A related, sharper finding from the same audit: the reference AS signs a **caller-supplied** owner DID without checking it against the authenticated identity — now forbidden by `protocol.md` → *Identity & Authorization* rule 6. Both are P2 work.

---

## Status notes — where the v0.6 spec leads its reference implementation

Two registers, deliberately kept apart. They are not the same kind of gap.

**Register 1 — specification-led by design (harmless while absent).** These are additive and optional; their absence changes nothing for existing artifacts, and no conformance claim is violated by not having them:

- **Owner mandate signatures:** entirely unimplemented (phasing above).
- **Receipt disclosure declarations:** the default-none principle is normative; no profile declares any disclosure yet and no implementation reads a grant-level declaration. Nothing is wrong today by construction — silence *is* the specified behavior.

**Register 2 — normative MUSTs not yet met: the reference implementation is currently non-conformant with v0.6 on these points.** Stated in those words because it is the uncomfortable, accurate status; these gaps are the compliance work list, not optional polish:

- **Per-correspondent overrides** — specified, not built (helpers reserved, unused).
- **Displayed-must-be-bound** — no enforcement exists, and there is a live, known case: an approval surface displays `bcc` while the binding deliberately omits it. Defensible only because review-mode proposal matching independently pins the whole argument set — which is exactly the "second mechanism MUST be stated" clause; that statement still needs to move from this ledger into the relevant profile/manifest metadata.
- **`actionTypes` registry undeclared in every published profile** (added 2026-08-26). `protocol.md` → *Bounds Schema* requires every v0.5+ `boundsSchema` to declare a non-empty `actionTypes: string[]`; no published profile does — including `customers@0.5/0.6`, `email@0.5`, and `deploy@0.6–0.8`, which postdate the rule. The enforcement side is now in place (same date): the AS rejects receipt requests without an `actionType` and validates membership whenever a profile declares a registry (its former name-derived fallback — `action.split('__')…`, forbidden by the receipt-request rules — is deleted), and the reference Gatekeeper fails closed on a write whose manifest declares no `action_type` and checks registry membership locally. Until profiles declare registries, membership is uncheckable and only presence is enforced. The remaining fix requires **new profile versions** — immutability forbids adding the field in place (the D1 lesson), and version choices rest with the maintainer.
- **The receipt is keyed by `authorizationId`, not `boundsHash` — payload field and lookup rule both** (added 2026-08-26; **resolution targets v0.7**, decided 2026-08-26: fix the specification to match the implementation, not the reverse). *Receipt Payload Schema* lists `boundsHash` without an OPTIONAL marker, and the core library types it as required; issued receipts omit it entirely and carry `authorizationId`, which the schema does not list at all. The receipt-request rule diverges the same way, and more sharply: it says the AS **MUST** use `boundsHash` as the *sole* lookup key and MUST NOT accept a UUID as a substitute, while the reference implementation treats `authorizationId` as the key and `boundsHash` as an optional cross-check it rejects on mismatch. This is per-ceremony identity (shipped July 2026) never absorbed into the spec: that change exists precisely because a content fingerprint cannot distinguish two grants with identical bounds, so the spec's rule is the weaker design, not the safer one. Nothing is unsound — signature verification is untouched, and the AS still fails closed — but *Receipt Verification* step 5 tells an external verifier to walk receipt → attestation via a field that is not there, so the documented procedure dead-ends for exactly the outside auditor it is written for. Resolution is a spec decision, and the two halves are separable: name `authorizationId` as the lookup key (superseding the sole-key rule), and decide independently whether the payload should *also* carry `boundsHash` so the chain-of-trust walk has a starting point. Carrying both is the cheapest fix — the AS already holds the value and validates against it. **Related, smaller:** the AS writes the identity overlay as `identity` (one flattened object) where the spec and core library both say `subjects` (an array). **Direction taken:** `protocol.md` is edited in v0.7 to name `authorizationId` the lookup key and to reconcile the payload schema; until that version exists this register entry is the record, and the reference implementation is knowingly non-conformant with the v0.6 text on a rule v0.7 will retire. Recorded this way deliberately: the entry states that the *specification* is what changes, so the divergence is not quietly re-read as conformance in the meantime.
- **Multi-owner ceremonies are not reachable** (added 2026-08-26). `protocol.md` → *Multi-Owner Decisions* and the *Multi-Owner Coverage Rule* describe several owners attesting to the same bounds, with the AS taking the union of `resolved_owners` before issuing a receipt. The reference AS mints only single-owner authorizations: a personal group auto-provisions the single domain `owner`, a team group sets `requiredDomains = [attester]`, and the sole endpoint that could configure several required domains per profile (`PUT /api/groups/:id/path-domains`) returns `410 Gone`. Group governance is expressed instead through above-cap approvers (`profile-config`), which is escalation, not joint attestation. The receipt-time coverage check itself is now implemented and tested (same date) — it refuses with `OWNER_NOT_COVERED` while any required owner is missing — so the enforcement point exists ahead of the feature rather than behind it. What remains unimplemented is the *ceremony*: a way to require, collect, and display two owners' attestations for one authorization. Recorded because the specification reads as though this is available.
- **Cumulative-count bound↔actionType pairing diverges from the spec, in both directions** (added 2026-08-26). To decide which `cumulative_count` bound governs which action type, both reference enforcement points (`hap-core` gatekeeper and the AS's bound selection) prefer a profile-declared `appliesTo` on the bounds field — a field the specification does not define — and fall back to field-name correlation (`write_daily_max` → `write`), which the specification explicitly forbids ("partitioned by `actionType` only — never by field-name correlation"; migration rule 10 orders the regex removed). The behaviour is well-tested and fails closed on unknown action types, but it is unspecified on one side and non-conformant on the other. Resolution is a spec decision: either promote `appliesTo` into the bounds-schema surface (and then delete the name fallback), or define another pairing mechanism. Recorded so the divergence is chosen, not inherited.

**Corrected 2026-08-15:** two entries originally recorded in this register — *resource scope on the read path* and *default-deny for undeclared read governance* — were listed in error. Both have been conformant since the reference gateway's 0.4.x line (2026-07-27): resource scopes bind reads (calendar containers enforced pre-fetch), and undeclared read governance denies for every connector, enforced by a build-time manifest lint alongside the runtime check. The ledger was written from an outdated picture of the implementation; the entries are removed rather than kept as history because a register of *current* non-conformance must state the current truth.

**Also declaration-class, recorded so its status is not forgotten:** `signing_surface` is normative in the spec and is explicitly a **declaration, not a proof** — it carries information no verifier can check, honest only because there is no incentive to overclaim protection to the party weighing it. If a checkable variant ever exists (e.g. an attested-surface mechanism), it would be a new field, not a reinterpretation of this one.

---

## Open directions

### Dual-signed public receipt projection — targets v0.7

> **Security dependency, not only a transparency improvement.** Invariant 10 permits a
> receipt-demanding effector to satisfy Complete Mediation, and such an effector must establish the
> receipt's authenticity itself. Today it cannot: the public projection withholds the signature, so
> the effector asks the Authority Server whether the signature is valid and its mediation therefore
> depends on the AS being both honest and reachable. The dual-signed projection is what closes that.
> This raises the item's priority above where transparency alone would place it.
>
> The reference verifier (the production website release) already enforces action class, scope
> binding by independently recomputed content hash, a 1800-second freshness window, and a
> clock-skew guard. Its two open gaps are exactly the ones above: no atomic consumption — acceptable
> there because re-releasing the same commit is idempotent, and not acceptable for an effector where
> repetition is itself the harm — and authenticity that reduces to trusting the issuer.

The public receipt view deliberately redacts private fields **and the signature**; because one Ed25519 signature covers the whole receipt, the public page cannot be independently re-verified — its "signature valid" is the AS re-verifying itself. Full zero-trust verification is available only to the holder of the complete signed receipt, which for a *private* action is the party that matters. For a *public* artifact "everyone is the holder," and the gap is real.

The pragmatic fix remains: the AS separately signs a public-only projection `{id, timestamp, profileId, actionType, boundsHash, contentHash, contentBinding, identity, issuer}` and exposes it with its signature — carrying `boundsHash` (the attestation reference) and, where present, the attestation's `owner_mandates`, because without those the receipt → attestation → owner-signature chain cannot even start from the public view, and the outward path would be denied to exactly the audience it exists for — extended by two requirements the deploy work surfaced when the receipt became a **bearer proof presented to a third party** (a pipeline refusing to run without a valid receipt):

1. **Replay.** Idempotency is retry-dedup, not replay defence. A receipt presented twice to an external verifier is a different problem; content binding contains most of it (replaying redeploys the *same* commit), but an old receipt could force old, vulnerable code back into production. Minimum: a validity window in the projection. Stronger: a spent-receipt record or an issue-time nonce.
2. **Scope fields must be verifiable, not merely disclosed.** A machine verifier must check the receipt authorizes *this* repository, environment, and pipeline. Those live in `executionContext`, which the projection redacts — so the projection must carry the execution-context fields the profile/grant **declares disclosable** (the promoted default-none principle supplies the declaration mechanism).

Selective-disclosure signatures (BBS+ / signed Merkle-root-of-fields) remain the general answer at substantially higher cost.

Related, smaller pieces of the same machine-verification surface, none started: content negotiation on the public receipt URL (JSON for agents), a `.well-known` discovery document, a structured receipt marker in email headers, and a verifier helper plus receipt types in the core library (which today has none).

### Verifier policy for external relying parties — targets v0.7

v0.6 makes verifier policy the **primary enforcement tier** for mandate signatures ("the relying party demands a minimum `binding`… MUST fail, not warn") — but defines no interface for a relying party who is not running a gateway. An auditor, a counterparty's system, or a pipeline consuming a bearer receipt has a normative verification *procedure* but no defined way to express its policy (minimum binding, required owners, pinned DIDs) or a standard failure semantics. P4 covers the reference gateway's configuration surface only. This is the same gap class as portable machine verification, and the two should land together: a small, declarative verifier-policy document (pin these DIDs, require this binding, require these disclosable fields) that any conformant verifier evaluates identically.

### Subject custody and export of evidence — undated

The receipt-verification guarantee is holder-relative: any party with the **complete signed receipt** and the issuer's public key verifies offline, without the Authority Server's cooperation. What v0.6 nowhere guarantees is that the human the evidence is *about* ever becomes such a holder. The asymmetry bites exactly where the receipt matters most — the exculpatory case. An AS is often run by an employer or their vendor; on termination the subject loses the account, the company laptop, and with them every artifact that could later clear them: the receipts proving what the agent actually did, the attestation proving the mandate was narrow, the intent text (local by design). *Retention* obliges the operator to keep everything — append-only, queryable, "available for export in a standard format for external audit" — but names no beneficiary: nothing entitles the subject to that export, and the gateway-side "SHOULD retain receipts locally" was satisfiable (and in the reference implementation was satisfied) by an unsigned, pruned summary that is operationally useful and evidentially worthless. The result is that evidence about the subject is *verifiable* without trusting the operator but not *available* without the operator's continued goodwill.

Two obligations close it, one per role:

1. **Gatekeeper custody.** The Gatekeeper retains, durably and unpruned, the **complete signed receipt** for every execution it performs, together with the attestation blobs it executed under and the issuer public key current at issuance — so each entry is self-contained for offline verification even against an AS that has since vanished or rotated keys (the same key-availability concern D2 and the dual-signed projection approach from the public side). This costs nothing on the wire: the full receipt is already in every issuance response; custody is purely a persistence decision. The reference gateway implements it as of August 2026 — an append-only, locally encrypted receipt archive, deduplicated by receipt id, distinct from the 31-day cumulative-display log. The spec half is hardening *Retention*'s SHOULD into subject-custody language; wording and version are open.
2. **Subject export at the AS.** The authenticated subject can export, at any time, the complete signed receipts issued under their authorizations and the attestation blobs behind them, in a self-contained format that verifies offline (issuer key included). This converts *Retention*'s operator-facing export duty into a right the evidence's subject can exercise — while an account still exists; it does not reach the already-terminated case, which is why custody (1) is the primary mechanism and export is the recovery path.

Deliberately out of scope here: custody on an employer-owned device (a returned laptop surrenders the archive with it — a deployment-profile concern, candidate for user-designated escrow, not protocol surface), and any subject access *after* account termination, which no protocol text can force on a hostile operator — the design answer to that is possession-before-termination, i.e. exactly (1) and (2).

### Selective disclosure / per-field commitments — undated (activates when a case requires it)

A single hash over a declared subset is all-or-nothing at disclosure time: proving one field means revealing all of them. Proving *"the environment was production"* without revealing the artifact requires a commitment per field plus a hash over those commitments — and that construction MUST NOT be adopted without a per-field random salt: bound values are frequently short and enumerable (an environment name, a currency), and an unsalted per-field hash is recoverable by enumeration. Multi-field binding and selective disclosure are one problem; the declared-field list (promoted) is the half that closes a live gap with no new primitives. Commitments follow when a case genuinely requires disclosing one field while withholding another.

### Resilience to a Compromised Authority Server — remaining items

Owner mandate signatures (promoted) removed authority fabrication from the compromised-AS surface. Remaining:

- **Transparency log — undated.** An append-only, independently auditable log of signed attestations and receipts — equivocation, ignored revocations, and cumulative-cap violations become detectable. To be worth its cost it must be **external or multi-witness**: an AS-run log is no defence against the AS. Its strongest justification is not key rotation but the irreducible residue — cumulative state and pre-flight ordering are claims about a sequence only the AS witnesses, and a witnessed log is the only mechanism on the table that reaches them.
- **Approver public-key authenticity — open; targets `intent-disclosure@0.2`.** Under `intent-disclosure@0.1`, the approver keys that wrap the content key are served by the AS unauthenticated and bound into nothing signed — `intent_disclosure_hash` freezes the approver *set*, not their *keys*. Binding the approver→key map into the signed payload is worth doing but only makes *later* substitution detectable — an AS malicious at issuance signs the attacker's key in. What holds is a key the verifier never receives from the AS. The owner-key answer (key-bearing DIDs) does not transfer for free: these are **encryption** (X25519) keys, and `did:key` as used in this specification carries an Ed25519 **signing** key. Closing this requires either an identifier that carries an X25519 key or a defined derivation from the signing key — a decision not to be taken casually. The hash-definition change is breaking, hence the companion-spec version bump. **Open.**

### The "enforced" audit — targets v0.7

Adopting *The Authority Server Cannot Check Itself* (`governance.md`) obliges an audit of everything the specification describes as "enforced," separating what holds only against an honest AS from what holds against a later-compromised one. First targets: the *Enforcement Authority* table, the receipt-issuance validation list, and the *AS Accountability* obligations in `governance.md`. The output is an annotation per control — *honest-operator control* vs *compromise-resistant evidence* — not a redesign. This item does not gate any implementation phase, but it is named here so it is tracked; an invariant with no audit behind it is the decorative control it was written to eliminate.

### Output Provenance — profile-bound, undated

Binding an attestation to an observable output location (`output_ref` in the context schema, hashed and signed) remains specified and unpromoted: it lands in the deploy-style profile that adopts it, not in HAP Core. Deploy profiles now exist in the profile repository; when one adopts `output_ref` end-to-end, promotion into **that profile's** surface follows. Maturity marker: no external integrator.

### `eudi` wallet integration — P5, undated

The `binding: "eudi"` value and its validation semantics are normative in v0.6; what remains here is the wallet integration itself and its rotation story. See the phasing table above — tracked here because it is also the answer to key rotation, which no rotation chain or AS-mediated mechanism can provide.
