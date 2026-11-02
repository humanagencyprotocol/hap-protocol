---
title: "Human Agency Protocol — Conformance Vectors (v0.8)"
version: "Version 0.8"
date: "November 2026"
status: "Normative data"
description: "The published answer key for a HAP implementation: canonical bounds and scope hashes, payload signatures under a published test key, profile hashes, and the refusals an implementation MUST produce. Checkable offline, with no server, no store, and no identity system."
---

These files are the checkable part of *"you can implement this protocol."* They turn the parts of the specification where silent disagreement is fatal into questions with published answers.

They are **normative data**. Where a vector and an implementation disagree, the implementation is wrong — unless the vector is shown to contradict `protocol.md`, in which case both are fixed and the change is recorded in `changelog.md`. A vector's value is not a fact about the reference implementation; it is a fact about the protocol.

## The five sets

| File | Answers | Why it matters |
|---|---|---|
| `profile-hash.json` | *"This published profile has exactly this `profile_hash`, however it was formatted on disk."* | The hash is over the JCS serialization of the parsed document, so two parties who provisioned the same profile through different channels agree — or refuse each other for a real reason, not a trailing newline. v0.8 adds three profiles that declare the new fields: `commitment_modes`, `maximum`, and `requiredFor` inside a `per_transaction` bound. These cases test the hash, not the profile: they are published documents as they are, some in pre-v0.7 vocabulary, and are not claimed to satisfy every v0.8 profile rule. |
| `canonical-bounds-and-scope.json` | *"These limits, in this order, produce exactly this string and this hash."* | A one-character disagreement means nothing either party signs will ever verify against the other. Carried unchanged from v0.7: no result changed (v0.8 writes down rules the cases already followed — LF between records and none after the last, `null` as no value). |
| `payload-signatures.json` | *"This payload, with this published key, produces exactly this signature."* | Pins key ordering, string escaping, number formatting, `null` handling and signature encoding together — for the mandate, the synchronous ticket (now carrying `idempotencyKey`), the review-path ticket (`proposalId`, `proposalContentHash`, `approvalSignature`), the owner's projection (plain and `review_above_cap`, whose caps, approvers and **count** are conditional projection fields), an approval (now carrying `approver_did` and `proposal_content_hash`), a **co-signed mandate** carrying two signatures from different parties, the **public ticket projection** `HAP-ticket-projection`, and one **canonicalization edge-case** payload that exercises what the protocol objects never reach — escapes, non-ASCII, keys ordered by UTF-16 code units, the ECMAScript number forms. The owner's projections now carry the owner-signed `binding`, `signing_surface` and `subjects_disclosed`, and the bounds, scope, profile and execution-context hashes inside a payload are real values from this set (the intent hash and the proposal fingerprint in the signature cases remain placeholders; `proposal-encryption.json` computes a real fingerprint). Every `version` is `"0.8"`, so no v0.7 signature is reused. |
| `required-refusals.json` | *"In this situation you MUST refuse, with this code."* | The set that matters most: refusal is where the safety lives. v0.8 adds the refusals for a mode the profile does not admit, a value above a declared maximum, a bound above a hard group cap, a required value absent, a proposal in the clear, a caller-supplied approver list, a ticket that answers another request, every proposal state, a negative or non-numeric value a bound reads, a reader set that differs from the signed deciders — and a new table for proposal submission. |
| `proposal-encryption.json` | *"This argument object, under these fixed keys, encrypts to exactly these bytes."* | New in v0.8: the encryption of proposal content is mandatory on the review path, so two implementations that cannot read each other's proposals cannot interoperate at all. Pins the HPKE mode, the empty `info` and associated data, the IV ‖ ciphertext ‖ tag layout and the encodings, with the content key, IV and ephemeral keys fixed so the output is reproducible. |

## How to use them

1. Feed each case's inputs (`key_order` + `values`, or `payload`) to your implementation.
2. Compare your canonical string to `canonical`, byte for byte, **before** comparing hashes — a mismatch there tells you *where* you diverged, while a hash mismatch only tells you *that* you did.
3. Compare your hash or signature to `hash` / `signature`.
4. For `must_refuse` and the refusal tables, confirm your implementation refuses **and** returns that exact code. Returning a different code — including a more generic one — is non-conformance: the Gatekeeper's behaviour branches on the code (`protocol.md` → *Pre-flight Ticket Request*).
5. For `fail_closed_situations`, confirm the required behaviour. Several v0.8 rows are Gatekeeper-side and produce no wire code at all (one execution per ticket; scope values never sent); they are listed because a suite can still exercise them.

Everything here is offline. No endpoint is named, because the specification deliberately defines none: a conformant Authority Server may share no URL with the reference one, so a suite that speaks HTTP to fixed paths cannot be pointed at it. What is portable is data.

The files carry data only, deliberately — no checker in any language, so that no implementation's behaviour is smuggled in as the definition.

## The test keys

`payload-signatures.json` uses the published Ed25519 test keys from **RFC 8032 §7.1** — vector 1 as the Mandate Owner, vector 2 as the Authority Server. Their seeds are in the file. They are public test keys and **MUST NOT** be used for anything real.

Two keys rather than one, because a single key would have hidden a mistake worth catching: the mandate's `issuer` field names the AS key's own `did:key`, so a verifier resolves the verifying key *from the artifact* and the vector fails if the wrong key signed it. Ed25519 is deterministic, so any correct implementation reproduces these exact signatures.

Three chains run through the cases, and the chains are the point:

- `mandate-cosigned` carries the owner's signature inside a payload the AS then signed, and that inner signature is byte-identical to the standalone `mandate-projection` case — because the projection is *reconstructed from the mandate's own fields*, never fetched.
- `ticket-payload-review` carries the owner's approval signature as `approvalSignature`, byte-identical to the `approval` case, and its signed bytes are reconstructible from the ticket and the mandate it names: `typ` and `version`, `proposalId`, `mandateId`, the mandate owner as `approver_did` (from the mandate), `action` and `action_type` from `action` and `actionType`, `decided_at`, `nonce`, `decision` `"commit"`, `proposal_content_hash` from `proposalContentHash`, and as `content_hash` also `proposalContentHash` — `charge@0.5` declares no content binding; where one applies to the action it would be `contentHash`.
- `ticket-projection` copies its public fields from `ticket-payload-review` and its `owner` entry from `mandate-cosigned`; the owner entry verifies only against the mandate, which the projection says plainly.

An implementation that reproduces the cases separately but cannot rebuild one from another has the bytes right and the mechanism wrong, which is the failure the chains exist to catch.

## What these vectors cannot prove

Stated so they are not oversold. Vectors prove agreement on **bytes** and on **refusals**. They cannot prove **sequence**:

- that the ticket was obtained *before* execution, rather than after;
- that cumulative state is counted correctly across many calls;
- that a revoked mandate stays revoked over time;
- that one ticket produced exactly one execution (new in v0.8 — a Gatekeeper claim about its own behaviour).

Those are claims about a running system, and they still need a live suite.

## Provenance

**Provenance.** The v0.8 values were computed by one freshly written implementation — Ed25519 from the RFC 8032 reference algorithm, checked against RFC 8032's own published vector, and an RFC 8785 serializer checked against the ECMAScript number forms — which first reproduced **every** v0.7 signature and the v0.7 profile hash byte for byte before producing anything new. `proposal-encryption.json` was produced with one HPKE library and recomputed by a second implementation written from RFC 9180. On 2026-10-29 the set was **re-derived from the specification text by an independently written implementation** in another language, sharing no code — its own RFC 8785 serializer, its own bounds and scope canonicalizer, its own HPKE — and every value agreed, the encryption envelope included; earlier states of the set had been re-derived three times and by both external reviewers. The second external round then changed the approval (it now signs `action` and `action_type`), and with it the `approval` and `ticket-payload-review` signatures; on 2026-10-30 the complete set was re-derived once more, over the final text, by a fifth independent implementation, and every one of its 868 values agreed. The set was published with v0.8 on 2026-11-02, unchanged from that re-derivation.

Carried from v0.7 unchanged: the canonical-bounds-and-scope cases and the `charge@0.5` profile hash, whose published values were reproduced here as the self-test.
