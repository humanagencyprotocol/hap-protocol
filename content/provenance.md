---
title: "Human Agency Protocol — Provenance"
status: "Non-normative — dated record"
description: "A dated, version-independent record of every published version of the protocol and the first public appearance of each core concept. Priority is never argued in prose; the dates exist and do the arguing."
---

This file exists because the execution boundary has become a crowded control point and entrants are filing patents on it. The Human Agency Protocol has been published openly, dated, and versioned since November 2025 under the MIT license. That history is prior art, and it is the ecosystem's protection: any future implementer can point at it. This record collects the dates in one place so no one has to reconstruct them from a repository.

**How to read the dates.** Each date is the day the version's documents were first committed to the public repository (`humanagencyprotocol`), with the commit hash for verification. A concept's *first appearance* is the first version whose published documents mention it — including a review ledger, where the idea often appears one version before it becomes binding; *normative since* is the first version in which it is a MUST. Independent corroboration exists outside the repository: the published npm history of `@humanagencyp/hap-core` and the reference MCP packages, and the website's own deploy history.

## Versions

| Version | First published | Commit | What it introduced |
|---|---|---|---|
| **0.1** | 2025-11-13 | `04a9c36` | The protocol: cryptographic *attestations* of human authorization over bounded action; explicit human *Decision Ownership*; the *privacy invariant* (no semantic content leaves local custody); the *Gatekeeper* as the local enforcement point; the signing service (then *Service Provider*); governance by invariants, no registry, no approval body. |
| **0.2** | 2026-01-22 | `a13b8df` | *Profiles* as the mechanism of authority-specific enforcement; the deploy-gate profile; the split of signed parameters into enforced *bounds* and local *context* (`context_hash`); the review ledger (`review.md`) and changelog as standing documents; revocation named as a direction. |
| **0.3** | 2026-03-10 | `457cf4f` | *Commitment modes* (`automatic` / `review`); `bounds_hash` as the content address of an authorization; the Gatekeeper document; the word *mandate* first appears (as the agent's "mandate brief"); the execution receipt appears in the review record as a direction. |
| **0.4** | 2026-04-09 | `2638f9f` | The **execution receipt**: AS-signed, obtained *before* the action runs — the pre-execution proof that becomes the protocol's central invariant ("no receipt, no execution"); *revocation* as a first-class, durable AS concept; cumulative bounds tracked by the signing service from receipt history. |
| **0.5** | 2026-06-19 | `93bd5b4` | The *Authority Server* (role renamed from Service Provider); `review_above_cap`; the closed `actionTypes` registry and `boundType` dispatch; *tool-gating manifests*; exactly-once execution via `idempotencyKey`; deterministic signing canonicalization (JCS) and published test vectors; the *consequential-execution boundary* as the stated scope; companion specifications (`intent-disclosure@0.1`, `output-provenance@0.1`); universal profiles with organizational policy on the AS. Content binding, read authorization, and identity assurance appear in the ledger. |
| **0.6** | 2026-08-12 | `e045e56` | *Content binding* (receipt proves *what* was executed); *read authorization* (receiptless reads governed locally, resource scopes bind reads); *identity assurance* (`self_declared` / `as_vouched` / `eudi`); **owner mandate signatures** — the human's own key over the mandate, making authority attributable independently of the operator; the four-term glossary (authority / mandate / capability / execution) and the sentence *a mandate constrains execution; it does not transfer authority*; **Complete Mediation** (Invariant 10) and the Deployment Security Profile; *The Authority Server Cannot Check Itself*; the revised promotion rule requiring recorded adversarial review. |
| **0.7** | 2026-08-31 (draft) | — | The single-vocabulary release: **mandate**, **mandate ticket**, **scope**, **Mandate Owner**, *without a mandate*; the invariant in its final words — *no mandate, no ticket; no ticket, no execution*; the one-identifiable-human rule for mandate owners; `appliesTo`; permanent revocation; Gatekeeper custody of evidence; the enforcement-class audit (honest-operator control vs. compromise-resistant evidence); `issuer`, `profile_hash`, ticket `version` and `mandateId`, and `disclose_fields` in the signed payloads; the owner projection covering the above-cap thresholds and approvers; version negotiation; the **published conformance vectors** (2026-09-03, revised the same day after a second external review); the delegation-vs-control distinction. |

## Concepts — first public appearance

| Concept | First appears | Normative since | Note |
|---|---|---|---|
| Cryptographic attestation of a human's bounded authorization (now: the signed **mandate**) | 0.1 · 2025-11-13 | 0.1 | The protocol's founding object. |
| Explicit, identity-scoped human ownership of each authorization (now: **Mandate Owner**) | 0.1 · 2025-11-13 | 0.1 | "Collective or symbolic ownership is invalid" from the first version; "a role, committee, or policy cannot own a mandate" made explicit in 0.7. |
| Privacy invariant — hashes cross the wire, semantic content never does | 0.1 · 2025-11-13 | 0.1 | |
| Gatekeeper — local, fail-closed enforcement before execution | 0.1 · 2025-11-13 | 0.1 | |
| Governance by invariant, no registry, no certification body | 0.1 · 2025-11-13 | 0.1 | |
| Profiles — permissionless, versioned, immutable authority schemas | 0.2 · 2026-01-22 | 0.2 | |
| Bounds / context split — enforced limits in plaintext, local scope as a hash | 0.2 · 2026-01-22 | 0.2 (`context_hash`), 0.3 (`bounds_hash`) | Renamed *bounds / scope* in 0.7. |
| Commitment modes — automatic vs. per-action human review, signed into the authorization | 0.3 · 2026-03-10 | 0.3 | `review_above_cap` added 0.5. |
| **Pre-execution signed proof per action** (execution receipt → **mandate ticket**) | 0.3 (record) · 2026-03-10 | 0.4 · 2026-04-09 | The receipt is the *precondition* for a consequential action, issued by the signing service, requested by the Gatekeeper; not an after-the-fact log. |
| Revocation with an append-only history | 0.2 (record) | 0.4 | Permanent (no supersession) since 0.7. |
| Cumulative bounds enforced by the signing service from signed history | 0.4 · 2026-04-09 | 0.4 | Rolling daily/weekly windows and calendar-month UTC anchoring fixed in 0.5. |
| The execution boundary as the protocol's scope ("consequential-execution boundary") | 0.5 · 2026-06-19 | 0.5 | Predates the 2026 "execution boundary" literature cited in `content/0.7/governance.md` → *Relationship to execution-boundary control models*. |
| Closed `actionTypes` registry; enforcement dispatch on declared `boundType`, never on field names | 0.5 · 2026-06-19 | 0.5 | |
| Tool-gating manifests — portable binding of tool calls to profiles | 0.5 · 2026-06-19 | 0.5 (portable format declared canonical in 0.6) | |
| Exactly-once execution (`idempotencyKey`) | 0.5 · 2026-06-19 | 0.5 | |
| Deterministic signing canonicalization + published signing vectors | 0.5 · 2026-06-19 | 0.5 | Widened to the conformance vector set in 0.7. The 0.5–0.6 vectors were never in the published package; the first vectors a third party could actually obtain are `content/0.7/vectors/`, 2026-09-03. |
| Implementation-neutral conformance vectors — canonical hashes, payload signatures under published test keys, and required refusals, checkable offline with no server or endpoint | 0.6 (record) · 2026-08-28 | 0.7 · 2026-09-03 | Published as normative data with the specification rather than inside an implementation, deliberately before a second implementation exists. |
| Encrypted intent disclosure to approvers (`intent-disclosure@0.1`) | 0.5 · 2026-06-19 | 0.5 (companion) | |
| Content binding — the proof covers *what* was executed; declared-field binding (v2) | 0.5 (record) · 2026-06-19 | 0.6 · 2026-08-12 | Reference implementation shipped June–July 2026. |
| Read authorization — receiptless reads, resource scopes bind reads, undeclared governance denies | 0.5 (record) | 0.6 | |
| Identity assurance with an explicit trust root (`self` / `as` / `external`) | 0.5 (record) | 0.6 | |
| **Owner signatures over the mandate** — non-repudiation by the human, independent of the operator; key-bearing signing DIDs; `binding` axis incl. `eudi` | 0.6 · 2026-08-12 | 0.6 | |
| Authority / mandate / capability / execution as fixed vocabulary; "a mandate constrains execution; it does not transfer authority" | 0.6 · 2026-08-12 | 0.6 | |
| Complete Mediation as an invariant; path exclusivity vs. receipt-demanding execution; the Deployment Security Profile | 0.6 · 2026-08-12 | 0.6 | |
| "An AS-side check is not a defence against the AS" | 0.6 · 2026-08-12 | 0.6 | |
| Recorded adversarial review as a promotion requirement | 0.6 · 2026-08-12 | 0.6 (governance of the spec itself) | |
| Single vocabulary across spec, wire, and public — **mandate / ticket / bounds / scope / Mandate Owner**; *access is not a mandate*; *without a mandate* as the named failure condition | 0.7 · 2026-08-31 | 0.7 | |
| Enforcement classes — honest-operator control vs. compromise-resistant evidence, per control | 0.7 · 2026-08-31 | 0.7 | |
| Gatekeeper custody — the subject keeps their own complete signed evidence | 0.7 · 2026-08-31 | 0.7 | |
| Delegation model vs. control model — "control governs the agent; a mandate governs the delegation" | 0.7 · 2026-08-31 | non-normative | |

## Directions recorded but not yet binding

Ideas appear in the review ledger before they are promoted, and the ledger is versioned and dated with the rest. Directions on the record with their first-appearance version: dual-signed public ticket projection (0.5), verifier policy for external relying parties (0.6), selective disclosure per field (0.5), witnessed transparency log (0.5), subject export of evidence at the AS (0.6), output provenance bound to observable outputs (0.2 as the deploy gate; companion spec since 0.5), `eudi` wallet integration and key rotation (0.6), sub-mandates and hierarchies of accountability (0.7). See the current `review.md`.

## Maintaining this record

Add a row when a version is first published and a row when a concept first appears in any published document. Never edit a past date. Where a date is later found to be wrong, correct it and note the correction in that version's changelog — a provenance record that silently rewrites itself is worth nothing.
