---
title: "Human Agency Protocol — Review and Future Directions"
version: "Version 0.5"
date: "August 2026"
status: "Non-normative — future directions"
description: "Non-normative v0.5 material: optional extensions and future directions an implementation may adopt or skip without affecting conformance."
---

This document collects v0.5 material that is **specified but not required for conformance** — future directions, optional extensions, and topics deferred to a later version. A v0.5 implementation MAY implement any of these without losing conformance, and MAY skip all of them without losing conformance. It is kept as a dedicated document to keep `protocol.md` focused on the binding protocol surface.

The decision rule for promoting a future direction into the binding surface is: at least one reference implementation exercises it end-to-end **and** at least one external integrator depends on it. Several directions below now satisfy the first condition — Content Provenance, Portable Tool-Gating Binding, Read Authorization and Content Binding Over Declared Fields each report a reference implementation in their own Status paragraphs. **None has a dependent external integrator, so none is promoted.** The second condition is the binding one, and it is the condition no amount of implementation work satisfies on its own.

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

## Public Receipt Verifiability — the redaction/signature gap (future direction)

The public receipt view (`/r/<id>`) deliberately redacts private fields
(`userId`, `cumulativeState`, `limits`, recipients, the full attestation hash)
**and the signature itself**. Because a single Ed25519 signature covers the
whole receipt, a verifier cannot re-check it while any signed field is hidden —
signing is all-or-nothing. Consequence: the public page's "Signature Valid" is
the AS re-verifying *its own* signature on each load; it is **not** independently
checkable from the public page alone.

Full zero-trust verification is available only to the **holder** of the complete
signed receipt (e.g. the recipient of an email, or the issuer's own execution
log): (1) obtain the full receipt incl. signature; (2) pin the AS public key
(`/api/as/pubkey`); (3) strip the signature, JCS-canonicalize the rest;
(4) Ed25519-verify; (5) recompute `content_hash` from the held content and
compare. For a **private** action the holder is the party that matters, so the
claim holds. For a **public** artifact (a published post) "everyone is the
holder," yet the public page can't be independently verified — that is the gap.

Two ways to close it, increasing cost:
- **Dual-sign a public projection** — the AS separately signs a public-only
  object `{id, timestamp, profileId, actionType, contentHash, contentBinding,
  identity, issuer}` and exposes it with its signature. Independently verifiable,
  zero private leakage. Pragmatic; ~half a day + a `verifyPublicReceipt` helper.
- **Selective-disclosure signatures** (BBS+ / signed Merkle-root-of-fields) —
  sign once, reveal any subset with proofs. General (also covers opt-in bounds
  disclosure) but substantial crypto work.

Not required for the current launch: the in-browser content verifier proves the
content matches the signed fingerprint, and campaign copy is scoped to "matches
the signed fingerprint," not "verify with zero trust in the operator." Dual-sign
is the fast-follow that makes the public claim airtight.

### Receipts consumed by a machine verifier (new in the deploy work)

The section above assumes a **human** reading a receipt page. The deploy domain
introduces a second consumer, and it changes the requirements.

To stop an agent bypassing the Gatekeeper — dispatching a pipeline directly with
`gh workflow run`, or with any credential lying around on a developer machine —
the **pipeline itself must refuse to run without a valid receipt**. The trigger
cannot be the control point, because trigger access cannot be fully restricted;
only whether pulling it achieves anything. That makes the pipeline a second
Gatekeeper at the true execution boundary, and it makes the receipt a **bearer
proof presented to a third party**.

Every existing integration is different: the Gatekeeper requests a receipt and
then performs the downstream call *itself*. The receipt never leaves. Nothing has
previously had to survive being handed to someone else.

Three consequences the protocol does not currently address:

1. **Replay.** Idempotency exists (a stable key per logical call, so a retry
   after a hidden failure returns the original receipt rather than counting
   twice) but that is retry-dedup, not replay defence. A receipt presented twice
   to an external verifier is a different problem. Content binding contains most
   of it — replaying a receipt redeploys the *same* commit, a no-op — but an old
   receipt could force old, possibly vulnerable, code back into production.
   Minimum: a **validity window**. Stronger: a spent-receipt record the verifier
   can consult, or a nonce bound at issue time.

2. **Scope fields must be verifiable, not merely disclosed.** A machine verifier
   needs to check that the receipt authorises *this* repository, environment and
   pipeline. Those live in `executionContext`, which the public projection
   redacts — so today a receipt for staging cannot be distinguished from one for
   production by the party enforcing the boundary. Any dual-signed public
   projection should therefore include the **execution-context fields the profile
   marks as disclosable**, not only `contentHash`. This is the same selective-
   disclosure need as above, arriving from enforcement rather than transparency.

3. **Disclosure becomes a per-grant decision.** A public artifact (a website
   deploy from a public repository) wants full disclosure — repository names and
   environments are not secrets, and the proof is the point. A private
   deployment wants the opposite: prove that *someone with authority approved a
   deploy*, revealing neither repository nor commit. That is the existing
   content-verifiable vs authority-verifiable split, and it argues for the owner
   choosing per grant rather than a single global projection.

**Direction.** Dual-signing a public projection remains the pragmatic first step
(above), extended so the projection carries profile-designated execution-context
fields and an explicit validity window. Selective-disclosure signatures remain
the general answer.

### Disclosure is declared, and silence means nothing is revealed

The requirements above pull in opposite directions. A machine verifier needs to
see the environment a deploy was authorised for; an email receipt must never
reveal who was written to. Both are receipts, and today one global projection
serves them.

Resolving that by widening the projection would make every existing profile
worse to serve the newest one: turning on execution-context disclosure for
deploy would start publishing recipients on email receipts. A new requirement
must never degrade the profiles that did not ask for it.

> **Principle.** A profile — and, where finer control is wanted, a grant —
> DECLARES which execution-context fields a receipt may disclose publicly. The
> default is **none**. Absence of a declaration is never permission.

This is the same fail-closed reading applied elsewhere in this document: an
unset read window denies rather than permitting everything; an undeclared read
governance denies rather than proxying. Disclosure follows the same rule, so the
protocol is consistent about what silence means.

Consequences:

- **Existing profiles are unaffected by construction.** They declare nothing, so
  they disclose nothing, and their privacy is exactly what it is today.
- `email` keeps recipients private permanently — that is not a limitation to be
  removed later, it is the correct setting.
- `publish` may disclose more freely: the artifact is public, so the content
  fingerprint and platform reveal nothing not already visible.
- `deploy` against a **public** repository may disclose repository, environment
  and pipeline — none is secret, and the verifier needs them.
- `deploy` against a **private** repository discloses none of it, and its
  receipt proves only that someone with authority approved a deploy.

The last two are the same profile with different disclosure, which is why the
declaration belongs on the grant as well as the profile: the owner is the one
who knows whether the target is public.

Stated for the reader rather than the implementer: **you decide whether a
receipt proves only that you approved something, or exactly what you approved.**

**Not a launch blocker for deploy.** The commit binding is the check that
actually prevents an unapproved release, and it works within what is already
exposed. The environment gap is presently theoretical for a deployment target
with a single environment — but it must not be described as closed.

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

Like Output Provenance, Content Provenance lives in the relevant **profiles** (`records`, `customers`, then `publish`, `calendar`, `email`) — **not in HAP Core**. Core only gains the optional signed receipt fields that profiles MAY populate. Promotion follows the same rule (a reference implementation exercises it end-to-end **and** an external integrator depends on it); Suveren's `records`/`customers` implementation (extended to `email`/`publish` with `kind:"text"` in July 2026) satisfies the first condition.

## Profile Immutability vs. Additive Annotations (deviation note — tightening targets v0.6)

The normative rule is stated three times (`protocol.md` "Profiles", "Profile
Constraints" rule 3, "Governance"; `governance.md` "Profile Governance"): once
published, a profile version is immutable — changes require a new version.

The reference implementation has deviated from it twice: `content_binding` was
added **in place** to the published `records@0.4`/`customers@0.4` (June 2026)
and then, following that precedent, to `email@0.4`/`publish@0.4` (July 2026).
No version bump, no re-attestation of existing grants.

Why the deviations were tolerable in practice:

- The **authority contract** the human signed — bounds schema, gates, context
  constraints, TTL — was untouched; existing attestations verify unchanged.
- Receipts are **self-contained**, so a profile mutation can never rewrite
  history — it only changes what *future* receipts carry.
- `content_hash` is OPTIONAL in the receipt surface; its absence or presence
  breaks no verifier.

Why they are still wrong: an annotation that changes what future receipts
**publicly expose** is a behavior change. For `email`, adding `content_binding`
changed the privacy posture of already-signed grants — a public hash of a
private body admits confirmation-of-guess on low-entropy content — without the
grant being re-signed. "Immutable except for annotations" is not immutable;
rule 3's examples (`boundType`, context constraints) were misread as an
exhaustive list of what forces a bump.

Tightening proposed for v0.6: **any** field change to a published profile
version — including additive, OPTIONAL, or annotation-class fields — requires
a new profile version. There is no annotation exemption; whether a field
touches the authority contract or only the receipt surface, it changes what
operating under the profile *means*. The four in-place mutations above are
grandfathered and documented here; implementations SHOULD treat them as the
last of their kind.

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

## The Authority Server Cannot Check Itself (invariant — targets `governance.md` in v0.6)

Several limitations recorded in this document have the same shape, and stating the shape once is worth more than restating the limitation each time it recurs:

> **An AS-side *check* is not a defence against the AS.**
> **An AS-*signed artifact held by another party* is evidence a compromised AS cannot retroactively alter.**

Both halves are load-bearing, and the second is the one that stops the first from proving too much.

The first half retires a class of decorative control. If the only thing standing between a claim and its abuse is the Authority Server validating that claim, then against a compromised Authority Server nothing stands there at all. A requirement the AS records, a uniqueness check the AS performs, a key directory the AS serves — each is a control that holds against an honest operator and evaporates against a dishonest one. That is not a reason to remove them; it is a reason not to describe them as defences against the operator.

The second half is why receipts are worth anything. An AS-signed artifact does not *prevent* a malicious operator. But once it is signed and in someone else's hands it cannot be rewritten, which is precisely why receipts outlive attestations (`protocol.md` → *Receipts Outlive Attestations*): expiring or revoking an authorization does not erase the record of what happened under it. Evidence and prevention are different properties, and the AS can supply the first without being trusted for the second.

**What the invariant already catches in this document.** Cumulative bound enforcement is an AS-side check, and the section immediately below concedes exactly that ("it can over-authorize authorities the human *did* create"). The approver public-key directory (below, third bullet) is a second instance: keys served by the AS, unauthenticated, not bound into the signed payload. Neither observation is new — but they were reached separately, and a reader currently has no way to see that they are the same finding twice.

**Consequence, and the item it creates.** Adopting the invariant requires auditing everything the specification currently describes as "enforced" and separating the two properties: what holds only against an honest AS, and what holds against a later-compromised one. That audit is substantial and is tracked as its own item; it does not gate stating the invariant. It must, however, actually be tracked — an invariant with no audit behind it is the same decorative control it was written to eliminate.

**Normative home.** This belongs in `governance.md` alongside the Trust Model, not in a subsection of whichever feature surfaced it. It is recorded here first because it generalizes well beyond any single direction below, and because the owner co-signature work depends on it: co-signature exists to move authorization out of the class the first half describes and into the class the second half describes.

## Resilience to a Compromised Authority Server

v0.5's threat model treats the Authority Server as **trusted to sign honestly and to enforce cumulative bounds, revocation, and approval** (see *Trust Model* in `governance.md`). The local Gatekeeper is the floor: it re-derives `gate_content_hashes` from locally-held content and enforces per-transaction bounds and context constraints, so a misbehaving AS cannot make an Executor run an action whose intent/context/bounds the human never authored locally. It can, however, over-authorize authorities the human *did* create (exceed cumulative caps, ignore a revocation, skip required approvals) and — because the human does not co-sign — it can fabricate authorization artifacts attributed to a Decision Owner. Hardening HAP against a fully compromised AS is a forward direction, not a v0.5 guarantee:

- **Owner co-signatures.** Have the Decision Owner sign the attestation (or a commitment over its bounds/context/intent/mode) with their own key, so authorization is non-repudiable independent of the AS — and approvals are owner signatures rather than AS assertions. Highest-leverage: removes the AS's ability to forge authority, skip approvals, or flip commitment mode.
- **Transparency log.** An append-only, independently auditable log of signed attestations and receipts, so a user can detect equivocation, forged authorizations under their DID, ignored revocations, or cumulative-cap violations.
- **Approver public-key authenticity.** Under companion spec `intent-disclosure@0.1`, intent confidentiality holds against a passive AS and any interceptor, but the approver public keys used to wrap the content key are served by the AS unauthenticated and are not bound into the signed attestation. An actively malicious AS could substitute an attacker key and read intent (detectable after the fact, but already leaked).

  The remedy must be read against the invariant above, which rules out the obvious half of it. **An AS signature over its own key directory is no defence** — that is the AS vouching for the AS. **Binding the approver→pubkey map into the signed attestation is worth doing but is not sufficient**: it makes *later* substitution detectable, while an AS that is already malicious at issuance simply signs the attacker's key into the payload. What actually holds is a key the verifier does not receive from the AS at all — pinned out of band, or carried in an independently resolvable identifier.

  That points at the same answer reached for owner signing keys (key-bearing DIDs), but it does not transfer for free: these are **encryption** keys used to wrap a content key, whereas the `did:key` used elsewhere in this specification carries an Ed25519 **signing** key. Closing this properly requires either an identifier that carries an X25519 key or a defined derivation from the signing key — a decision not to be taken casually, and one this document should record rather than assume. Open.

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

## Read Authorization: Age Windows, Overrides & Resource Scope (targets v0.6)

v0.5 profiles may declare **read bounds** (`email@0.4`: `read_max_age_days`, `read_daily_max`) and **read scope** (`allowed_recipients`, `allowed_domains`), but the *binding semantics* of read authority were left implicit — and a reference Gatekeeper initially enforced none of them, letting an agent read any message once any email authority existed. This proposal specifies how read authority binds. It extends `protocol.md` → *Bounded Execution*. It is **not** Identity Assurance (§ above): that binds the **Decision Owner's real-world identity** into the *signed attestation*; this concerns purely local, unsigned read enforcement by the Gatekeeper. Reads remain **receiptless** — no consequential action, no receipt — so everything here is Gatekeeper-local; enforcement is broader than receipting.

> **Supersedes** the earlier *Correspondent Coverage & Identity* proposal. That design derived a `correspondent(message) = participants − ownIdentities` set and denied reads no authority covered, which required a per-connector account-identity subsystem (discovered + human-declared "this is also me" identifiers). Two findings retired it. First, a *per-authorization* read window is **unenforceable as specified**: nothing maps an inbound item to a particular grant, so where several grants overlap the strictest window silently collapses to the most permissive — the UI would promise a limit the engine cannot keep. Second, the identity layer's failure mode is **silent and asymmetric**: one forgotten self-address over-covers, i.e. leaks, and nothing surfaces it. The model below drops identity entirely and keeps the capability that motivated it.

### Read policy binds to the integration, not the grant

A conformant Gatekeeper SHOULD evaluate read authority as **one policy per integration**, derived from the authorizations that enable its read tools, with two knobs:

- **Default age window** — the floor applying to *every* item. Unset ⇒ unlimited; `0` ⇒ read nothing by default.
- **Per-correspondent overrides** — a list of `identifier → window`, each **≥ the default**. Overrides may only *raise* a window, never lower it.

```
applicableWindow(item) =
    max( defaultWindow,
         { override.window | override.identifier matches some participant of item } )

read permitted  ⇔  age(item) ≤ applicableWindow(item)
```

Normative consequences:

- Because overrides only raise, the default is a **guaranteed floor** and a multi-party item never yields a conflict — the most permissive applicable window applies.
- An override is a **positive membership test** ("is this identifier among the participants?"). It requires no notion of *self*, hence no identity store, no discovery recipe, and no self-subtraction.
- The **only** denial reason on the read path is **age**. There is no coverage denial: a read is never refused because no grant "reaches" a correspondent.
- Restrictive intent ("only read mail involving X") is expressed as `default = 0` plus higher overrides — the same mechanism at a lower floor, not a separate feature.
- Where several authorizations enable the same integration's reads, the effective default is the **most permissive** among them, and an implementation SHOULD surface it as a single effective number rather than implying a stricter grant is constraining reads when it is not.

**Stated limit.** Matching is ANY-of-participants, not all-parties: an item on which an overridden identifier appears alongside others becomes readable at that identifier's window. This is an **age-tuning** model, not a confidentiality wall; it MUST NOT be presented as "the agent can never see X's correspondence." A true confidentiality guarantee would require the retired coverage design.

### Two kinds of scope

A context field's meaning on the read path is not uniform. Profiles SHOULD mark each context field:

```jsonc
"allowed_recipients": { "format": "email", "scopeKind": "counterparty" },
"allowed_calendars":  { "format": "string", "scopeKind": "resource" }
```

- **`counterparty`** — names the *other party* to a communication or transaction (email `allowed_recipients`, calendar `allowed_attendees`, purchase `allowed_vendors`). Matched against the item's participant list.
- **`resource`** — names *which container the item belongs to* (`allowed_calendars`, publish `allowed_platforms`, customers `contact_type`). A direct attribute match.

Absent an explicit `scopeKind`, an implementation MAY infer `counterparty` from `format: email|domain` (transitional; explicit is normative).

### Resource scope MUST bind reads

A resource scope names a container the authority may act within. Where an implementation enforces such a scope on writes, it **MUST** enforce the same scope on reads of the same resource. Enforcing it on one side only produces the incoherent posture that an excluded container is *unwritable yet fully readable* — the agent cannot add an event to a calendar it can read in full.

This is the cheapest of the read mechanisms: a subset membership test on an argument the call already carries, requiring no date parsing and no participant extraction, and reusing the mapping the write path already declares. A conformant Gatekeeper MUST reject a read whose resource argument falls outside the granted subset, and MUST fail closed where the target resource cannot be determined.

Containers are not only calendars. A mailbox's folders/labels, a drive's shared drives, a workspace's projects are all resource scopes, and a **container allowlist is the preferred way to exclude a class of untrusted content** — notably a mail provider's spam/junk container. An allowlist is default-deny by construction, so an excluded container needs no rule of its own; a denylist ("do not read spam") is a special case that must be written, remembered, and kept in step with each provider's naming.

Correspondingly, where a provider exposes an argument that *widens* the container set (e.g. an `includeSpamTrash`-style flag, or a caller-supplied label list), that argument is the **Gatekeeper's to set, not the agent's**. A conformant Gatekeeper MUST NOT pass an agent-supplied resource-widening argument through unvalidated, and MUST NOT rely on a provider's permissive-by-omission default. Relying on a provider default is not enforcement: it holds only until the agent supplies the argument, and typically does not apply to fetch-by-id at all.

### Identifier matching

Override and scope identifiers are compared against values the connector supplies. Semantics MUST be fixed by the implementation and identical across providers, or the same policy yields different results on Gmail and Microsoft Graph:

- Comparison is **case-insensitive**; identifiers and extracted values are normalized (NFKC) before matching.
- Where a value carries a display name, matching is on the **address**, never the display-name text — display names are unauthenticated attacker-controlled data.
- Domain identifiers match **that domain exactly**; a subdomain is NOT matched by its parent (silent widening is worse than an explicit second entry).
- Which fields carry participants is **manifest data** (e.g. `From`/`To`), not protocol. Implementations MUST NOT match on message bodies or item content.

### Conformance: undeclared read governance is a denial

Read enforcement is driven by per-connector descriptors — a static gate, a read adapter, a resource mapping. A conformant Gatekeeper MUST NOT treat *absent* descriptors as *permitted*: a tool classified as a read that declares no applicable governance MUST be denied, or carry an explicit, recorded exemption. Absence of configuration is otherwise indistinguishable from absence of enforcement, and a connector silently bypasses the read model by omitting a declaration.

### Conformance: enforcement by construction must not be escapable

Where a Gatekeeper enforces read limits by injecting constraints into a provider **query** supplied by the agent (an optimization over post-fetch filtering), the injected constraints MUST be combined so the agent's own fragment cannot capture or cancel them. In a boolean query language a naive concatenation is insufficient — a fragment ending in a disjunction operator turns the intended conjunction into a union, and the limit stops binding. Implementations MUST bracket the agent-supplied fragment and MUST fail closed on a fragment that cannot be safely combined, rather than silently rewriting it. Query injection is an optimization; **post-fetch enforcement remains the normative baseline** and MUST NOT be omitted on the assumption that the query was constrained.

### Read enforcement is Gatekeeper-local — and that is the trust boundary

Consequential actions are checked **twice**: the Gatekeeper verifies locally, then the Authority Server enforces cumulative bounds and issues the signed receipt — so a Gatekeeper that ignored its own checks still cannot produce a receipt, and without a receipt the action does not run. Reads have no such second check. They are receiptless by design (no consequential action), so read enforcement is verified **only** by the local Gatekeeper, and no other party observes it.

The consequence should be stated rather than left implicit: **read bounds are a property of a trusted Gatekeeper build, not of the protocol.** A modified, misconfigured, or simply outdated Gatekeeper reads whatever the connector will return, and nothing in the system contradicts it. This is an accepted trade — reads are not the consequential act, and the acts that disclose what was read (send, publish) *are* receipted on the way out, so the boundary that matters is enforced where the data leaves.

**Design implication: read policy is local, live configuration — not a signed bound.** This follows the governing rule now stated in `protocol.md` (*Bounds, Context, and Read Policy*): **a limit lives in the same trust domain as its enforcement.** A send bound is checked by the signed receipt loop, so it must be attested — signing is how a relying party comes to trust it, and the bound is frozen for the life of the grant. A read limit is checked only by the local Gatekeeper over the owner's own data; there is no counterparty to prove it to, so an attested read window would be a signature no receipt ever verifies. The practical payoff is that read policy — the read-age window, the readable containers — belongs on the **integration**, as local settings the owner can edit in one place and have take effect immediately, rather than being frozen into each signed authorization. Authority to *act* is signed and per-grant; reach to *read* is local and live-editable. (The exception is the same one the protocol names: a read limit one party must enforce *against* another — a team admin capping a member's reach — re-enters the signed surface, because now there is someone who must trust it.)

**Possible future addition.** If read enforcement ever needs to be verifiable rather than merely performed, the options are, in increasing cost: (a) a **signed read policy** — the effective window/containers bound into the attestation, so a relying party can at least see what the Gatekeeper was *supposed* to enforce; (b) **denial reporting** — the Gatekeeper reports read denials to the Authority Server, making enforcement observable without recording what was read; (c) **read receipts** for a narrow class of high-sensitivity reads, accepting the latency and privacy cost of the Authority Server learning that a read occurred. (c) should not be adopted broadly: a complete read record is a metadata trail of everything the owner corresponds with, which is a privacy cost the current design deliberately avoids paying.

### Where it lives (portable)

- **Profile**: `scopeKind` per context field; the bound governing the read window (linked to the adapter's produced age field via `boundType.of`, not by field name). Provider-agnostic.
- **Manifest**: read adapters only — where participants and dates live, the resource argument mapping, and any query-injection template. Provider data. **No identity recipe.**
- **Gatekeeper**: generic evaluation — window resolution, positive override matching, resource subset test, query composition. No tool or profile literal.

A new provider (Outlook) reuses the profile and engine unchanged, supplying only its manifest adapters. A connector that cannot expose participants simply cannot offer overrides and falls back to the default window.

### Status

Reference implementation (Suveren gateway, `email`): the static read gate and age enforcement are landed and verified live against real Gmail; query-composition hardening is landed with adversarial tests. The read window is now a **local per-integration setting** as described above — live-editable, taking precedence over the signed `read_max_age_days` bound, which remains as a fallback so existing grants keep working; with neither set, reads still fail closed. Not yet built: per-correspondent overrides, resource scope on reads (calendar's `allowed_calendars` currently binds writes only), and default-deny for undeclared read governance. The first-cut coverage code from the retired design is superseded and pending removal. No external integrator depends on any of it → future direction under the promotion rule. It remains the highest-leverage open area on the *read* surface: unspecified, read authority is either unenforced or enforced against the wrong thing. Full design, UX, use cases and edge cases: `doc/read-authorization-identity-coverage.md`.

## Content Binding Over Declared Fields (targets v0.6)

Content binding has two modes, and neither is the general case. `kind:"text"` hashes a **single** field — one declared by the manifest, or auto-detected from a prose vocabulary. `kind:"jcs"` hashes the **whole** tool-argument payload. Binding several things therefore needs no new cryptography; what is missing is the ability to say *which* things.

### The gap is not theoretical: approved content, unapproved recipients

A profile that binds prose with `kind:"text"` binds the body and nothing else. The receipt then proves *"this text was approved"* — not *"…to be sent to these recipients."* An Executor may take approved wording and deliver it elsewhere, and the receipt still verifies: **a receipt that verifies while certifying something no one agreed to**, which is worse than no receipt, because it manufactures confidence. The same shape appears wherever an action has a payload beside its prose — an attached image on a publish, a payee on a charge, attendees on an invitation.

### Who verifies decides what may be bound

The obvious repair — bind the whole payload — fails on a question the mechanism does not currently ask: **who will verify this, and what will they be holding?**

A hash over the whole call is checkable only by a party that knows the whole call. A pipeline receiving a dispatch does know it. **An email recipient does not: they hold the body, the subject and their own address, but not `bcc`.** Binding the full payload does not merely overbind — it makes verification *impossible for the party the binding exists to serve*. Publish is stronger still: the verifier is the public, who sees the post and nothing else.

So `text` is too narrow and whole-payload `jcs` is too wide, and the general case is neither. **What is required is a declared subset**, chosen so that the intended verifier can reproduce it.

### Proposal: a declared field list

A profile MAY declare `fields` on its `content_binding` at `version:"2"`. The Gatekeeper constructs an object from exactly those keys and canonicalizes it by the declared `kind`. No new canonicalization is introduced.

Field ordering MUST NOT affect the hash (JCS sorts keys). Adding or removing a bound field changes every resulting hash and is therefore a **breaking** profile change requiring a version bump, not a silent edit.

`version:"1"` retains its current meaning exactly: `text` binds one field, `jcs` binds the entire payload. Existing receipts and verifiers continue to check unchanged.

Selecting the subset is a design act with a stated rule: **bind everything the approving human is shown, and nothing the intended verifier cannot see.** For a message profile that means recipients, subject and body, and deliberately *not* blind recipients — omitting `bcc` is what allows a recipient to verify at all.

#### Absence is sometimes a fact and sometimes a fault

An earlier draft of this entry required that any declared field absent at call time be treated as a configuration fault. Implementation showed that rule to be too blunt: a connector declares `cc` as an ordinary optional argument, and most messages legitimately carry none, so a literal reading refuses ordinary sends. The distinction the mechanism actually needs is between an absence that describes the world and an absence that means the call is not the call the profile thinks it is.

A profile therefore MAY declare `required_fields`, a subset of `fields`. An absent **optional** field is omitted from the hashed object; an absent **required** field MUST refuse the call. A value that is null, or empty after canonicalization, counts as absent — the two MUST NOT be distinguished, or the same message hashes differently depending on whether a connector sent `""` or nothing. If no declared field carries a value the call MUST be refused whatever `required_fields` says, because that hash would commit to nothing while reading exactly like one that commits to everything.

Omission is safe precisely because the field list is published with the receipt: a verifier holding a message with a `Cc` header knows `cc` is in scope and includes it, so a recipient added after approval still breaks the hash. The rule both sides follow is deterministic, and neither side needs to guess.

#### The binding covers actions, not whole profiles

A profile gates more than its content-bearing calls — `email` also gates deletes, which carry an identifier and no content. A field binding that applied to every gated action under the profile would refuse those, since the required fields are structurally absent.

A field binding therefore MAY declare `appliesTo`, using the same action-type vocabulary as a bound. It MUST be read **strictly**: an action type that is undeclared is NOT covered. This is deliberately the opposite of how a bound reads the same key, where an unknown action type enforces the bound — the two directions are not symmetric. An extra bound is a tighter limit; an extra content binding is a refused legitimate action. An implementation that finds a gated write with no declared action type under a content-binding profile SHOULD say so, because the receipt it issues will bind nothing.

#### Canonicalization inside the object

Every string entering the bound object — at any depth, including inside arrays — MUST be canonicalized by the `text` rule (NFC, LF, trailing per-line whitespace stripped, trailing blank lines removed) before serialization. This is not a new primitive; it is the existing `kind:"text"` rule applied per string rather than to one field, and it is what makes the binding checkable at all. The party verifying an email holds the **delivered** copy, whose body has CRLF line endings and transport-added trailing whitespace. JCS embeds strings verbatim, so without this rule the intended verifier could never reproduce the hash — the binding would be sound and useless.

Array order MUST be preserved: reordering recipients is a change worth catching, and no transport reorders them. Values MUST NOT be otherwise normalized — in particular, addresses MUST NOT be lowercased, since the local part is case-sensitive per RFC 5321 and this layer has no standing to make that semantic claim.

### Conformance: an identifier MUST have one spelling

A binding hashes an exact string, so two spellings of one value are two
bindings. For prose this never bites — nobody writes a body two ways by
accident. For an identifier it is the normal case: `https://x.app` and
`https://x.app/` name the same build and produce different hashes.

Where a profile binds an identifier rather than prose, its normal form MUST be
declared, and the Gatekeeper MUST apply it **before the value is shown for
approval** — not merely before hashing. Normalizing later would bind a string
the approver never saw, which is the failure the display rule above forbids.
Applied early, the value approved, the value bound, and the value a verifier
can later reproduce are one string.

The consequence of leaving this undeclared is worse than a mismatch. A receipt
that cannot be found reads as *no receipt exists*, so a trailing slash is
indistinguishable from an action that was never authorized at all. A mechanism
whose false alarm and true alarm look identical raises neither.

Normalization belongs next to the declaration that names the bound field — the
connector, where a profile is deliberately host-agnostic about which identifier
its artifact carries. Adding or changing a rule moves every hash it produced, so
it is a breaking change on the same footing as adding a bound field.

### Conformance: a bound value MUST survive transport

A binding is only worth something if the intended verifier can reproduce it from what they actually received. An implementation MUST NOT bind a field the transport will alter in delivery.

This is not hypothetical, and it was not found by reading the design. A live send bound a subject containing an em-dash; RFC 5322 headers are ASCII-only and the connector wrote raw UTF-8, so it arrived as `Ã¢Â€Â”` and the recipient could not reproduce the hash. Every layer behaved correctly — the receipt bound exactly what the human approved — and the check still failed.

**A false mismatch is worse than no binding.** A verifier who sees a mismatch on honest mail learns that mismatches are noise, and the next real one is dismissed too. A binding that cries wolf has negative value, and the failure is silent from the sender's side: the receipt looks perfect to everyone except the one party the binding exists to serve.

The repair belongs at the boundary, not in the binding. The value is hashed as approved and encoded for transport on the way out, in that order — encoding before hashing would bind the wire form and force every verifier to reproduce the transport's quirks instead of reading their mail. Which argument needs which encoding is declared by the connector; the encodings themselves belong to the engine, so a second connector with the same problem is a declaration rather than new code.

Implementations SHOULD assume this class of defect is present until a bound field has been verified against a genuinely delivered copy. Header encoding, line-ending rewriting, whitespace folding and Unicode normalization are all transport behaviours that a local test reproducing neither the transport nor the recipient will not reveal.

### Conformance: what is displayed MUST be what is bound

An implementation MUST NOT display, on an approval surface, a consequential parameter it does not bind; and MUST NOT bind a parameter it does not display. The two failures are distinct and both defeat the purpose. **Bound but not displayed** means the human committed to something never seen. **Displayed but not bound** means the Executor may alter it after approval, and the display was decoration — the reviewer's attention was spent on a value the receipt does not hold. Where another mechanism independently constrains a displayed parameter (a pipeline that checks the repository it is running in), that MUST be stated rather than left to coincidence.

This is a conformance requirement and not a presentation guideline. The protocol elsewhere concedes that it verifies commitment, not comprehension; that concession is only defensible if what was shown and what was signed are the same thing.

### Deferred: per-field commitments and selective disclosure

A single hash over a subset is all-or-nothing at disclosure time: proving one field means revealing all of them. Proving *"the environment was production"* without revealing the artifact requires a commitment per field plus a hash over those commitments.

That construction MUST NOT be adopted without a per-field random salt. Bound values are frequently short and drawn from small sets — an environment name, a currency, a rounded amount — and an unsalted per-field hash is recoverable by enumeration, turning a privacy-preserving commitment into a disclosure. A whole-object hash resists this incidentally; per-field hashes must do so deliberately.

This is the same design as *Disclosure is declared, and silence means nothing is revealed* above — **multi-field binding and selective disclosure are one problem**, which is reason enough not to improvise half of it. The declared-field list is the half that closes a live gap and introduces no new primitives; commitments follow when a case genuinely requires disclosing one field while withholding another.

### Status

Reference implementation (hap-core, Suveren gateway, Suveren Authority Server): `fields`, `required_fields` and `appliesTo` are landed, with the field list signed into the receipt and published on the verify page so a third party knows what the hash covers — a scope that were recorded but unsigned could be re-presented as narrower than it was. `email@0.5` is the first profile to adopt it, binding `to`, `cc`, `subject` and `body`, requiring `to` and `body`, and scoped to sends; `email@0.4` is retained unchanged, so grants issued against it keep their body-only binding and nothing needs migrating. The interactive verifier reconstructs the bound object from delivered values and shows the exact canonical bytes, because `fields` records the bound keys but not their JSON types and a wrong guess must be visible rather than surfacing as an unexplained mismatch.

Not yet built: `publish` (post text is bound, an attached image is not) and `deploy` (which adopts the mechanism once a case needs it — its unbound parameters are separately checked by the pipeline that consumes the receipt, which is the "stated rather than coincidental" case the conformance rule above demands). Also unbuilt: any enforcement of that conformance rule. It is currently a requirement an implementation can violate silently, and the live example is an approval surface that displays `bcc` while the binding deliberately omits it — defensible only because review-mode proposal matching independently pins the whole argument set, which is exactly the kind of second mechanism the rule says MUST be stated. Full analysis: `doc/content-binding-fields.md`.

## Authority Remains with the Decision Owner; Automation Executes Under Mandate (discussion, targets v0.6)

This specification already states that an agent carries no independent authority: it is an Executor, and every consequential call is checked against a grant it does not hold. Yet the vocabulary throughout says a human **delegates authority to** an agent, and that a grant is a **bounded authority** the agent **receives**.

Those cannot both be true. The wording concedes the thing the architecture refuses.

### The wording is what is wrong, not the design

The implementation is already correct. **No authority-bearing credential, attestation, or signing key is placed in the agent's possession.** The agent receives a brief describing its bounds — that much is transferred, and must be, or it could not stay inside them. What it never receives is anything it could present as proof of authority.

It requests execution; the Gatekeeper evaluates each consequential call against a mandate held elsewhere; execution may still be refused. There is no artefact an agent holds by which it could be said to carry authority.

So this is not a change of position. It is the vocabulary catching up with a design decision already made and already enforced.

### The claim, stated architecturally

A tempting formulation — *authority cannot be delegated* — is wrong and would not survive a lawyer. Conferring authority on an agent is what agency law is for.

An equally tempting repair — *an AI is not a legal person, so it cannot hold authority* — makes the protocol depend on a doctrine that may not hold everywhere or forever.

Neither is needed. The claim is about what this protocol models:

> **HAP does not model an automated system as an authority holder.** Authority remains with the accountable human or institution — the Decision Owner. The automated system executes under a bounded mandate issued under that authority.

If some jurisdiction later grants autonomous systems a legal status of their own, the security model is unchanged, because it never rested on their lacking one.

### Four terms, kept apart

**Authority** — the legitimate power to decide that a consequence may occur. Held by the Decision Owner, or by an institution through accountable humans. Not held by the agent.

**Mandate** — a bounded, revocable instruction issued under that authority, permitting a defined class of execution: scope, limits, context, expiry, commitment mode, approvers. An attestation records one.

**Capability** — what the agent can technically do through a tool or API, irrespective of whether it may.

**Execution** — one attempted consequence, evaluated against the mandate before it may run.

The invariant is unchanged and gains a second sentence:

> **No receipt, no execution. A mandate constrains execution; it does not transfer authority.**

### Identity is not authority

An implementation may track which model, process or session performed something, for attribution and telemetry. That is useful and orthogonal.

It does not follow that the agent becomes an authority holder, and HAP deliberately does not authorize agents. **It authorizes executions against mandates.** This exclusion is stated rather than left implicit, so that agent-level authorization is not added later in the belief that its absence was an oversight.

### Why "mandate"

It has a strong and familiar European analogue. A SEPA direct-debit mandate is a bounded, revocable instruction under which a third party may initiate collections while the payer retains the power to set limits, restrict who may collect, and cancel at any time. That is the same structure, and it is already understood by the finance and public-sector readers most likely to interrogate the model.

The analogy is structural, not evidential: the SEPA definition itself speaks of consent and authorisation, so it cannot show that a mandate is legally distinct from an authorization. It shows that the *shape* is familiar.

Translation needs care rather than a dictionary — in German, *Mandat* carries political and legal-representation connotations that may not transfer.

### What does not change

**Authority Server** keeps its name. It does not originate the mandate and does not hold the Decision Owner's authority. It verifies and records the authorization state a human created, enforces mandate limits, and issues signed attestations and execution receipts. The name stays accurate: infrastructure serving the authority relationship, not the party to it.

**`authorization_id`, `authz_` identifiers, the attestation wire format.** An authorization is the record of a mandate being issued. Renaming signed identifiers would invalidate every existing grant to gain a synonym.

**Decision Owner** already names the human who retains authority. No second term is introduced for the same role.

### Honest scope

This changes how the protocol is explained, not what any implementation does. No conformance requirement follows, no verification changes, and an implementation using the older vocabulary is not less conformant.

It is recorded because the current wording undermines the strongest claim the protocol makes — and because a specification that describes its own architecture inaccurately invites the misreading it exists to prevent.
