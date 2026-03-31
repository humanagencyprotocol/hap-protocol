---
title: "HAP Service Provider"
version: "Version 0.3"
date: "March 2026"
---

Part of [humanagencyprotocol.com](https://humanagencyprotocol.com) — applying the [Human Agency Protocol](https://humanagencyprotocol.org).

Let your AI agents act — within bounds you control.

The Service Provider manages authorization and accountability. It tracks who can authorize what, signs cryptographic proof of human commitment, and issues receipts for every action an agent takes. Works for personal use or across teams.

---

## What It Does

**Authorization** — Define what your agents are allowed to do. Set bounds, time limits, and choose between automatic execution or per-action review.

**Personal or Team** — Use it solo or create a team. Assign roles to control who can approve what. For critical actions, require approval from multiple members.

**Automatic or Review** — Routine actions execute automatically within your bounds. High-stakes actions pause for your review before the agent acts.

**Receipts** — Every action produces a signed receipt — cryptographic proof of what was done, when, and under which authorization. Full audit trail.

**Verification** — Public endpoints to verify any authorization or receipt. Third parties can independently confirm that an action was human-authorized.

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

Together they ensure your AI agents act within the bounds you set — high autonomy without losing accountability.

---

## Technical Documentation

See [docs/api.md](docs/api.md) for the full API surface, authentication, and integration details.

---

Protocol specification: [humanagencyprotocol.org](https://humanagencyprotocol.org)
