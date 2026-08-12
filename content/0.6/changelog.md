---
title: "Human Agency Protocol — v0.6 Changelog"
version: "Version 0.6"
date: "August 2026"
status: "Non-normative — record of change"
description: "What changed from v0.5 to v0.6, under which promotion rule, with the review record behind each promotion. Forward-looking material lives in review.md."
---

This document is the backward-looking record of v0.6: what was promoted into the binding surface, under which rule, on the strength of which recorded review, and what was retired. The forward ledger — open directions, deviations, implementation status, tracked audits — is `review.md`.

## The promotion rule, revised in v0.6

The v0.5 rule required, for promotion into the binding surface, a reference implementation exercising the direction end-to-end **and** an external integrator depending on it. By v0.6 four directions satisfied the first condition and none the second — and none ever could, because the second condition is not satisfiable by the protocol's own author. Applied literally, the rule made the specification permanently lag its only implementation, which produces the worse outcome: shipped, enforcement-relevant behavior with no normative text.

The v0.6 rule — a direction is promoted when:

1. at least one reference implementation exercises it end-to-end, **and**
2. the design has survived **recorded** adversarial review — recorded in the ledger, by an identifiable reviewer, with the objections and their resolutions visible, so a third party can check what was challenged and how it was answered rather than taking the author's satisfaction on faith. A review that leaves no record does not count.
3. **Exception (specification-led promotion):** a direction MAY be promoted without an implementation where the design is additive, optional, and its absence changes nothing for existing artifacts. Such promotions MUST be marked as specification-led, and their implementation status MUST be tracked in `review.md` until closed.

External-integrator dependence is demoted from gate to **maturity marker**: each promoted item records whether one exists, and once the ecosystem has external integrators the marker returns to being the gate for further promotions — the original rule's intent, deferred rather than deleted.

## Promoted into v0.6

None has an external integrator yet (maturity marker: absent, ecosystem-wide).

| Direction (v0.5 name) | Landed as | Basis |
|---|---|---|
| Content Provenance | `protocol.md` → *Content Binding* (v1) | rule 1 + 2 |
| Content Binding Over Declared Fields | `protocol.md` → *Content Binding* (v2: `fields`, `required_fields`, `appliesTo`) | rule 1 + 2 |
| Disclosure is declared (default none) | `protocol.md` → *Receipt Disclosure Is Declared* | rule 1 + 2 (principle; mechanism activates with the first disclosure declaration) |
| Receipt lookup by content | `protocol.md` → *Receipt Lookup by Content* | rule 1 + 2 (was shipped with no spec text at all) |
| Identity Assurance (`self_declared` + `as_vouched`) | `protocol.md` → *Identity Assurance* | rule 1 + 2 |
| Read Authorization | `protocol.md` → *Read Authorization* | rule 1 + 2 — **partially specification-led**: three MUSTs are ahead of the implementation; see `review.md` status notes for the non-conformance register |
| **Portable Tool-Gating Binding** | **resolved by promotion**: the existing manifest schema *is* the portable binding format — `manifestVersion: "1"`, closed and versioned transform vocabulary, the "reference Gatekeeper's shape is canonical" line retracted (`protocol.md` → *Tool-Gating Manifests*) | rule 1 + 2 |
| Profile Immutability tightening | `protocol.md` → *Profiles* (no annotation exemption) | rule 2 (the rule change; the four prior violations are deviation D1 in `review.md`) |
| Owner co-signatures | `protocol.md` → *Owner Mandate Signatures* (`HAP-mandate`, `HAP-approval`, `owner_mandates`, `binding` axis, key-bearing signing DIDs) | **rule 3 — specification-led**: additive, optional, absence changes nothing for existing artifacts; implementation tracked as P1–P5 in `review.md` |
| Authority Remains with the Decision Owner (mandate vocabulary) | `protocol.md` → *Roles* → *Authority, Mandate, Capability, Execution*; invariant second sentence | rule 2 (vocabulary; no implementation applicable) |
| The Authority Server Cannot Check Itself | `governance.md` → *Trust Model* | rule 2 (invariant; obliges the tracked audit in `review.md`) |
| **Complete Mediation** (new in v0.6 — not a v0.5 direction) | `governance.md` → *Invariant 10* and *Deployment Security Profile*; `protocol.md` → *What HAP does not secure*, *No Executor Trust*, *When the trigger cannot be the control point* | rule 2, plus a partial reference implementation — the production release verifier already enforces most of the receipt-demanding conditions |

Also normative, surfaced by implementation audit rather than carried as v0.5 directions: `requiredFor` on context constraints, `scopeKind` on context fields, the read-window precedence rule, `subjects`/`proposalId`/`approvalSignature`/`contentHash`/`contentBinding` receipt fields, four new error codes, and Identity & Authorization rule 6 (no caller-supplied owner DID). Full wire detail: `protocol.md` → *Migration from v0.5*.

## Renames and terminology

- Role name: the v0.5 documents were already clean of "Service Provider"; one residual example artifact (`uuid-assigned-by-sp`) fixed.
- The owner-signed object is `HAP-mandate` (draft name `HAP-commitment` rejected — "commitment" already names the gate and `commitment_mode`); the field is `owner_mandates`, the axis is **mandate assurance**.
- `signing_surface` values name roles, not vendors: `gatekeeper_local` | `as_web` | `wallet_display`.
- The four-term glossary (authority / mandate / capability / execution) is normative vocabulary; "grant"/"authorization" are recorded as informal names for an attestation-backed mandate.

## Corrections to the record

**A v0.5 passage was lost in condensation and is restored here.** The v0.5 ledger contained the sharpest statement in the project of why an unrestricted trigger cannot be the control point — written for the deploy work, and the origin of what v0.6 now calls receipt-demanding execution. It did not survive the reorganization of the ledger into this document and `review.md`. It returns in `protocol.md` → *Gatekeeper & Executor Behavior*, generalized past the deploy case. Recorded rather than silently reinstated, because a specification that quietly drops and restores its own reasoning has no way to notice when it happens again.

**"No Executor Trust" previously assigned liability where it owed a requirement.** v0.5 said an executor that ignores the receipt requirement "acts outside HAP — and is liable." That is true and insufficient: it converts a security precondition into a blame allocation. v0.6 states the requirement first and keeps the liability as its consequence.

## Retired in v0.6

**Decision Streams.** Linking attestations into verifiable per-project chains. Carried as a direction since v0.3; its own v0.5 entry set the test — *"v0.6 will re-review; if no integrator has asked by then, this direction retires."* No integrator asked; no reference implementation ever existed. Retired; the `decision-streams@0.1` companion-spec registration is withdrawn. The design record remains in the v0.5 archive; it can return as a fresh proposal if a use case materializes.

Every v0.5 direction appears in exactly one v0.6 bucket: promoted (above), open (`review.md`), or retired (here).

## Review record

The recorded adversarial review behind this version, per rule 2 (external advisor, August 2026, three rounds):

1. **Owner co-signature design rounds** (pre-fold, recorded in the design history): profile placement of the requirement, key-continuity limits, intent coverage, multi-owner semantics, key loss as an attack vector, nonce overclaim (self-caught, generalized into the invariant), `public_key` prohibition, `alg`/DID precedence, `signing_surface` as declaration. All resolutions are in `protocol.md` → *Owner Mandate Signatures*.
2. **Spec-draft round** — five findings, all accepted and fixed: the `eudi` normative-vs-deferred contradiction (resolved: the value is normative, wallet integration is deferred); the approval-signature MUST with no schema field (`approvalSignature` added); the `resolved_owners` / signing-DID hole (resolved *against* the suggested pairing field — an AS-recorded pairing is an AS-side check — a co-signing owner is recorded by their key-bearing DID itself); missing receipt-path error codes (`APPROVAL_SIGNATURE_REQUIRED`/`INVALID` added); approval `content_hash` undefined without a content binding (defined as JCS of the proposal argument set, third-party-checkable only with a binding).
3. **Ledger round** — five findings, all accepted: the 0.6/0.7 framing ambiguity (resolved by this changelog/review split); the promotion rule's self-certification weakness (rule 2's recording requirement added); the specification-led contradiction (rule 3 added); the undefined verifier-policy surface for non-gateway relying parties (new open item in `review.md`); `signing_surface` and Portable Tool-Gating missing from the ledger buckets (both placed).
4. **Security round** — the objection was that HAP risked claiming containment without making its reference-monitor assumption part of the security model. Resolved by Complete Mediation (above). A second pass found three defects in the first draft of that work, all fixed before it landed: the deployment profile's credential and executor clauses were written from the path-exclusivity case and forbade receipt-demanding effectors outright — the better of the two strategies the same document introduced; receipt-demanding execution was unconditioned, so a signature check alone could have claimed the invariant; and Gatekeeper isolation named a topology ("a separate process at minimum") where it owed a property. A fourth item was found while verifying that review: the choice between the two strategies is not free, since receipt-demanding execution requires an effector you control or one that has adopted the protocol.
