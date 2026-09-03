# Human Agency Protocol

**People stay in charge. AI does the work. Nothing runs without a ticket.**

Open protocol — v0.7, September 2026. MIT.

A person gives an agent a **mandate** — what it may do, within which limits, for how long. Every consequential action is checked against that mandate **before** it runs, and obtains a signed **mandate ticket** proving the mandate existed and the act stayed inside it. Not a log written afterwards. A precondition.

- Specification: [content/0.7/protocol.md](content/0.7/protocol.md)
- Governance & invariants: [content/0.7/governance.md](content/0.7/governance.md)
- Conformance vectors (the answer key): [content/0.7/vectors/](content/0.7/vectors/)
- What changed in 0.7: [content/0.7/changelog.md](content/0.7/changelog.md)
- Open directions: [content/0.7/review.md](content/0.7/review.md)
- Implementation report for the reference implementation: [hap-e2e/CONFORMANCE.md](https://github.com/humanagencyprotocol/hap-e2e/blob/main/CONFORMANCE.md)
- Dated record of every version and concept: [content/provenance.md](content/provenance.md)
- Website: [humanagencyprotocol.org](https://humanagencyprotocol.org)

---

## No mandate, no ticket. No ticket, no execution.

The first half rules out acting *without* a mandate — every permission system promises that much, for access. The second half is the one only HAP promises: a signed ticket, obtained before each act, that puts an identifiable person behind it. **Access is not a mandate.**

1. A person gives a **mandate** — bounds, scope, time, and commitment mode. The Authority Server signs it. Where the person co-signs with their own key, the mandate is attributable to them independently of the operator.
2. The **Gatekeeper** verifies the mandate locally (Ed25519 signature, expiry, `bounds_hash`, `scope_hash`), enforces per-action bounds and scope, then requests a ticket — pre-flight, fail-closed.
3. The **Authority Server** checks cumulative limits, expiry, revocation, and approval, then **signs the ticket**. It can refuse.
4. The **Executor** runs the action — only after the ticket exists. The Gatekeeper keeps the complete signed ticket, so the person the evidence is about never depends on the operator to hold it.

The agent holds no credential, mandate, or signing key at any point. It receives a brief describing its bounds; it never receives anything it could present as proof of authority. *A mandate constrains execution; it does not transfer authority.*

### One ticket, three directions

- **Now — enforcement.** The action is checked against the mandate before it happens. Prevented, not caught in a log.
- **Outward — credibility.** The ticket is portable: a holder verifies the signature and, where content binding applies, recomputes the content hash — cryptography, not testimony.
- **Back — attribution.** Evidence generated *before* the act: which mandate, which bounds, which content, which person.

Honest status: today the chain holds as far as you trust one operator's signing key — the Authority Server asserts that the person authorized it. v0.6 specified **owner signatures** (the person's own key co-signs the mandate), which remove that trust requirement; they remain specified ahead of implementation; the reference implementation's report says so.

### What a ticket looks like

```jsonc
{
  "id": "…",                                  // AS-assigned
  "mandateId": "…",                           // the mandate this ran under
  "version": "0.7",
  "issuer": "did:key:z6Mk…",                  // the AS key that signed it — verifiable offline
  "profileId": "charge@0.5",                  // profiles version independently
  "actionType": "charge",                     // drives bounds dispatch + cumulative bucketing
  "boundsHash": "sha256:7a91…",               // content address of the mandate's bounds
  "executionContext": { "amount": 48, "currency": "EUR" },
  "cumulativeState": { "daily": { "amount": 391, "count": 12 }, "monthly": { "amount": 2140, "count": 61 } },
  "limits": { "profile": "charge@0.5", "amount_max": 100, "amount_daily_max": 500 },
  "contentHash": "sha256:…",                  // optional: binds the exact content
  "contentBinding": { "version": "2", "kind": "jcs", "fields": ["…"] },
  "timestamp": 1757000000,
  "signature": "base64url…"                   // Ed25519 over RFC 8785 (JCS) canonical bytes
}
```

### Verifying one, without trusting the operator

1. Read `issuer`. For a `did:key` the public key *is* the identifier; decide by local policy whether you trust that issuer.
2. Strip `signature`, canonicalize the payload per RFC 8785 (JCS), verify.
3. Where `contentHash` is present: recompute it from the artifact you hold, using the signed `contentBinding` — the field list travels in the ticket, so you know exactly what the hash covers.
4. Optionally walk up the chain: obtain the mandate named by `mandateId`, verify it the same way, and — where the owner co-signed — verify the owner's own signature against the key carried in their DID. No key directory involved: for signing identities, the key *is* the identifier.

Every value your implementation must reproduce — canonical strings, hashes, signatures under published test keys, the profile hash, and the refusals — is in [content/0.7/vectors/](content/0.7/vectors/).

---

## Where HAP fits

HAP is **not** another login, API gateway, agent framework, sandbox, or policy engine. It composes with both generations of the stack and replaces none of it:

| Layer | Answers |
|---|---|
| OAuth / OpenID Connect | Can this client access this API? |
| Identity (EUDI, passkeys, WebAuthn) | Who is this person? |
| MCP | Which tools can this agent see? |
| Agent identity & lifecycle | Which agents exist, and what can they reach? |
| Agent platforms & policy engines | Should this call pass the rules we configured? |
| **HAP** | **Was this act inside a mandate an identifiable person gave — and where's the proof?** |

Every other layer answers an access question. None of them holds a bounded mandate a person committed to, and none produces an artifact a third party can verify for themselves.

**OAuth grants reachable capability. HAP governs mandated use of that capability.**
**Control governs the agent. A mandate governs the delegation.**

---

## Security model

> **HAP authorizes; it does not contain.**

HAP is an authorization and evidence layer — not a sandbox, hypervisor, secrets manager, or network policy engine. The load-bearing assumption is **complete mediation** ([governance.md → Invariant 10](content/0.7/governance.md)): the guarantee holds exactly where a consequential capability is reachable *only* through a HAP-enforced boundary. Two ways to satisfy that, per effector:

- **Path exclusivity** — the agent cannot reach the effector except through the Gatekeeper. Infrastructure's job; fragile in the specific sense that a stray credential or new egress rule silently removes it.
- **Ticket-demanding execution** — the effector itself refuses to act without a valid ticket, so reaching it accomplishes nothing. Topology-independent, but conditional: the effector must check authenticity, action class, scope binding, freshness, and replay — a signature check alone is not mediation.

The obligations on a deployment are specified in the [Deployment Security Profile](content/0.7/governance.md). Which controls hold only while the operator is honest, and which survive a compromised operator, is stated control by control in [protocol.md → Enforcement classes](content/0.7/protocol.md). The threat model assumes a compromised local app, a malicious executor, and a malicious or negligent Authority Server.

---

## Commitment modes

Autonomy is a signed choice on every mandate (`commitment_mode`), not a default the agent can change:

- **`automatic`** — runs on its own within bounds; every call still obtains a pre-execution ticket, deduplicated exactly-once via idempotency keys.
- **`review`** — asks first; each action becomes a proposal, and approval precedes the ticket. No approval, no ticket — no execution.
- **`review_above_cap`** — asks above a limit; automatic under a cap the mandate carries, and above it the AS refuses and routes to the approvers the mandate names.

---

## New in v0.7

Full record with rationale and review history: [changelog.md](content/0.7/changelog.md).

- **One vocabulary** on the wire, in the spec, and in public: mandate, mandate ticket, bounds, scope, Mandate Owner. The retired words (attestation, receipt, context, Decision Owner) are gone from all three.
- **The invariant in its final words**, and a sharpened Invariant 2: a Mandate Owner is one identifiable person — never a role, committee, policy, shared account, or system.
- **Gatekeeper custody**: the Gatekeeper keeps the complete signed ticket, the mandate, and the issuer key for every execution — the person's own evidence, verifiable after the operator is gone.
- **Enforcement classes**: every control annotated as holding against an honest operator only, or against a compromised one.
- **Conformance vectors** published with the specification — hashes, signatures, profile hash, refusals — so "you can implement this" is checkable.
- **New signed fields**: `issuer`, `profile_hash` (also in the owner-signed projection, which now also covers above-cap thresholds and approvers), ticket `version` and `mandateId`, `disclose_fields`; version negotiation; permanent revocation; `appliesTo` on cumulative bounds.

---

## Build with HAP

| Component | Purpose | Reference |
|-----------|---------|-----------|
| **Protocol** | Concepts, wire format, role behavior | [content/0.7/protocol.md](content/0.7/protocol.md) |
| **Conformance vectors** | The values every implementation must reproduce | [content/0.7/vectors/](content/0.7/vectors/) |
| **Authority Server** | Signs mandates and tickets; enforces bounds, cumulative limits, expiry, revocation, approval | [protocol.md → Authority Server Behavior](content/0.7/protocol.md#authority-server-behavior) |
| **Gatekeeper** | Local verification + pre-flight ticket, fail-closed; custody of tickets | [protocol.md → Gatekeeper & Executor Behavior](content/0.7/protocol.md#gatekeeper--executor-behavior) |
| **Gateway** | Suveren's open-source Gatekeeper + Executor — any MCP-compatible agent connects | [github.com/suverenai/suveren-gateway](https://github.com/suverenai/suveren-gateway) |
| **Authority Profiles** | Eight published profiles, versioned independently: charge, purchase, email, customers, calendar, publish, records, deploy | [github.com/humanagencyprotocol/hap-profiles](https://github.com/humanagencyprotocol/hap-profiles) |
| **Core library** | Types, canonicalization, verification, content binding — on npm | [@humanagencyp/hap-core](https://www.npmjs.com/package/@humanagencyp/hap-core) |
| **Governance** | Invariants, trust model, deployment obligations | [content/0.7/governance.md](content/0.7/governance.md) |

Compliance note: HAP is enabling infrastructure for regimes that require demonstrable human oversight — EU AI Act Article 14, ISO/IEC 42001, NIST AI RMF — not compliance on its own. Wherever an organization must show a person stood behind an automated act — regulation, audit, insurance, or litigation — the ticket is the artifact.

---

## Repository contents

```
.
├── content/
│   ├── 0.1/ – 0.5/   Frozen prior specs
│   ├── 0.6/          Prior spec
│   ├── 0.7/          Current spec
│   │   ├── protocol.md      Normative: concepts, wire format, role behavior
│   │   ├── governance.md    Normative: invariants, trust model, deployment profile
│   │   ├── changelog.md     What 0.7 promoted, under which rule, with review record
│   │   ├── review.md        Forward ledger: open directions, deviations, implementation status
│   │   └── vectors/         Conformance vectors: hashes, signatures, profile hash, refusals
│   └── provenance.md  Dated record of every version and the first appearance of each concept
├── website/          humanagencyprotocol.org (Astro)
└── README.md
```

> History of the document set: v0.5 folded `service.md` and `gatekeeper.md` into `protocol.md` and retired the "Service Provider" term in favor of **Authority Server**; v0.6 split the review ledger into `changelog.md` and `review.md`; v0.7 added the vectors and the provenance record.

### Related repositories

**Protocol (open source):**
- [**hap-profiles**](https://github.com/humanagencyprotocol/hap-profiles) — authority profiles (JSON, immutable, independently versioned)
- [**hap-core**](https://www.npmjs.com/package/@humanagencyp/hap-core) — TypeScript library: types, JCS canonicalization, verification, content binding
- **hap-e2e** — protocol conformance suite against real servers, with the map from MUSTs to the tests that prove them

**Suveren — reference implementation:**
- [**suveren-gateway**](https://github.com/suverenai/suveren-gateway) — Gatekeeper + Executor, runs locally (open source)

---

## Running the website locally

```bash
cd website
npm install
npm run dev
```

The sync script reads the spec version from `website/package.json` and copies `content/<version>/` into the Astro content collection on every build.

---

## License

MIT — open infrastructure. The Human Agency Protocol is maintained by stewards, not owners.
