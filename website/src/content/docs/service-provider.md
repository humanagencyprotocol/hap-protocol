---
title: "HAP Service Provider"
version: "Version 0.3"
date: "March 2026"
---

Part of [humanagencyprotocol.com](https://humanagencyprotocol.com) — the first service applying the [Human Agency Protocol](https://humanagencyprotocol.org).

AI systems are probabilistic — flexible, adaptive, powerful. Real-world actions are deterministic — irreversible, accountable. You can't safely let a probabilistic system directly control deterministic consequences.

HAP separates intelligence from authority and enforces that boundary at execution. The Service Provider is the authority and accountability layer — it manages who can authorize what, signs the cryptographic proof of human commitment, and issues receipts for every action an agent takes.

Without this separation, more AI capability means more risk, and organizations restrict their agents. With it, organizations can safely grant agents real authority — because the proof is structural, not behavioral.

> **Alpha** — Under active development.

---

## What It Does

**Authority management** — Organizations create teams and assign domain authority (finance, compliance, engineering) to members. A person's authority is contextual to their team — the same person can hold different domains in different teams.

**Attestation signing** — When a human authorizes an action through the [Agent Gateway](https://github.com/humanagencyprotocol/hap-gateway), the SP verifies their domain authority and signs the attestation with its Ed25519 key. Two modes of commitment:

- **Fully committed** — The human commits to bounds upfront. The agent executes autonomously within those bounds. The SP validates each action against the attested bounds and issues a signed receipt.
- **Committed per action** — The human defines bounds but defers full commitment. Each agent action becomes a proposal. Domain owners review and commit or reject in the gateway UI before execution proceeds.

**Execution receipts** — Every action an agent takes produces a signed receipt at the SP — cryptographic proof of what was done, when, under which authorization, with cumulative consumption state. Full audit trail, append-only, queryable, third-party verifiable.

**Profile catalog** — Browsable catalog of authorization templates defining bounds schemas, required domains, and execution paths. Protocol profiles are immutable. Community profiles can be published by any user.

**Verification** — Public endpoints to retrieve the SP's public key and verify any attestation or receipt. Third parties can independently verify that an action was human-authorized and that execution stayed within bounds.

The SP proves two things: that a human authorized an action, and that the action was executed within those bounds. Authorization and accountability in one service.

---

## Relationship to the Gateway

```
Service Provider (cloud)              Agent Gateway (local)
┌───────────────────────┐             ┌───────────────────────┐
│  Accounts & teams     │             │  Vault (credentials)  │
│  Domain authority     │◄───────────►│  Gate content (local) │
│  Profile catalog      │  API calls  │  Gatekeeper           │
│  Ed25519 signing      │             │  MCP tool proxy       │
│  Attestation storage  │             │  Agent connection     │
│  Execution receipts   │             │  Proposal review UI   │
└───────────────────────┘             └───────────────────────┘
```

The SP answers "who has authority to authorize what." The gateway answers "is this specific tool call authorized right now." The receipt proves it happened within bounds.

Together they turn AI from an uncontrolled actor into a bounded executor of human decisions — enabling high autonomy without losing accountability.

---

## Technical Documentation

See [docs/api.md](docs/api.md) for the full API surface, authentication, and integration details.

---

Protocol specification: [humanagencyprotocol.org](https://humanagencyprotocol.org)
