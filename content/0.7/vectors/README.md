---
title: "Human Agency Protocol — Conformance Vectors (v0.7)"
version: "Version 0.7"
date: "September 2026"
status: "Normative data — draft"
description: "The published answer key for a HAP implementation: canonical bounds and scope hashes, payload signatures under a published test key, and the refusals an implementation MUST produce. Checkable offline, with no server, no store, and no identity system."
---

These files are the checkable part of *"you can implement this protocol."* Until they existed, the answer to *"am I conformant?"* was: read 2,300 lines of specification, implement it, and hope. The vectors turn the parts where silent disagreement is fatal into questions with published answers.

They are **normative data**. Where a vector and an implementation disagree, the implementation is wrong — unless the vector is shown to contradict `protocol.md`, in which case both are fixed and the change is recorded in `changelog.md`. A vector's value is not a fact about the reference implementation; it is a fact about the protocol.

## The four sets

| File | Answers | Why it matters |
|---|---|---|
| `profile-hash.json` | *"This published profile has exactly this `profile_hash`, however it was formatted on disk."* | The hash is over the JCS serialization of the parsed document, so two parties who provisioned the same profile through different channels agree — or refuse each other for a real reason, not a trailing newline. |
| `canonical-bounds-and-scope.json` | *"These limits, in this order, produce exactly this string and this hash."* | A one-character disagreement means nothing either party signs will ever verify against the other — and it stays invisible until two implementations meet. |
| `payload-signatures.json` | *"This payload, with this published key, produces exactly this signature."* | Pins key ordering, string escaping, number formatting, `null` handling and signature encoding together — for the mandate, the ticket, the owner's projection (plain and `review_above_cap`, whose caps and approvers are conditional projection fields), an approval, and a **co-signed mandate** carrying two signatures from different parties, whose case walks the whole chain. |
| `required-refusals.json` | *"In this situation you MUST refuse, with this code."* | The set that matters most: refusal is where the safety lives. It is also the only set expressible with no reference to any URL, store, or identity system. |

## How to use them

1. Feed each case's inputs (`key_order` + `values`, or `payload`) to your implementation.
2. Compare your canonical string to `canonical`, byte for byte, **before** comparing hashes — a mismatch there tells you *where* you diverged, while a hash mismatch only tells you *that* you did.
3. Compare your hash or signature to `hash` / `signature`.
4. For `must_refuse` and the refusal tables, confirm your implementation refuses **and** returns that exact code. Returning a different code — including a more generic one — is non-conformance: the Gatekeeper's behaviour branches on the code (`protocol.md` → *Pre-flight Ticket Request*).

Everything here is offline. No endpoint is named, because the specification deliberately defines none: a conformant Authority Server may share no URL with the reference one, so a suite that speaks HTTP to fixed paths cannot be pointed at it. What is portable is data.

The files carry data only, deliberately — no checker in any language, so that no implementation's behaviour is smuggled in as the definition. The reference core library is required to consume these files in its tests rather than carry its own copies; `review.md` records how far that has got.

## The test keys

`payload-signatures.json` uses the published Ed25519 test keys from **RFC 8032 §7.1** — vector 1 as the Mandate Owner, vector 2 as the Authority Server. Their seeds are in the file. They are public test keys and **MUST NOT** be used for anything real.

Two keys rather than one, because a single key would have hidden a mistake worth catching: the mandate's `issuer` field names the AS key's own `did:key`, so a verifier resolves the verifying key *from the artifact* and the vector fails if the wrong key signed it. Ed25519 is deterministic, so any correct implementation reproduces these exact signatures.

Two of the cases deliberately chain. `mandate-cosigned` carries the owner's signature inside a payload the AS then signed, and that inner signature is byte-identical to the standalone `mandate-projection` case — because the projection is *reconstructed from the mandate's own fields*, never fetched. An implementation that reproduces both cases separately but cannot rebuild one from the other has the bytes right and the mechanism wrong, which is the failure the pair exists to catch.

## What these vectors cannot prove

Stated so they are not oversold. Vectors prove agreement on **bytes** and on **refusals**. They cannot prove **sequence**:

- that the ticket was obtained *before* execution, rather than after;
- that cumulative state is counted correctly across many calls;
- that a revoked mandate stays revoked over time.

Those are claims about a running system, and they still need a live suite. The vectors move the checkable surface from *"read the specification and hope"* to *"here are the answers"* for the parts where a silent disagreement is fatal. They do not make the protocol self-certifying.

## Provenance

Published with v0.7, before a second implementation exists — because afterwards it is much harder to say whose bytes are correct. Every value in the 2026-09-03 morning files was computed, then re-derived by an independently written implementation (a different language, no shared code, Ed25519 from the RFC 8032 reference algorithm and checked against RFC 8032's own published vector) before publication; a third, separately written implementation then reproduced all of them during the second external review. The same day's revision (ticket `mandateId` and `limits`, the `review_above_cap` projection, the profile-hash set, the refusal rows) was computed by that third implementation and cross-checked against the unchanged cases; it has not yet had its own second-language re-derivation, and the record says so until it has.
