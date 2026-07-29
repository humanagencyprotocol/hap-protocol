# The Essence — HAP and Suveren

**Status:** canonical. Everything below is the source; the surfaces listed here
derive from it, not the other way round.

| Surface | Derives | Owner file |
|---|---|---|
| humanagencyprotocol.org | Part I — the protocol | `content/<version>/` + `website/` |
| suveren.ai homepage | Part II — the product | `suveren-as/src/lib/i18n.ts`, `HomePageContent.tsx` |
| `/context.txt`, `/llms.txt`, JSON-LD FAQ | Part II, AI-facing | `suveren-as/src/lib/ai-context.ts` |
| Developer onboarding | Part III | `CLAUDE.md`, repo READMEs |
| Code-level map | — | `suveren-as/docs/architecture.md` (internal; spans all repos) |
| Assistant memory | Parts I, II, IV, V (high level) | project memory |

When these disagree, this document is right and the other is stale. The buyer
prose in `ai-context.ts` is already canonical for **wording**; Part II does not
restate it, it points at it.

---

## The one sentence

**Humans hold authority. Agents borrow it, bounded, and every consequential act
carries proof the loan was honoured before it happened.**

Everything else is mechanism.

---

# Part I — HAP, the protocol

*Audience: implementers. This is the blueprint. Suveren conforms to it, not the
reverse.*

## The problem, in protocol terms

An agent acting for a person has no **checkable** boundary. Access controls
answer "may this system reach that resource?" — permanently, and without naming
a decision. They cannot answer the question that matters after the fact:

> Who authorised *this specific action*, at this amount, to this recipient,
> today?

The root cause is **standing authority**. A credential is a durable grant to a
system. Authorisation is a bounded grant from a person, about an action. Access
is not authorisation.

Policies, prompts and system messages are all *hoped-for* boundaries: nothing
verifies them, and nothing proves afterwards that they held.

## The invariant

**No receipt, no execution.**

The receipt is a **precondition**, not a record. It is obtained *before* the
action runs. If it cannot be issued — out of scope, over a limit, approval
missing, revoked, expired — the action does not happen.

This is the single idea the whole protocol exists to make true. Every other
mechanism is in service of it.

> It is never an audit log, never "left behind", never "every action leaves a
> receipt". Those phrasings invert precondition into aftermath and describe a
> different, weaker product.

## The three roles

| Role | Holds | Does |
|---|---|---|
| **Authority Server** | the signing key | Enforces cumulative limits, approval and revocation. **Issues and signs** the receipt (Ed25519). Can refuse. |
| **Gatekeeper** | the bounds, locally | Verifies the attempted action against granted authority, then **requests** a receipt pre-flight, fail-closed. |
| **Executor** | the credentials | Runs the downstream tool — only after a valid receipt exists. |

The Gatekeeper never issues a receipt. It asks. The Authority Server may say no.

Gatekeeper and Executor are commonly the same process; they are separate roles
because their trust properties differ.

## Authority is data, not code

A **profile** declares what a kind of authority means: which bounds exist, how
each is enforced (`boundType`), what context scopes it, which gates a human must
close. An **attestation** is a signed instance of that: this person, these
bounds, this scope, this expiry, this commitment mode.

Consequences that implementers must preserve:

- Adding a limit is a **data** change, not a code change. An enforcement engine
  that needs new code per bound has failed the model.
- Anything an implementation infers rather than reads from the profile is a
  latent divergence. (Suveren learned this: bounds were once matched by parsing
  field *names*, and limits that did not match the convention were silently
  never enforced.)

## Privacy shape

The Authority Server verifies **hashes**, not content. It signs a `bounds_hash`,
a `context_hash`, gate-content hashes, and optionally a `content_hash` for the
payload — never the payload itself. Intent may additionally be end-to-end
encrypted to a frozen approver set.

An Authority Server that must read what it authorises is a different, more
invasive design. Keep the hash boundary.

## What conformance means

The protocol surface is **small**. `hap-core` is about 2,000 lines: verification,
frame/bounds canonicalisation and hashing, attestation decode/verify,
content-binding, identity. That is the contract.

Everything else in a real deployment — accounts, teams, invitations, admin,
billing, onboarding — is **product**, not protocol. Suveren's Authority Server is
roughly 60 routes and 30 stores; the protocol part of it is a small fraction.

> **To implement HAP you satisfy `hap-core`'s contract and the normative
> requirements in `content/<version>/protocol.md`. You do not reimplement
> Suveren.**

How many normative requirements the spec carries is **not currently known**. The
string `MUST` appears 258 times across `content/0.5/` (194 in `protocol.md`
alone), but that is a text count, not a requirement count: 73 of them are inside
`MUST NOT`, and a single rule is often stated twice — `protocol.md:15` expresses
one requirement as *MUST obtain* plus *MUST NOT proceed*. The real figure is
materially lower, and establishing it is the first step of the conformance work,
not a precondition for starting it.

A conformance mapping — clause → implementation → test — is outstanding, and is
the main gap between "HAP is a blueprint" and "HAP is a blueprint someone else
can build from." It cannot begin until the requirements have stable identifiers,
because the spec's sections are named rather than numbered and nothing today is
citable.

## What HAP is not

- Not a permission system. It does not decide *what should be allowed* — a human
  does, per grant.
- Not a guarantee of compliance. It is **enabling infrastructure** for regimes
  like EU AI Act Art. 14 and ISO 42001. It never "ensures" or "guarantees"
  compliance.
- Not agent sandboxing. It governs consequential *actions*, not the agent's
  reasoning or its host.

---

# Part II — Suveren, the implementation

*Audience: buyers, operators, evaluators.*

**Wording for this audience is canonical in `suveren-as/src/lib/ai-context.ts`.**
Use it verbatim where possible; do not paraphrase the invariant. Summarised
here only to fix the relationship to HAP.

## The two products

- **Suveren Gateway** — open source, runs locally. Implements **Gatekeeper +
  Executor**. Holds the credentials so the agent never does. Checks each
  consequential action against granted authority, requests the receipt, executes
  only if one is issued.
- **Suveren Authority Server** — the signing backend. Implements the **Authority
  Server** role. Available as Suveren's hosted service, or self-hosted for
  sovereign and regulated environments. **Not open source.**

## Relationship to HAP

HAP is the blueprint; Suveren is one conforming implementation. Suveren may
*drive* protocol direction — real deployments surface what the spec is missing —
but the two must not silently diverge.

**Sync rule:** anything Suveren ships that the current spec does not describe
lands in `content/<current>/review.md` **in the same change**. `review.md` is the
ledger of implementation-ahead-of-spec, and the next version is a promotion from
it rather than an archaeology exercise.

Open source is per-component, and the distinction is load-bearing:

- **Open:** the protocol spec, `hap-core`, the profiles, the reference MCP
  connectors, the conformance suite, the Gateway.
- **Not open:** the Suveren Authority Server.

Say "open-source" about the Gateway and connectors. Say "open" or "MIT-licensed"
about the protocol. Never about the Authority Server.

---

# Part III — Developer essence

*Audience: anyone about to change this system.*

## Where authority actually lives

```
profile (data)            what a kind of authority means: bounds, context, gates
   └─ attestation (signed) this person, these bounds, this scope, this expiry
        └─ receipt (signed) this action, now, within those bounds — BEFORE it runs
```

## The enforcement path, end to end

1. Agent calls a tool through the Gateway's MCP surface.
2. **Tool gating** (manifest) says what the tool is: read, write, disabled, or —
   for reads — how it is governed.
3. **Selection** picks which authorization governs the call (most-specific wins;
   overlapping grants must not let a review requirement be bypassed).
4. **Local verification** checks bounds it can check without the network.
5. **Receipt request** to the Authority Server, fail-closed. The AS enforces
   cumulative limits and may refuse, or require approval.
6. **Execution** — only now.
7. **Record** — execution log, and denials recorded separately for the human.

Reads are governed differently: they carry **no receipt** (nothing consequential
happened), so their enforcement is entirely local — a static gate, a read
adapter, or an explicit exemption. A read tool that declares none of those is
denied.

## Non-negotiables when changing this

- **Fail closed, and audibly.** A missing bound blocks; it never means "nothing
  to check". Silence is worse than refusal — a filtered-to-empty result makes an
  agent state falsehoods with confidence.
- **Generic over hardcoded.** Dispatch on what the profile declares. Never on a
  field name, tool name or profile name.
- **The refusal is the product.** It deserves better error messages than the
  success path: name the bound, name the value, say what would fix it.
- **Never weaken the hash boundary**, and never put a credential in anything the
  Authority Server, a log, or an autostart unit can see.

## Where to start reading

| To understand | Read |
|---|---|
| The protocol contract | `hap-core/src/gatekeeper.ts`, `frame.ts`, `types.ts` |
| The write path | `suveren-gateway/apps/mcp-server/src/lib/tool-proxy.ts` |
| The read model | `.../lib/read-gate.ts` |
| Authority creation | `suveren-as/src/app/api/as/attest/route.ts` |
| Receipt issuance + limits | `suveren-as/src/app/api/as/receipt/route.ts` |
| What authority looks like as data | `hap-profiles/*/[version].profile.json` |

---

# Part IV — Humans at the centre

This is the through-line, and it applies twice.

**In the product:** the human is the decision maker. The agent is a delegate
holding bounded authority, never credentials, never standing power. The receipt
is the evidence the delegation was honoured — issued before the act, not
reconstructed after.

**In how this is built:** most of the code here is written by AI. The human sets
direction, decides what is worth building, and holds authority over what ships.
That is the same shape as the product, and it is not a coincidence — it is the
strongest evidence that the model works, because it is the one we live in.

It also carries an obligation. When an AI writes both the implementation and its
tests, they agree by construction; agreement is not evidence. Verification has
to come from somewhere the author does not control — the shipped artefact, real
servers with real data, and the human actually using it. That is why the
engineering strategy is a companion to this document rather than a footnote.

---

# Part V — Accuracy guardrails

Each of these has been got wrong before and corrected. They are not style
preferences.

| Never say | Say instead |
|---|---|
| "the Gateway issues the receipt" | the Authority Server **issues and signs**; the Gateway **requests** it |
| "every action leaves a receipt" / "audit trail" | the receipt is a **precondition** — no receipt, no execution |
| "Suveren is open source" | the **Gateway** and connectors are open source; the Authority Server is not |
| "HAP guarantees compliance" | **enabling infrastructure** for EU AI Act Art. 14, ISO 42001 |
| "agents hold credentials" | agents hold **bounded authority**; the Gateway holds the credentials |
| "Service Provider" | **Authority Server** (the old term is retired) |
| commitment modes: "critical" | `automatic` / `review` / `review_above_cap` — "critical" is a UX label only |

---

## Maintaining this document

Update it when the **shape** changes — a new role, a changed invariant, a shift
in what is open — not when a version number moves. If it needs updating more
than a few times a year, it has drifted into project state and should be
trimmed back to essence.
