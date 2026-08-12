# Human Agency Protocol

**Give AI autonomy without giving it authority.**

Open protocol — v0.6, August 2026. MIT.

A human sets what automation may do — scope, limits, duration. Every consequential action is checked against that mandate **before** it runs, and produces a signed receipt proving the authorization existed first. Not a log written afterwards. A precondition.

- Specification: [content/0.6/protocol.md](content/0.6/protocol.md)
- Governance & invariants: [content/0.6/governance.md](content/0.6/governance.md)
- What changed in 0.6: [content/0.6/changelog.md](content/0.6/changelog.md)
- Open directions: [content/0.6/review.md](content/0.6/review.md)
- Website: [humanagencyprotocol.org](https://humanagencyprotocol.org)

---

## No receipt. No execution.

The invariant, in full since v0.6: **no receipt, no execution — a mandate constrains execution; it does not transfer authority.**

1. A human authorizes **bounded execution** — scope, limits, time, and commitment mode. The Authority Server signs this as an **attestation**: the record of a mandate.
2. The **Gatekeeper** verifies the attestation locally (Ed25519 signature, TTL, `bounds_hash`, `context_hash`), enforces per-action bounds and context constraints, then requests a receipt — pre-flight, fail-closed.
3. The **Authority Server** checks cumulative limits, expiry, revocation, and approval, then **signs the execution receipt**. It can refuse.
4. The **Executor** runs the action — only after the receipt exists.

The agent holds no credential, attestation, or signing key at any point. It receives a brief describing its bounds; it never receives anything it could present as proof of authority.

### One receipt, three directions

- **Now — enforcement.** The action is checked against the mandate before it happens. Prevented, not caught in a log.
- **Outward — credibility.** The receipt is portable: a holder verifies the signature and, where content binding applies, recomputes the content hash — cryptography, not testimony.
- **Back — attribution.** Evidence generated *before* the act: which mandate, which bounds, which content.

Honest status: today the chain holds as far as you trust one operator's signing key — the Authority Server asserts that the human authorized it. v0.6 specifies **owner mandate signatures** (the human's own key co-signs the mandate), which removes that trust requirement; they are specified ahead of implementation, and [changelog.md](content/0.6/changelog.md) marks them as such.

### What a receipt looks like

```jsonc
{
  "id": "…",                                  // AS-assigned
  "profileId": "charge@0.4",                  // profiles version independently
  "actionType": "refund",                     // drives bounds dispatch + cumulative bucketing
  "boundsHash": "sha256:7a91…",               // content address of the mandate this ran under
  "executionContext": { "amount": 48.0, "currency": "EUR" },
  "cumulativeState": { "daily": { "amount": 391, "count": 12 } },
  "contentHash": "sha256:…",                  // optional: binds the exact content (v0.6)
  "contentBinding": { "version": "2", "kind": "jcs", "fields": ["…"] },
  "subjects": [{ "did": "did:key:z6Mk…" }],   // optional: opt-in disclosed identity (v0.6)
  "timestamp": 1747924920,
  "signature": "base64url…"                   // Ed25519 over RFC 8785 (JCS) canonical bytes
}
```

### Verifying one, without trusting the operator

1. Obtain the Authority Server's Ed25519 public key (endpoint, DID, or pinned).
2. Strip `signature`, canonicalize the payload per RFC 8785 (JCS), verify.
3. Where `contentHash` is present: recompute it from the artifact you hold, using the signed `contentBinding` — the field list travels in the receipt, so you know exactly what the hash covers.
4. Optionally walk up the chain: fetch the attestation for `boundsHash`, verify it the same way, and — once owner mandate signatures ship — verify the owner's own signature against the key carried in their DID. No key directory involved: for signing identities, the key *is* the identifier.

Conformance canonicalization vectors ship with [`@humanagencyp/hap-core`](https://www.npmjs.com/package/@humanagencyp/hap-core).

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
| **HAP** | **Was this execution mandated by a named human — and where's the proof?** |

Every other layer answers an access question. None of them holds a bounded mandate a named human committed to, and none produces an artifact a third party can verify for themselves.

**OAuth grants reachable capability. HAP governs authorized use of that capability.**
**Agent platforms decide what an agent may reach. HAP records what a human actually mandated — and proves this act was inside it.**

---

## Security model

> **HAP authorizes; it does not contain.**

HAP is an authorization and evidence layer — not a sandbox, hypervisor, secrets manager, or network policy engine. The load-bearing assumption is **complete mediation** ([governance.md → Invariant 10](content/0.6/governance.md)): the guarantee holds exactly where a consequential capability is reachable *only* through a HAP-enforced boundary. Two ways to satisfy that, per effector:

- **Path exclusivity** — the agent cannot reach the effector except through the Gatekeeper. Infrastructure's job; fragile in the specific sense that a stray credential or new egress rule silently removes it.
- **Receipt-demanding execution** — the effector itself refuses to act without a valid receipt, so reaching it accomplishes nothing. Topology-independent, but conditional: the effector must check authenticity, action class, scope binding, freshness, and replay — a signature check alone is not mediation.

The obligations on a deployment (credential custody, Gatekeeper integrity, fail-closed behavior) are specified in the [Deployment Security Profile](content/0.6/governance.md). The relationship to infrastructure is TLS's relationship to your OS: precise about what it protects, explicit about what it assumes.

The threat model assumes a compromised local app, a malicious executor, and a malicious or negligent Authority Server. What each party can and cannot forge — and what only owner co-signatures remove from the attack surface — is stated in [protocol.md → Threat Model](content/0.6/protocol.md) and [governance.md → Trust Model](content/0.6/governance.md).

---

## Commitment modes

Autonomy is a signed choice on every authorization (`commitment_mode` in the attested payload), not a default the agent can change:

- **`automatic`** — the agent acts within bounds; every call still produces a pre-execution receipt, deduplicated exactly-once via idempotency keys.
- **`review`** — each action becomes a proposal; approval precedes the receipt. No approval, no receipt — no execution.
- **`review_above_cap`** — automatic under a configured cap; above it, the AS refuses and routes to a named approver set carried in the signed payload.

---

## New in v0.6

Full record with rationale and review history: [changelog.md](content/0.6/changelog.md).

- **Content binding** (normative): receipts carry `contentHash` + `contentBinding` — single-field text, whole-payload JCS, or a declared field subset chosen so the intended verifier can reproduce it.
- **Identity assurance**: opt-in, signed disclosure of the owner's verified identity (`self_declared` / `as_vouched` / `eudi`).
- **Read authorization**: age windows, resource scopes that bind reads as well as writes, default-deny for undeclared read governance.
- **Owner mandate signatures** (specified, not yet implemented): `HAP-mandate` / `HAP-approval` objects, key-bearing signing DIDs, the `binding` assurance axis (`raw` / `webauthn` / `eudi`).
- **Complete mediation**: Invariant 10 and the Deployment Security Profile.
- **Tool-gating manifests** versioned as the portable binding format; strict profile immutability (no annotation exemption); the authority / mandate / capability / execution vocabulary.

---

## Build with HAP

| Component | Purpose | Reference |
|-----------|---------|-----------|
| **Protocol** | Concepts, wire format, role behavior | [content/0.6/protocol.md](content/0.6/protocol.md) |
| **Authority Server** | Signs attestations and receipts; enforces bounds, cumulative limits, expiry, revocation, approval | [protocol.md → Authority Server Behavior](content/0.6/protocol.md#authority-server-behavior) |
| **Gatekeeper** | Local verification + pre-flight receipt, fail-closed | [protocol.md → Gatekeeper & Executor Behavior](content/0.6/protocol.md#gatekeeper--executor-behavior) |
| **Gateway** | Suveren's open-source Gatekeeper + Executor — any MCP-compatible agent connects | [github.com/suverenai/suveren-gateway](https://github.com/suverenai/suveren-gateway) |
| **Authority Profiles** | Eight published profiles, versioned independently: charge, purchase, email, customers, calendar, publish, records, deploy | [github.com/humanagencyprotocol/hap-profiles](https://github.com/humanagencyprotocol/hap-profiles) |
| **Core library** | Types, canonicalization, verification, content binding — on npm | [@humanagencyp/hap-core](https://www.npmjs.com/package/@humanagencyp/hap-core) |
| **Governance** | Invariants, trust model, deployment obligations | [content/0.6/governance.md](content/0.6/governance.md) |

Compliance note: HAP is enabling infrastructure for regimes that require demonstrable human oversight — EU AI Act Article 14, ISO/IEC 42001, NIST AI RMF — not compliance on its own. Wherever an organization must show a human stood behind an automated act — regulation, audit, insurance, or litigation — the receipt is the artifact.

---

## Repository contents

```
.
├── content/
│   ├── 0.1/ – 0.4/   Frozen prior specs
│   ├── 0.5/          Prior spec (protocol, governance, review)
│   └── 0.6/          Current spec
│       ├── protocol.md      Normative: concepts, wire format, role behavior
│       ├── governance.md    Normative: invariants, trust model, deployment profile
│       ├── changelog.md     What 0.6 promoted, under which rule, with review record
│       └── review.md        Forward ledger: open directions, deviations, status
├── website/          humanagencyprotocol.org (Astro)
└── README.md
```

> v0.5 folded the former `service.md` and `gatekeeper.md` into `protocol.md` and retired the "Service Provider" term in favor of **Authority Server**. v0.6 splits the single review ledger into `changelog.md` (backward-looking record) and `review.md` (forward ledger).

### Related repositories

**Protocol (open source):**
- [**hap-profiles**](https://github.com/humanagencyprotocol/hap-profiles) — authority profiles (JSON, immutable, independently versioned)
- [**hap-core**](https://www.npmjs.com/package/@humanagencyp/hap-core) — TypeScript library: types, JCS canonicalization, verification, content binding
- **hap-e2e** — protocol conformance test suite against real servers

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
