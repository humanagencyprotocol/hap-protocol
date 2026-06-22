---
title: "Review"
version: "Version 0.5"
date: "June 2026"
status: "Non-normative — future directions"
---

This document collects v0.5 material that is **specified but not required for conformance** — future directions, optional extensions, and topics deferred to a later version. A v0.5 implementation MAY implement any of these without losing conformance, and MAY skip all of them without losing conformance. It is kept as a dedicated document to keep `protocol.md` focused on the binding protocol surface.

The decision rule for promoting a future direction into the binding surface is: at least one reference implementation exercises it end-to-end **and** at least one external integrator depends on it. As of v0.5, only Content Provenance has a reference implementation (Suveren's `records`/`customers`); none has a dependent external integrator, so none is promoted.

---

## Output Provenance

For deployment-style profiles (`ship`, `provision`, `deploy`), it can be useful to bind the attestation to an observable output — a deployed URL, an artifact, a configuration state.

Profiles MAY define an `output_ref` field in the **context schema**. Because `output_ref` is part of context, it is hashed into `context_hash` and signed; the binding between attestation and output location is therefore cryptographic. After execution, outputs MAY carry provenance metadata (`attestation_id` + `bounds_hash`, optionally an AS endpoint and receipt IDs). Verification flow:

1. Read provenance metadata from the output.
2. Fetch the attestation through the AS's third-party verification endpoint (see `protocol.md` → "Verification API for Third Parties").
3. Verify the attestation signature.
4. Verify `output_ref` in the attested context matches the output's actual location — this is the binding step; without it an `attestation_id` on an output is just a claim.
5. Optionally fetch receipts to verify the execution chain.

Output Provenance is a useful design pattern for deployment-style profiles. The deploy profile is not yet shipped in `hap-profiles`; when it ships, expect Output Provenance to be promoted into that profile's normative surface — not into HAP Core. Profile-bound features stay profile-bound.

## Content Provenance

Output Provenance binds an output's **location**. Some profiles produce content with no stable address — an email body, a published post, a CRM record, a database row. **Content Provenance** is the ephemeral-content analog: it binds the **bytes** instead, for those profiles.

A profile MAY declare a `content_binding` block — `{ "version": "1", "kind": "jcs" | "text", "pre_footer"?: bool }`. When present, the Gatekeeper computes a `content_hash` over the action's content and includes it in the receipt **request**; the AS copies it verbatim into the signed receipt **payload**. The AS receives **only the hash, never the content** — so Content Provenance preserves HAP's privacy-minimal design (the AS sees hashes, never plaintext).

Canonicalization is normative and versioned — a verifier MUST pin `content_binding.version`:

- `kind:"jcs"` — RFC 8785 JCS of the record payload → `sha256`. For structured writes (records, CRM), which have no single content field; the whole payload is the content.
- `kind:"text"` — UTF-8 of the auto-detected content field after Unicode NFC, LF line endings, trailing per-line whitespace stripped, and trailing blank lines removed; taken **pre-footer** when `pre_footer` is set. For communicative profiles (email, publish, calendar).

Receipt additions, both OPTIONAL (omitting them is fully conformant):

- request: `content_hash` (Gatekeeper → AS).
- payload: `content_hash` + `content_binding` (signed by the AS).

Verification: recompute the hash from the held or stored content using the receipt's `content_binding`, compare to the signed `content_hash`, and verify the receipt signature. A match under a valid signature proves the AS attested that **this exact content** was authorized under these bounds at this time. It does **not** prove real-world identity (account-level only), nor catch edits made outside Suveren — those surface only as a gap between the signed content and the live artifact, never prevented.

Like Output Provenance, Content Provenance lives in the relevant **profiles** (`records`, `customers`, then `publish`, `calendar`, `email`) — **not in HAP Core**. Core only gains the optional signed receipt fields that profiles MAY populate. Promotion follows the same rule (a reference implementation exercises it end-to-end **and** an external integrator depends on it); Suveren's `records`/`customers` implementation satisfies the first condition.

## Decision Streams

Individual attestations are snapshots. For public accountability and project history, attestations MAY be linked into a verifiable chain. Each attestation MAY optionally belong to a decision stream:

```json
{
  "stream": {
    "project_id": "hap-protocol",
    "sequence": 12,
    "previous_attestation_hash": "sha256:..."
  }
}
```

| Field | Purpose |
|-------|---------|
| `project_id` | Groups attestations into a project |
| `sequence` | Order within the stream (starts at 1) |
| `previous_attestation_hash` | Links to prior attestation (null for first) |

If implemented, `stream` MUST be part of the **signed** attestation payload (otherwise an AS could rewrite history) and any verifier consuming the stream MUST validate the `previous_attestation_hash` chain.

The use cases that motivate decision streams (public project histories, regulatory audits of multi-step decisions) have not surfaced in any reference implementation since v0.3. v0.6 will re-review; if no integrator has asked by then, this direction retires.

## Resilience to a Compromised Authority Server

v0.5's threat model treats the Authority Server as **trusted to sign honestly and to enforce cumulative bounds, revocation, and approval** (see *Trust Model* in `governance.md`). The local Gatekeeper is the floor: it re-derives `gate_content_hashes` from locally-held content and enforces per-transaction bounds and context constraints, so a misbehaving AS cannot make an Executor run an action whose intent/context/bounds the human never authored locally. It can, however, over-authorize authorities the human *did* create (exceed cumulative caps, ignore a revocation, skip required approvals) and — because the human does not co-sign — it can fabricate authorization artifacts attributed to a Decision Owner. Hardening HAP against a fully compromised AS is a forward direction, not a v0.5 guarantee:

- **Owner co-signatures.** Have the Decision Owner sign the attestation (or a commitment over its bounds/context/intent/mode) with their own key, so authorization is non-repudiable independent of the AS — and approvals are owner signatures rather than AS assertions. Highest-leverage: removes the AS's ability to forge authority, skip approvals, or flip commitment mode.
- **Transparency log.** An append-only, independently auditable log of signed attestations and receipts, so a user can detect equivocation, forged authorizations under their DID, ignored revocations, or cumulative-cap violations.
- **Approver public-key authenticity.** Under companion spec `intent-disclosure@0.1`, intent confidentiality holds against a passive AS and any interceptor, but the approver public keys used to wrap the content key are served by the AS unauthenticated and are not bound into the signed attestation. An actively malicious AS could substitute an attacker key and read intent (detectable after the fact, but already leaked). Bind the approver→pubkey map into the signed payload, or sign/pin the key directory.
