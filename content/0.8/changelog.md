---
title: "Human Agency Protocol — v0.8 Changelog"
version: "Version 0.8"
date: "October 2026"
status: "Non-normative — record of change (draft)"
description: "What changed from v0.7 to v0.8: twelve ledger directions promoted on implementation evidence, two promoted specification-led, the details the ledger left open and how they were pinned, the deviation rules restated, closed, and added, and the review record behind each. Forward-looking material lives in review.md."
---

This document is the backward-looking record of v0.8: what was promoted into the binding surface, under which rule, on the strength of which recorded review and which implementation evidence, what was retired, and what was found while writing it. The forward ledger — open directions and deviation rules — is `review.md`. Implementation status is in neither (`governance.md` → *Reference Conformance* → *Implementation reports*).

## What v0.8 is

v0.8 is the **first version written from use**. v0.7 was published on 2026-09-03 and the reference implementation switched to its wire on 2026-10-09. Between the two dates and for five weeks after, fifteen entries were added to the v0.7 ledger — each found in a demo, a gated release, a team setup, or an audit of a live Authority Server's stored data, each with a stated direction, and twelve of them built end to end before this text was drafted. v0.8 promotes what was built and reviewed, pins the four details the ledger had left open in the shape the implementation chose, and adds two things no one has built, because the public ticket page has been a standing violation since v0.7 and only they close it.

It is **additive on the wire**. No field is renamed or retired; every new signed field is optional or conditional; a v0.7 Gatekeeper keeps working against a v0.8 Authority Server through version negotiation. The substance is behavioural — what the Gatekeeper and the Authority Server are now required to do — and most of it is written down after the fact. That order is the one the promotion rule was designed for.

One sentence summarises the release: **the ticket now names the request it answers, admits one execution, and never required the Authority Server to read what the action contained.**

## The promotion rule (unchanged from v0.6)

A direction is promoted when (1) a reference implementation exercises it end-to-end **and** (2) the design has survived recorded adversarial review; or (3) specification-led, where the design is additive, optional, and its absence changes nothing for existing artifacts — marked as such and tracked in `review.md` until closed. External-integrator dependence remains a maturity marker (absent, ecosystem-wide). The rule text and its rationale are in the v0.6 changelog.

## Promoted into v0.8

None has an external integrator yet (maturity marker: absent, ecosystem-wide). Dates are the day the ledger entry was written and the day the reference implementation exercised the direction end to end; the code is not named here (*Implementation status left the specification*, v0.7 changelog).

| Direction (v0.7 ledger title) | Landed as | Basis |
|---|---|---|
| Scope values must not travel in the execution context | `protocol.md` → *Ticket Request Schema*, rules 7–8; *Validation Steps*, step 11; *Privacy Invariant* | rule 1 + 2 — ledger 2026-09-04; implemented before the v0.7 wire switch (allow-list of `boundType.of` fields on every AS call); reviewed in the 2026-10 ledger round. **Ledger gap pinned:** the ledger's "plus any field a declared content binding requires" contradicted *Content Binding* ("the AS receives only the hash, never the content") and is corrected: a binding contributes the hash and the declaration, never a value |
| One execution per ticket | `protocol.md` → *One execution per ticket* (Gatekeeper conformance); *Enforcement classes* | rule 1 + 2 — ledger 2026-09-04 after a double execution in a gated release; durable execution journal, replay-as-recovery, per-proposal serialization built and tested end to end in September 2026. **Ledger gap pinned:** the escape hatch "unless the profile or manifest declares the action idempotent under its ticket id" is dropped — no such declaration exists and an undeclared declaration is the hazard the manifest rules forbid |
| A ticket names the request it answers | `protocol.md` → *Ticket Payload Schema*, `idempotencyKey` + rule 4; *Pre-flight Ticket Request*; code `TICKET_REQUEST_MISMATCH` | rule 1 + 2 — ledger 2026-09-04; the AS copies the key and the Gatekeeper refuses a mismatch and a stale timestamp since the v0.7 wire switch (2026-10-09); tested end to end |
| Per-transaction bounds must be able to require their value | `protocol.md` → *Bounds Schema*, rule 8 | rule 1 + 2 — ledger 2026-09-30; both enforcement points refuse an absent value since early October 2026; adopted by five published profiles. **Ledger gap pinned:** the ledger did not say where the key goes; every profile placed it *inside `boundType`*, beside `of` — the specification pins that placement and refuses it elsewhere |
| A profile can restrict the commitment modes of its mandates | `protocol.md` → *Commitment Modes*, rule 8; code `COMMITMENT_MODE_NOT_ALLOWED` | rule 1 + 2 — ledger 2026-10-05; the AS refuses an unlisted mode and two published profiles declare `["review"]`. **Two ledger gaps pinned:** no error code was named — one is; and `review_above_cap` "counts as its own mode" left a contradiction with the group mechanism that issues an `automatic` request as `review_above_cap` — resolved by the rule that `automatic` admits it and `review` alone does not |
| The owner's disclosure choice can be standing | `protocol.md` → *Identity Assurance* → *Standing disclosure choice*; `governance.md` → *Invariant 2* wording | rule 1 + 2 — ledger 2026-10-06 after 27 of 29 tickets in a run lost the owner's name; AS-side setting live since 2026-10-06 |
| A profile can declare a maximum for a bound | `protocol.md` → *Bounds Schema*, rule 9 | rule 1 + 2 — ledger 2026-10-06; AS refusal and the first declaring profile (`reporting@0.2`, `read_max_age_days.maximum: 366`) shipped the same week |
| Group roles: who may grant, who approves above the cap | `protocol.md` → *Group roles, approval count, and hard caps*; *AS Group Configuration*; `above_cap_approvals` in mandate and projection; codes `GROUP_CAP_EXCEEDED`, `APPROVAL_IMPOSSIBLE`, `PROPOSAL_APPROVERS_INVALID` | rule 1 + 2 — ledger 2026-10-14 from a team of ten; grantor gate, approval count, proposer exclusion, hard caps, and the `automatic` → `review_above_cap` promotion built mid-October 2026. The specification keeps the ledger's rule 6 (the count is signed) and adds the rule the review found missing: the decider set comes from the signed mandate, never from the caller |
| A group can cap reads and capability switches | `protocol.md` → *Read Authorization* → *Group ceilings*; *Bounds Schema*, rules 10–11 (enum order, `enforcedBy`) | rule 1 + 2 — ledger 2026-10-14; hard caps on Gatekeeper-enforced and `enum` bounds, and the Gatekeeper reading up to the signed value in a team, built mid-October 2026. **Ledger gap pinned:** the ledger's "sign the group cap into the mandate as a ceiling" would have been a second signed field; the implementation needed none, because the AS refuses to sign above the cap and the signed value *is* the ceiling. The simpler shape is specified; it also gives `enforcedBy: "gatekeeper"` — in published profiles since v0.6 — its first definition. The enum order is stated as every published profile already has it (most permissive first); the ledger's `gates` declaration is not promoted (below) |
| The Authority Server never sees what an action contains | `protocol.md` → *Proposals — what the Authority Server receives*; *Privacy Invariant*; `proposalContentHash` in the ticket; codes `PROPOSAL_NOT_ENCRYPTED`, `PROPOSAL_CONTENT_MISMATCH`; `governance.md` → *Invariant 4*, companion note | rule 1 + 2 — ledger 2026-10-12 from a demo run; content encrypted to its readers, fingerprint compared at ticket time, decisions carrying the fingerprint, "encrypted for another device" — built in the second week of October 2026. The fingerprint's copy into the *signed* ticket (ledger rule 3 said "bind by fingerprint") is specified as the rule requires, although the implementation compared without signing; see *Found while writing* |
| System data on an approval surface | `protocol.md` → *Content Binding* → *What may be shown next to what is bound* | rule 1 + 2 — ledger 2026-10-13; three-origin display (sealed / from the system / the AI's claim), read time, re-read before execution, built the same week |
| What was shown can be bound to the decision; the request an action answers | `protocol.md` → *Content Binding* → *The request an action answers, and binding what was shown*; *Tool-Gating Manifests*, rule 5 extended | rule 1 + 2 — ledger 2026-10-14; the agent's reference labelled as the agent's, gateway-read history on declared keys, `shown_hash` per decider, built 2026-10-14 → 10-20. The rule that a reserved key enters neither the content binding nor the Executor's call is the review's addition |
| "Gateway" appears in normative text without a definition | editorial — ten occurrences replaced by the defined term each stood for | editorial, not a promotion — no requirement changes; ledger 2026-09-10; landed with the vocabulary item below, as the ledger asked |
| Owner Interface, approval surface, and the local custody domain | `protocol.md` → *Roles* (three rows replace *Local App*); *Approval surfaces* | rule 3 — specification-led: a remote approval surface is optional, and an implementation without one is unaffected; tracked in `review.md` until one exists. Undated in the ledger; written now because the proposal-content work gave it its first case (a remote surface that must verify before it shows) and because the "gateway" fix needed to know what *Local App* becomes. Device enrolment stays open |
| **Dual-signed public ticket projection** | `protocol.md` → *Public ticket projection — `HAP-ticket-projection`*; vector `ticket-projection` | **rule 3, specification-led.** Targeted v0.7, slipped to v0.8 for a dependency v0.7 then supplied (`disclose_fields`, `issuer`). Not implemented. Promoted anyway, on the record: it is additive and optional, a vector pins its bytes, and the public ticket page's "valid" indicator has been a stated v0.7 violation for seven weeks that nothing else closes. Tracked in `review.md` until an implementation serves it |
| **Verifier policy for external relying parties** | `protocol.md` → *Owner Signatures* → *Verifier policy — `HAP-verifier-policy`*; code `POLICY_UNMET` | **rule 3, specification-led**, landing with the projection as the ledger asked. A declarative document with one failure code per line; never sent to the AS |

**Found by the implementation and not in the ledger — recorded and, where it changes a rule, promoted:**

- **Revocation by membership change.** Joining or leaving a group MAY revoke the member's mandates under it (built 2026-10-11, decided the same day). v0.7 allowed revocation by the owner or a group admin only. One sentence in *Revocation*, plus a rule that every revocation record names its cause.
- **Outcome after the ticket.** A failed execution keeps its consumption (decided 2026-10-14). One rule: cumulative state counts issued tickets, never outcomes (*Execution Context Schema*, rule 6). Reporting outcomes to the AS at all stays open (`review.md`).
- **Agent-prepared mandate requests.** A non-normative sentence under *Human-Gated Actions*, so the pattern is not read as agent-assigned authority.
- **AS-signed decision records.** One row in *Enforcement classes*: an AS signature over an approval it recorded is the AS vouching for the AS, and MUST NOT be presented as the owner's approval.
- **`mandateId` on the ticket request.** Two mandates of one owner can share a `bounds_hash` (a revoked one and its replacement — the reason v0.7 added `mandateId` to the ticket), so an AS resolving a ticket request by the hash alone has to guess. v0.8 lets the request name the mandate, with the hash as a mandatory cross-check. This retires a listed v0.7 non-conformance by legitimising the shape the implementation needed, which is the right outcome when the specification's own text concedes the ambiguity.

## Pinned where the ledger left a detail open

Each of these is a place where the ledger stated a direction, the implementation had to choose a detail to build it, and v0.8 pins the implemented choice because it was reviewed and because a second implementation would otherwise choose differently:

1. `requiredFor` lives **inside `boundType`** on a bound (beside `of`) and inside `constraint` on a scope field — in each case next to the thing it qualifies.
2. A profile that lists `automatic` admits `review_above_cap`; one that lists only `review` does not. The condition is the actions *below* the caps.
3. The group read ceiling is the **signed bound value itself**; no second field. The AS refuses to sign above the cap and refuses the field's omission where a cap exists.
4. A content binding contributes **the hash and the declaration** to the ticket request, never a field's value (the ledger sentence that said otherwise is corrected).
5. The one-execution rule has **no idempotent-action escape hatch**.
6. Error codes for every promoted refusal: `COMMITMENT_MODE_NOT_ALLOWED`, `GROUP_CAP_EXCEEDED`, `APPROVAL_IMPOSSIBLE`, `PROPOSAL_CONTENT_MISMATCH`, `PROPOSAL_NOT_ENCRYPTED`, `PROPOSAL_APPROVERS_INVALID`, `TICKET_REQUEST_MISMATCH`, `POLICY_UNMET`. The reference implementation emitted several of these conditions under non-canonical names; those are implementation work for its report, not specification text (the v0.7 advisor round made the same ruling).
7. **The read cap applies in every mode.** The ledger capped reads at the signed value in group mode only, which needs a signal the Gatekeeper cannot read from the mandate. v0.8 caps at the signed value of an `enforcedBy: "gatekeeper"` bound in every mode; in personal mode the owner raises it by re-signing (*Read Authorization* → *Group ceilings*, rules 2–3).
8. **`review` in a group carries the above-cap rule.** The ledger promoted only `automatic` requests, so a grantor choosing `review` approved above the group's cap alone. v0.8 signs the group's above-cap fields on a `review` mandate too (*Group roles*, rule 7).
9. **Required owners are a third role.** Splitting grantors from approvers left the multi-owner coverage rule pointing at a list that no longer existed. v0.8 names *required owners* — default none beyond the granting owner (*Group roles*, rule 8).

## Deviation rules

- **D1 — in-place profile edits** is **restated**: the v0.7 text grandfathered four mutations; the profiles' own history shows seven more published versions edited in place, all before 2026-08-03 and none since. The rule is unchanged; the grandfather clause now reads "every in-place edit before 2026-08-03", with the list left to the git history where it already is.
- **D2 — the field-name fallback for cumulative bounds** is **closed for v0.8 mandates**: a v0.8 mandate names a profile version that declares `appliesTo`, so no enforcement point may select a cumulative bound by field name for one. For live v0.7 mandates the v0.7 condition still governs until they expire.
- **D3 — scope enum values in `field.enum`** is **new**. Every published profile with enum scope fields still places allowed values in the top-level `field.enum` that v0.5 retired; none uses `constraint.values`. The v0.5 MUST stands. D3 grandfathers the published versions and requires each profile's next version to move the values. Re-admitting `field.enum` was considered and rejected: two read locations for one declaration is the kind of ambiguity the `boundType` rule exists to forbid.

## Found while writing

Writing v0.8 against the running implementation found eight places where the implementation and the ledger disagreed. Each is listed in the implementation's own report in the specification's terms; none changed the specification, and they are recorded here only as the fact that the review happened and what kind of thing it found. Three of them touched rules with a security consequence — what travels to the Authority Server, where the decider set comes from, and what is signed — and the text of those rules is stated more plainly in v0.8 because of it.

The lesson is the one the v0.7 changelog already recorded for `appliesTo`, now with a sharper edge: a ledger entry written the day a thing is built is an invitation to build *the entry*, and the implementation will meet it in its own words. Where the implementation's words were better — `requiredFor` inside `boundType`, no second ceiling field — the specification adopted them. Where they were not, it did not.

## Not promoted, with reasons

- **`gates` on enum bounds** (ledger, group caps item, rule 4) — not built; stays in `review.md`.
- **Attachments by reference** — two published profile versions bind attachment fingerprints and declare attachment sources, with no specification text and no recorded review. Recorded in `review.md` as an open direction with a ledger entry rather than written into v0.8 on one implementation's say-so.
- **The owner-signature curve** (P2) — no P2 work in this version; the decision stays with whoever starts it.
- **Device enrolment and revocation** for remote approval surfaces — the open half of the vocabulary item; stays in `review.md`.
- **Outcome reporting to the Authority Server** — only the rule that outcomes never release consumption is normative; the report itself is open.
- **A profile's name is its area** (ledger, 2026-10-17) — reached the ledger after this text was drafted, with no recorded review; carried in `review.md`.

## Retired in v0.8

**The role name *Local App*** — replaced by *Owner Interface*, *approval surface*, and *local custody domain*. **The word *gateway*** in normative text — ten occurrences replaced. **The ledger's idempotent-action escape hatch** on the one-execution rule — dropped, never defined. **The v0.7 sentence** that a public projection is "a tracked direction, not a v0.7 guarantee" — replaced by the projection.

## Considered and rejected

- **A second companion specification for proposal content** (`proposal-disclosure@0.1`) beside `intent-disclosure@0.1`. One construction with two names is the drift the single-vocabulary release removed; the core section applies the companion's cryptography and says so.
- **Re-admitting `field.enum`** — see D3.
- **Making `gates` a SHOULD before it is built** — a SHOULD nobody has implemented is a sentence, not a rule.
- **Deciding the P-256 question in this version** — nothing in v0.8 depends on it.
- **A wire-breaking v0.8** — nothing promoted needed a rename, and an additive version lets v0.7 and v0.8 implementations keep working together through version negotiation.
- **Treating the workspace model** (an account is personal *or* in one team) as protocol — the v0.7 worked example of one person in two groups remains conformant; the implementation's restriction is policy.

## Review record

The recorded review behind this version, per rule 2:

1. **Ledger round** (the v0.7 `review.md`, 2026-09-04 → 2026-10-14, thirteen commits): each promoted direction was carried there with a stated finding, a direction, a conformance test, and a target, and each was built against that entry before promotion. The entries are reproduced in substance in `protocol.md` and summarised in the table above; the two 2026-10-14 entries (group roles; group caps) were reviewed together and merged on 2026-10-15.
2. **Implementation review** (2026-10-27 → 10-28): a read of the reference implementation — Gatekeeper, core library, Authority Server, and every published profile — against v0.7 and the ledger, by a reviewer who had not written either; findings as described under *Found while writing*; the proposed scope, the pinned details, the deviation rules, and ten questions put to the author. The author's decisions on all ten are reflected above (one core section; sign the fingerprint; `mandateId` on the request; the three terms; `gates`, attachments, and the curve stay open; D3; promote the projection and the policy specification-led).
3. **Author's adoption** (2026-10-28): accepted as proposed.
4. **Draft review** (2026-10-28): an independent read of the whole v0.8 draft — text, ledger and vectors — for contradictions, gaps and security consequences of the new text. Three blockers and twenty-three further findings. Resolved in the text: required owners named as a third role; `review` in a group carries the above-cap rule; the decider set is exactly the signed approvers, never narrowed; `HAP-approval` names its approver (`approver_did`) and a ticket carries above-cap approvals as `approvalSignatures`; a ticket verifier rejects any object carrying `typ`; one review-path flow; an idempotency key on every request without a proposal; replays exempt from the freshness check; `APPROVAL_IMPOSSIBLE` defined against approvers who can no longer decide; D2 closed for v0.8 mandates only; scope values removed from every example and vector.
5. **External reviews** — two rounds, before publication. *Pending.*

Every v0.7 direction appears in exactly one v0.8 bucket: promoted (above), open (`review.md`), or retired (here).
