---
title: "Human Agency Protocol — Governance"
version: "Version 0.6"
date: "August 2026"
status: "Normative — full prose"
description: "How HAP is governed: invariant constraints instead of institutions. No central authority, no registry, no approval process — conformance is enforced locally."
---

HAP is governed by invariant constraints, not institutions.

There is no central authority, no steward council, no registry, and no mandatory approval process. Compliance is enforced locally and cryptographically by any participant using the open specification.

---

## Core Laws

HAP is designed to satisfy three non-negotiable laws of globally scalable protocols:

1. Anyone can implement it
2. Anyone can verify it
3. No one can stop it

Any governance mechanism that violates these laws is invalid.

---

## Canonical HAP Invariants

A system may only claim to be HAP-compliant if all of the following invariants hold.

### Invariant 1 — No Execution Without Attestation and Receipt

A consequential action is any operation that affects external state, human wellbeing, financial position, legal standing, or reputation.

No executor (human or machine) may perform a consequential action unless preceded by:

1. A valid HAP attestation conforming to a trusted Profile
2. A valid HAP execution receipt issued by the AS for that specific action

This is the v0.5 strengthening of the v0.3 invariant. v0.3 required only the attestation. v0.5 requires both the attestation (proof of authorization) and the receipt (proof that the specific action was within bounds at the time of execution).

v0.6 adds the second sentence of the invariant: **a mandate constrains execution; it does not transfer authority.** HAP does not model an automated system as an authority holder — authority remains with the Decision Owner, and the protocol authorizes executions against mandates, never agents (see `protocol.md` → *Authority, Mandate, Capability, Execution*).

### Invariant 2 — Explicit Human Decision Ownership

Every attestation must reference at least one identifiable human Decision Owner. Collective, symbolic, or anonymous ownership is invalid.

### Invariant 3 — Required-Owner Coverage

Each Decision Owner is identified by DID. In group mode, execution is invalid if the profile's required approvers (as defined by the AS group configuration) are not all covered by the attesting Decision Owners. In personal mode, the user attests directly with no approver checks.

### Invariant 4 — Privacy Preservation

No semantic content may leave local custody by protocol design. ASes and Executors receive only:

- Bounds (in plaintext, for AS enforcement)
- Cryptographic hashes (`bounds_hash`, `context_hash`, `execution_context_hash`, `gate_content_hashes.intent`, `contentHash`)
- Structural metadata
- Signatures (the AS's, and any owner mandate/approval signatures)
- DIDs and owner declarations
- **By explicit owner opt-in only:** a disclosed identity (`subjects.disclose.name`) under Identity Assurance (`protocol.md` → *Identity Assurance*). This is the single carve-out to the list above, it exists only at `assurance: "high"`, and it is opt-in per authorization — never a protocol default. An AS that receives a name the owner did not explicitly choose to disclose violates this invariant.

Context content, intent text, and any other narrative remain local.

### Invariant 5 — Profile Conformance

Attestations must reference a specific Profile. Validation rules are Profile-defined. Unknown or untrusted Profiles must be rejected.

### Invariant 6 — Binding Commitment

Once execution occurs, the associated commitment, ownership record, and receipt must be append-only and non-reversible. History may be appended to, but not rewritten. Revocation does not rewrite history — it only prevents new receipts from being issued against an attestation.

### Invariant 7 — Cryptographic Receipt of Execution

> New in v0.4.

Every authorized action must produce an AS-signed receipt before it executes. The receipt is the cryptographic record of execution. A system that authorizes actions without receipts is not v0.4+ compliant.

### Invariant 8 — Tool-Gating Manifest Integrity

> New in v0.5.

A Gatekeeper that fronts MCP tool calls (or any other tool-shaped surface) MUST gate every tool — including read-only tools — through a tool-gating manifest. There is no permissive default and no implicit categorization. `actionType` MUST be resolved from the manifest, never inferred from string patterns on tool names.

A system that exposes ungated tool access, or that derives enforcement semantics from tool-name parsing, is not v0.5+ compliant.

v0.6 extends the same fail-closed reading to the read path: a tool classified as a read that declares no applicable read governance MUST be denied (or carry an explicit, recorded exemption), and a resource scope enforced on writes MUST bind reads of the same resource (`protocol.md` → *Read Authorization*).

### Invariant 9 — Deterministic Signing

> New in v0.5.

Attestation and receipt signatures MUST be produced over a deterministic JSON canonicalization (sorted keys, no insignificant whitespace, base64url signatures, RFC 8785 compatible). Implementations MUST publish at least one signing test vector so independent verifiers can confirm canonicalization parity.

A system whose signatures depend on object insertion order or implementation-specific JSON serialization is not v0.5+ compliant.

### Invariant 10 — Complete Mediation

> New in v0.6.

A HAP deployment MUST ensure that every consequential capability within its scope is reachable **only** through a HAP-enforced boundary — either because no path to the effector exists that does not traverse the Gatekeeper (**path exclusivity**), or because the effector itself refuses to produce the consequential effect without a valid execution receipt (**receipt-demanding execution**).

A receipt-demanding effector satisfies this invariant only where it establishes the authenticity, action class, scope binding, freshness, and replay protection appropriate to that action (see *Deployment Security Profile*). Verifying a signature alone is not mediation: it confirms the receipt is genuine, not that it authorizes this effect now.

**Invariant 1 is conditional on this one.** A deployment that leaves an unmediated path to a consequential capability does not satisfy "no execution without attestation and receipt" for that capability, no matter how correctly its Gatekeeper behaves — the Gatekeeper is simply not on the path.

HAP does not implement, and cannot verify, the isolation this invariant depends on. It states the requirement, defines the two ways to satisfy it, and specifies the operator obligations below.

---

## Profile Governance

Profiles are the mechanism for authority-specific enforcement. Profile governance follows these principles:

### Permissionless Creation

Anyone may create and publish a Profile. No approval is required.

### Versioned Evolution

Profiles version independently of HAP Core. Breaking changes require version bumps. Once published, a profile version is immutable — changes require a new version.

### Local Trust Decisions

Applications and ASes decide which Profiles to trust. There is no global Profile registry.

### Trust on First Use

`profile_id` is a stable identifier, not a runtime fetch URL. ASes and Gatekeepers MUST resolve `profile_id` to bytes through a one-time provisioning step (bundled at install, or fetched once and persisted) and MUST NOT re-fetch on the attestation or receipt hot path. The protocol relies on the publisher's immutability promise plus each operator's local copy; it does not provide an additional cryptographic check for publisher misbehavior. Operators concerned about publisher integrity SHOULD verify a content hash at provisioning time using out-of-band means.

Once provisioned, the local copy is the operator's source of truth for that `profile_id`. The protocol's trust unit is "Public Key + Profile + Local Policy"; the profile is part of the local trust anchor, not a remote dependency.

### Transparent Specification

Profiles must fully specify:
- Bounds schema (enforceable parameters)
- `boundsSchema.actionTypes: string[]` — closed registry of valid `actionType` values (new in v0.5)
- Context schema (operational scope, may be empty), including any `scopeKind` and `requiredFor` declarations (new in v0.6)
- Execution context schema (cumulative tracking)
- Required gates (`bounds`, `intent`, `commitment`, `decision_owner`)
- TTL limits (default and max)
- Retention minimum
- Any optional v0.6 surfaces it adopts: `content_binding`, public-disclosure declaration, `ownerMandate` floor, `receipt_lookup`

Ambiguous Profiles are unenforceable.

Profiles MUST NOT define:
- `executionPaths` — removed in v0.4
- `requiredDomains` — moved to AS group configuration (now `requiredApprovers`)
- `gateQuestions` — the intent prompt is universal in the gateway UI
- `paths: [...]` arrays on bounds fields — finished removal in v0.5
- `field.enum: string[]` — retired in v0.5; allowed values live in `constraint.values`

### Profile Versioning

- Profiles MUST declare a version
- Once published, profile versions are immutable
- Breaking changes MUST bump the version
- ASes MUST reject unknown profile versions
- ASes SHOULD support profile version negotiation
- Deprecated profiles SHOULD have a sunset timeline

---

## Permissionless Implementation

Any individual, team, or system may:

- Implement the HAP protocol
- Run an Authority Server
- Publish Profiles
- Enforce HAP locally
- Reject non-compliant executors

No approval is required. No registration is necessary.

---

## Cryptographic Self-Verification

Compliance is proven exclusively through:

- Correct schema usage
- Valid cryptographic signatures (on attestations and receipts)
- Invariant-preserving behavior

If an implementation satisfies the invariants, it is compliant. If it does not, it is not.

No external certification is required.

---

## Adversarial Interoperability

HAP assumes all remote parties are potentially hostile.

Local systems decide which entities to trust using:

- Public key whitelisting
- Local policy
- User-defined reputation

There is no global root of trust. There is only local sovereignty plus cryptographic proof.

---

## Forkability and Naming

Forking is a feature, not a failure.

Any community may fork:

- Profiles
- Authority Server implementations
- Gatekeeper / Gateway implementations
- UX layers
- Execution models

However:

- If core invariants are preserved, the system may call itself HAP
- If any canonical invariant is broken, the system must rename itself

This preserves interoperability without requiring permission.

---

## Reference Conformance

To support interoperability without institutional control, the HAP ecosystem maintains:

- Public invariant test vectors
- Reference bounds and context canonicalization tests (including escape rules: newline rejection, percent-encoding of `=`/`%`/non-printable bytes)
- Signing canonicalization test vectors — `(payload, canonical bytes, base64url signature)` triples with a known public key
- Attestation validation test cases (per-mode: `automatic`, `review`, `review_above_cap`)
- Receipt validation test cases (success, `BOUND_EXCEEDED`, `CUMULATIVE_LIMIT_EXCEEDED`, `APPROVAL_REQUIRED`, `INVALID_ACTION_TYPE`)
- Profile compliance checks (presence of `boundsSchema.actionTypes`, absence of `field.enum`, absence of `paths` arrays)
- Tool-gating manifest schema validator (incl. `manifestVersion` and the closed transform vocabulary)
- Content-binding canonicalization vectors (`text` rule, JCS field-binding objects, pinned hashes)
- Mandate-projection vectors — (attestation payload, reconstructed `HAP-mandate` canonical bytes, signature) triples (new in v0.6)

> **Deliverable (since v0.5).** A normative test-vector file MUST ship with `hap-core` so any third-party AS or Gatekeeper can self-verify canonicalization parity. The file location is implementation-defined; the format is JSON with one test case per top-level entry. Implementations that pass the vectors are conformant on those points.

Running these tests is voluntary. Publishing results is optional.

No entity grants approval. No entity issues certification.

---

## AS Governance

Authority Servers are trusted parties. Their governance must be explicit:

### AS Operators

- Who operates the AS?
- What jurisdiction?
- What liability?

### AS Accountability

- ASes MUST publish their signing public key
- ASes MUST retain a record of all attestations issued
- ASes MUST retain a record of all receipts issued (new in v0.4)
- ASes MUST retain attestation and receipt records for at least the profile-defined retention period
- Records MUST be append-only
- ASes MUST maintain a revocation list (new in v0.4)
- ASes SHOULD publish attestation and receipt counts and statistics
- ASes MUST NOT issue attestations without verifying required-approver coverage (in group mode)
- ASes MUST NOT issue receipts for revoked or expired attestations

### AS Misbehavior

- Issuing attestations for unauthorized DIDs → AS trust revocation
- Issuing receipts that violate bounds → AS trust revocation
- Backdating timestamps → AS trust revocation
- Refusing valid requests → escalation path required

---

## Deployment Security Profile

> New in v0.6.

Complete Mediation (Invariant 10) is satisfied by the execution environment, not by the protocol. A conformant deployment MUST provide the following properties. They are stated as obligations so an operator, an auditor, or a security reviewer has a checklist rather than an inference.

Each item states a **security property**. Where a topology is named it is an example of how the property is commonly achieved, never a definition of it: a deployment that achieves the property by other means is conformant, and one that matches the topology without achieving the property is not.

**Credential and effector custody.** A deployment MUST ensure that possession of any credential available to the agent is **insufficient to cause a consequential effect without HAP authorization**. Under path exclusivity, credentials capable of causing the effect MUST remain behind the Gatekeeper boundary. Under receipt-demanding execution, the effector MAY be directly reachable by the agent, and the agent MAY hold a credential that reaches it, provided the effector independently validates a receipt before producing the effect. The credential then confers reachability, not consequential authority, and separating those two is the point of the strategy.

**Executor access.** An Executor MUST either accept consequential commands only through the Gatekeeper boundary, or independently enforce valid execution receipts at its own execution boundary. Exposing a directly callable interface is a violation only in the first case.

**Receipt-demanding effectors.** Where an effector enforces receipts itself, it MUST establish:

1. **Authenticity** — the receipt is genuine and was issued by an Authority Server the effector trusts. Where the effector cannot verify the signature itself, this reduces to trusting the issuer, and MUST NOT be described as independent verification.
2. **Action class** — the receipt authorizes this kind of action (`actionType`, and a `profileId` the effector expects). A receipt for a cheaper action MUST NOT release a costlier one.
3. **Scope binding** — the receipt binds *this* effect, checked by recomputing the content hash from what is about to be executed. This is the load-bearing check; without it the receipt authorizes some action rather than this one.
4. **Freshness** — the receipt falls within a validity window the effector defines, and its timestamp is not implausibly in the future. This is what stops an old receipt returning old, possibly vulnerable, state to production.
5. **Replay protection, scaled to the action** — where repeating the action is itself the harm (a payment, a message send, an irreversible provisioning step), the effector MUST consume the receipt atomically so a second presentation fails. Where the effect is idempotent, the validity window MAY suffice; a spent-receipt store SHOULD NOT be mandated there, since it buys little and adds state, atomicity requirements, and new failure modes.
6. **Honest scope statement** — the effector MUST document which properties it does not check, so an operator does not infer coverage that is absent.

A verifier SHOULD NOT depend on the software it is verifying: an effector that recomputes the canonical form itself, rather than calling the library that produced it, keeps a defect in that library from becoming invisible to the check that exists to catch it.

**Gatekeeper integrity.** The agent MUST NOT be able to modify, replace, reconfigure, restart into a different configuration, impersonate, intercept, or extract protected secrets from the Gatekeeper. *(Non-normative: this is commonly achieved by separating agent and Gatekeeper into distinct processes under distinct user accounts, containers, hosts, or hardware boundaries, scaled to the value of the effectors involved. Separation alone does not establish the property — two processes under one account may be able to attach to one another, and a privileged container or a VM with an exposed management interface provides less than its topology suggests.)*

**Signing-key custody.** The Authority Server's signing key MUST NOT reside on any host the agent can reach. Where a profile or verifier policy requires a mandate `binding` above `raw`, the owner's signing key MUST be held in the custody that binding names and MUST NOT be exportable to software the agent can read.

**Fail-closed everywhere.** Every dependency whose absence would otherwise permit execution MUST refuse instead: an unreachable Authority Server blocks, an unreadable profile blocks, an undeterminable resource scope blocks, an unparseable argument blocks. "Degraded mode" is not a conformant configuration.

**Declared posture.** A deployment claiming HAP conformance SHOULD record, per consequential capability, which mediation strategy it relies on. This is a **declaration, not a proof** — HAP cannot verify it, in exactly the sense that `signing_surface` is a declaration (`protocol.md` → *Owner Mandate Signatures*). It carries information because there is no benefit in claiming a posture to a party who will weigh it, and none a verifier can check. It is recorded because a control that is assumed rather than stated is the failure mode this specification repeatedly forbids elsewhere.

### Which strategy is available

The two strategies are not interchangeable, and the choice is often not free:

| Situation | Approach |
|---|---|
| Third-party effector you cannot modify (payments, mail, calendar) | **Path exclusivity only** — receipt-demanding execution is unavailable |
| Effector you own, with a trigger that cannot be fully restricted (CI/CD, webhooks, internal APIs) | **Receipt-demanding**, subject to the six conditions above |
| Effector you own, reachable only through a credential the Gatekeeper holds | Path exclusivity, or both |
| High-value effector where topology cannot be guaranteed indefinitely | Both |

Receipt-demanding execution requires an effector you control, or one whose operator has adopted the protocol. A third-party API cannot be made to demand receipts, and no amount of architecture on the deploying side changes that. Where it is unavailable, path exclusivity is the only option and its fragility must be carried knowingly — it depends on a topology holding for the life of the deployment, and nothing in the system reports when it stops holding.

---

## Multi-AS Ecosystem

The protocol supports multiple ASes:

- Organizations choose which AS(s) to use
- Verifiers can trust multiple ASes
- Attestations and receipts reference which AS signed them
- No single AS has monopoly on trust

### Interoperability

- ASes SHOULD use compatible attestation and receipt formats
- ASes MAY federate approver authority (AS-A trusts AS-B's authority registry)
- Cross-AS verification MUST be possible if both ASes are trusted

> The protocol does not yet specify cross-AS receipt federation (unchanged in v0.6). A single attestation lives on a single AS. Multi-AS federation for receipts is deferred to a future version.

---

## Approver Authority Governance

Since v0.5, required approvers are configured per group on the AS, not in profiles.

### Within Groups

- The group admin defines `requiredApprovers` — which profiles are enabled and which members must attest
- The group admin defines group membership — who may attest
- Authority grants SHOULD require approval from existing authority holders
- Authority SHOULD have expiration (annual renewal)

### Audit Trail

- All authority grants/revocations MUST be logged
- Logs MUST include: who granted, to whom, which profile, when, expiration

---

## Dispute Resolution

When attestation or receipt validity is disputed:

1. Verify cryptographic validity (signatures, hashes)
2. Verify required-approver coverage at time of attestation
3. Verify AS was trusted at time of attestation
4. For receipts: verify the receipt was issued during the attestation's TTL window and before any revocation
5. If all valid → attestation and receipt stand
6. If authority was invalid → attestation is void, AS may be at fault
7. If receipt was issued for an unauthorized action → AS misbehavior

---

## TTL Enforcement

- Each Profile defines TTL limits (default and max)
- Gatekeepers MUST enforce these limits at attestation issuance
- The user selects a specific TTL within the profile's allowed range at attestation time
- This prevents time-pressure attacks on approval

### Retention Enforcement

- Each Profile defines `retention_minimum`
- Attestations MUST be retained beyond TTL expiry for audit purposes
- Receipts MUST be retained for at least `retention_minimum` from the receipt's own timestamp, independent of the parent attestation's lifecycle
- **Receipts outlive attestations**: TTL expiry and revocation of an attestation affect only the AS's willingness to issue *new* receipts against it. Previously-issued receipts remain cryptographically valid, queryable, and retained until their own retention window elapses. Destroying a receipt because its parent attestation was revoked destroys the audit trail of what actually happened and is a governance violation.
- Discarding attestations or receipts on TTL expiry destroys the audit trail

### Revocation

- v0.4 adds revocation as a first-class concept
- The AS maintains a revocation list, persisted in durable storage
- Revoked attestations remain cryptographically valid for audit, but the AS refuses to issue new receipts against them
- Revocation is faster than waiting for TTL expiry

---

## Error Transparency

- Gatekeepers and ASes SHOULD return structured error codes
- Error codes MUST NOT leak sensitive information (intent text, context content, business secrets)
- Failed validations MUST abort execution

See the canonical error-code tables in [protocol.md](protocol.md#error-codes).

---

## What Governance Is Not

HAP governance explicitly rejects:

- Central registries
- Steward councils
- Qualification processes
- Compliance certification bodies
- Jurisdiction-based approval

HAP governs behavior, not actors.

---

## Trust Model

Trust in HAP is constructed as:

```
Public Key + Profile + Local Policy
```

Every Authority Server, Profile, Executor, or App identifies itself via a public key. Local systems choose which keys and Profiles to trust. Unknown or untrusted keys are ignored by default.

There is no global trust anchor.

### The Authority Server Cannot Check Itself

Several controls in this specification have the same shape, and stating the shape once is worth more than restating the limitation each time it recurs:

> **An AS-side *check* is not a defence against the AS.**
> **An AS-*signed artifact held by another party* is evidence a compromised AS cannot retroactively alter.**

Both halves are load-bearing, and the second stops the first from proving too much.

The first half retires a class of decorative control. If the only thing standing between a claim and its abuse is the Authority Server validating that claim, then against a compromised Authority Server nothing stands there at all. A requirement the AS records, a uniqueness check the AS performs, a key directory the AS serves — each holds against an honest operator and evaporates against a dishonest one. That is not a reason to remove such controls; it is a reason not to describe them as defences against the operator.

The second half is why receipts are worth anything. An AS-signed artifact does not *prevent* a malicious operator. But once it is signed and in someone else's hands it cannot be rewritten — which is precisely why receipts outlive attestations: expiring or revoking an authorization does not erase the record of what happened under it. Evidence and prevention are different properties, and the AS can supply the first without being trusted for the second.

The owner mandate signature (`protocol.md` → *Owner Mandate Signatures*) is this invariant applied: it exists to move authorization out of the class the first half describes (an AS assertion) and into the class the second half describes (a distributed, independently verifiable artifact). Instances the invariant catches inside this specification: cumulative bound enforcement (an AS-side check — conceded below), nonce consumption (AS-side, so defence-in-depth against third parties only), grant-level co-signature requirements (recorded by the AS, so assurance rather than enforcement), and any AS-served key directory, including an AS signature over its own key directory — that is the AS vouching for the AS.

**Consequence.** Adopting this invariant obliges an audit of everything this specification describes as "enforced," separating what holds only against an honest AS from what holds against a later-compromised one. That audit is tracked as an open item in `review.md`; an invariant with no audit behind it is the same decorative control it was written to eliminate.

**Scope of AS trust.** Choosing to trust an Authority Server's key means trusting it to **sign honestly and to enforce cumulative bounds, revocation, and approval**. The local Gatekeeper is the counterweight: it re-derives `gate_content_hashes` from locally-held content and enforces per-transaction bounds and context constraints, so a misbehaving AS cannot cause an Executor to run an action the human never authored locally. A *compromised* AS can still over-authorize authorities the human did create — cumulative state and pre-flight ordering are claims about a sequence only the AS witnesses, and that residue is stated honestly in `protocol.md` → *What this does and does not prove*. What v0.6 removes from the compromised-AS attack surface is **fabrication of authority**: where owners co-sign their mandates and approvals, the AS can no longer forge authorization artifacts attributed to a Decision Owner, fabricate or discard approvals, flip commitment mode, or extend a mandate's life. Attestations without owner mandate signatures retain the v0.5 posture. The remaining hardening directions (a witnessed transparency log, approver-public-key authenticity) are tracked in `review.md` → "Resilience to a Compromised Authority Server."

---

## Companion Specifications

Some capabilities sit outside HAP Core but interoperate through it. v0.5 introduced the notion of a **companion specification** — an optional, independently versioned document that defines an extension surface. Companion specs MAY be implemented without affecting HAP Core conformance. A companion spec MUST NOT relax any HAP Core invariant; it MAY add new invariants applicable only to participants implementing the companion.

### `output-provenance@0.1`

Binds attestations to observable outputs (URLs, artifacts, configuration state) via an optional `output_ref` field in the profile's context schema. See `review.md` § "Output Provenance" for the design. **Profile-bound by design:** when a deployment-style profile adopts it, `output_ref` is promoted into that profile's normative surface — not into HAP Core. The companion-spec registration exists so the design has a stable name; it does not make Output Provenance a Core surface.

*(`decision-streams@0.1` was registered here in v0.5. The direction retired in v0.6 — no reference implementation since v0.3 and no integrator asked. The registration is withdrawn; the design record remains in the v0.5 archive.)*

### `intent-disclosure@0.1`

**Status:** Normative companion specification. Optional — implementing it does not affect HAP Core conformance, but a participant that claims `intent-disclosure@0.1` MUST satisfy every requirement below.

Enables multi-recipient encrypted intent for `review` and `review_above_cap` authorizations, where the intent text is needed by approvers (typically on different machines than the original attester) but MUST NOT be readable by the AS.

The HAP privacy invariant says no semantic content leaves local custody. That works for `automatic` mode, where no one downstream of the attester reads intent. For review modes, two non-conformant solutions tempt implementers:

1. Send intent in plaintext to the AS for relay. **Violates the privacy invariant.**
2. Keep intent on the attester's machine and require approvers to fetch it directly. **Operationally fragile, breaks asynchronous review.**

`intent-disclosure@0.1` chooses a third path: encrypt the intent under each approver's public key, store the ciphertext on the AS, and let approvers decrypt locally. The AS holds bytes it cannot read.

#### Disclosure object

The attester computes the following object and sends it to the AS alongside the attestation. These fields are AS-side metadata — they are **not** part of the signed attestation payload; their integrity is guaranteed instead by `intent_disclosure_hash` (below), which **is** signed.

```json
{
  "intent_ciphertext": "base64url(iv ‖ AES-256-GCM ciphertext)",
  "encrypted_keys": {
    "did:key:alice": { "ct": "base64url(wrapped CEK)", "enc": "base64url(HPKE enc)" },
    "did:key:bob":   { "ct": "base64url(wrapped CEK)", "enc": "base64url(HPKE enc)" }
  },
  "approvers_frozen": ["did:key:alice", "did:key:bob"]
}
```

| Field | Required | Description |
|---|---|---|
| `intent_ciphertext` | yes | The **canonical intent text** (per *Intent canonicalization* in `protocol.md`) encrypted under a freshly generated 256-bit content-encryption key (CEK) with **AES-256-GCM**; the 96-bit IV is prepended to the ciphertext before base64url encoding. |
| `encrypted_keys` | yes | One entry per approver, keyed by the approver's **DID**. Each entry wraps the CEK to that approver using **HPKE (RFC 9180)** with suite `DHKEM(X25519, HKDF-SHA256) + HKDF-SHA256 + AES-256-GCM`: `enc` is the HPKE encapsulated key, `ct` is the HPKE-sealed CEK. Each recipient is sealed independently. |
| `approvers_frozen` | yes | Snapshot of the approver DID set at attestation time. The key set of `encrypted_keys` MUST equal this set. |

#### Signed binding (`intent_disclosure_hash`)

When an attestation carries a disclosure object, its **signed** payload (the Ed25519-signed `AttestationPayload`) MUST include the field `intent_disclosure_hash`, computed as:

```
intent_disclosure_hash = "sha256:" + hex(
  sha256( utf8( intent_ciphertext ‖ "\n" ‖ JCS(sort(approvers_frozen)) ) )
)
```

where `intent_ciphertext` is the exact base64url string above, `sort(approvers_frozen)` orders the DIDs by Unicode code point, and `JCS` is RFC 8785 JSON Canonicalization of the sorted array. The attester computes this **after** encryption and signs it as part of the attestation.

This is the integrity anchor: `intent_ciphertext`, `encrypted_keys`, and `approvers_frozen` travel unsigned, but any change to the ciphertext or the approver set alters `intent_disclosure_hash`, which is covered by the attestation signature. (`encrypted_keys` is bound transitively: its key set MUST equal `approvers_frozen`, and a verifier MUST reject any mismatch.)

#### Verification chain

1. **AS, at attestation time** — recompute `intent_disclosure_hash` from the received `intent_ciphertext` + `approvers_frozen`; it MUST equal the value in the signed payload, and `keys(encrypted_keys)` MUST equal `approvers_frozen`. On any mismatch the AS MUST reject the attestation (fail-closed) — it does not store it.
2. **AS, relaying to an approver** — return `intent_ciphertext`, the caller's own `encrypted_keys[caller_did]`, and `approvers_frozen` only to a DID present in `approvers_frozen`.
3. **Approver, on receipt** — verify the attestation signature; recompute `intent_disclosure_hash` and confirm it matches; HPKE-open the CEK; AES-256-GCM-decrypt the intent; recompute `gate_content_hashes.intent` over the decrypted, canonicalized text and confirm it equals the value in the signed attestation. Only then is the intent trustworthy. This chain ties ciphertext, approver set, and plaintext-intent commitment together under one signature.

#### Companion-spec invariants

- **C1.** The AS MUST NOT be able to decrypt `intent_ciphertext`. If the AS holds any decryption key for any approver, the companion spec is not in force.
- **C2.** The signed attestation payload MUST include `intent_disclosure_hash` as defined above. Without it, a malicious or compromised AS could swap ciphertexts, replace wrapped keys, or widen/shrink the approver set without invalidating the attestation signature.
- **C3.** When the approver set changes (e.g., an approver leaves the group), a **new** attestation with a new disclosure object MUST be issued for any subsequent action: the CEK is regenerated and re-wrapped for the new `approvers_frozen` set. Superseded wrapped keys MUST be retained for audit but MUST NOT be referenced by any future receipt. A receipt MUST only be issued against an attestation whose `approvers_frozen` matches the current required-approver set.

As a companion spec, only `review` / `review_above_cap` deployments opt in; `automatic`-only deployments carry none of this. The Suveren reference AS and gateway implement this companion spec; see `protocol.md` *Intent canonicalization* for the shared hashing rule the chain depends on.

**Known limitation (read against *The Authority Server Cannot Check Itself*).** The approver public keys used to wrap the CEK are served by the AS and are not bound into any signed payload — `intent_disclosure_hash` freezes the approver *set*, not their *keys*. Intent confidentiality therefore holds against a passive AS and any interceptor, but an actively malicious AS could substitute an attacker key at issuance. Binding the approver→key map into the signed payload would make *later* substitution detectable but cannot stop an AS already malicious at issuance; what would actually hold is a key the verifier never receives from the AS. That fix does not transfer for free from the owner-signing answer, because these are **encryption** (X25519) keys where `did:key` as used in this specification carries an Ed25519 **signing** key. Changing the hash definition is a breaking change, so it is deferred to `intent-disclosure@0.2`; the open design question is tracked in `review.md`.

---

## Final Statement

HAP does not ask for permission. It does not seek legitimacy from institutions.

Its authority derives from invariants that cannot be bypassed without detection.

Systems that preserve those invariants interoperate. Systems that do not are ignored.

That is the entirety of governance.
