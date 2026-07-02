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

## Portable Tool-Gating Binding

HAP profiles define the **abstract** side of a consequential action — the bounds schema, context schema, `actionTypes` registry, and required gates (`protocol.md` → *Profiles*). The **concrete** side — how a specific tool invocation's arguments map onto those abstract fields — is left to the implementation. `protocol.md` assigns that job to *"`actionType` and the tool-gating manifest,"* and the *Example Integration Topology* that performs it (*"the Gatekeeper maps the tool arguments into a profile-defined execution context"*) is explicitly **non-normative** — HAP Core specifies "not the surrounding transport or identity choices."

That scoping is deliberate, but it carries a cost the transport/identity disclaimers do not: **the argument→field mapping is enforcement-critical.** Whether an email tool's `to` array maps to `recipient_count` (a count transform) or to `allowed_domains` (a domain-extraction transform) decides *which bound a call is checked against*. Get it wrong and the Gatekeeper enforces the wrong constraint — a security outcome, not a plumbing choice. Today that mapping lives only in a vendor-specific manifest (the reference implementation's `toolGating.executionMapping`, with an ad-hoc transform vocabulary), so:

- two HAP-conformant Gatekeepers, given the same profile and the same MCP tool, MAY gate it differently — or one incorrectly — and both remain conformant; and
- a gated integration built for one implementation does **not** port to another. HAP's receipts are portable; the **gating that produces them is not.**

This also sits in tension with the protocol's own principle that *"context-specific bindings belong in profiles."* The profile carries the abstract binding; the concrete binding it references lives nowhere normative.

**Forward direction.** Define an optional, normative **binding descriptor** — a minimal, portable schema mapping a named tool's arguments onto a profile's bounds/context fields, plus its consequential/read classification, using a fixed, versioned transform vocabulary:

```json
{
  "tool": "send_message",
  "profile": "email@0.5",
  "consequential": true,
  "actionType": "send",
  "map": {
    "to": [
      { "field": "recipient_count", "transform": "count" },
      { "field": "allowed_recipients", "transform": "identity" },
      { "field": "allowed_domains", "transform": "domains" }
    ]
  }
}
```

Where it should live is the open question, and it forks on *"bindings belong in profiles"*:

1. **In the profile** — the profile ships a normative binding for a canonical tool shape. Honors the principle and maximizes portability, but couples profiles to specific tool schemas, which the abstract profile deliberately avoids.
2. **A standalone binding artifact** — versioned like a profile and referenced by both, so profiles stay tool-agnostic while the binding becomes a first-class, portable, verifiable object. Clean abstraction at the cost of a new artifact type.
3. **Explicitly out of scope** — keep it implementation-defined (status quo), but make the disclaimer *deliberate and reasoned* in `protocol.md`: state plainly that portable, consistent gating of a given tool is **not** a HAP guarantee, so relying parties do not assume it.

Any transform vocabulary MUST be closed and versioned — mirroring the `boundType.kind` rule that already forbids inferring enforcement semantics from field-name patterns. An open or string-eval'd transform set would reintroduce exactly that "infer enforcement from names" hazard.

**Status.** One reference implementation exists (the gateway's `toolGating`), but no external integrator yet depends on a portable format, so under the promotion rule above this stays a future direction. It is, however, the highest-leverage open item for HAP's *"any compliant Gatekeeper"* claim: unlike the other entries here, leaving it unspecified weakens the **enforcement** guarantee itself, not an optional feature.

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

## Identity Assurance (targets v0.6)

`resolved_owners` records a Decision Owner as a bare DID — pseudonymous by design. Identity Assurance adds an optional, **signed** overlay so an authorization (and the receipts and content footers it produces) can carry the owner's **verified real-world identity**, gated by *how* that identity was verified. It extends `protocol.md` → *Identity & Authorization* (identity ≠ authority); the `eudi` method below *is* the *Owner co-signatures* direction above.

### Levels, methods, trust root

Two display levels; at `high`, two trust roots:

| Field | Values | Meaning |
|---|---|---|
| `assurance` | `low` \| `high` | `low` → no name shown; `high` → the name MAY be shown |
| `method` | `self_declared` \| `as_vouched` \| `eudi` | how identity was established |
| `trust_root` | `self` \| `as` \| `external` | **who** vouches — the load-bearing field |

- **`self_declared`** (`low`/`self`) — the owner typed a name. Never disclosed.
- **`as_vouched`** (`high`/`as`) — the **AS operator** verified the owner. Valid only within the operator's own trust domain.
- **`eudi`** (`high`/`external`) — an external eID (EUDI wallet); AS-independent, carries the owner's own signature.

### Signed `subjects` block

When identity is disclosed, the attestation carries a signed `subjects` array (one per owner); the receipt copies the disclosed subset so it self-verifies:

```json
"subjects": [{
  "did": "did:key:…",
  "assurance": "high",
  "method": "as_vouched",
  "trust_root": "as",
  "verifier": "did:web:suveren.ai",
  "disclose": { "name": "Andreas Schadauer" },
  "verified_at": 1735900000,
  "owner_signature": null
}]
```

Validation: `disclose.name` only when `assurance:"high"`; `as_vouched ⇒ trust_root:"as"` + `verifier`; `eudi ⇒ trust_root:"external"` + `owner_signature`; `low ⇒ no disclose`.

### Two orthogonal knobs

**Assurance** (how verified — a property of the credential) is separate from **disclosure** (whether the name is attached to a given authorization — opt-in, default off). `high` *permits* the name; the owner still *chooses* to attach it.

### Domain-scoping (conformance)

> An AS MAY issue `method:"as_vouched"` (`high`) **only** for subjects within its own trust domain. For any subject outside that domain, `high` MUST come from an external root (e.g. EUDI). An AS MUST NOT self-vouch `high` for an external subject.

### Credential binding

Identity is **not re-verified per attestation.** Verification is a one-time event that attaches the assurance record to the authenticated **credential (API key)**; each attestation **stamps** the `subjects` block from that credential's *current* record at issuance. So revocation/expiry need no re-verification (the next attestation reflects the change), and a key minted from a stronger auth session can carry a higher assurance than a weaker one for the same account. A bearer key carrying `high` is a sensitive credential — which is why the strongest root (`eudi`) binds to a **per-event owner signature**, not a bearer key.

### Disclosure in footers

The owner's name appears **only at `high`**, derived from the signed `subjects` block:

- `low` → "Sent by an AI agent via «operator»" — **no name**.
- `high`/`as_vouched` → "Sent by an AI agent of «name», verified by «operator»".
- `high`/`eudi` → "…of «name», identity verified (EUDI)".

`«operator»` renders the actual `verifier`, never a hardcoded brand — a different AS operator self-vouches under its own name. The verify page always shows the method and trust root so a relying party can weigh operator-asserted vs externally-verified identity.

### Status

`self_declared` + `as_vouched` are the v0.6 baseline. `eudi` (per-session wallet signature → `owner_signature`) is a forward method that also delivers the *Owner co-signatures* hardening above. Additive and backward-compatible: an attestation with no `subjects` renders as `low`.
